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

/** "0 - 0 = 0" says nothing — a step is dropped when both its numbers are 0 (one-digit sums like 7 − 3). */
const steps = (...xs: (string | null)[]) => xs.filter((x): x is string => x !== null);
const tensStep = (x: number, y: number, r: number) => (x === 0 && y === 0 ? null : `${x} - ${y} = ${r}`);

function correctSteps(a: number, b: number): string[] {
  const [ta, oa] = split(a);
  const [tb, ob] = split(b);
  if (oa < ob) return steps(`${oa + 10} - ${ob} = ${oa + 10 - ob}`, tensStep(ta - 1, tb, ta - 1 - tb), `so ${a - b}`);
  return steps(`${oa} - ${ob} = ${oa - ob}`, tensStep(ta, tb, ta - tb), `so ${a - b}`);
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
      const tens = tensStep(Math.max(ta, tb), Math.min(ta, tb), Math.abs(ta - tb));
      return steps(ones, tens, `so ${smallerFromLarger(a, b)}`);
    }
    case "borrowNoDecrement": {
      const ones = oa < ob ? `${oa + 10} - ${ob} = ${oa + 10 - ob}` : `${oa} - ${ob} = ${oa - ob}`;
      return steps(ones, tensStep(ta, tb, ta - tb), `so ${borrowNoDecrement(a, b)}`);
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

/**
 * What the teacher asked, from the Director's `newTask` (AGENTS.md 7.2, changed 28 Oct after a live test):
 *   "10-5"  → a sum the engine can play: any a − b with 0 ≤ b ≤ a ≤ 99 (each child's mistake is run on it)
 *   "1-2"   → impossible: take a bigger number from a smaller one (one child is puzzled, no number)
 *   "10+5", "4x3", "125-30" → unsupported: not today's skill (one child says so, no number)
 *   "", "43", "ten minus five" → none: no new task (also for a Director slip)
 */
export type Task =
  { kind: "none" } | { kind: "sum"; sum: Sum } | { kind: "impossible"; a: number; b: number } | { kind: "unsupported" };

/**
 * The numbers a step of this sum can use: its digits, and the ones after borrowing (43 − 18 → 3, 8, 13, 4, 1).
 * "13 take away 8" while working on 43 − 18 is a step of it, not a new sum — the engine decides, not Claude.
 */
export function stepNumbers([a, b]: Sum): Set<number> {
  const [ta, oa] = split(a);
  const [tb, ob] = split(b);
  return new Set([oa, ob, oa + 10, ta, tb, ta - 1]);
}

export function parseTask(newTask: string, current?: Sum): Task {
  const t = newTask.trim();
  if (!t) return { kind: "none" };
  // Two numbers joined by an operation. Anything else (a single number, words the Director didn't convert) is no task:
  // a Director slip must never turn an ordinary turn into "today we do take-away".
  const m = /^(\d+)\s*([-−–+x×*/÷])\s*(\d+)$/i.exec(t);
  if (!m) return { kind: "none" };
  const a = Number(m[1]);
  const b = Number(m[3]);
  const subtract = "-−–".includes(m[2]!);
  if (subtract && current && !(a === current[0] && b === current[1])) {
    const step = stepNumbers(current);
    if (step.has(a) && step.has(b)) return { kind: "none" }; // a step of the current sum
  }
  if (!subtract || a > 99 || b > 99) return { kind: "unsupported" };
  return b > a ? { kind: "impossible", a, b } : { kind: "sum", sum: [a, b] };
}

/** A sum this lesson can use: it must need borrowing (ones digit of a smaller than b's), or the mistakes can't show. */
export function parseLessonSum(text: string): Sum | null {
  const sum = parseSum(text);
  return sum && sum[0] % 10 < sum[1] % 10 ? sum : null;
}
