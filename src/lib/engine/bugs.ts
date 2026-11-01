/**
 * The children's mistakes. Every number a child says comes from these functions — never from Claude.
 * (AGENTS.md 7.2.) Each mistake also lists its steps, so a child's explanation always matches its answer.
 * A lesson file names its operation (add, sub, mul or div; a file that says nothing means take-away, like the first
 * module and every lesson stored before 1 Nov), and each mistake belongs to exactly one operation.
 */

export const OPERATIONS = ["add", "sub", "mul", "div"] as const;
/** The kinds of sum a lesson can play. Where it is missing (older stored lessons, older call sites) it means "sub". */
export type Operation = (typeof OPERATIONS)[number];
/** The two numbers of a task, [a, b], for any operation: 52 − 27, 27 + 35, 23 × 4, 12 ÷ 3. The name is historical. */
export type Sum = [number, number];
type BugFn = (a: number, b: number) => number;

/** The sign a task is written with — "43-18", "27+35", "23x4", "12/3" — by the lesson files and the Director alike. */
export const OP_SIGN: Record<Operation, string> = { sub: "-", add: "+", mul: "x", div: "/" };

const split = (n: number) => [Math.floor(n / 10), n % 10] as const;

/** The right answer. Division is exact: parseTask and the lesson loader only let exact sums through. */
export function answerOf(op: Operation, a: number, b: number): number {
  switch (op) {
    case "add":
      return a + b;
    case "sub":
      return a - b;
    case "mul":
      return a * b;
    case "div":
      return a / b;
  }
}

/** "43-18", "27+35", "23x4", "12/3" — the one way the engine and the prompts write a task. */
export function formatTask(op: Operation, [a, b]: Sum): string {
  return `${a}${OP_SIGN[op]}${b}`;
}

/**
 * Which operation a written sign asks for: - − – → sub; + → add; x X × * → mul; / ÷ → div.
 * ':' means sharing only inside a sharing lesson (`op === "div"`): anywhere else it is no sign at all (a time like
 * "10:30" must not become a task), exactly as before the modules existed.
 */
export function operationOf(sign: string, op: Operation = "sub"): Operation | null {
  if (sign.length !== 1) return null;
  if ("-−–".includes(sign)) return "sub";
  if (sign === "+") return "add";
  if ("xX×*".includes(sign)) return "mul";
  if ("/÷".includes(sign)) return "div";
  if (sign === ":") return op === "div" ? "div" : null;
  return null;
}

/* ----------------------------------------------------------------------------
 * Take-away (sub)
 * ------------------------------------------------------------------------- */

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

/* ----------------------------------------------------------------------------
 * Adding (add)
 * ------------------------------------------------------------------------- */

/** Ravi in add_to_9: counts on from the first number but counts that number too, so he is 1 too high. 5 + 3 → 9. */
export const countOnOffByOne: BugFn = (a, b) => a + b + 1;

/**
 * Ravi in add_2digit_carry: adds the ones, writes only the last digit and drops the carry. 27 + 35 → 52.
 * Two one-digit numbers have no tens column to carry into, so he simply adds them (5 + 7 → 12, not 2).
 */
export const forgetCarry: BugFn = (a, b) => {
  if (a < 10 && b < 10) return a + b;
  const [ta, oa] = split(a);
  const [tb, ob] = split(b);
  return (ta + tb) * 10 + ((oa + ob) % 10);
};

/* ----------------------------------------------------------------------------
 * Times (mul)
 * ------------------------------------------------------------------------- */

/** Ravi in mul_groups: treats × like +. 3 × 4 → 7. */
export const addInstead: BugFn = (a, b) => a + b;

/**
 * Ravi in mul_2x1_carry: multiplies the ones, writes only the last digit and drops the carry. 23 × 4 → 82.
 * A one-digit first factor has no tens column to carry into, so he gets it right (3 × 4 → 12, not 2).
 */
export const forgetCarryMul: BugFn = (a, b) => {
  if (a < 10) return a * b;
  const [ta, oa] = split(a);
  return ta * b * 10 + ((oa * b) % 10);
};

/* ----------------------------------------------------------------------------
 * Sharing (div)
 * ------------------------------------------------------------------------- */

/** Ravi in div_sharing: takes away instead of sharing. 12 ÷ 3 → 9. */
export const subtractInstead: BugFn = (a, b) => a - b;

