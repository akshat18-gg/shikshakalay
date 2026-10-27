/**
 * Sums outside the lesson (live phone test, 28 Oct): the engine plays any a − b it can compute, and for anything
 * else exactly one child answers with no number. A child never says a number that doesn't belong to the question.
 */
import { describe, expect, it } from "vitest";
import type { ChildId, DirectorOutput, Move } from "@/lib/contracts";
import { explainSteps, parseTask } from "@/lib/engine/bugs";
import { type StepDeps, step } from "@/lib/engine/core";
import { checkLine, fillBackup } from "@/lib/engine/guardrails";
import { applyMove, spokenAnswer } from "@/lib/engine/mindState";
import { loadScenario, startState } from "@/lib/engine/scenario";
import { pickSpeakers } from "@/lib/engine/speakers";
import type { EngineState } from "@/lib/engine/types";

const scenario = loadScenario("sub_2digit")!;
const fresh = () => startState(scenario, "en", "2026-10-28T10:00:00.000Z");
const d = (move: Move, newTask = "", addressedTo: DirectorOutput["addressedTo"] = ["whole_class"]): DirectorOutput => ({
  move,
  addressedTo,
  newTask,
  evidenceQuote: "x",
  confidence: "high",
});
const said = (s: EngineState, id: ChildId) =>
  spokenAnswer(
    s.children.find((c) => c.id === id)!,
    s.currentSum,
    s.parrots,
  );

describe("parseTask", () => {
  it("sorts what she asked into sum / impossible / unsupported / none", () => {
    expect(parseTask("10-5")).toEqual({ kind: "sum", sum: [10, 5] });
    expect(parseTask("0 − 0")).toEqual({ kind: "sum", sum: [0, 0] });
    expect(parseTask("1-2")).toEqual({ kind: "impossible", a: 1, b: 2 });
    for (const t of ["10+5", "4x3", "8/2", "6÷2", "125-30"]) expect(parseTask(t).kind).toBe("unsupported");
    // A Director slip (one number, unconverted words) is no task — never "today we do take-away".
    for (const t of [" ", "43", "ten minus five", "52-"]) expect(parseTask(t)).toEqual({ kind: "none" });
  });
});

describe("steps of the current sum are not new sums (the engine decides)", () => {
  it("on 43 − 18, '13-8' and '3-8' are steps; on 52 − 27, '12-7' is a step but '10-5' is a new sum", () => {
    expect(parseTask("13-8", [43, 18])).toEqual({ kind: "none" });
    expect(parseTask("3-8", [43, 18])).toEqual({ kind: "none" });
    expect(parseTask("12-7", [52, 27])).toEqual({ kind: "none" });
    expect(parseTask("10-5", [52, 27])).toEqual({ kind: "sum", sum: [10, 5] });
    expect(parseTask("43-18", [43, 18])).toEqual({ kind: "sum", sum: [43, 18] }); // the current sum asked again
  });

  it("sample 4 still works when the Director writes the step as a task: Ravi goes WOBBLY then GOT_IT on 43 − 18", () => {
    let s = applyMove(fresh(), d("new_sum", "43-18"));
    s = applyMove(s, d("ask_to_explain", "", ["ravi"]));
    s = applyMove(s, d("concrete_materials", "3-8", ["ravi"]));
    expect(s.children[0]).toMatchObject({ state: "WOBBLY", workedSum: [43, 18] });
    s = applyMove(s, d("targeted_question", "13-8", ["ravi"]));
    expect(s.currentSum).toEqual([43, 18]);
    expect(s.children[0]!.state).toBe("GOT_IT");
  });
});

describe("any sum the engine can compute", () => {
  it("10 − 5 → Ravi 15, Arjun 15, Meena 6, Sana 5 (each child's own mistake)", () => {
    const s = applyMove(fresh(), d("new_sum", "10-5", ["arjun"]));
    expect(s.currentSum).toEqual([10, 5]);
    expect(["ravi", "arjun", "meena", "sana"].map((id) => said(s, id as ChildId))).toEqual([15, 15, 6, 5]);
    expect(pickSpeakers(s, d("new_sum", "10-5", ["arjun"]))).toEqual([{ child: "arjun", mode: "answer", mustSay: 15 }]);
  });

  it('explains one-digit and no-borrow sums without empty "0 - 0" steps', () => {
    expect(explainSteps(null, 7, 3)).toEqual(["7 - 3 = 4", "so 4"]);
    expect(explainSteps("smallerFromLarger", 10, 5)).toEqual(["5 - 0 = 5", "1 - 0 = 1", "so 15"]);
    expect(explainSteps(null, 10, 5)).toEqual(["10 - 5 = 5", "so 5"]);
  });

  it("'10 minus 5 is 5' sets the sum to 10 − 5 first, so the parrot is 5 — for that sum only", () => {
    let s = applyMove(fresh(), d("tell_answer", "10-5"));
    expect(s.parrots.arjun).toEqual({ sum: [10, 5], answer: 5 });
    expect(pickSpeakers(s, d("tell_answer", "10-5")).map((x) => [x.child, x.mode, x.mustSay])).toEqual([
      ["ravi", "parrot", 5],
      ["arjun", "parrot", 5],
      ["meena", "parrot", 5],
    ]);
    s = applyMove(s, d("new_sum", "52-27"));
    expect(said(s, "arjun")).toBe(35);
  });

  it("a plain reaction never repeats a told answer", () => {
    const s = applyMove(fresh(), d("tell_answer"));
    expect(pickSpeakers(s, d("other")).every((x) => x.mode === "react" && x.mustSay === null)).toBe(true);
  });
});

