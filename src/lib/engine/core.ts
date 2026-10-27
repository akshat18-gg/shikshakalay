/**
 * One teacher turn, as a pure function (AGENTS.md 7.4–7.8): no database, no HTTP. Claude is reached only through
 * `deps`, so tests and the eval runner can play whole lessons with a fake Claude.
 *
 * Order: end command → too short ("say again") → Director → move → who speaks → children's lines → count → over?
 */
import type { ChildLine, ChildState, DirectorOutput } from "@/lib/contracts";
import type { LineRecord } from "./children";
import type { DirectorResult } from "./director";
import { applyMove } from "./mindState";
import { type Scenario, backupLine, moveEffects } from "./scenario";
import { mostEager, pickSpeakers } from "./speakers";
import type { AiTurnContext, EngineState, Speaker } from "./types";

export const MAX_TURNS = 12;
export const LESSON_MS = 5 * 60 * 1000;
export const MAX_TEACHER_CHARS = 1000;

const END_COMMANDS = new Set(["end", "end lesson", "खत्म", "समाप्त"]);

export type StepDeps = {
  tagMove: (ctx: AiTurnContext) => Promise<DirectorResult>;
  writeLines: (ctx: AiTurnContext, speakers: Speaker[]) => Promise<{ lines: ChildLine[]; records: LineRecord[] }>;
};

export type StepInput = Omit<AiTurnContext, "state" | "teacher"> & {
  scenario: Scenario;
  state: EngineState;
  teacherText: string;
  now: Date;
};

export type StepResult = {
  state: EngineState;
  teacherText: string;
  director: DirectorOutput | null;
  directorOk: boolean;
  lines: ChildLine[];
  records: LineRecord[];
  statesBefore: ChildState[];
  /** Counted toward the 12 turns (a "say again" is not). */
  counted: boolean;
  lessonOver: boolean;
};

const letters = (s: string) => (s.match(/\p{L}/gu) ?? []).length;

export function isEndCommand(text: string): boolean {
  return END_COMMANDS.has(
    text
      .trim()
      .toLowerCase()
      .replace(/[.!।]+$/u, ""),
  );
}

export function timeIsUp(state: EngineState, now: Date): boolean {
  return now.getTime() - Date.parse(state.startedAt) >= LESSON_MS;
}

export async function step(input: StepInput, deps: StepDeps): Promise<StepResult> {
  const { scenario, state, now } = input;
  const teacherText = input.teacherText.trim().slice(0, MAX_TEACHER_CHARS);
  const statesBefore = state.children;
  const base = { teacherText, statesBefore, directorOk: true };

  if (isEndCommand(teacherText)) {
    return { ...base, state, director: null, lines: [], records: [], counted: false, lessonOver: true };
  }

  if (letters(teacherText) < 2) {
    const first = mostEager(state);
    const text = backupLine(scenario, state.lang, "repeat");
    const lines = first ? [{ child: first.id, text }] : [];
    const records: LineRecord[] = first
      ? [{ child: first.id, text, expectedAnswer: null, passed: true, retries: 0, usedBackup: true }]
      : [];
    return { ...base, state, director: null, lines, records, counted: false, lessonOver: timeIsUp(state, now) };
  }

  const ctx: AiTurnContext = { ...input, state, teacher: teacherText };
  const { director, ok } = await deps.tagMove(ctx);
  const effects = moveEffects(scenario);
  const moved = applyMove(state, director, effects);
  const speakers = pickSpeakers(moved, director, effects);
  const { lines, records } = await deps.writeLines({ ...ctx, state: moved }, speakers);

  const next: EngineState = { ...moved, turnCount: state.turnCount + 1 };
  const lessonOver = next.turnCount >= MAX_TURNS || timeIsUp(next, now);
  return { ...base, state: next, director, directorOk: ok, lines, records, counted: true, lessonOver };
}
