/**
 * Real-Claude check of the Director and the Children (costs a few cents; run by hand, never in CI):
 *   1. Director on the 30 lines in tests/fixtures/teacher_lines.json → how many moves / children / sums match.
 *   2. Children on 20 set-up moments (EN + HI) → every final line must contain the engine's number.
 * Calls are recorded in ai_calls (Neon dev branch). Run: npm run ai:check  (add --director or --children for one part)
 */
import { readFileSync } from "node:fs";
import type { DirectorOutput } from "../src/lib/contracts";
import { sql } from "../src/lib/db/client";
import { writeLines } from "../src/lib/engine/children";
import { tagMove } from "../src/lib/engine/director";
import { applyMove } from "../src/lib/engine/mindState";
import { loadScenario, startState } from "../src/lib/engine/scenario";
import { pickSpeakers } from "../src/lib/engine/speakers";
import type { AiTurnContext } from "../src/lib/engine/types";
import { checkEnv } from "../src/lib/env";

type FixtureLine = { id: string; lang: string; teacher: string; label: string; addressedTo: string[]; newTask: string };

const env = checkEnv({ ...process.env, USE_MOCKS: "0" });
const scenario = loadScenario("sub_2digit")!;
const models = { director: env.DIRECTOR_MODEL, child: env.CHILD_MODEL };
let spend = 0;
const ai = {
  record: async (row: { costUsd?: number | null }) => {
    spend += row.costUsd ?? 0;
    const { insertAiCall } = await import("../src/lib/db/queries/aiCalls");
    await insertAiCall(row as Parameters<typeof insertAiCall>[0]);
  },
};

function ctxFor(lang: "en" | "hi", teacher: string): AiTurnContext {
  return { scenario, state: startState(scenario, lang, new Date().toISOString()), recent: [], teacher, models, ai };
}

async function checkDirector() {
  const { lines } = JSON.parse(readFileSync("tests/fixtures/teacher_lines.json", "utf8")) as { lines: FixtureLine[] };
  let move = 0;
  let to = 0;
  let task = 0;
  for (const l of lines) {
    const { director: d, ok } = await tagMove(ctxFor(l.lang === "hi" ? "hi" : "en", l.teacher));
    const moveOk = d.move === l.label;
    const toOk = [...d.addressedTo].sort().join() === [...l.addressedTo].sort().join();
    const taskOk = d.newTask === l.newTask;
    move += Number(moveOk);
    to += Number(toOk);
    task += Number(taskOk);
    if (!(moveOk && toOk && taskOk) || !ok) {
      console.log(
        `  ✗ ${l.id} "${l.teacher}" → ${d.move} ${JSON.stringify(d.addressedTo)} "${d.newTask}" (${d.confidence}) · want ${l.label} ${JSON.stringify(l.addressedTo)} "${l.newTask}"${ok ? "" : " · CALL FAILED"}`,
      );
    }
  }
  console.log(`Director: move ${move}/30 · addressedTo ${to}/30 · newTask ${task}/30`);
}

type Moment = { lang: "en" | "hi"; steps: [string, DirectorOutput][] };
const D = (
  move: DirectorOutput["move"],
  addressedTo: DirectorOutput["addressedTo"] = ["whole_class"],
  newTask = "",
): DirectorOutput => ({
  move,
  addressedTo,
  newTask,
  evidenceQuote: "",
  confidence: "high",
});

