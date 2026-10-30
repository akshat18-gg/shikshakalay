/**
 * The label check (IMPLEMENTATION_PLAN E2): a second, independent model pass (Sonnet 5.5) labels every teacher line
 * of the 100 eval lessons WITHOUT seeing the generator's label. Where both agree, the label stands ("agreed"); the
 * operator settles every disagreement by hand and spot-checks 40 random agreed lines ("human").
 *
 *   npx tsx --env-file-if-exists=.env.local evals/label-check.ts --dry-run    one request + the count (free)
 *   … --submit     send all lessons as one Batch (half price, ≈ $1–2) — ask the operator first
 *   … --collect    wait, compare, mark agreed lessons reviewed, write docs/solo/label-review.md
 *   … --apply      read the operator's picks from label-review.md into the lessons
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { EvalLesson, Move } from "../src/lib/contracts";
import { loadScenario } from "../src/lib/engine/scenario";
import { checkEnv } from "../src/lib/env";
import { MOVE_MEANINGS } from "./generate";

const LESSONS = "evals/lessons";
const BATCH_FILE = "evals/label-batch.json";
const CHECK_FILE = "evals/label-check.json";
const REVIEW_FILE = "docs/solo/label-review.md";
const SPOT_CHECKS = 40;

/** What the checker writes: one move per teacher turn, in order. */
const CheckerLabels = z.object({ moves: z.array(Move) });
/** lesson id → the checker's move for each turn. */
export type CheckerResult = Record<string, Move[]>;

const scenario = loadScenario("sub_2digit")!;

const SYSTEM = `You label teacher speech from a teacher-training simulator in India. A primary teacher practises
"${scenario.title.en}" (Grade 2) with four pretend children:
${scenario.children.map((c) => `- ${c.name.en} (${c.id}): ${c.bug === null ? "gets it right but is very shy" : c.explainsAs}`).join("\n")}
The lesson starts with the sum ${scenario.sums[0]}.

For each numbered teacher turn, pick exactly one move from: ${Move.options.join(", ")}.
${MOVE_MEANINGS}

Read the whole lesson first: a turn's move can depend on what came before. Speech-to-text may misspell names
(Rabi = Ravi, Arjoon = Arjun, Mina = Meena) and say numbers as words. Hindi and Hinglish turns use the same moves.
When a turn does two things, pick the move that matters most for how the children think (a reveal or a fix beats
praise or a new sum). Return one move per turn, in order.`;

function userFor(lesson: EvalLesson): string {
  return `Lesson (${lesson.lang === "en" ? "English" : "Hindi/Hinglish"}), ${lesson.turns.length} teacher turns:\n${lesson.turns
    .map((t, i) => `${i + 1}. <teacher_said>${t.teacher}</teacher_said>`)
    .join("\n")}`;
}

function params(lesson: EvalLesson, model: string): Anthropic.Messages.MessageCreateParamsNonStreaming {
  return {
    model,
    max_tokens: 8000,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userFor(lesson) }],
    output_config: { format: zodOutputFormat(CheckerLabels) },
  };
}

export type Disagreement = { lessonId: string; turn: number; teacher: string; generator: Move; checker: Move };
export type SpotCheck = { lessonId: string; turn: number; teacher: string; label: Move };

/** Compares the two passes. A lesson is "agreed" only when every one of its turns matches. */
export function compare(lessons: EvalLesson[], checked: CheckerResult) {
  const disagreements: Disagreement[] = [];
  const agreedTurns: SpotCheck[] = [];
  const agreedLessons: string[] = [];
  const missing: string[] = [];
  for (const l of lessons) {
    const moves = checked[l.id];
    if (!moves || moves.length !== l.turns.length) {
      missing.push(l.id);
      continue;
    }
    let all = true;
    for (const [i, t] of l.turns.entries()) {
      if (moves[i] === t.label) agreedTurns.push({ lessonId: l.id, turn: i + 1, teacher: t.teacher, label: t.label });
      else {
        all = false;
        disagreements.push({ lessonId: l.id, turn: i + 1, teacher: t.teacher, generator: t.label, checker: moves[i]! });
      }
    }
    if (all) agreedLessons.push(l.id);
  }
  return { disagreements, agreedTurns, agreedLessons, missing };
}

/** A fixed-seed shuffle, so re-running --collect picks the same 40 lines. */
export function pickSpotChecks(turns: SpotCheck[], n: number, seed = 42): SpotCheck[] {
  const a = [...turns];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2 ** 31;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a.slice(0, n);
}

