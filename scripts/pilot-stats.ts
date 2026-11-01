/**
 * Pilot numbers for the README, deck and "you said, we changed" — read-only, teacher codes only.
 *
 *   DB_TARGET=prod npx tsx --env-file-if-exists=.env.local scripts/pilot-stats.ts           the live database
 *   … scripts/pilot-stats.ts --open                                                          also print open answers
 *
 * Counts real teachers only (not demo/seeded accounts). Open answers are printed to this terminal only:
 * read them, write the gist with codes into docs/pilot/changes.md, never paste them raw into git.
 */
import { and, eq, inArray } from "drizzle-orm";
import { db, sql } from "../src/lib/db/client";
import { users } from "../src/lib/db/schema/auth";
import { checkins, feedback, sessions } from "../src/lib/db/schema/core";

const ist = (d: Date | null) =>
  d ? d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "short", timeStyle: "short" }) : "-";
const avg = (xs: number[]) => (xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : "n/a");

async function main() {
  const showOpen = process.argv.includes("--open");
  const teachers = await db
    .select({ id: users.id, code: users.code })
    .from(users)
    .where(and(eq(users.role, "teacher"), eq(users.isDemo, false)));
  const real = teachers.filter((t) => !t.code.endsWith("_demo"));
  if (real.length === 0) {
    console.log("No real teacher accounts found.");
    return;
  }
  const ids = real.map((t) => t.id);
  const lessons = await db
    .select({
      userId: sessions.userId,
      id: sessions.id,
      status: sessions.status,
      lang: sessions.lang,
      channel: sessions.channel,
      turns: sessions.turnCount,
      startedAt: sessions.startedAt,
    })
    .from(sessions)
    .where(and(inArray(sessions.userId, ids), eq(sessions.isDemo, false)));
  const answers = await db.select().from(feedback).where(inArray(feedback.userId, ids));
  const lessonIds = lessons.map((l) => l.id);
  const tried = lessonIds.length ? await db.select().from(checkins).where(inArray(checkins.sessionId, lessonIds)) : [];

  console.log("code  lessons ended  turns  langs   first            last             need/7 easy/7");
  let used = 0;
  let returned = 0;
  for (const t of real.sort((a, b) => a.code.localeCompare(b.code))) {
    const mine = lessons.filter((l) => l.userId === t.id).sort((a, b) => +a.startedAt - +b.startedAt);
    const fb = answers.filter((f) => f.userId === t.id);
    const counted = mine.filter((l) => l.turns > 0);
    if (counted.length >= 1) used++;
    if (counted.length >= 2) returned++;
    const langs = [...new Set(mine.map((l) => l.lang))].join("+") || "-";
    console.log(
      [
        t.code.padEnd(5),
        String(mine.length).padStart(7),
        String(mine.filter((l) => l.status === "ended").length).padStart(5),
        String(mine.reduce((s, l) => s + l.turns, 0)).padStart(6),
        langs.padEnd(7),
        ist(mine[0]?.startedAt ?? null).padEnd(16),
        ist(mine.at(-1)?.startedAt ?? null).padEnd(16),
        avg(fb.flatMap((f) => (f.doesWhatINeed ? [f.doesWhatINeed] : []))).padStart(6),
        avg(fb.flatMap((f) => (f.easyToUse ? [f.easyToUse] : []))).padStart(6),
      ].join(" "),
    );
    if (showOpen) for (const f of fb) if (f.openAnswers) console.log(`      open: ${JSON.stringify(f.openAnswers)}`);
  }
  const need = answers.flatMap((f) => (f.doesWhatINeed ? [f.doesWhatINeed] : []));
  const easy = answers.flatMap((f) => (f.easyToUse ? [f.easyToUse] : []));
  console.log("");
  console.log(`Accounts: ${real.length} · used (≥ 1 lesson with a turn): ${used} · came back (≥ 2): ${returned}`);
  console.log(`Lessons: ${lessons.length} (${lessons.filter((l) => l.status === "ended").length} ended, cards made)`);
  console.log(`Feedback forms: ${answers.length} · "does what I need" ${avg(need)}/7 · "easy to use" ${avg(easy)}/7`);
  console.log(`Check-ins: ${tried.length} · tried the line in class: ${tried.filter((c) => c.triedInClass).length}`);
  console.log(
    used >= 5
      ? "≥ 5 teachers: a pilot summary may be reported."
      : "Fewer than 5 teachers: report the count honestly, no averages per teacher.",
  );
}

main()
  .catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
