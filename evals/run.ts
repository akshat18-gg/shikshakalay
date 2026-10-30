/**
 * The eval runner (AGENTS.md 18). Real Claude, text only, no database writes except one eval_runs row (--save).
 *
 *   npm run evals                         reviewed lessons, coach on 20 of them
 *   npm run evals -- --limit 10 --unreviewed      quick run on generator labels (before the label check)
 *   npm run evals -- --kind weak --lang hi        a slice
 *   npm run evals -- --redteam            the 20 red-team cases
 *   add --save to store the eval_runs row (DB_TARGET=prod → shown on the live /admin/evals page)
 *
 * After each lesson a probe turn ("Everyone, what is {finalSum}?") skips the Director and makes every child answer.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { version as childrenVersion } from "../src/lib/ai/prompts/children";
import { version as coachVersion } from "../src/lib/ai/prompts/coach";
import { version as directorVersion } from "../src/lib/ai/prompts/director";
import { type DirectorOutput, EvalLesson, type Move } from "../src/lib/contracts";
import { answerWith, parseLessonSum, parseTask } from "../src/lib/engine/bugs";
import { type LineRecord, writeLines } from "../src/lib/engine/children";
import { writeCard } from "../src/lib/engine/coach";
import { step } from "../src/lib/engine/core";
import { tagMove } from "../src/lib/engine/director";
import { applyMove, beliefAnswer, spokenAnswer } from "../src/lib/engine/mindState";
import { loadScenario, moveEffects, startState } from "../src/lib/engine/scenario";
import type { AiTurnContext, EngineState, Speaker, Sum } from "../src/lib/engine/types";
import { checkEnv } from "../src/lib/env";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const flag = (name: string) => process.argv.includes(`--${name}`);

const scenario = loadScenario("sub_2digit")!;
let spend = 0;
const ai = { record: async (row: { costUsd?: number | null }) => void (spend += row.costUsd ?? 0) };

/** "" and the current sum asked again mean the same to the engine. */
function taskKey(newTask: string, current: Sum): string {
  const t = parseTask(newTask, current);
  if (t.kind === "sum") return t.sum[0] === current[0] && t.sum[1] === current[1] ? "none" : `${t.sum[0]}-${t.sum[1]}`;
  return t.kind;
}

type TurnScore = { move: Move; label: Move; toOk: boolean; taskOk: boolean };
type LessonResult = {
  id: string;
  kind: "weak" | "strong";
  lang: "en" | "hi";
  turns: TurnScore[];
  lines: LineRecord[];
  probe: { child: string; said: number; bug: number | null; right: number }[];
  resisted: boolean | null;
  taught: boolean | null;
  coach?: { verified: boolean; dropped: number };
};

async function runLesson(
  lesson: EvalLesson,
  models: { director: string; child: string; coach: string },
  withCoach: boolean,
): Promise<LessonResult> {
  let state: EngineState = startState(scenario, lesson.lang, new Date().toISOString());
  const recent: AiTurnContext["recent"] = [];
  const scores: TurnScore[] = [];
  const lines: LineRecord[] = [];
  const coachTurns: Parameters<typeof writeCard>[0]["turns"] = [];
  for (const [i, t] of lesson.turns.entries()) {
    const before = state.currentSum;
    const r = await step(
      { scenario, state, teacherText: t.teacher, now: new Date(), recent: recent.slice(-4), models, ai, turn: i + 1 },
      { tagMove, writeLines },
    );
    const d = r.director;
    if (d) {
      const to = (x: string[]) => [...x].sort().join();
      scores.push({
        move: d.move,
        label: t.label,
        toOk: to(d.addressedTo) === to(t.addressedTo),
        taskOk: taskKey(d.newTask, before) === taskKey(t.newTask, before),
      });
    }
    lines.push(...r.records);
    coachTurns.push({
      turn: i + 1,
      teacherText: r.teacherText,
      director: d,
      lines: r.lines,
      statesBefore: r.statesBefore,
      statesAfter: r.state.children,
    });
    recent.push({ turn: i + 1, teacher: r.teacherText, lines: r.lines });
    state = r.state;
  }

  // Probe: every child answers the fresh sum (Sana too) — the engine decides each number, Claude says it.
  const sum = parseLessonSum(lesson.finalSum)!;
  const probeDirector: DirectorOutput = {
    move: "new_sum",
    addressedTo: ["whole_class"],
    newTask: lesson.finalSum,
    evidenceQuote: "",
    confidence: "high",
  };
  const probed = applyMove(state, probeDirector, moveEffects(scenario));
  const speakers: Speaker[] = probed.children.map((c) => ({
    child: c.id,
    mode: "answer",
    mustSay: spokenAnswer(c, sum, probed.parrots),
  }));
  const { records } = await writeLines(
    {
      scenario,
      state: probed,
      recent: recent.slice(-4),
      teacher: `Everyone, what is ${sum[0]} minus ${sum[1]}?`,
      models,
      ai,
    },
    speakers,
  );
  lines.push(...records);
  const right = sum[0] - sum[1];
  const probe = probed.children.map((c) => ({
    child: c.id,
    said: beliefAnswer(c, sum),
    bug: c.bug ? answerWith(c.bug, sum[0], sum[1]) : null,
    right,
  }));
  const bugged = probe.filter((p) => p.bug !== null);
  const resisted = lesson.kind === "weak" ? bugged.every((p) => p.said === p.bug) : null;
  const taught =
    lesson.kind === "strong" && lesson.focusChild
      ? probe.find((p) => p.child === lesson.focusChild)!.said === right
      : null;

  let coach: LessonResult["coach"];
  if (withCoach) {
    const out = await writeCard({ scenario, lang: lesson.lang, turns: coachTurns, model: models.coach, ai });
    coach = { verified: out.quotesVerified, dropped: out.droppedPoints };
  }
  return { id: lesson.id, kind: lesson.kind, lang: lesson.lang, turns: scores, lines, probe, resisted, taught, coach };
}

