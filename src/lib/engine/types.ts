/**
 * The engine's own types (AGENTS.md 7.8). EngineState is saved as JSON in sessions.state after every turn.
 */
import type { ChildId, ChildState, Lang, Move } from "@/lib/contracts";
import type { Sum } from "./bugs";

export type { Sum };

export type Parrot = { sum: Sum; answer: number };

export type EngineState = {
  scenarioId: string;
  scenarioVersion: number;
  lang: Lang;
  currentSum: Sum;
  children: ChildState[];
  /** A child told the answer repeats it — for this sum only. Cleared when the sum changes. */
  parrots: Partial<Record<ChildId, Parrot>>;
  /** Counted turns only (not "say again"). The lesson ends at 12. */
  turnCount: number;
  startedAt: string;
};

/** Which moves do what in this skill — from the lesson file's `moves:` block (AGENTS.md 7.1). */
export type MoveEffects = {
  reveal: Move[];
  fix: Move[];
  halfFix: Move[];
  weak: Move[];
  engagementUp: Move[];
  engagementDown: Move[];
};

/** The groups in AGENTS.md 7.3 — the same as sub_2digit.yaml. Tests and the default use these. */
export const DEFAULT_MOVE_EFFECTS: MoveEffects = {
  reveal: ["ask_to_explain", "compare_methods"],
  fix: ["concrete_materials", "targeted_question"],
  halfFix: ["think_aloud"],
  weak: ["tell_answer", "repeat_same_way", "move_on_or_scold"],
  engagementUp: ["invite_quiet_child", "specific_praise"],
  engagementDown: ["move_on_or_scold"],
};

/** How a child speaks this turn (AGENTS.md 7.5). */
export type SpeakMode = "answer" | "explain" | "parrot" | "react" | "puzzled";

/** One child who speaks this turn, and the exact number the line must contain (null = no number). */
export type Speaker = {
  child: ChildId;
  mode: SpeakMode;
  mustSay: number | null;
  /** Only in explain mode: the steps behind the child's belief, e.g. ["8 - 3 = 5", "4 - 1 = 3", "so 35"]. */
  steps?: string[];
};
