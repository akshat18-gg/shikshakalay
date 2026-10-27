/**
 * The line check (AGENTS.md 7.10): Claude writes the words, but the numbers must be the engine's.
 * A child line fails if it misses the number it must say, drifts to the right answer when the child
 * doesn't understand yet, or rambles past 30 words. Failing lines get one retry, then a backup line.
 */
import type { ChildState, Lang } from "@/lib/contracts";
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
 */
export function checkLine(
  text: string,
  mustSay: number | null,
  [a, b]: Sum,
  child: ChildState,
  allowedNumbers?: number[],
): LineVerdict {
  const correct = a - b;
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { ok: false, reason: "empty" };
  if (words.length > MAX_WORDS) return { ok: false, reason: "too_long" };
  const nums = numbersIn(text);
  if (mustSay !== null && !nums.includes(mustSay)) return { ok: false, reason: "missing_number" };
  if (allowedNumbers && nums.some((n) => n !== mustSay && !allowedNumbers.includes(n))) {
    return { ok: false, reason: "foreign_number" };
  }
  // A child who doesn't understand yet must not "accidentally" say the right answer — unless told to repeat it.
  // When the answer equals the sum's second number (70 − 35 = 35), one 35 is fine if the line restates the sum.
  const allowed = correct === b && nums.includes(a) ? 1 : 0;
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

/** The retry's firm reminder: "Ravi's line MUST contain 35 as digits. Do NOT say 25." */
export function strictReminder(name: string, mustSay: number | null, correct: number, child: ChildState): string {
  const must =
    mustSay === null ? `${name}'s line must contain no numbers.` : `${name}'s line MUST contain ${mustSay} as digits.`;
  const avoid = child.state !== "GOT_IT" && mustSay !== correct ? ` Do NOT say ${correct}.` : "";
  return `${must}${avoid} At most 20 words.`;
}