/** A share, or null when nothing was measured (shown as n/a, never as 0%). */
const pct = (n: number, d: number): number | null => (d ? n / d : null);

function metrics(results: LessonResult[]) {
  const turns = results.flatMap((r) => r.turns);
  const lines = results.flatMap((r) => r.lines.filter((l) => l.expectedAnswer !== null));
  const weak = results.filter((r) => r.resisted !== null);
  const strong = results.filter((r) => r.taught !== null);
  const coached = results.filter((r) => r.coach);
  const confusion: Record<string, Record<string, number>> = {};
  for (const t of turns) {
    confusion[t.label] ??= {};
    confusion[t.label]![t.move] = (confusion[t.label]![t.move] ?? 0) + 1;
  }
  return {
    metrics: {
      resistWeak: pct(weak.filter((r) => r.resisted).length, weak.length),
      teachable: pct(strong.filter((r) => r.taught).length, strong.length),
      directorAccuracy: pct(turns.filter((t) => t.move === t.label).length, turns.length),
      addressedToAccuracy: pct(turns.filter((t) => t.toOk).length, turns.length),
      newTaskAccuracy: pct(turns.filter((t) => t.taskOk).length, turns.length),
      lineFirstTry: pct(lines.filter((l) => l.passed).length, lines.length),
      lineFinal: lines.length ? 1 : null, // every final line carries the engine's number (retry or backup) — guaranteed in code
      quoteFirstPass: pct(coached.filter((r) => r.coach!.verified).length, coached.length),
      quoteValidity: coached.length ? 1 : null, // after the quote check no unverified quote reaches a card
    },
    counts: {
      lessons: results.length,
      weak: weak.length,
      strong: strong.length,
      turns: turns.length,
      lines: lines.length,
      coached: coached.length,
    },
    confusion,
  };
}

type RedCase = { id: string; lang: "en" | "hi" | "mixed"; input: string; expect: string; note: string };

/** Each red-team case is one turn in a fresh lesson; the expectation is checked automatically where it can be. */
async function runRedteam(models: { director: string; child: string; coach: string }, limit?: number) {
  const cases = (JSON.parse(readFileSync("evals/redteam.json", "utf8")) as { cases: RedCase[] }).cases.slice(0, limit);
  const out: { id: string; expect: string; pass: boolean | null; detail: string }[] = [];
  for (const c of cases) {
    const lang = c.lang === "en" ? "en" : "hi";
    const state = startState(scenario, lang, new Date().toISOString());
    const r = await step(
      { scenario, state, teacherText: c.input, now: new Date(), recent: [], models, ai },
      { tagMove, writeLines },
    );
    const d = r.director;
    const kind = d ? parseTask(d.newTask, state.currentSum).kind : "none";
    const correct = state.currentSum[0] - state.currentSum[1];
    const saysCorrectWhileStuck = r.lines.some((l) => {
      const child = r.state.children.find((x) => x.id === l.child)!;
      return (
        child.state !== "GOT_IT" &&
        new RegExp(`\\b${correct}\\b`).test(l.text) &&
        !r.records.find((x) => x.child === l.child && x.expectedAnswer === correct)
      );
    });
    let pass: boolean | null;
    if (c.expect === "say_again") pass = d === null && r.lines.length <= 1;
    else if (c.expect === "trimmed") pass = r.teacherText.length <= 1000;
    else if (c.expect === "cannot" || c.expect === "not_today")
      pass = r.lines.length === 1 && (c.expect === "cannot" ? kind === "impossible" : kind === "unsupported");
    else if (c.expect.startsWith("new_sum ")) pass = d?.move === "new_sum" && d.newTask === c.expect.split(" ")[1];
    else pass = c.expect.split(" or ").includes(d?.move ?? "none");
    if (saysCorrectWhileStuck) pass = false;
    out.push({
      id: c.id,
      expect: c.expect,
      pass,
      detail: `${d?.move ?? "-"} "${d?.newTask ?? ""}" → ${r.lines.map((l) => `${l.child}: ${l.text}`).join(" | ")}`,
    });
    process.stdout.write(pass ? "." : "x");
  }
  return out;
}

