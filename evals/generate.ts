/**
 * Writes the 100 synthetic eval lessons for sub_2digit with Opus 5.5 (AGENTS.md 18): 50 weak + 50 strong,
 * half English, half Hindi/Hinglish, 6–10 teacher turns, each turn labelled by the generator (labelSource
 * "generator", reviewed false — the label check in Phase 6 confirms them).
 *
 *   npm run gen:lessons -- --dry-run     show one request and the count (free)
 *   npm run gen:lessons -- --sample 2    write 2 lessons now, full price, to check quality (~$0.15)
 *   npm run gen:lessons -- --submit      send all 100 as one Batch (half price, ~$3–6) — ask the operator first
 *   npm run gen:lessons -- --collect     wait for the batch, check every lesson, write evals/lessons/<id>.json
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { ChildId, EvalLesson, EvalTurn, Move } from "../src/lib/contracts";
import { parseLessonSum } from "../src/lib/engine/bugs";
import { loadScenario } from "../src/lib/engine/scenario";
import { checkEnv } from "../src/lib/env";

const OUT = "evals/lessons";
const BATCH_FILE = "evals/batch.json";
const scenario = loadScenario("sub_2digit")!;

const WEAK_ALLOWED: Move[] = [
  "tell_answer",
  "repeat_same_way",
  "move_on_or_scold",
  "new_sum",
  "check_whole_class",
  "other",
];
const STYLES = [
  "a patient teacher in a crowded government school in Uttar Pradesh",
  "a hurried teacher at the end of a long day",
  "a young new teacher, a bit unsure",
  "an experienced teacher who likes order and quiet",
  "a warm teacher who praises a lot",
  "a strict teacher who often says 'chup' and 'jaldi'",
  "a teacher in Bihar who mixes Bhojpuri-flavoured Hindi words",
  "a teacher in Madhya Pradesh who speaks slowly and repeats",
  "a teacher whose speech-to-text sometimes garbles names",
  "a teacher who says numbers as words more than digits",
];

/** What Opus writes: only the turns (we set id, kind, language, focus child and final sum ourselves). */
const GenLesson = z.object({ turns: z.array(EvalTurn) });

type Spec = {
  id: string;
  kind: "weak" | "strong";
  lang: "en" | "hi";
  focusChild: ChildId | null;
  finalSum: string;
  style: string;
  turns: number;
};

/** Borrowing sums other than the lesson's first one, for the final probe. */
function borrowingSums(): string[] {
  const out: string[] = [];
  for (let a = 31; a <= 98; a++)
    for (let b = 12; b < a; b++) if (a % 10 < b % 10 && parseLessonSum(`${a}-${b}`)) out.push(`${a}-${b}`);
  return out.filter((s) => s !== scenario.sums[0]);
}

export function specs(): Spec[] {
  const sums = borrowingSums();
  const focus: ChildId[] = ["ravi", "arjun", "meena"];
  const list: Spec[] = [];
  for (const kind of ["weak", "strong"] as const) {
    for (let i = 0; i < 50; i++) {
      const lang = i % 2 === 0 ? "en" : "hi";
      list.push({
        id: `sub_2digit-${kind}-${lang}-${String(Math.floor(i / 2) + 1).padStart(2, "0")}`,
        kind,
        lang,
        focusChild: kind === "strong" ? focus[i % 3]! : null,
        finalSum: sums[(i * 37 + (kind === "strong" ? 11 : 0)) % sums.length]!,
        style: STYLES[i % STYLES.length]!,
        turns: 6 + (i % 5),
      });
    }
  }
  return list;
}

