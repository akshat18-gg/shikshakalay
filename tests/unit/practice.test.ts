import { describe, expect, it } from "vitest";
import type { ChildState, TurnResult } from "@/lib/contracts";
import { formatClock, latestStates, msLeft, silentChildren } from "@/lib/practice";

const states: ChildState[] = [
  { id: "ravi", bug: "smallerFromLarger", state: "STUCK", revealed: false, engagement: 3, workedSum: null },
  { id: "sana", bug: null, state: "GOT_IT", revealed: false, engagement: 0, workedSum: null },
];

function turn(addressedTo: string[], lines: TurnResult["lines"], sana = 0): TurnResult {
  return {
    sessionId: "s",
    turn: 1,
    transcript: "x",
    director: {
      move: "new_sum",
      addressedTo: addressedTo as NonNullable<TurnResult["director"]>["addressedTo"],
      newTask: "",
      evidenceQuote: "x",
      confidence: "high",
    },
    lines,
    statesAfter: states.map((c) => (c.id === "sana" ? { ...c, engagement: sana } : c)),
    audioUrl: null,
    lessonOver: false,
    ms: 1,
  };
}

describe("silentChildren", () => {
  it("names a withdrawn child who was asked and said nothing", () => {
    expect(silentChildren(turn(["whole_class"], [{ child: "ravi", text: "35!" }]))).toEqual(["sana"]);
    expect(silentChildren(turn(["sana"], []))).toEqual(["sana"]);
  });

  it("stays empty when the child was not asked, spoke, or is engaged again", () => {
    expect(silentChildren(turn(["ravi"], [{ child: "ravi", text: "35!" }]))).toEqual([]);
    expect(silentChildren(turn(["sana"], [{ child: "sana", text: "25?" }]))).toEqual([]);
    expect(silentChildren(turn(["sana"], [], 1))).toEqual([]);
    expect(silentChildren({ ...turn([], []), director: null })).toEqual([]);
  });
});

describe("timer", () => {
  it("counts down 5 minutes from the start and never goes below zero", () => {
    const start = "2026-10-27T10:00:00.000Z";
    expect(formatClock(msLeft(start, Date.parse("2026-10-27T10:00:28.000Z")))).toBe("4:32");
    expect(formatClock(msLeft(start, Date.parse("2026-10-27T10:09:00.000Z")))).toBe("0:00");
  });
});

describe("latestStates", () => {
  it("reads the last turn, or nothing before the hello", () => {
    expect(latestStates([turn([], [])])[0]?.id).toBe("ravi");
    expect(latestStates([])).toEqual([]);
  });
});