/* ----------------------------------------------------------------------------
 * Steps: what a child says when asked HOW. Claude turns them into a 7-year-old's words.
 * ------------------------------------------------------------------------- */

/** "0 - 0 = 0" says nothing — a step is dropped when both its numbers are 0 (one-digit sums like 7 − 3). */
const steps = (...xs: (string | null)[]) => xs.filter((x): x is string => x !== null);
const tensStep = (x: number, y: number, r: number) => (x === 0 && y === 0 ? null : `${x} - ${y} = ${r}`);
/** The same rule for an adding column ("0 + 0" is dropped). */
const addColumn = (x: number, y: number, r: number) => (x === 0 && y === 0 ? null : `${x} + ${y} = ${r}`);
/** b repeated n times: "4 + 4 + 4". */
const repeated = (b: number, n: number) => Array.from({ length: n }, () => b).join(" + ");

function correctSubSteps(a: number, b: number): string[] {
  const [ta, oa] = split(a);
  const [tb, ob] = split(b);
  if (oa < ob) return steps(`${oa + 10} - ${ob} = ${oa + 10 - ob}`, tensStep(ta - 1, tb, ta - 1 - tb), `so ${a - b}`);
  return steps(`${oa} - ${ob} = ${oa - ob}`, tensStep(ta, tb, ta - tb), `so ${a - b}`);
}

/** Counting on for one-digit sums ("5, then 6, 7, 8"); columns, with the carry, for bigger ones. */
function correctAddSteps(a: number, b: number): string[] {
  if (a < 10 && b < 10) {
    const counted = Array.from({ length: b }, (_, i) => a + i + 1).join(", ");
    return [b === 0 ? `${a} and 0 more is ${a}` : `${a}, then ${counted}`, `so ${a + b}`];
  }
  const [ta, oa] = split(a);
  const [tb, ob] = split(b);
  const ones = oa + ob;
  if (ones >= 10) {
    return [
      `${oa} + ${ob} = ${ones}, write ${ones % 10}, carry 1`,
      `${ta} + ${tb} + 1 = ${ta + tb + 1}`,
      `so ${a + b}`,
    ];
  }
  return steps(`${oa} + ${ob} = ${ones}`, addColumn(ta, tb, ta + tb), `so ${a + b}`);
}

/** Groups for one-digit times ("4 + 4 + 4 = 12"); columns, with the carry, for a 2-digit number times a 1-digit one. */
function correctMulSteps(a: number, b: number): string[] {
  if (a < 10) {
    if (a <= 1) return [`${a} group of ${b} is ${a * b}`, `so ${a * b}`];
    return [`${repeated(b, a)} = ${a * b}`, `so ${a * b}`];
  }
  if (b >= 10) return [`${a} × ${b} = ${a * b}`, `so ${a * b}`]; // never a lesson sum; keep it short and true
  const [ta, oa] = split(a);
  const ones = oa * b;
  const carry = Math.floor(ones / 10);
  if (carry > 0) {
    return [
      `${oa} × ${b} = ${ones}, write ${ones % 10}, carry ${carry}`,
      `${ta} × ${b} = ${ta * b}, plus ${carry} is ${ta * b + carry}`,
      `so ${a * b}`,
    ];
  }
  return [`${oa} × ${b} = ${ones}`, `${ta} × ${b} = ${ta * b}`, `so ${a * b}`];
}

/** Sharing as repeated adding: "3 + 3 + 3 + 3 = 12, that is 4 times". */
function correctDivSteps(a: number, b: number): string[] {
  const q = a / b;
  if (!Number.isInteger(q) || q < 2) return [`${a} shared among ${b} is ${q} each`, `so ${q}`];
  return [`${repeated(b, q)} = ${a}, that is ${q} times`, `so ${q}`];
}

/** What a child with no mistake (or one who now understands) explains, for each operation. */
export function correctSteps(op: Operation, a: number, b: number): string[] {
  switch (op) {
    case "sub":
      return correctSubSteps(a, b);
    case "add":
      return correctAddSteps(a, b);
    case "mul":
      return correctMulSteps(a, b);
    case "div":
      return correctDivSteps(a, b);
  }
}

/* ----------------------------------------------------------------------------
 * The catalogue
 * ------------------------------------------------------------------------- */