export function renderReview(disagreements: Disagreement[], spots: SpotCheck[], totalTurns: number): string {
  const agreed = totalTurns - disagreements.length;
  const q = (s: string) => s.replace(/\s+/g, " ").trim();
  return `# Label review (E2) — for the operator

The 100 eval lessons were written and labelled by Opus 5.5. A second pass (Sonnet 5.5) labelled every teacher line
again **without seeing** the first label. They agree on **${agreed} of ${totalTurns}** lines (${((agreed / totalTurns) * 100).toFixed(1)}%).

**What to do (about 20–30 minutes):**
1. **Disagreements** — for each one, write after \`Pick:\` either \`A\` (first label), \`B\` (second label) or the
   right tag yourself. Tags: ${Move.options.join(", ")}.
2. **Spot checks** — 40 random lines where both agreed. Leave \`OK: yes\` if the label is right; otherwise write
   \`OK: no <right tag>\`. The share of "yes" is reported as the answer key's quality.
3. Save the file and tell me "labels done". I apply your picks with \`evals/label-check.ts --apply\`.

Short guide: ${q(MOVE_MEANINGS.replace("Move meanings: ", ""))}

## Disagreements (${disagreements.length})

${disagreements
  .map(
    (d, i) => `### D${String(i + 1).padStart(3, "0")} · ${d.lessonId} · turn ${d.turn}
> ${q(d.teacher)}

A: \`${d.generator}\` · B: \`${d.checker}\`
Pick:
`,
  )
  .join("\n")}
## Spot checks (${spots.length})

