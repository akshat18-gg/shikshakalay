/**
 * The five new mistakes for adding, multiplying and sharing (private/ops-spec.md), checked against answers worked out
 * by hand — not with the code. The engine still decides every number; these tests only need bugs.ts.
 */
import { describe, expect, it } from "vitest";
import {
  BUG_CATALOGUE,
  type Operation,
  type Sum,
  answerOf,
  answerWith,
  correctSteps,
  explainSteps,
  forgetCarry,
  forgetCarryMul,
  isBug,
  operationOf,
  parseTask,
  smallerFromLarger,
} from "@/lib/engine/bugs";

// [a, b, the child's wrong answer, the right answer]
type Worked = [number, number, number, number];

/** Ravi in add_to_9: counts the first number too (5 + 3 → "5, 6, 7, 8, 9"). */
const COUNT_ON_OFF_BY_ONE: Worked[] = [
  [5, 3, 9, 8],
  [4, 2, 7, 6],
  [6, 3, 10, 9],
  [2, 5, 8, 7],
  [3, 4, 8, 7],
  [7, 2, 10, 9],
];

/** Ravi in add_2digit_carry: adds the ones, writes the last digit, drops the carry. 27 + 35 → 52. */
const FORGET_CARRY: Worked[] = [
  [27, 35, 52, 62],
  [48, 17, 55, 65],
  [56, 29, 75, 85],
  [39, 44, 73, 83],
  [65, 28, 83, 93],
  [17, 76, 83, 93],
];

/** Ravi in mul_groups: treats × like +. 3 × 4 → 7. */
const ADD_INSTEAD: Worked[] = [
  [3, 4, 7, 12],
  [2, 5, 7, 10],
  [4, 3, 7, 12],
  [5, 2, 7, 10],
  [3, 3, 6, 9],
  [2, 4, 6, 8],
];

/** Ravi in mul_2x1_carry: multiplies the ones, writes the last digit, drops the carry. 23 × 4 → 82. */
const FORGET_CARRY_MUL: Worked[] = [
  [23, 4, 82, 92],
  [14, 6, 64, 84],
  [37, 2, 64, 74],
  [18, 5, 50, 90],
  [26, 3, 68, 78],
  [45, 2, 80, 90],
];

/** Ravi in div_sharing: takes away instead of sharing. 12 ÷ 3 → 9. */
const SUBTRACT_INSTEAD: Worked[] = [
  [12, 3, 9, 4],
  [10, 2, 8, 5],
  [15, 5, 10, 3],
  [8, 4, 4, 2],
  [18, 3, 15, 6],
  [20, 4, 16, 5],
];

const NEW_BUGS: { bug: string; op: Operation; worked: Worked[] }[] = [
  { bug: "countOnOffByOne", op: "add", worked: COUNT_ON_OFF_BY_ONE },
  { bug: "forgetCarry", op: "add", worked: FORGET_CARRY },
  { bug: "addInstead", op: "mul", worked: ADD_INSTEAD },
  { bug: "forgetCarryMul", op: "mul", worked: FORGET_CARRY_MUL },
  { bug: "subtractInstead", op: "div", worked: SUBTRACT_INSTEAD },
];

const ALL_BUGS = [
  "smallerFromLarger",
  "borrowNoDecrement",
  "countBackOffByOne",
  "countOnOffByOne",
  "forgetCarry",
  "addInstead",
  "forgetCarryMul",
  "subtractInstead",
];

