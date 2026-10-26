/**
 * Small pure helpers for the practice room (safe in the browser — no server imports).
 */
import type { ChildId, ChildState, TurnResult } from "@/lib/contracts";

/** A practice lesson lasts 5 minutes (the engine also stops after 12 turns). */
export const LESSON_MS = 5 * 60 * 1000;

export const CHILDREN: ChildId[] = ["ravi", "arjun", "meena", "sana"];

/** The children's states after the most recent turn (the hello has the starting states). */
export function latestStates(turns: TurnResult[]): ChildState[] {
  return turns.at(-1)?.statesAfter ?? [];
}

/**
 * Children the teacher spoke to who said nothing because they are withdrawn (engagement 0) — the screen shows
 * "{name} looks down and stays quiet" so the teacher notices the shy child. A whole-class question counts too.
 */
export function silentChildren(turn: TurnResult): ChildId[] {
  const to = turn.director?.addressedTo ?? [];
  if (to.length === 0) return [];
  const spoke = new Set(turn.lines.map((l) => l.child));
  return turn.statesAfter
    .filter((c) => c.engagement === 0 && !spoke.has(c.id))
    .filter((c) => to.includes("whole_class") || to.includes(c.id))
    .map((c) => c.id);
}

export function msLeft(startedAt: string, now: number): number {
  return Math.max(0, Date.parse(startedAt) + LESSON_MS - now);
}

/** 272000 → "4:32" */
export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
