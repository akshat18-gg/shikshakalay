/**
 * The children's mistakes, checked against answers worked out by hand (not with the code).
 */
import { describe, expect, it } from "vitest";
import {
  BUGS,
  answerWith,
  borrowNoDecrement,
  countBackOffByOne,
  explainSteps,
  isBug,
  parseLessonSum,
  parseSum,
  smallerFromLarger,
} from "@/lib/engine/bugs";

// [a, b, Ravi, Arjun, Meena, correct]
const HAND_WORKED: [number, number, number, number, number, number][] = [
  [52, 27, 35, 35, 26, 25],
  [43, 18, 35, 35, 26, 25],
  [61, 24, 43, 47, 38, 37],
  [70, 35, 45, 45, 36, 35],
  [84, 59, 35, 35, 26, 25],
  [92, 46, 54, 56, 47, 46],
  [31, 17, 26, 24, 15, 14],
  [65, 38, 33, 37, 28, 27],
  [50, 26, 36, 34, 25, 24],
  [73, 49, 36, 34, 25, 24],
];

describe("the three mistakes on 10 hand-worked sums", () => {
  it.each(HAND_WORKED)("%i − %i → Ravi %i, Arjun %i, Meena %i, right %i", (a, b, ravi, arjun, meena, right) => {
    expect(smallerFromLarger(a, b)).toBe(ravi);
    expect(borrowNoDecrement(a, b)).toBe(arjun);
    expect(countBackOffByOne(a, b)).toBe(meena);
    expect(answerWith(null, a, b)).toBe(right);
  });

  it("never gives the right answer on a borrowing sum (so a mistake is always visible)", () => {
    for (const [a, b, , , , right] of HAND_WORKED) {
      for (const name of Object.keys(BUGS)) expect(answerWith(name, a, b)).not.toBe(right);
    }
  });

  it("refuses an unknown bug name loudly", () => {
    expect(isBug("borrowNoDecrement")).toBe(true);
    expect(isBug("toString")).toBe(false);
    expect(() => answerWith("noSuchBug", 52, 27)).toThrow(/Unknown bug/);
    expect(() => explainSteps("noSuchBug", 52, 27)).toThrow(/Unknown bug/);
  });
});

describe("explainSteps", () => {
  it("matches the examples in AGENTS.md 7.2", () => {
    expect(explainSteps("smallerFromLarger", 43, 18)).toEqual(["8 - 3 = 5", "4 - 1 = 3", "so 35"]);
    expect(explainSteps("borrowNoDecrement", 52, 27)).toEqual(["12 - 7 = 5", "5 - 2 = 3", "so 35"]);
    expect(explainSteps(null, 43, 18)).toEqual(["13 - 8 = 5", "3 - 1 = 2", "so 25"]);
  });

  it("explains Meena's counting and a sum with no borrowing", () => {
    expect(explainSteps("countBackOffByOne", 52, 27)).toEqual([
      "count back 27 from 52",
      "52 is 1, 51 is 2, … 26 is 27",
      "so 26",
    ]);
    expect(explainSteps(null, 57, 23)).toEqual(["7 - 3 = 4", "5 - 2 = 3", "so 34"]);
  });

  it("always ends with the same number the mistake gives", () => {
    for (const [a, b] of HAND_WORKED) {
      for (const bug of [...Object.keys(BUGS), null]) {
        expect(explainSteps(bug, a, b).at(-1)).toBe(`so ${answerWith(bug, a, b)}`);
      }
    }
  });
});

describe("parseSum", () => {
  it("reads hyphen, minus sign, en dash and spaces", () => {
    expect(parseSum("43-18")).toEqual([43, 18]);
    expect(parseSum(" 43 − 18 ")).toEqual([43, 18]);
    expect(parseSum("61 – 24")).toEqual([61, 24]);
  });

  it("refuses anything that is not two 2-digit numbers with the first bigger", () => {
    for (const bad of ["", "18-43", "43-43", "143-18", "4-1", "43+18", "43 minus 18", "43-18-2", "05-03"]) {
      expect(parseSum(bad)).toBeNull();
    }
  });

  it("lesson sums must need borrowing", () => {
    expect(parseLessonSum("52-27")).toEqual([52, 27]);
    expect(parseLessonSum("57-23")).toBeNull();
    expect(parseLessonSum("52-22")).toBeNull();
  });
});