${spots
  .map(
    (s, i) => `### S${String(i + 1).padStart(2, "0")} · ${s.lessonId} · turn ${s.turn}
> ${q(s.teacher)}

Label: \`${s.label}\`
OK: yes
`,
  )
  .join("\n")}`;
}

export type Pick = { lessonId: string; turn: number; move: Move | null };

/**
 * Reads the operator's answers. Disagreements: "Pick: A|B|<tag>" (blank = not decided yet → move null).
 * Spot checks: "OK: yes" keeps the label, "OK: no <tag>" changes it.
 */
export function parseReview(md: string) {
  const picks: Pick[] = [];
  const spots: { lessonId: string; turn: number; ok: boolean; move: Move | null }[] = [];
  for (const block of md.split(/^### /m).slice(1)) {
    const head = /^(D|S)\d+ · (\S+) · turn (\d+)/.exec(block);
    if (!head) continue;
    const [, kind, lessonId, turnText] = head;
    const turn = Number(turnText);
    if (kind === "D") {
      const a = /A: `(\w+)`/.exec(block)?.[1];
      const b = /B: `(\w+)`/.exec(block)?.[1];
      const pick = /^Pick:[ \t]*`?(\w*)`?/m.exec(block)?.[1]?.trim() ?? "";
      const raw = pick.toUpperCase() === "A" ? a : pick.toUpperCase() === "B" ? b : pick;
      const parsed = Move.safeParse(raw);
      picks.push({ lessonId: lessonId!, turn, move: parsed.success ? parsed.data : null });
    } else {
      const ok = /^OK:[ \t]*(yes|no)\b[ \t]*`?(\w*)`?/im.exec(block);
      const parsed = Move.safeParse(ok?.[2]);
      spots.push({
        lessonId: lessonId!,
        turn,
        ok: ok?.[1]?.toLowerCase() !== "no",
        move: parsed.success ? parsed.data : null,
      });
    }
  }
  return { picks, spots };
}

/**
 * Applies the picks to the lessons. A lesson becomes reviewed when the checker agreed on every turn, or when every
 * disagreement in it has a pick. A lesson with any hand-set label gets labelSource "human".
 */
export function applyReview(
  lessons: EvalLesson[],
  checked: CheckerResult,
  review: ReturnType<typeof parseReview>,
): EvalLesson[] {
  const { disagreements, missing } = compare(lessons, checked);
  return lessons.map((l) => {
    const turns = l.turns.map((t) => ({ ...t }));
    const open = disagreements.filter((d) => d.lessonId === l.id);
    let human = false;
    let undecided = missing.includes(l.id);
    for (const d of open) {
      const pick = review.picks.find((p) => p.lessonId === l.id && p.turn === d.turn);
      if (!pick?.move) undecided = true;
      else {
        turns[d.turn - 1]!.label = pick.move;
        human = true;
      }
    }
    for (const s of review.spots.filter((x) => x.lessonId === l.id && !x.ok && x.move)) {
      turns[s.turn - 1]!.label = s.move!;
      human = true;
    }
    return EvalLesson.parse({
      ...l,
      turns,
      reviewed: !undecided,
      labelSource: human ? "human" : undecided ? "generator" : "agreed",
    });
  });
}

function loadLessons(): EvalLesson[] {
  return readdirSync(LESSONS)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => EvalLesson.parse(JSON.parse(readFileSync(`${LESSONS}/${f}`, "utf8"))));
}

function saveLessons(lessons: EvalLesson[]) {
  for (const l of lessons) writeFileSync(`${LESSONS}/${l.id}.json`, `${JSON.stringify(l, null, 2)}\n`);
}

async function main() {
  const args = process.argv.slice(2);
  const lessons = loadLessons();
  const model = checkEnv({ ...process.env, USE_MOCKS: "0" }).COACH_MODEL; // Sonnet 5.5 — not the generator's model
  const client = new Anthropic({ maxRetries: 2 });

  if (args.includes("--dry-run")) {
    console.log(`${lessons.length} lessons, ${lessons.reduce((n, l) => n + l.turns.length, 0)} turns, model ${model}`);
    console.log(userFor(lessons[0]!));
    return;
  }

  if (args.includes("--submit")) {
    if (existsSync(BATCH_FILE)) throw new Error(`${BATCH_FILE} exists — a batch was already sent. Use --collect.`);
    const batch = await client.messages.batches.create({
      requests: lessons.map((l) => ({ custom_id: l.id, params: params(l, model) })),
    });
    writeFileSync(
      BATCH_FILE,
      `${JSON.stringify({ id: batch.id, createdAt: batch.created_at, count: lessons.length, model }, null, 2)}\n`,
    );
    console.log(`✓ batch ${batch.id} sent (${lessons.length} lessons). Collect: evals/label-check.ts --collect`);
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
    const checked: CheckerResult = {};
    let inTokens = 0;
    let outTokens = 0;
    for await (const r of await client.messages.batches.results(id)) {
      if (r.result.type !== "succeeded") {
        console.log(`✗ ${r.custom_id}: ${r.result.type}`);
        continue;
      }
      const m = r.result.message;
      inTokens +=
        m.usage.input_tokens + (m.usage.cache_creation_input_tokens ?? 0) + (m.usage.cache_read_input_tokens ?? 0);
      outTokens += m.usage.output_tokens;
      const text = m.content.find((c) => c.type === "text");
      try {
        const parsed = CheckerLabels.safeParse(text && text.type === "text" ? JSON.parse(text.text) : null);
        if (parsed.success) checked[r.custom_id] = parsed.data.moves;
        else console.log(`✗ ${r.custom_id}: did not match the schema`);
      } catch {
        console.log(`✗ ${r.custom_id}: not JSON`);
      }
    }
    writeFileSync(CHECK_FILE, `${JSON.stringify(checked, null, 2)}\n`);
    const { disagreements, agreedTurns, agreedLessons, missing } = compare(lessons, checked);
    const totalTurns = lessons.reduce((n, l) => n + l.turns.length, 0);
    writeFileSync(REVIEW_FILE, renderReview(disagreements, pickSpotChecks(agreedTurns, SPOT_CHECKS), totalTurns));
    saveLessons(applyReview(lessons, checked, { picks: [], spots: [] }));
    // Batch = half of Sonnet 5.5's $2 / $10 per million tokens (cache reads counted at full input price: an upper bound).
    const cost = ((inTokens * 2 + outTokens * 10) / 1e6) * 0.5;
    console.log(
      `✓ ${Object.keys(checked).length}/${lessons.length} lessons checked · ${agreedTurns.length}/${totalTurns} lines agree · ` +
        `${agreedLessons.length} lessons fully agreed (reviewed) · ${disagreements.length} disagreements → ${REVIEW_FILE}` +
        `${missing.length ? ` · missing: ${missing.join(", ")}` : ""} · cost ≈ $${cost.toFixed(2)}`,
    );
    return;
  }

  if (args.includes("--apply")) {
    const checked = JSON.parse(readFileSync(CHECK_FILE, "utf8")) as CheckerResult;
    const review = parseReview(readFileSync(REVIEW_FILE, "utf8"));
    const updated = applyReview(lessons, checked, review);
    saveLessons(updated);
    const undecided = review.picks.filter((p) => !p.move).length;
    const yes = review.spots.filter((s) => s.ok).length;
    console.log(
      `✓ ${updated.filter((l) => l.reviewed).length}/${updated.length} lessons reviewed · ${undecided} disagreements still open · ` +
        `spot checks: ${yes}/${review.spots.length} agreed labels confirmed by hand`,
    );
    return;
  }

  console.log("Use --dry-run, --submit, --collect or --apply");
}

if (process.argv[1]?.endsWith("label-check.ts")) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
