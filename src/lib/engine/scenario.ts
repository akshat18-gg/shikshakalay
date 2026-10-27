/**
 * Lesson files: content/scenarios/<id>.yaml (AGENTS.md 7.1). Checked strictly when loaded — both languages
 * complete, every mistake exists in bugs.ts, every sum needs borrowing — so a broken file fails loudly at the
 * first request instead of in the middle of a teacher's lesson. Loaded once, then kept in memory.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { ChildId, type ChildState, type Lang, Mind, Move, type ScenarioSummary } from "@/lib/contracts";
import { isBug, parseLessonSum } from "./bugs";
import type { EngineState, MoveEffects, Sum } from "./types";

const text = z.string().trim().min(1);
const Bilingual = z.object({ en: text, hi: text }).strict();

const withAnswer = text.refine((s) => s.includes("{answer}"), "must contain {answer}");
const noAnswer = text.refine((s) => !s.includes("{answer}"), "must not contain {answer}");
const BackupLines = z
  .object({
    STUCK: withAnswer,
    WOBBLY: withAnswer,
    GOT_IT: withAnswer,
    react: noAnswer,
    repeat: noAnswer,
    hello: noAnswer,
    puzzled: noAnswer,
  })
  .strict();

const Child = z
  .object({
    id: ChildId,
    name: Bilingual,
    gender: z.enum(["boy", "girl"]),
    bug: z
      .string()
      .nullable()
      .refine((b) => b === null || isBug(b), "is not a mistake in src/lib/engine/bugs.ts"),
    start: z.object({ state: Mind, engagement: z.number().int().min(0).max(3) }).strict(),
    persona: text,
    explainsAs: text,
    sampleLines: z.object({ en: z.array(text).min(1), hi: z.array(text).min(1) }).strict(),
  })
  .strict();

const moveList = z.array(Move);

export const Scenario = z
  .object({
    id: z.string().regex(/^[a-z0-9_]+$/),
    version: z.number().int().min(1),
    title: Bilingual,
    grade: z.number().int().min(1).max(5),
    languages: z.array(z.enum(["en", "hi"])).refine((l) => l.includes("en") && l.includes("hi"), "needs en and hi"),
    sums: z
      .array(z.string().refine((s) => parseLessonSum(s) !== null, "must be a 2-digit sum that needs borrowing"))
      .min(1),
    keyterms: z.array(text).max(50),
    children: z
      .array(Child)
      .min(1)
      .refine((c) => new Set(c.map((x) => x.id)).size === c.length, "child ids must be unique"),
    moves: z
      .object({
        reveal: moveList,
        fix: moveList,
        halfFix: moveList,
        weak: moveList,
        engagementUp: moveList,
        engagementDown: moveList,
      })
      .strict(),
    backupLines: z.object({ en: BackupLines, hi: BackupLines }).strict(),
  })
  .strict();

export type Scenario = z.infer<typeof Scenario>;
export type BackupKey = keyof Scenario["backupLines"]["en"];

export class ScenarioError extends Error {
  constructor(file: string, problems: string[]) {
    super(`${file} is not valid: ${problems.join("; ")}`);
    this.name = "ScenarioError";
  }
}

/** Checks one file's text. Errors name the exact place: "backupLines.hi.repeat: missing". */
export function parseScenario(yamlText: string, file = "scenario"): Scenario {
  let raw: unknown;
  try {
    raw = parseYaml(yamlText);
  } catch (err) {
    throw new ScenarioError(file, [`YAML: ${err instanceof Error ? err.message : String(err)}`]);
  }
  const r = Scenario.safeParse(raw);
  if (!r.success) {
    throw new ScenarioError(
      file,
      r.error.issues.map(
        (i) => `${i.path.join(".") || "(top)"}: ${i.code === "invalid_type" ? "missing or wrong type" : i.message}`,
      ),
    );
  }
  return r.data;
}

const DIR = () => path.join(process.cwd(), "content", "scenarios");
const cache = new Map<string, Scenario>();

/** The lesson file with this id, or null if there is none. Throws ScenarioError if the file is broken. */
export function loadScenario(id: string): Scenario | null {
  if (!/^[a-z0-9_]{1,40}$/.test(id)) return null;
  const hit = cache.get(id);
  if (hit) return hit;
  const file = `${id}.yaml`;
  let yamlText: string;
  try {
    yamlText = readFileSync(path.join(DIR(), file), "utf8");
  } catch {
    return null;
  }
  const scenario = parseScenario(yamlText, file);
  if (scenario.id !== id) throw new ScenarioError(file, [`id is "${scenario.id}" but the file is named ${file}`]);
  cache.set(id, scenario);
  return scenario;
}

export function listScenarios(): ScenarioSummary[] {
  return readdirSync(DIR())
    .filter((f) => f.endsWith(".yaml"))
    .sort()
    .map((f) => loadScenario(f.replace(/\.yaml$/, "")))
    .filter((s): s is Scenario => s !== null)
    .map((s) => ({ id: s.id, title: s.title, grade: s.grade, languages: s.languages }));
}

export function findScenario(id: string): ScenarioSummary | undefined {
  return listScenarios().find((s) => s.id === id);
}

export function moveEffects(s: Scenario): MoveEffects {
  return s.moves;
}

/** A fixed line from the file, with {answer} filled in by the engine. */
export function backupLine(s: Scenario, lang: Lang, key: BackupKey, answer?: number): string {
  return s.backupLines[lang][key].replace("{answer}", answer === undefined ? "" : String(answer));
}

/** The state a new lesson starts in: the first sum, every child as the file describes. */
export function startState(s: Scenario, lang: Lang, startedAt: string): EngineState {
  const children: ChildState[] = s.children.map((c) => ({
    id: c.id,
    bug: c.bug,
    state: c.start.state,
    revealed: false,
    engagement: c.start.engagement,
    workedSum: null,
  }));
  return {
    scenarioId: s.id,
    scenarioVersion: s.version,
    lang,
    currentSum: parseLessonSum(s.sums[0]) as Sum,
    children,
    parrots: {},
    turnCount: 0,
    startedAt,
  };
}
