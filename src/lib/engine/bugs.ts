/**
 * The children's mistakes. Every number a child says comes from these functions — never from Claude.
 * (AGENTS.md 7.2.) Each mistake also lists its steps, so a child's explanation always matches its answer.
 */

export type Sum = [number, number];
type BugFn = (a: number, b: number) => number;

const split = (n: number) => [Math.floor(n / 10), n % 10] as const;

/** Ravi: in each column takes the smaller digit from the bigger one. 52 − 27 → 35. */
export const smallerFromLarger: BugFn = (a, b) => {
  const [ta, oa] = split(a);
  const [tb, ob] = split(b);
  return Math.abs(ta - tb) * 10 + Math.abs(oa - ob);
};

/** Arjun: borrows a ten for the ones but forgets to take it from the tens. 52 − 27 → 35. */
export const borrowNoDecrement: BugFn = (a, b) => {
  const [ta, oa] = split(a);
  const [tb, ob] = split(b);
  const ones = oa < ob ? oa + 10 - ob : oa - ob;
  return (ta - tb) * 10 + ones;
};

/** Meena: counts back from the first number but counts that number too, so she is always 1 too high. 52 − 27 → 26. */
export const countBackOffByOne: BugFn = (a, b) => a - b + 1;

export const BUGS: Record<string, BugFn> = { smallerFromLarger, borrowNoDecrement, countBackOffByOne };

export function isBug(name: string): boolean {
  return Object.hasOwn(BUGS, name);
}

/** The child's answer: its mistake, or the right answer for a child with no mistake (bug = null). */
export function answerWith(bug: string | null, a: number, b: number): number {
  if (bug === null) return a - b;
  const fn = BUGS[bug];
  if (!fn) throw new Error(`Unknown bug "${bug}" — add it to src/lib/engine/bugs.ts`);
  return fn(a, b);
}

function correctSteps(a: number, b: number): string[] {
  const [ta, oa] = split(a);
  const [tb, ob] = split(b);
  if (oa < ob) return [`${oa + 10} - ${ob} = ${oa + 10 - ob}`, `${ta - 1} - ${tb} = ${ta - 1 - tb}`, `so ${a - b}`];
  return [`${oa} - ${ob} = ${oa - ob}`, `${ta} - ${tb} = ${ta - tb}`, `so ${a - b}`];
}

/**
 * The steps behind a child's answer, in plain symbols. Claude turns them into a 7-year-old's words.
 *   explainSteps("smallerFromLarger", 43, 18) → ["8 - 3 = 5", "4 - 1 = 3", "so 35"]
 *   explainSteps(null, 43, 18)                → ["13 - 8 = 5", "3 - 1 = 2", "so 25"]
 */
export function explainSteps(bug: string | null, a: number, b: number): string[] {
  const [ta, oa] = split(a);
  const [tb, ob] = split(b);
  switch (bug) {
    case null:
      return correctSteps(a, b);
    case "smallerFromLarger": {
      const ones = `${Math.max(oa, ob)} - ${Math.min(oa, ob)} = ${Math.abs(oa - ob)}`;
      const tens = `${Math.max(ta, tb)} - ${Math.min(ta, tb)} = ${Math.abs(ta - tb)}`;
      return [ones, tens, `so ${smallerFromLarger(a, b)}`];
    }
    case "borrowNoDecrement": {
      const ones = oa < ob ? `${oa + 10} - ${ob} = ${oa + 10 - ob}` : `${oa} - ${ob} = ${oa - ob}`;
      return [ones, `${ta} - ${tb} = ${ta - tb}`, `so ${borrowNoDecrement(a, b)}`];
    }
    case "countBackOffByOne": {
      const end = countBackOffByOne(a, b);
      return [`count back ${b} from ${a}`, `${a} is 1, ${a - 1} is 2, … ${end} is ${b}`, `so ${end}`];
    }
    default:
      throw new Error(`Unknown bug "${bug}" — add it to src/lib/engine/bugs.ts`);
  }
}

/**
 * Reads a sum like "43-18", "43 − 18" or "43 - 18": two 2-digit numbers, the first bigger. Otherwise null.
 * The Director writes spoken numbers as digits before this runs.
 */
export function parseSum(text: string): Sum | null {
  const m = /^(\d{2})\s*[-−–]\s*(\d{2})$/.exec(text.trim());
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  return a > b && a >= 10 && b >= 10 ? [a, b] : null;
}

/** A sum this lesson can use: it must need borrowing (ones digit of a smaller than b's), or the mistakes can't show. */
export function parseLessonSum(text: string): Sum | null {
  const sum = parseSum(text);
  return sum && sum[0] % 10 < sum[1] % 10 ? sum : null;
}