type BugDef = {
  /** The operation this mistake belongs to: a lesson file may only give it to a child in a module of that operation. */
  op: Operation;
  fn: BugFn;
  /** The child's own (wrong) steps, ending with "so <answer>" — always the same number `fn` gives. */
  steps: (a: number, b: number) => string[];
  /** For a mistake that only shows on some tasks: what a lesson sum must look like (the loader's message). */
  needs?: { test: (a: number, b: number) => boolean; rule: string };
};

/** Every mistake the engine knows, by the name lesson files use, with the operation it belongs to. */
export const BUG_CATALOGUE: Record<string, BugDef> = {
  smallerFromLarger: {
    op: "sub",
    fn: smallerFromLarger,
    steps: (a, b) => {
      const [ta, oa] = split(a);
      const [tb, ob] = split(b);
      const ones = `${Math.max(oa, ob)} - ${Math.min(oa, ob)} = ${Math.abs(oa - ob)}`;
      const tens = tensStep(Math.max(ta, tb), Math.min(ta, tb), Math.abs(ta - tb));
      return steps(ones, tens, `so ${smallerFromLarger(a, b)}`);
    },
  },
  borrowNoDecrement: {
    op: "sub",
    fn: borrowNoDecrement,
    steps: (a, b) => {
      const [ta, oa] = split(a);
      const [tb, ob] = split(b);
      const ones = oa < ob ? `${oa + 10} - ${ob} = ${oa + 10 - ob}` : `${oa} - ${ob} = ${oa - ob}`;
      return steps(ones, tensStep(ta, tb, ta - tb), `so ${borrowNoDecrement(a, b)}`);
    },
  },
  countBackOffByOne: {
    op: "sub",
    fn: countBackOffByOne,
    steps: (a, b) => {
      const end = countBackOffByOne(a, b);
      return [`count back ${b} from ${a}`, `${a} is 1, ${a - 1} is 2, … ${end} is ${b}`, `so ${end}`];
    },
  },
  countOnOffByOne: {
    op: "add",
    fn: countOnOffByOne,
    // 5 + 3 → "5, 6, 7, 8, 9": he counts the 5 as the first of the 3.
    steps: (a, b) => {
      const end = countOnOffByOne(a, b);
      const counted =
        b <= 9 ? Array.from({ length: b + 2 }, (_, i) => a + i).join(", ") : `${a}, ${a + 1}, ${a + 2}, … ${end}`;
      return [counted, `so ${end}`];
    },
  },
  forgetCarry: {
    op: "add",
    fn: forgetCarry,
    steps: (a, b) => {
      if (a < 10 && b < 10) return correctAddSteps(a, b); // nothing to carry: his answer is the right one
      const [ta, oa] = split(a);
      const [tb, ob] = split(b);
      const ones = oa + ob;
      const onesStep = ones >= 10 ? `${oa} + ${ob} = ${ones}, so ${ones % 10}` : `${oa} + ${ob} = ${ones}`;
      return steps(onesStep, addColumn(ta, tb, ta + tb), `so ${forgetCarry(a, b)}`);
    },
    needs: {
      test: (a, b) => (a % 10) + (b % 10) >= 10,
      rule: "must carry (its ones add up to 10 or more), or forgetCarry can't show",
    },
  },
  addInstead: {
    op: "mul",
    fn: addInstead,
    steps: (a, b) => [`${a} and ${b} make ${a + b}`, `so ${a + b}`],
  },
  forgetCarryMul: {
    op: "mul",
    fn: forgetCarryMul,
    steps: (a, b) => {
      if (a < 10) return correctMulSteps(a, b); // nothing to carry: his answer is the right one
      const [ta, oa] = split(a);
      const ones = oa * b;
      const onesStep = ones >= 10 ? `${oa} × ${b} = ${ones}, so ${ones % 10}` : `${oa} × ${b} = ${ones}`;
      return steps(onesStep, `${ta} × ${b} = ${ta * b}`, `so ${forgetCarryMul(a, b)}`);
    },
    needs: {
      test: (a, b) => a >= 10 && b < 10 && (a % 10) * b >= 10,
      rule: "must be a 2-digit number times a 1-digit number with a carry (ones product 10 or more), or forgetCarryMul can't show",
    },
  },
  subtractInstead: {
    op: "div",
    fn: subtractInstead,
    steps: (a, b) => [`${a} take away ${b} is ${a - b}`, `so ${a - b}`],
  },
};