describe("answerOf — the right answer for each operation", () => {
  it("adds, takes away, multiplies and shares exactly", () => {
    expect(answerOf("add", 27, 35)).toBe(62);
    expect(answerOf("add", 5, 3)).toBe(8);
    expect(answerOf("add", 48, 17)).toBe(65);
    expect(answerOf("sub", 52, 27)).toBe(25);
    expect(answerOf("sub", 43, 18)).toBe(25);
    expect(answerOf("sub", 7, 3)).toBe(4);
    expect(answerOf("mul", 3, 4)).toBe(12);
    expect(answerOf("mul", 23, 4)).toBe(92);
    expect(answerOf("mul", 14, 6)).toBe(84);
    expect(answerOf("div", 12, 3)).toBe(4);
    expect(answerOf("div", 20, 4)).toBe(5);
    expect(answerOf("div", 18, 3)).toBe(6);
  });

  it("answerWith(null, a, b, op) is the same as answerOf", () => {
    for (const { op, worked } of NEW_BUGS) {
      for (const [a, b, , right] of worked) {
        expect(answerWith(null, a, b, op)).toBe(right);
        expect(answerOf(op, a, b)).toBe(right);
      }
    }
    // The default operation is still take-away, so the existing lesson is untouched.
    expect(answerWith(null, 52, 27)).toBe(25);
    expect(answerWith(null, 52, 27, "sub")).toBe(25);
    expect(answerWith("smallerFromLarger", 52, 27, "sub")).toBe(smallerFromLarger(52, 27));
    expect(answerWith("smallerFromLarger", 52, 27, "sub")).toBe(35);
  });
});

describe.each(NEW_BUGS)("$bug ($op) on hand-worked tasks", ({ bug, op, worked }) => {
  it.each(worked)("%i, %i → the child says %i, the right answer is %i", (a, b, wrong, right) => {
    expect(answerWith(bug, a, b, op)).toBe(wrong);
    expect(answerOf(op, a, b)).toBe(right);
    expect(wrong).not.toBe(right); // the mistake is visible on every task of its module
  });

  it("explains its steps: non-empty, every step mentions a number, the last is 'so <answer>'", () => {
    for (const [a, b, wrong] of worked) {
      const steps = explainSteps(bug, a, b, op);
      expect(steps.length).toBeGreaterThan(0);
      for (const step of steps) {
        expect(typeof step).toBe("string");
        expect(step).toMatch(/\d/);
      }
      expect(steps.at(-1)).toBe(`so ${wrong}`);
    }
  });

  it("a child with no mistake explains the right steps for this operation", () => {
    for (const [a, b, , right] of worked) {
      const steps = explainSteps(null, a, b, op);
      expect(steps.length).toBeGreaterThan(0);
      for (const step of steps) expect(step).toMatch(/\d/);
      expect(steps.at(-1)).toBe(`so ${right}`);
    }
  });
});

describe("explainSteps — one example per mistake (private/ops-spec.md)", () => {
  it("ends with the child's own number", () => {
    expect(explainSteps("countOnOffByOne", 5, 3, "add").at(-1)).toBe("so 9");
    expect(explainSteps("forgetCarry", 27, 35, "add").at(-1)).toBe("so 52");
    expect(explainSteps("addInstead", 3, 4, "mul").at(-1)).toBe("so 7");
    expect(explainSteps("forgetCarryMul", 23, 4, "mul").at(-1)).toBe("so 82");
    expect(explainSteps("subtractInstead", 12, 3, "div").at(-1)).toBe("so 9");
  });

  it("the correct steps end with the correct answer for that operation", () => {
    expect(explainSteps(null, 27, 35, "add").at(-1)).toBe("so 62");
    expect(explainSteps(null, 5, 3, "add").at(-1)).toBe("so 8");
    expect(explainSteps(null, 3, 4, "mul").at(-1)).toBe("so 12");
    expect(explainSteps(null, 23, 4, "mul").at(-1)).toBe("so 92");
    expect(explainSteps(null, 12, 3, "div").at(-1)).toBe("so 4");
    // Default = take-away, exactly as today.
    expect(explainSteps(null, 43, 18)).toEqual(["13 - 8 = 5", "3 - 1 = 2", "so 25"]);
    expect(explainSteps("smallerFromLarger", 43, 18, "sub")).toEqual(["8 - 3 = 5", "4 - 1 = 3", "so 35"]);
  });
});

