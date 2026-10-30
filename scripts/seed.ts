/**
 * Seeds the database (AGENTS.md P1-T12). Safe to run again.
 *  - The three demo logins (teacher_demo, trainer_demo, admin_demo; PIN = DEMO_PIN; isDemo).
 *  - 8 synthetic teachers T01–T08 (isDemo, no PIN — they can't log in) with 1–4 scripted lessons each, played through
 *    the real engine with a fake Claude (no cost), cards with Teach scores, and ai_calls rows tagged "demo-seed".
 *    Re-running deletes only these synthetic teachers' lessons and makes them again.
 * npm run db:seed (dev) · npm run db:seed:prod (ask the operator first)
 */
import { randomUUID } from "node:crypto";
import { inArray, sql as dsql } from "drizzle-orm";
import { hashPin } from "../src/lib/auth/pin";
import type { Lang } from "../src/lib/contracts";
import { db, sql } from "../src/lib/db/client";
import { consents, users } from "../src/lib/db/schema/auth";
import { aiCalls, checkins, childLines, coachCards, sessions, turns } from "../src/lib/db/schema/core";
import { TEMPLATES, playDemoLesson } from "../src/lib/demo/lessons";
import { backupLine, loadScenario, startState } from "../src/lib/engine/scenario";
import { helloSpeakers } from "../src/lib/engine/speakers";

const DEMO = [
  { code: "teacher_demo", role: "teacher" as const },
  { code: "trainer_demo", role: "trainer" as const },
  { code: "admin_demo", role: "admin" as const },
];

/** [code, language, templates for each lesson (oldest first)] — a mix of weak, mixed and strong teaching. */
const TEACHERS: [string, Lang, (keyof typeof TEMPLATES)[]][] = [
  ["T01", "hi", ["weak", "mixed", "strong"]],
  ["T02", "en", ["weak", "weak", "mixed", "strong"]],
  ["T03", "hi", ["mixed", "strong"]],
  ["T04", "en", ["weak", "mixed"]],
  ["T05", "hi", ["weak", "weak", "mixed"]],
  ["T06", "en", ["strong", "strong"]],
  ["T07", "hi", ["weak"]],
  ["T08", "en", ["mixed"]],
];

const HOUR = 3_600_000;

async function seedDemoLogins(pin: string) {
  for (const u of DEMO) {
    const pinHash = await hashPin(pin);
    await db
      .insert(users)
      .values({ ...u, lang: "en", pinHash, isDemo: true })
      .onConflictDoUpdate({ target: users.code, set: { pinHash, role: u.role, isDemo: true } });
  }
}