/** The take-away mistakes of the first module as plain functions (tools and tests iterate this list). */
export const BUGS: Record<string, BugFn> = { smallerFromLarger, borrowNoDecrement, countBackOffByOne };

function bugDef(name: string): BugDef {
  if (!Object.hasOwn(BUG_CATALOGUE, name)) throw new Error(`Unknown bug "${name}" — add it to src/lib/engine/bugs.ts`);
  return BUG_CATALOGUE[name]!;
}

/** Is this a mistake the engine knows — and, when `op` is given, one that belongs to that operation? */
export function isBug(name: string, op?: Operation): boolean {
  return Object.hasOwn(BUG_CATALOGUE, name) && (op === undefined || BUG_CATALOGUE[name]!.op === op);
}

/** The operation a mistake belongs to. */
export function bugOperation(name: string): Operation {
  return bugDef(name).op;
}

/**
 * The child's answer: its mistake, or the right answer for a child with no mistake (bug = null).
 * `op` is the lesson's operation; a named mistake carries its own (the loader only pairs the two correctly).
 */
export function answerWith(bug: string | null, a: number, b: number, op: Operation = "sub"): number {
  if (bug === null) return answerOf(op, a, b);
  return bugDef(bug).fn(a, b);
}

/**
 * The steps behind a child's answer, in plain symbols. Claude turns them into a 7-year-old's words.
 *   explainSteps("smallerFromLarger", 43, 18) → ["8 - 3 = 5", "4 - 1 = 3", "so 35"]
 *   explainSteps(null, 43, 18)                → ["13 - 8 = 5", "3 - 1 = 2", "so 25"]
 *   explainSteps("forgetCarry", 27, 35, "add") → ["7 + 5 = 12, so 2", "2 + 3 = 5", "so 52"]
 */
export function explainSteps(bug: string | null, a: number, b: number, op: Operation = "sub"): string[] {
  if (bug === null) return correctSteps(op, a, b);
  return bugDef(bug).steps(a, b);
}

/** Why a lesson sum would hide this mistake (the loader's message), or null when the mistake shows on it. */
export function hidesMistake(bug: string, [a, b]: Sum): string | null {
  const def = bugDef(bug);
  if (def.needs && !def.needs.test(a, b)) return def.needs.rule;
  return def.fn(a, b) === answerOf(def.op, a, b)
    ? `gives the right answer even with ${bug}, so the mistake can't show`
    : null;
}

/* ----------------------------------------------------------------------------
 * Reading sums and tasks
 * ------------------------------------------------------------------------- */

/** The signs a lesson file may write for each operation: the canonical one plus look-alikes. Numbers up to 99. */
const SUM_RE: Record<Operation, RegExp> = {
  sub: /^(\d{1,2})\s*[-−–]\s*(\d{1,2})$/,
  add: /^(\d{1,2})\s*\+\s*(\d{1,2})$/,
  mul: /^(\d{1,2})\s*[xX×*]\s*(\d{1,2})$/,
  div: /^(\d{1,2})\s*[/÷:]\s*(\d{1,2})$/,
};

/**
 * Reads a lesson sum: "43-18", "43 − 18" (sub: two 2-digit numbers, the first bigger), "27+35" or "5+3" (add),
 * "23x4" (mul), "12/3" (div: shares out exactly). Otherwise null. The Director writes spoken numbers as digits first.
 */
export function parseSum(text: string, op: Operation = "sub"): Sum | null {
  const m = SUM_RE[op].exec(text.trim());
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  switch (op) {
    case "sub":
      return a > b && a >= 10 && b >= 10 ? [a, b] : null;
    case "add":
    case "mul":
      return [a, b];
    case "div":
      return b > 0 && a % b === 0 ? [a, b] : null;
  }
}

/**
 * What the teacher asked, from the Director's `newTask` (AGENTS.md 7.2, changed 28 Oct after a live test), read
 * against the lesson's operation:
 *   "10-5" (sub), "27+35" (add), "23x4" (mul), "12/3" (div) → a sum the engine can play (each child's mistake runs on it)
 *   "1-2" in sub, "12/5" or "12/0" in div → impossible: can't be done (one child is puzzled, no number)
 *   another operation's sign, "125-30", "99x99" → unsupported: not today's skill (one child says so, no number)
 *   "", "43", "ten minus five" → none: no new task (also for a Director slip)
 */