const MOMENTS: Moment[] = [
  { lang: "en", steps: [["What is 52 minus 27?", D("new_sum", ["whole_class"], "52-27")]] },
  { lang: "hi", steps: [["बावन में से सत्ताईस कितना?", D("new_sum", ["whole_class"], "52-27")]] },
  { lang: "en", steps: [["No, it is 25. Everyone say 25.", D("tell_answer")]] },
  { lang: "hi", steps: [["नहीं, पच्चीस। सब बोलो पच्चीस।", D("tell_answer")]] },
  {
    lang: "en",
    steps: [
      ["Say 25.", D("tell_answer")],
      ["Now 43 minus 18?", D("new_sum", ["whole_class"], "43-18")],
    ],
  },
  {
    lang: "en",
    steps: [
      ["Now 43 minus 18?", D("new_sum", ["whole_class"], "43-18")],
      ["Ravi, tell me how you got 35.", D("ask_to_explain", ["ravi"])],
    ],
  },
  {
    lang: "hi",
    steps: [
      ["अब तैंतालीस में से अठारह?", D("new_sum", ["whole_class"], "43-18")],
      ["रवि, तुमने कैसे किया?", D("ask_to_explain", ["ravi"])],
    ],
  },
  { lang: "en", steps: [["Meena, how did you get 26?", D("ask_to_explain", ["meena"])]] },
  { lang: "hi", steps: [["रवि और अर्जुन, दोनों बताओ कैसे किया?", D("compare_methods", ["ravi", "arjun"])]] },
  {
    lang: "en",
    steps: [
      ["Ravi, show 52 with bundles and sticks. Can you take 7 sticks from 2?", D("concrete_materials", ["ravi"])],
    ],
  },
  { lang: "hi", steps: [["रवि, बावन को बंडल और तीलियों से दिखाओ।", D("concrete_materials", ["ravi"])]] },
  {
    lang: "en",
    steps: [
      ["Ravi, how did you get 35?", D("ask_to_explain", ["ravi"])],
      ["Show it with bundles.", D("concrete_materials", ["ravi"])],
      ["12 take away 7?", D("targeted_question", ["ravi"])],
    ],
  },
  { lang: "en", steps: [["Sana, what do you think? Take your time.", D("invite_quiet_child", ["sana"])]] },
  { lang: "hi", steps: [["सना, तुम क्या सोचती हो? आराम से बताओ।", D("invite_quiet_child", ["sana"])]] },
  { lang: "en", steps: [["Tell me a joke about cricket.", D("off_task")]] },
  { lang: "hi", steps: [["मुझे एक गाना सुनाओ।", D("off_task")]] },
  { lang: "en", steps: [["Good morning, children.", D("other")]] },
  { lang: "hi", steps: [["सब लोग बैठ जाओ।", D("other")]] },
  { lang: "en", steps: [["Try 70 minus 35.", D("new_sum", ["whole_class"], "70-35")]] },
  { lang: "hi", steps: [["अब इकसठ में से चौबीस।", D("new_sum", ["whole_class"], "61-24")]] },
];

async function checkChildren() {
  let lines = 0;
  let firstPass = 0;
  let retried = 0;
  let backups = 0;
  let wrong = 0;
  for (const [i, m] of MOMENTS.entries()) {
    let state = startState(scenario, m.lang, new Date().toISOString());
    for (const [, d] of m.steps) state = applyMove(state, d);
    const [teacher, last] = m.steps.at(-1)!;
    const speakers = pickSpeakers(state, last);
    const ctx: AiTurnContext = { scenario, state, recent: [], teacher, models, ai };
    const r = await writeLines(ctx, speakers);
    console.log(`#${i + 1} [${m.lang}] ${state.currentSum.join("-")} "${teacher}"`);
    for (const [j, rec] of r.records.entries()) {
      const ok = rec.expectedAnswer === null || rec.text.includes(String(rec.expectedAnswer));
      lines += 1;
      firstPass += Number(rec.passed);
      retried += Number(rec.retries > 0 && !rec.usedBackup);
      backups += Number(rec.usedBackup);
      wrong += Number(!ok);
      const flag = rec.usedBackup ? " [backup]" : rec.retries ? " [retry]" : "";
      console.log(
        `   ${ok ? "✓" : "✗"} ${speakers[j]!.child} (${speakers[j]!.mode}, must ${rec.expectedAnswer ?? "-"}): ${rec.text}${flag}`,
      );
    }
  }
  console.log(
    `Children: ${lines} lines · first try ${firstPass} · fixed by retry ${retried} · backup ${backups} · WRONG NUMBER ${wrong}`,
  );
}

async function main() {
  const only = process.argv.find((a) => a === "--director" || a === "--children");
  if (only !== "--children") await checkDirector();
  if (only !== "--director") await checkChildren();
  console.log(`Spend this run: $${spend.toFixed(4)}`);
  await sql.end();
}

main().catch(async (err: unknown) => {
  console.error(err);
  await sql.end({ timeout: 1 });
  process.exit(1);
});
