/**
 * The line check (AGENTS.md 7.10): Claude writes the words, but the numbers must be the engine's.
 * A child line fails if it misses the number it must say, drifts to the right answer when the child
 * doesn't understand yet, or rambles past 30 words. Failing lines get one retry, then a backup line.
 */
import type { ChildState, Lang } from "@/lib/contracts";
import { type Operation, answerOf } from "./bugs";
import { type BackupKey, type Scenario, backupLine } from "./scenario";
import type { Speaker, Sum } from "./types";

export const MAX_WORDS = 30;

const DEVANAGARI_DIGITS = "०१२३४५६७८९";

/** "३५" → "35", so a Hindi line that writes Devanagari digits is checked like any other. */
export function normaliseDigits(text: string): string {
  return text.replace(/[०-९]/g, (d) => String(DEVANAGARI_DIGITS.indexOf(d)));
}

/** Every whole number in the line: "35, Teacher! 125?" → [35, 125] (so 25 is not found inside 125). */
export function numbersIn(text: string): number[] {
  return (normaliseDigits(text).match(/\d+/g) ?? []).map(Number);
}

export type LineVerdict =
  { ok: true } | { ok: false; reason: "missing_number" | "says_correct" | "foreign_number" | "too_long" | "empty" };

/**
 * `allowedNumbers` (optional): the only numbers the line may contain besides `mustSay`. A line with no number to say
 * may only repeat numbers from the teacher's words or the current sum; a parrot only the told answer and the sum —
 * so a child never says a number that doesn't belong to the question just asked.
 * `op` is the lesson's operation: the right answer the line must not drift to is a + b, a − b, a × b or a ÷ b.
 * `extraCorrect` (optional, default 0): how many more times the right answer may appear without counting as a
 * drift — the engine's own explain steps can pass through it (counting on 5 + 3 as "5, 6, 7, 8, 9" says 8).
 */
export function checkLine(
  text: string,
  mustSay: number | null,
  [a, b]: Sum,
  child: ChildState,
  allowedNumbers?: number[],
  op: Operation = "sub",
  extraCorrect = 0,
): LineVerdict {
  const correct = answerOf(op, a, b);
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { ok: false, reason: "empty" };
  if (words.length > MAX_WORDS) return { ok: false, reason: "too_long" };
  const nums = numbersIn(text);
  if (mustSay !== null && !nums.includes(mustSay)) return { ok: false, reason: "missing_number" };
  if (allowedNumbers && nums.some((n) => n !== mustSay && !allowedNumbers.includes(n))) {
    return { ok: false, reason: "foreign_number" };
  }
  // A child who doesn't understand yet must not "accidentally" say the right answer — unless told to repeat it.
  // When the answer equals one of the sum's own numbers (70 − 35 = 35, 1 × 4 = 4, 12 ÷ 1 = 12), one such number is
  // fine if the line restates the sum (it names the other number too).
  const restates = (correct === b && nums.includes(a)) || (correct === a && nums.includes(b)) ? 1 : 0;
  const allowed = restates + extraCorrect;
  const saysCorrect = nums.filter((n) => n === correct).length > allowed;
  if (child.state !== "GOT_IT" && mustSay !== correct && saysCorrect) return { ok: false, reason: "says_correct" };
  return { ok: true };
}

/** The fixed line for a speaker whose generated line failed twice. Always passes the check. */
export function fillBackup(s: Scenario, lang: Lang, speaker: Speaker, child: ChildState): string {
  const byMode: Partial<Record<Speaker["mode"], BackupKey>> = {
    react: "react",
    puzzled: "puzzled",
    cannot: "cannot",
    not_today: "notToday",
  };
  const key: BackupKey = byMode[speaker.mode] ?? child.state;
  return backupLine(s, lang, key, speaker.mustSay ?? undefined);
}

/**
 * The retry's firm reminder: "Ravi's line MUST contain 35 as digits. Do NOT say 25."
 * `extraCorrect` > 0 means the child's own steps pass through the right answer (see checkLine), so it may be said
 * there — only not as the answer.
 */
export function strictReminder(
  name: string,
  mustSay: number | null,
  correct: number,
  child: ChildState,
  extraCorrect = 0,
): string {
  const must =
    mustSay === null ? `${name}'s line must contain no numbers.` : `${name}'s line MUST contain ${mustSay} as digits.`;
  const avoid =
    child.state !== "GOT_IT" && mustSay !== correct
      ? extraCorrect > 0
        ? ` Say ${correct} only inside the steps, never as the answer.`
        : ` Do NOT say ${correct}.`
      : "";
  return `${must}${avoid} At most 20 words.`;
}
