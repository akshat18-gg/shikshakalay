/**
 * Lesson storage (real mode): sessions, turns, child lines, coaching cards. Multi-row writes run in one
 * transaction, and no transaction is ever held open while waiting for Claude or a voice service.
 */
import { and, asc, count, eq, gte, sql } from "drizzle-orm";
import type { ChildState, CoachCard, DirectorOutput, Lang, TurnResult } from "@/lib/contracts";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema/auth";
import { childLines, coachCards, sessions, turns } from "@/lib/db/schema/core";
import type { LineRecord } from "@/lib/engine/children";
import type { EngineState } from "@/lib/engine/types";

export type SessionRow = typeof sessions.$inferSelect & { state: EngineState };
export type TurnRow = typeof turns.$inferSelect;

export type NewTurn = {
  turn: number;
  idempotencyKey: string;
  teacherText: string;
  audioMs: number | null;
  director: DirectorOutput | null;
  statesBefore: ChildState[];
  statesAfter: ChildState[];
  result: TurnResult;
  ms: number;
  records: LineRecord[];
};

const MAX_TURN_ROWS = 100; // a lesson has at most 12 counted turns plus a few "say again"s

/** Postgres "unique violation" (also when wrapped by Drizzle). */
export function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "23505" || e?.cause?.code === "23505";
}

function lineRows(turnId: string, records: LineRecord[]) {
  return records.map((r) => ({
    turnId,
    child: r.child,
    text: r.text,
    expectedAnswer: r.expectedAnswer,
    passed: r.passed,
    retries: r.retries,
    usedBackup: r.usedBackup,
  }));
}

/** Creates the lesson and its turn 0 (the hello) together. Returns the new session id. */
export async function createSession(o: {
  userId: string;
  scenarioId: string;
  scenarioVersion: number;
  lang: Lang;
  channel: "web" | "whatsapp";
  state: EngineState;
  hello: Omit<NewTurn, "result"> & { result: (sessionId: string) => TurnResult };
}): Promise<string> {
  return db.transaction(async (tx) => {
    const [u] = await tx.select({ isDemo: users.isDemo }).from(users).where(eq(users.id, o.userId)).limit(1);
    const [s] = await tx
      .insert(sessions)
      .values({
        userId: o.userId,
        scenarioId: o.scenarioId,
        scenarioVersion: o.scenarioVersion,
        lang: o.lang,
        channel: o.channel,
        state: o.state,
        isDemo: u?.isDemo ?? false,
      })
      .returning({ id: sessions.id });
    const [t] = await tx
      .insert(turns)
      .values({ ...o.hello, sessionId: s!.id, result: o.hello.result(s!.id) })
      .returning({ id: turns.id });
    if (o.hello.records.length) await tx.insert(childLines).values(lineRows(t!.id, o.hello.records));
    return s!.id;
  });
}

export async function loadSession(id: string): Promise<SessionRow | null> {
  const [s] = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  return (s as SessionRow | undefined) ?? null;
}

export async function loadTurns(sessionId: string): Promise<TurnRow[]> {
  return db.select().from(turns).where(eq(turns.sessionId, sessionId)).orderBy(asc(turns.turn)).limit(MAX_TURN_ROWS);
}

export async function loadTurnResult(sessionId: string, turn: number): Promise<TurnResult | null> {
  const [t] = await db
    .select({ result: turns.result })
    .from(turns)
    .where(and(eq(turns.sessionId, sessionId), eq(turns.turn, turn)))
    .limit(1);
  return t?.result ?? null;
}

export async function findTurnByKey(sessionId: string, key: string): Promise<TurnResult | null> {
  const [t] = await db
    .select({ result: turns.result })
    .from(turns)
    .where(and(eq(turns.sessionId, sessionId), eq(turns.idempotencyKey, key)))
    .limit(1);
  return t?.result ?? null;
}

/** Turns this teacher sent since `since`, across all her lessons (for TURNS_PER_HOUR_LIMIT). */
export async function countUserTurnsSince(userId: string, since: Date): Promise<number> {
  const [r] = await db
    .select({ n: count() })
    .from(turns)
    .innerJoin(sessions, eq(turns.sessionId, sessions.id))
    .where(and(eq(sessions.userId, userId), gte(turns.createdAt, since)));
  return r?.n ?? 0;
}

/** Saves a turn, its child lines and the new engine state in one transaction. */
export async function saveTurn(o: {
  sessionId: string;
  turn: NewTurn;
  state: EngineState;
  bytesIn: number;
  bytesOut: number;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [t] = await tx
      .insert(turns)
      .values({ ...o.turn, sessionId: o.sessionId })
      .returning({ id: turns.id });
    if (o.turn.records.length) await tx.insert(childLines).values(lineRows(t!.id, o.turn.records));
    await tx
      .update(sessions)
      .set({
        state: o.state,
        turnCount: o.state.turnCount,
        bytesIn: sql`${sessions.bytesIn} + ${o.bytesIn}`,
        bytesOut: sql`${sessions.bytesOut} + ${o.bytesOut}`,
      })
      .where(eq(sessions.id, o.sessionId));
  });
}

export async function loadCard(sessionId: string): Promise<CoachCard | null> {
  const [c] = await db
    .select({ card: coachCards.card })
    .from(coachCards)
    .where(eq(coachCards.sessionId, sessionId))
    .limit(1);
  return c?.card ?? null;
}

/** Stores the card (first writer wins) and marks the lesson ended. Returns the stored card. */
export async function saveCardAndEnd(o: {
  sessionId: string;
  card: CoachCard;
  quotesVerified: boolean;
  droppedPoints: number;
  lang: Lang;
}): Promise<CoachCard> {
  return db.transaction(async (tx) => {
    await tx.insert(coachCards).values(o).onConflictDoNothing({ target: coachCards.sessionId });
    await tx.update(sessions).set({ status: "ended", endedAt: new Date() }).where(eq(sessions.id, o.sessionId));
    const [c] = await tx
      .select({ card: coachCards.card })
      .from(coachCards)
      .where(eq(coachCards.sessionId, o.sessionId))
      .limit(1);
    return c!.card;
  });
}