const SYSTEM = `You write realistic practice-lesson transcripts for a teacher-training simulator in India. A primary teacher
practises "${scenario.title.en}" (Grade 2) with four pretend children:
${scenario.children.map((c) => `- ${c.name.en} (${c.id}): ${c.bug === null ? "gets it right but is very shy, speaks only when invited by name" : c.explainsAs}`).join("\n")}
The lesson starts with the sum ${scenario.sums[0]}.

You write ONLY the teacher's turns (what she says to the class), and label each one with exactly one move:
${Move.options.join(", ")}.
Move meanings: ask_to_explain = asks a child HOW they got it · compare_methods = asks two or more to compare/each explain ·
concrete_materials = uses bundles/sticks/objects/drawings · targeted_question = a precise question on the exact wrong step
(the borrowed ten, opening a bundle, the ones column) · think_aloud = solves it herself step by step aloud · new_sum = gives a
whole new sum (or asks the current one again) with no other teaching · check_whole_class = thumbs up / who agrees ·
invite_quiet_child = gently invites a child who hasn't spoken · specific_praise = praises a specific thing ·
tell_answer = gives the right answer / tells them to repeat it · repeat_same_way = repeats the same explanation, louder ·
move_on_or_scold = dismisses, scolds, "wrong, next" · other = greetings, classroom management, plain "good" ·
off_task = not about the lesson.

For each turn also give addressedTo (child ids she names, or ["whole_class"]) and newTask (a whole new 2-digit sum she asks,
as digits "a-b" with the bigger first and needing borrowing, e.g. "43-18"; otherwise ""). Steps inside a sum ("13 take away 8")
are NOT a newTask.

Make the speech real: short classroom sentences, sometimes numbers as words ("forty three", "तैंतालीस"), sometimes a name
misspelled the way speech-to-text does (Rabi, Arjoon, Mina). Hindi lessons: everyday spoken Hindi in Devanagari, often mixed
with English words (Hinglish), sometimes fully romanised Hinglish. English lessons: Indian English.
The labels must be the honest, correct label for what she said.`;

function userFor(s: Spec): string {
  const lang =
    s.lang === "en"
      ? "English (Indian English)"
      : "Hindi / Hinglish (mostly Devanagari; one or two turns may be romanised Hinglish)";
  const plan =
    s.kind === "weak"
      ? `A WEAK lesson: she only uses these moves: ${WEAK_ALLOWED.join(", ")}. She tells answers, repeats herself, scolds or moves on; she never asks how a child thinks and never uses materials.`
      : `A STRONG lesson focused on ${s.focusChild}: somewhere in the lesson she first finds out how ${s.focusChild} thinks (ask_to_explain or compare_methods, addressed to ${s.focusChild}), and AFTER that works on the exact mistake with at least two fix moves (concrete_materials or targeted_question) addressed to ${s.focusChild}. Other turns can be anything natural (new sums, inviting Sana, praise).`;
  return `Write one lesson.
Teacher: ${s.style}. Language: ${lang}.
${plan}
Exactly ${s.turns} teacher turns. Do not ask the sum ${s.finalSum} (it is saved for a final check).`;
}

function params(s: Spec, model: string): Anthropic.Messages.MessageCreateParamsNonStreaming {
  return {
    model,
    max_tokens: 8000,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userFor(s) }],
    output_config: { format: zodOutputFormat(GenLesson) },
  };
}

/** Checks a generated lesson against its plan. Returns the problems (empty = good). */
export function problems(s: Spec, turns: z.infer<typeof GenLesson>["turns"]): string[] {
  const p: string[] = [];
  if (turns.length < 6 || turns.length > 10) p.push(`${turns.length} turns`);
  for (const [i, t] of turns.entries()) {
    if (t.newTask && !parseLessonSum(t.newTask)) p.push(`turn ${i + 1}: bad newTask "${t.newTask}"`);
    if (t.newTask === s.finalSum) p.push(`turn ${i + 1}: uses the final sum`);
    if (s.kind === "weak" && !WEAK_ALLOWED.includes(t.label)) p.push(`turn ${i + 1}: ${t.label} in a weak lesson`);
  }
  if (s.kind === "strong") {
    const to = (t: (typeof turns)[number]) => t.addressedTo.includes(s.focusChild!);
    const reveal = turns.findIndex((t) => (t.label === "ask_to_explain" || t.label === "compare_methods") && to(t));
    const fixes = turns.filter(
      (t, i) => i > reveal && (t.label === "concrete_materials" || t.label === "targeted_question") && to(t),
    );
    if (reveal < 0) p.push(`no reveal for ${s.focusChild}`);
    else if (fixes.length < 2) p.push(`only ${fixes.length} fix after the reveal`);
  }
  return p;
}

function toLesson(s: Spec, turns: z.infer<typeof GenLesson>["turns"]): EvalLesson {
  return EvalLesson.parse({
    id: s.id,
    scenarioId: scenario.id,
    lang: s.lang,
    kind: s.kind,
    focusChild: s.focusChild,
    turns,
    finalSum: s.finalSum,
    reviewed: false,
    labelSource: "generator",
  });
}