describe("the bug catalogue", () => {
  it("knows all 8 mistakes and still refuses unknown names", () => {
    for (const name of ALL_BUGS) expect(isBug(name)).toBe(true);
    expect(Object.keys(BUG_CATALOGUE).sort()).toEqual([...ALL_BUGS].sort());
    expect(isBug("guessRandomly")).toBe(false);
    expect(isBug("toString")).toBe(false);
    expect(() => answerWith("noSuchBug", 27, 35, "add")).toThrow(/Unknown bug/);
    expect(() => explainSteps("noSuchBug", 3, 4, "mul")).toThrow(/Unknown bug/);
  });
});

describe("parseTask per operation", () => {
  const current: Sum = [52, 27];

  it("reads a task whose sign matches the module's operation", () => {
    expect(parseTask("27+35", current, "add")).toEqual({ kind: "sum", sum: [27, 35] });
    expect(parseTask(" 27 + 35 ", current, "add")).toEqual({ kind: "sum", sum: [27, 35] });
    expect(parseTask("5+3", current, "add")).toEqual({ kind: "sum", sum: [5, 3] });
    expect(parseTask("23x4", current, "mul")).toEqual({ kind: "sum", sum: [23, 4] });
    expect(parseTask("23×4", current, "mul")).toEqual({ kind: "sum", sum: [23, 4] });
    expect(parseTask("23*4", current, "mul")).toEqual({ kind: "sum", sum: [23, 4] });
    expect(parseTask("23 X 4", current, "mul")).toEqual({ kind: "sum", sum: [23, 4] });
    expect(parseTask("12/3", current, "div")).toEqual({ kind: "sum", sum: [12, 3] });
    expect(parseTask("12÷3", current, "div")).toEqual({ kind: "sum", sum: [12, 3] });
    expect(parseTask("12:3", current, "div")).toEqual({ kind: "sum", sum: [12, 3] });
    expect(parseTask("12 ÷ 3", current, "div")).toEqual({ kind: "sum", sum: [12, 3] });
    expect(parseTask("43-18", current, "sub")).toEqual({ kind: "sum", sum: [43, 18] });
  });

  it("a task with another operation's sign is not today's skill", () => {
    expect(parseTask("27+35", current, "sub").kind).toBe("unsupported");
    expect(parseTask("43-18", current, "add").kind).toBe("unsupported");
    expect(parseTask("3x4", current, "add").kind).toBe("unsupported");
    expect(parseTask("12/3", current, "add").kind).toBe("unsupported");
    expect(parseTask("3+4", current, "mul").kind).toBe("unsupported");
    expect(parseTask("43-18", current, "mul").kind).toBe("unsupported");
    expect(parseTask("12/3", current, "mul").kind).toBe("unsupported");
    expect(parseTask("12x3", current, "div").kind).toBe("unsupported");
    expect(parseTask("12+3", current, "div").kind).toBe("unsupported");
    expect(parseTask("12-3", current, "div").kind).toBe("unsupported");
  });

  it("sharing that does not come out equal, or by nothing, is impossible", () => {
    expect(parseTask("12/5", current, "div").kind).toBe("impossible");
    expect(parseTask("12/0", current, "div").kind).toBe("impossible");
    expect(parseTask("10÷4", current, "div").kind).toBe("impossible");
    expect(parseTask("7-9", current, "sub")).toEqual({ kind: "impossible", a: 7, b: 9 }); // today's rule
  });

  it("3-digit numbers and answers of 1000 or more are not today's skill", () => {
    expect(parseTask("125+30", current, "add").kind).toBe("unsupported");
    expect(parseTask("123x4", current, "mul").kind).toBe("unsupported");
    expect(parseTask("120/3", current, "div").kind).toBe("unsupported");
    expect(parseTask("100/5", current, "div").kind).toBe("unsupported");
    expect(parseTask("125-30", current, "sub").kind).toBe("unsupported");
    expect(parseTask("99x99", current, "mul").kind).toBe("unsupported"); // 9801
    expect(parseTask("50x20", current, "mul").kind).toBe("unsupported"); // exactly 1000
    expect(parseTask("99x9", current, "mul")).toEqual({ kind: "sum", sum: [99, 9] }); // 891 is fine
  });

  it("a Director slip (one number, unconverted words, nothing) is no task in any module", () => {
    for (const op of ["add", "mul", "div"] as const) {
      expect(parseTask("", current, op)).toEqual({ kind: "none" });
      expect(parseTask("  ", current, op)).toEqual({ kind: "none" });
      expect(parseTask("35", current, op)).toEqual({ kind: "none" });
      expect(parseTask("twenty-seven plus thirty-five", current, op)).toEqual({ kind: "none" });
      expect(parseTask("27+", current, op)).toEqual({ kind: "none" });
    }
  });

  it("both numbers made from the current task's digits are a step of it, not a new task", () => {
    // Working on 27 + 35: "7 + 5" and "2 + 3" are its columns. The task itself asked again is still a task.
    expect(parseTask("7+5", [27, 35], "add")).toEqual({ kind: "none" });
    expect(parseTask("2+3", [27, 35], "add")).toEqual({ kind: "none" });
    expect(parseTask("27+35", [27, 35], "add")).toEqual({ kind: "sum", sum: [27, 35] });
    expect(parseTask("48+17", [27, 35], "add")).toEqual({ kind: "sum", sum: [48, 17] });
    // Working on 23 × 4: "3 × 4" is its ones step.
    expect(parseTask("3x4", [23, 4], "mul")).toEqual({ kind: "none" });
    expect(parseTask("23x4", [23, 4], "mul")).toEqual({ kind: "sum", sum: [23, 4] });
    expect(parseTask("14x6", [23, 4], "mul")).toEqual({ kind: "sum", sum: [14, 6] });
  });

  it("keeps today's take-away behaviour with the default operation", () => {
    expect(parseTask("10-5")).toEqual({ kind: "sum", sum: [10, 5] });
    expect(parseTask("0 − 0")).toEqual({ kind: "sum", sum: [0, 0] });
    expect(parseTask("1-2")).toEqual({ kind: "impossible", a: 1, b: 2 });
    for (const t of ["10+5", "4x3", "8/2", "6÷2", "125-30"]) expect(parseTask(t).kind).toBe("unsupported");
    for (const t of [" ", "43", "ten minus five", "52-"]) expect(parseTask(t)).toEqual({ kind: "none" });
    expect(parseTask("13-8", [43, 18])).toEqual({ kind: "none" });
    expect(parseTask("3-8", [43, 18])).toEqual({ kind: "none" });
    expect(parseTask("12-7", [52, 27])).toEqual({ kind: "none" });
    expect(parseTask("10-5", [52, 27])).toEqual({ kind: "sum", sum: [10, 5] });
    expect(parseTask("43-18", [43, 18])).toEqual({ kind: "sum", sum: [43, 18] });
  });
});