describe("tasks the engine can't compute", () => {
  it("bigger from smaller: nothing changes, one child is puzzled, no number", () => {
    const before = applyMove(fresh(), d("tell_answer"));
    const s = applyMove(before, d("new_sum", "1-2"));
    expect(s).toEqual(before);
    expect(pickSpeakers(s, d("new_sum", "1-2"))).toEqual([{ child: "ravi", mode: "cannot", mustSay: null }]);
  });

  it("addition, times, 3 digits: one child says 'today we do take-away' — the named child if she named one", () => {
    for (const t of ["10+5", "4x3", "125-30"]) {
      const s = applyMove(fresh(), d("new_sum", t));
      expect(s.currentSum).toEqual([52, 27]);
      expect(pickSpeakers(s, d("new_sum", t))).toEqual([{ child: "ravi", mode: "not_today", mustSay: null }]);
    }
    expect(pickSpeakers(fresh(), d("new_sum", "10+5", ["meena"]))).toEqual([
      { child: "meena", mode: "not_today", mustSay: null },
    ]);
    // The moves of an unplayable task change no mind (e.g. a "fix" while asking 10 + 5).
    expect(applyMove(fresh(), d("concrete_materials", "10+5", ["ravi"]))).toEqual(fresh());
  });

  it("have their own backup lines", () => {
    const ravi = fresh().children[0]!;
    expect(fillBackup(scenario, "en", { child: "ravi", mode: "cannot", mustSay: null }, ravi)).toMatch(
      /big number from a small/,
    );
    expect(fillBackup(scenario, "hi", { child: "ravi", mode: "not_today", mustSay: null }, ravi)).toMatch(/घटाना/);
  });
});

describe("a child never says a number that doesn't belong to the question", () => {
  const stuck = fresh().children[1]!;
  it("a no-number line may only repeat her numbers or the current sum", () => {
    expect(checkLine("10 plus 5? Teacher, today we do take-away!", null, [52, 27], stuck, [10, 5, 52, 27])).toEqual({
      ok: true,
    });
    expect(checkLine("Ten plus five… 25?", null, [52, 27], stuck, [10, 5, 52, 27])).toMatchObject({ ok: false });
    expect(checkLine("10 plus 5 is 15!", null, [52, 27], stuck, [10, 5, 52, 27])).toMatchObject({
      reason: "foreign_number",
    });
  });

  it("a parrot only says the told answer", () => {
    expect(checkLine("26, Teacher!", 26, [30, 4], stuck, [30, 4])).toEqual({ ok: true });
    expect(checkLine("Me also 26! Ravi said 25.", 26, [30, 4], stuck, [30, 4])).toMatchObject({
      reason: "foreign_number",
    });
  });
});

describe("step", () => {
  it("'10 + 7' is a real question, not 'say it again'", async () => {
    let asked = 0;
    const deps: StepDeps = {
      tagMove: async () => (asked++, { director: d("new_sum", "10+7"), ok: true }),
      writeLines: async (_c, speakers) => ({
        lines: speakers.map((sp) => ({ child: sp.child, text: "Teacher, today we are doing take-away sums!" })),
        records: [],
      }),
    };
    const r = await step(
      {
        scenario,
        state: fresh(),
        teacherText: "10 + 7",
        now: new Date("2026-10-28T10:01:00Z"),
        recent: [],
        models: { director: "h", child: "h" },
      },
      deps,
    );
    expect(asked).toBe(1);
    expect(r.lines).toEqual([{ child: "ravi", text: "Teacher, today we are doing take-away sums!" }]);
    expect(r.state.currentSum).toEqual([52, 27]);
  });
});