function save(s: Spec, raw: unknown): boolean {
  const parsed = GenLesson.safeParse(raw);
  const issues = parsed.success ? problems(s, parsed.data.turns) : ["did not match the schema"];
  if (issues.length) {
    console.log(`✗ ${s.id}: ${issues.join("; ")}`);
    return false;
  }
  writeFileSync(`${OUT}/${s.id}.json`, `${JSON.stringify(toLesson(s, parsed.data!.turns), null, 2)}\n`);
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const all = specs();
  mkdirSync(OUT, { recursive: true });
  const model = checkEnv({ ...process.env, USE_MOCKS: "0" }).EVAL_GEN_MODEL; // checked here, never at import
  const client = new Anthropic({ maxRetries: 2 });

  if (args.includes("--dry-run")) {
    console.log(
      `${all.length} lessons (${all.filter((s) => s.kind === "weak").length} weak, ${all.filter((s) => s.lang === "hi").length} Hindi)`,
    );
    console.log(JSON.stringify(all[51], null, 1));
    console.log(userFor(all[51]!));
    return;
  }

  const sampleAt = args.indexOf("--sample");
  if (sampleAt >= 0) {
    const n = Number(args[sampleAt + 1] ?? 2);
    const picks = [
      all.find((s) => s.kind === "weak" && s.lang === "hi")!,
      all.find((s) => s.kind === "strong" && s.lang === "en")!,
    ].slice(0, n);
    let cost = 0;
    for (const s of picks) {
      const msg = await client.messages.parse(params(s, model), { timeout: 300_000 });
      const u = msg.usage;
      cost +=
        ((u.input_tokens + (u.cache_creation_input_tokens ?? 0) * 1.25 + (u.cache_read_input_tokens ?? 0) * 0.05) * 4 +
          u.output_tokens * 20) /
        1e6;
      console.log(
        `${s.id}: stop ${msg.stop_reason}, out ${u.output_tokens} tokens → ${save(s, msg.parsed_output) ? "saved" : "rejected"}`,
      );
    }
    console.log(`Sample cost ≈ $${cost.toFixed(3)} (batch would be half)`);
    return;
  }

  if (args.includes("--submit")) {
    if (existsSync(BATCH_FILE)) throw new Error(`${BATCH_FILE} exists — a batch was already sent. Use --collect.`);
    const batch = await client.messages.batches.create({
      requests: all.map((s) => ({ custom_id: s.id, params: params(s, model) })),
    });
    writeFileSync(
      BATCH_FILE,
      `${JSON.stringify({ id: batch.id, createdAt: batch.created_at, count: all.length }, null, 2)}\n`,
    );
    console.log(`✓ batch ${batch.id} sent (${all.length} lessons). Collect later: npm run gen:lessons -- --collect`);
    return;
  }

  if (args.includes("--collect")) {
    const { id } = JSON.parse(readFileSync(BATCH_FILE, "utf8")) as { id: string };
    let b = await client.messages.batches.retrieve(id);
    while (b.processing_status !== "ended") {
      console.log(`… ${b.processing_status}: ${JSON.stringify(b.request_counts)}`);
      await new Promise((r) => setTimeout(r, 60_000));
      b = await client.messages.batches.retrieve(id);
    }
    const bySpec = new Map(all.map((s) => [s.id, s]));
    let ok = 0;
    let outTokens = 0;
    for await (const r of await client.messages.batches.results(id)) {
      const s = bySpec.get(r.custom_id);
      if (!s) continue;
      if (r.result.type !== "succeeded") {
        console.log(`✗ ${r.custom_id}: ${r.result.type}`);
        continue;
      }
      const m = r.result.message;
      outTokens += m.usage.output_tokens;
      const text = m.content.find((c) => c.type === "text");
      let raw: unknown = null;
      try {
        raw = text && text.type === "text" ? JSON.parse(text.text) : null;
      } catch {
        raw = null;
      }
      if (save(s, raw)) ok++;
    }
    console.log(`✓ ${ok}/${all.length} lessons written to ${OUT}/ · output ${outTokens} tokens`);
    return;
  }

  console.log("Use --dry-run, --sample 2, --submit or --collect");
}

if (process.argv[1]?.endsWith("generate.ts")) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