/* ----------------------------------------------------------------------------
 * Fixes from the adversarial review of the modules (1 Nov)
 * ------------------------------------------------------------------------- */

describe("the carry mistakes on numbers with nothing to carry into (item B)", () => {
  it("forgetCarryMul with a one-digit first factor is simply right: 3 × 4 → 12, not 2", () => {
    expect(forgetCarryMul(3, 4)).toBe(12);
    expect(forgetCarryMul(2, 5)).toBe(10);
    expect(forgetCarryMul(23, 4)).toBe(82); // the real mistake is untouched
    expect(explainSteps("forgetCarryMul", 3, 4)).toEqual(correctSteps("mul", 3, 4));
    expect(explainSteps("forgetCarryMul", 23, 4, "mul")).toEqual(["3 × 4 = 12, so 2", "2 × 4 = 8", "so 82"]);
  });

  it("forgetCarry with two one-digit numbers is simply right: 5 + 7 → 12, not 2", () => {
    expect(forgetCarry(5, 7)).toBe(12);
    expect(forgetCarry(2, 3)).toBe(5);
    expect(forgetCarry(27, 35)).toBe(52); // the real mistake is untouched
    expect(explainSteps("forgetCarry", 5, 7)).toEqual(correctSteps("add", 5, 7));
    expect(explainSteps("forgetCarry", 27, 35, "add")).toEqual(["7 + 5 = 12, so 2", "2 + 3 = 5", "so 52"]);
  });
});

