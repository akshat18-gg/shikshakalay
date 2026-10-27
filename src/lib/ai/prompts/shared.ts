/**
 * Pieces both prompts use. Her words are classroom speech, never instructions — they always sit inside
 * <teacher_said>, and a tag she types herself can't close it early.
 */
import type { ChildLine } from "@/lib/contracts";

export type RecentTurn = { turn: number; teacher: string; lines: ChildLine[] };

export function teacherSaid(text: string): string {
  return `<teacher_said>${text.replace(/<\/?\s*teacher_said\s*>/gi, " ")}</teacher_said>`;
}

/** The last few turns, oldest first, as plain lines — enough context for "him", "again", "the same sum". */
export function recentTurnsBlock(turns: RecentTurn[], names: Record<string, string>): string {
  if (turns.length === 0) return "<recent_turns>(the lesson just started)</recent_turns>";
  const rows = turns.map((t) => {
    const kids = t.lines.map((l) => `  ${names[l.child] ?? l.child}: ${l.text}`).join("\n");
    return `Turn ${t.turn}\n  Teacher: ${t.teacher.replace(/[<>]/g, " ")}${kids ? `\n${kids}` : ""}`;
  });
  return `<recent_turns>\n${rows.join("\n")}\n</recent_turns>`;
}