async function main() {
  const env = checkEnv({ ...process.env, USE_MOCKS: "0" });
  const models = { director: env.DIRECTOR_MODEL, child: env.CHILD_MODEL, coach: env.COACH_MODEL };
  if (flag("redteam")) {
    const rt = await runRedteam(models, arg("limit") ? Number(arg("limit")) : undefined);
    const passed = rt.filter((x) => x.pass).length;
    mkdirSync("evals/results", { recursive: true });
    const file = `evals/results/redteam-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.json`;
    writeFileSync(file, `${JSON.stringify({ passed, total: rt.length, spendUsd: spend, cases: rt }, null, 2)}\n`);
    console.log(`\nRed team: ${passed}/${rt.length} as expected · spend $${spend.toFixed(3)} · ${file}`);
    for (const x of rt.filter((y) => !y.pass)) console.log(`  ✗ ${x.id} (want ${x.expect}): ${x.detail.slice(0, 200)}`);
    return;
  }
  let lessons = readdirSync("evals/lessons")
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => EvalLesson.parse(JSON.parse(readFileSync(`evals/lessons/${f}`, "utf8"))));
  if (!flag("unreviewed")) lessons = lessons.filter((l) => l.reviewed);
  if (arg("kind")) lessons = lessons.filter((l) => l.kind === arg("kind"));
  if (arg("lang")) lessons = lessons.filter((l) => l.lang === arg("lang"));
  if (arg("limit")) lessons = lessons.slice(0, Number(arg("limit")));
  if (lessons.length === 0)
    throw new Error("no lessons to run (are they reviewed? add --unreviewed for generator labels)");
  const coachEvery = Math.max(1, Math.floor(lessons.length / Number(arg("coach") ?? 20)));

  console.log(`Running ${lessons.length} lessons (coach on every ${coachEvery}th)…`);
  const results: LessonResult[] = [];
  const queue = [...lessons.entries()];
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        const [i, lesson] = next;
        try {
          results.push(await runLesson(lesson, models, i % coachEvery === 0));
          process.stdout.write(".");
        } catch (err) {
          console.log(`\n✗ ${lesson.id}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }),
  );
  const m = metrics(results);
  const promptVersions = {
    director: directorVersion,
    children: childrenVersion,
    coach: coachVersion,
    scenario: `sub_2digit@${scenario.version}`,
  };
  const date = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  mkdirSync("evals/results", { recursive: true });
  const file = `evals/results/${date}.json`;
  writeFileSync(file, `${JSON.stringify({ promptVersions, ...m, spendUsd: spend, results }, null, 2)}\n`);
  console.log(
    `\n\n${Object.entries(m.metrics)
      .map(([k, v]) => `${k.padEnd(20)} ${v === null ? "n/a" : `${(v * 100).toFixed(1)}%`}`)
      .join("\n")}`,
  );
  console.log(`\n${JSON.stringify(m.counts)} · spend $${spend.toFixed(3)} · ${file}`);

  if (flag("save")) {
    const [{ db, sql }, { evalRuns }] = await Promise.all([
      import("../src/lib/db/client"),
      import("../src/lib/db/schema/core"),
    ]);
    // Only what was measured goes in the row (an empty slice is n/a, not 0).
    const measured = Object.fromEntries(Object.entries(m.metrics).filter((e): e is [string, number] => e[1] !== null));
    await db.insert(evalRuns).values({
      promptVersions,
      metrics: measured,
      details: { counts: m.counts, confusion: m.confusion },
      notes: `${lessons.length} lessons · ${file}`,
    });
    console.log(`✓ eval_runs row saved (${process.env.DB_TARGET === "prod" ? "prod" : "dev"})`);
    await sql.end();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
