/**
 * Admin pages: recent lessons, one lesson's full trace, the latest eval run. Every list has a limit.
 */
import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { ChildState, DirectorOutput, TurnResult } from "@/lib/contracts";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema/auth";
import { aiCalls, childLines, evalRuns, sessions, turns } from "@/lib/db/schema/core";

export async function recentLessons(limit = 50) {
  return db
    .select({
      id: sessions.id,
      code: users.code,
      lang: sessions.lang,
      channel: sessions.channel,
      turnCount: sessions.turnCount,
      startedAt: sessions.startedAt,
      costUsd: sql<number>`coalesce((select sum(${aiCalls.costUsd}) from ${aiCalls} where ${aiCalls.sessionId} = ${sessions.id}), 0)::float`,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .orderBy(desc(sessions.startedAt))
    .limit(limit);
}

export type TraceTurn = {
  turn: number;
  teacherText: string;
  director: DirectorOutput | null;
  statesBefore: ChildState[];
  statesAfter: ChildState[];
  result: TurnResult;
  ms: number;
  lines: {
    child: string;
    text: string;
    expectedAnswer: number | null;
    passed: boolean;
    retries: number;
    usedBackup: boolean;
  }[];
  calls: {
    purpose: string;
    model: string;
    promptVersion: string | null;
    ms: number;
    costUsd: number | null;
    ok: boolean;
    cacheReadTokens: number | null;
  }[];
};

/** One lesson, turn by turn, with its child lines and AI calls — three queries, no N+1. */
export async function lessonTrace(sessionId: string) {
  const [s] = await db
    .select({
      id: sessions.id,
      code: users.code,
      lang: sessions.lang,
      startedAt: sessions.startedAt,
      scenarioVersion: sessions.scenarioVersion,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, sessionId))
    .limit(1);
  if (!s) return null;
  const rows = await db.select().from(turns).where(eq(turns.sessionId, sessionId)).orderBy(asc(turns.turn)).limit(100);
  const ids = rows.map((r) => r.id);
  const [lines, calls] = await Promise.all([
    ids.length ? db.select().from(childLines).where(inArray(childLines.turnId, ids)).limit(500) : [],
    db.select().from(aiCalls).where(eq(aiCalls.sessionId, sessionId)).orderBy(asc(aiCalls.createdAt)).limit(300),
  ]);
  const traced: TraceTurn[] = rows.map((r) => ({
    turn: r.turn,
    teacherText: r.teacherText,
    director: r.director,
    statesBefore: r.statesBefore,
    statesAfter: r.statesAfter,
    result: r.result,
    ms: r.ms,
    lines: lines.filter((l) => l.turnId === r.id),
    calls: calls.filter((c) => c.turn === r.turn),
  }));
  const coach = calls.filter((c) => c.turn === null);
  return { session: s, turns: traced, coach };
}

export async function latestEvalRun() {
  const [r] = await db.select().from(evalRuns).orderBy(desc(evalRuns.createdAt)).limit(1);
  return r ?? null;
}