describe("parseTask — the current task's numbers with another sign are a restatement (item A)", () => {
  it("'3 + 4' while on 3 × 4, '12 - 3' while on 12 ÷ 3: no new task, not 'not today'", () => {
    expect(parseTask("3+4", [3, 4], "mul")).toEqual({ kind: "none" });
    expect(parseTask("4+3", [3, 4], "mul")).toEqual({ kind: "none" }); // either order
    expect(parseTask("12-3", [12, 3], "div")).toEqual({ kind: "none" });
    expect(parseTask("3-12", [12, 3], "div")).toEqual({ kind: "none" });
    expect(parseTask("27-35", [27, 35], "add")).toEqual({ kind: "none" });
    expect(parseTask("52+27", [52, 27], "sub")).toEqual({ kind: "none" });
  });

  it("other numbers with another sign are still not today's skill; the same-sign step rule still holds", () => {
    expect(parseTask("3+5", [3, 4], "mul").kind).toBe("unsupported");
    expect(parseTask("12-4", [12, 3], "div").kind).toBe("unsupported");
    expect(parseTask("3x4", [23, 4], "mul")).toEqual({ kind: "none" });
    expect(parseTask("13-8", [43, 18], "sub")).toEqual({ kind: "none" });
  });
});

describe("parseTask — a times task is written 2-digit factor first (item C)", () => {
  it("'4 x 23' plays as 23 × 4, which forgetCarryMul expects", () => {
    expect(parseTask("4x23", [14, 6], "mul")).toEqual({ kind: "sum", sum: [23, 4] });
    expect(parseTask("4x23", [23, 4], "mul")).toEqual({ kind: "sum", sum: [23, 4] });
    expect(parseTask("4×23", [14, 6], "mul")).toEqual({ kind: "sum", sum: [23, 4] });
    expect(parseTask("3x4", [14, 6], "mul")).toEqual({ kind: "sum", sum: [3, 4] }); // two one-digit factors stay
    expect(parseTask("23x4", [14, 6], "mul")).toEqual({ kind: "sum", sum: [23, 4] });
    expect(answerWith("forgetCarryMul", 23, 4, "mul")).toBe(82);
  });
});

describe("':' is a sharing sign only in a sharing lesson (item F)", () => {
  it("'43:18' in a take-away lesson is no task at all, as before the modules", () => {
    expect(parseTask("43:18", [52, 27])).toEqual({ kind: "none" });
    expect(parseTask("43:18", [52, 27], "sub")).toEqual({ kind: "none" });
    expect(parseTask("10:30", [27, 35], "add")).toEqual({ kind: "none" });
    expect(parseTask("3:4", [23, 4], "mul")).toEqual({ kind: "none" });
    expect(parseTask("12:3", [12, 3], "div")).toEqual({ kind: "sum", sum: [12, 3] });
    expect(parseTask("12:3", [10, 2], "div")).toEqual({ kind: "sum", sum: [12, 3] });
  });

  it("operationOf reads ':' as sharing only for a div lesson", () => {
    expect(operationOf(":", "div")).toBe("div");
    expect(operationOf(":", "sub")).toBeNull();
    expect(operationOf(":")).toBeNull();
    expect(operationOf("/", "sub")).toBe("div");
    expect(operationOf("÷", "add")).toBe("div");
  });
});

describe("sharing fewer than the sharers is impossible (item G)", () => {
  it("'0 / 5' and '3 / 12' are not playable sums (Ravi's take-away would say a minus number)", () => {
    expect(parseTask("0/5", [12, 3], "div")).toEqual({ kind: "impossible", a: 0, b: 5 });
    expect(parseTask("3/12", [12, 3], "div")).toEqual({ kind: "impossible", a: 3, b: 12 });
    expect(parseTask("0/0", [12, 3], "div").kind).toBe("impossible");
    expect(parseTask("5/5", [12, 3], "div")).toEqual({ kind: "sum", sum: [5, 5] });
    expect(parseTask("12/3", [10, 2], "div")).toEqual({ kind: "sum", sum: [12, 3] });
  });
});