async function seedTeachers() {
  const scenario = loadScenario("sub_2digit")!;
  const now = Date.now();
  for (const [k, [code, lang, plan]] of TEACHERS.entries()) {
    const [u] = await db
      .insert(users)
      .values({ code, role: "teacher", lang, pinHash: null, isDemo: true })
      .onConflictDoUpdate({ target: users.code, set: { isDemo: true, lang } })
      .returning({ id: users.id });
    const userId = u!.id;

    await db.transaction(async (tx) => {
      // Only this synthetic teacher's own rows are removed and made again.
      const old = await tx
        .select({ id: sessions.id })
        .from(sessions)
        .where(inArray(sessions.userId, [userId]));
      if (old.length) {
        await tx.delete(aiCalls).where(
          inArray(
            aiCalls.sessionId,
            old.map((o) => o.id),
          ),
        );
        await tx.delete(sessions).where(inArray(sessions.userId, [userId]));
      }
      await tx.insert(consents).values({ userId, textVersion: "v1", channel: "web" }).onConflictDoNothing();

      for (const [j, template] of plan.entries()) {
        const startedAt = new Date(now - (plan.length - j) * 26 * HOUR - (k + 1) * 3 * HOUR);
        const sessionId = randomUUID();
        const lesson = await playDemoLesson({ scenario, lang, script: TEMPLATES[template], startedAt, sessionId });
        const start = startState(scenario, lang, startedAt.toISOString());
        const hello = helloSpeakers(start).map((c) => ({ child: c.id, text: backupLine(scenario, lang, "hello") }));
        const endedAt = new Date(startedAt.getTime() + (lesson.turns.length + 1) * 20_000);

        await tx.insert(sessions).values({
          id: sessionId,
          userId,
          scenarioId: scenario.id,
          scenarioVersion: scenario.version,
          lang,
          channel: "web",
          status: "ended",
          state: lesson.state,
          turnCount: lesson.state.turnCount,
          bytesIn: 900 * lesson.turns.length,
          bytesOut: 2400 * lesson.turns.length,
          isDemo: true,
          startedAt,
          endedAt,
        });
        const helloRow = {
          sessionId,
          turn: 0,
          idempotencyKey: "hello",
          teacherText: "",
          director: null,
          statesBefore: start.children,
          statesAfter: start.children,
          result: {
            sessionId,
            turn: 0,
            transcript: "",
            director: null,
            lines: hello,
            statesAfter: start.children,
            audioUrl: `/audio/hello-${lang}.mp3`,
            lessonOver: false,
            ms: 400,
          },
          ms: 400,
          createdAt: startedAt,
        };
        await tx.insert(turns).values(helloRow);
        for (const t of lesson.turns) {
          const createdAt = new Date(startedAt.getTime() + t.turn * 20_000);
          const [row] = await tx
            .insert(turns)
            .values({
              sessionId,
              turn: t.turn,
              idempotencyKey: `demo-${t.turn}`,
              teacherText: t.teacherText,
              director: t.director,
              statesBefore: t.statesBefore,
              statesAfter: t.statesAfter,
              result: t.result,
              ms: t.result.ms,
              createdAt,
            })
            .returning({ id: turns.id });
          if (t.records.length) {
            await tx.insert(childLines).values(t.records.map((r) => ({ ...r, turnId: row!.id })));
          }
          // Plausible numbers so the AI trace shows tokens, cache reads, time and cost per call.
          const common = {
            sessionId,
            turn: t.turn,
            provider: "anthropic" as const,
            model: "claude-haiku-5-5",
            ok: true,
            createdAt,
          };
          await tx.insert(aiCalls).values([
            {
              ...common,
              purpose: "director",
              promptVersion: "demo-seed",
              inputTokens: 180,
              outputTokens: 60,
              cacheReadTokens: t.turn > 1 ? 3265 : 0,
              cacheWriteTokens: t.turn > 1 ? 0 : 3265,
              ms: 1300,
              costUsd: t.turn > 1 ? 0.00008 : 0.00045,
            },
            {
              ...common,
              purpose: "children",
              promptVersion: "demo-seed",
              inputTokens: 300,
              outputTokens: 70,
              cacheReadTokens: t.turn > 1 ? 2195 : 0,
              cacheWriteTokens: t.turn > 1 ? 0 : 2195,
              ms: 1600,
              costUsd: t.turn > 1 ? 0.00009 : 0.00034,
            },
          ]);
        }
        await tx
          .insert(coachCards)
          .values({ sessionId, card: lesson.card, quotesVerified: true, droppedPoints: 0, lang, createdAt: endedAt });
        await tx.insert(aiCalls).values({
          sessionId,
          provider: "anthropic",
          model: "claude-sonnet-5-5",
          purpose: "coach",
          promptVersion: "demo-seed",
          inputTokens: 900,
          outputTokens: 800,
          cacheWriteTokens: 1700,
          cacheReadTokens: 0,
          ms: 9800,
          costUsd: 0.014,
          ok: true,
          createdAt: endedAt,
        });
        if (j < plan.length - 1 && k % 2 === 0)
          await tx
            .insert(checkins)
            .values({ sessionId, triedInClass: j % 2 === 0, createdAt: new Date(endedAt.getTime() + 20 * HOUR) });
      }
    });
  }
}

async function main() {
  const pin = process.env.DEMO_PIN;
  if (!pin || !/^\d{4}$/.test(pin)) throw new Error("DEMO_PIN must be set to 4 digits (npm run env:check)");
  const target = process.env.DB_TARGET === "prod" ? "MAIN (prod)" : "DEV";
  await seedDemoLogins(pin);
  await seedTeachers();
  const [n] = await db.select({ users: dsql<number>`count(*)::int` }).from(users);
  const [s] = await db.select({ lessons: dsql<number>`count(*)::int` }).from(sessions);
  console.log(
    `✓ ${target}: demo logins + ${TEACHERS.length} synthetic teachers; ${n?.users} users, ${s?.lessons} lessons in total`,
  );
  await sql.end();
}

main().catch(async (err: unknown) => {
  console.error(`✗ seed failed: ${err instanceof Error ? err.message : String(err)}`);
  await sql.end({ timeout: 1 });
  process.exit(1);
});