export type Task =
  { kind: "none" } | { kind: "sum"; sum: Sum } | { kind: "impossible"; a: number; b: number } | { kind: "unsupported" };

/**
 * The numbers a step of this task can use, so "13 take away 8" while working on 43 − 18 is a step of it, not a new
 * sum — the engine decides, not Claude. Sub: the digits and the ones after borrowing (43 − 18 → 3, 8, 13, 4, 1).
 * Add and mul: the columns and the carry, but only when there are columns (a 2-digit number). Div: nothing.
 */
export function stepNumbers([a, b]: Sum, op: Operation = "sub"): Set<number> {
  const [ta, oa] = split(a);
  const [tb, ob] = split(b);
  switch (op) {
    case "sub":
      return new Set([oa, ob, oa + 10, ta, tb, ta - 1]);
    case "add":
      return a < 10 && b < 10 ? new Set() : new Set([oa, ob, oa + ob, ta, tb, ta + tb, 1]);
    case "mul":
      return a < 10 ? new Set() : new Set([oa, ta, b, oa * b, ta * b, Math.floor((oa * b) / 10)]);
    case "div":
      return new Set();
  }
}

/** Two numbers joined by any sign the engine knows. */
const TASK_RE = /^(\d+)\s*([-−–+xX×*/÷:])\s*(\d+)$/;

export function parseTask(newTask: string, current?: Sum, op: Operation = "sub"): Task {
  const t = newTask.trim();
  if (!t) return { kind: "none" };
  // Two numbers joined by a sign. Anything else (a single number, words the Director didn't convert) is no task:
  // a Director slip must never turn an ordinary turn into "today we do take-away".
  const m = TASK_RE.exec(t);
  if (!m) return { kind: "none" };
  const asked = operationOf(m[2]!, op);
  if (asked === null) return { kind: "none" }; // ':' outside a sharing lesson is no sign (a time, a ratio)
  let a = Number(m[1]);
  let b = Number(m[3]);
  // Times is the same either way round, and the mistakes expect the 2-digit factor first: "4 × 23" plays as 23 × 4.
  if (asked === "mul" && a < 10 && b >= 10) [a, b] = [b, a];
  if (current) {
    const sameNumbers = (a === current[0] && b === current[1]) || (a === current[1] && b === current[0]);
    // The current task's own numbers with another sign ("3 + 4" while on 3 × 4, "12 - 3" while on 12 ÷ 3) is the
    // teacher restating or working a step of it, not a new skill — nothing changes.
    if (asked !== op && sameNumbers) return { kind: "none" };
    if (asked === op && !(a === current[0] && b === current[1])) {
      const step = stepNumbers(current, op);
      if (step.has(a) && step.has(b)) return { kind: "none" }; // a step of the current sum
    }
  }
  // Another operation's sign or 3-digit numbers: not today's skill.
  if (asked !== op || a > 99 || b > 99) return { kind: "unsupported" };
  if (op === "sub" && b > a) return { kind: "impossible", a, b }; // take a bigger number from a smaller one
  // Sharing: by nothing, fewer than the sharers (0 ÷ 5 included — Ravi's take-away would say −5), or not equal.
  if (op === "div" && (b === 0 || a < b || a % b !== 0)) return { kind: "impossible", a, b };
  if (answerOf(op, a, b) >= 1000) return { kind: "unsupported" }; // a 4-digit answer is not for this classroom
  return { kind: "sum", sum: [a, b] };
}

/** What a sum in a lesson file must look like, per operation (the loader's message when one doesn't). */
export const LESSON_SUM_RULE: Record<Operation, string> = {
  sub: "must be a 2-digit sum that needs borrowing",
  add: "must be an adding sum like 27+35 (numbers up to 99)",
  mul: "must be a times sum like 23x4 (numbers up to 99, answer under 1000)",
  div: "must be a sharing sum like 12/3 that shares out exactly",
};

/** A sum this lesson can use. Sub: it must need borrowing (ones digit of a smaller than b's), or the mistakes can't show. */
export function parseLessonSum(text: string, op: Operation = "sub"): Sum | null {
  const sum = parseSum(text, op);
  if (!sum) return null;
  if (op === "sub") return sum[0] % 10 < sum[1] % 10 ? sum : null;
  return answerOf(op, sum[0], sum[1]) < 1000 ? sum : null;
}
