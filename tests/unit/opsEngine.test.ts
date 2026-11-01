/**
 * The five arithmetic modules on the one engine (private/ops-spec.md): a lesson file says `operation`, the
 * mind-state rules and speakers compute every number for that operation, and the line check uses the module's
 * right answer. Hand-made Director decisions, no Claude.
 */
import { describe, expect, it } from "vitest";
import type { ChildId, ChildState, DirectorOutput, Move } from "@/lib/contracts";
import { type Operation, type Sum, answerOf } from "@/lib/engine/bugs";
import { cleanDirector } from "@/lib/engine/director";
import { checkLine, strictReminder } from "@/lib/engine/guardrails";
import { applyMove, beliefAnswer, believesMistake, spokenAnswer } from "@/lib/engine/mindState";
import { loadScenario, startState } from "@/lib/engine/scenario";
import { pickSpeakers } from "@/lib/engine/speakers";
import type { EngineState } from "@/lib/engine/types";

const STARTED = "2026-11-01T10:00:00.000Z";
const fresh = (id: string): EngineState => startState(loadScenario(id)!, "en", STARTED);

const d = (move: Move, newTask = "", addressedTo: DirectorOutput["addressedTo"] = ["whole_class"]): DirectorOutput => ({
  move,
  addressedTo,
  newTask,
  evidenceQuote: "x",
  confidence: "high",
});

const child = (s: EngineState, id: ChildId): ChildState => s.children.find((c) => c.id === id)!;
const op = (s: EngineState): Operation => s.operation ?? "sub";
const said = (s: EngineState, id: ChildId) => spokenAnswer(child(s, id), s.currentSum, s.parrots, op(s));

/** One row per module: the first task, Ravi's wrong answer, the right one, a second task and its numbers. */
type ModuleCase = {
  id: string;
  op: Operation;
  bug: string;
  first: Sum;
  firstText: string;
  ravi: number;
  right: number;
  second: string;
  secondSum: Sum;
  ravi2: number;
  right2: number;
  /** A task with another operation's sign, with numbers that are not digits of the first task. */
  wrongSign: string;
};

const MODULES: ModuleCase[] = [
  {
    id: "add_to_9",
    op: "add",
    bug: "countOnOffByOne",
    first: [5, 3],
    firstText: "5+3",
    ravi: 9,
    right: 8,
    second: "4+2",
    secondSum: [4, 2],
    ravi2: 7,
    right2: 6,
    wrongSign: "9-2",
  },
  {
    id: "add_2digit_carry",
    op: "add",
    bug: "forgetCarry",
    first: [27, 35],
    firstText: "27+35",
    ravi: 52,
    right: 62,
    second: "48+17",
    secondSum: [48, 17],
    ravi2: 55,
    right2: 65,
    wrongSign: "43-18",
  },
  {
    id: "mul_groups",
    op: "mul",
    bug: "addInstead",
    first: [3, 4],
    firstText: "3x4",
    ravi: 7,
    right: 12,
    second: "2x5",
    secondSum: [2, 5],
    ravi2: 7,
    right2: 10,
    wrongSign: "6+2",
  },
  {
    id: "mul_2x1_carry",
    op: "mul",
    bug: "forgetCarryMul",
    first: [23, 4],
    firstText: "23x4",
    ravi: 82,
    right: 92,
    second: "14x6",
    secondSum: [14, 6],
    ravi2: 64,
    right2: 84,
    wrongSign: "5+6",
  },
  {
    id: "div_sharing",
    op: "div",
    bug: "subtractInstead",
    first: [12, 3],
    firstText: "12/3",
    ravi: 9,
    right: 4,
    second: "10/2",
    secondSum: [10, 2],
    ravi2: 8,
    right2: 5,
    wrongSign: "40-15",
  },
];

describe("the lesson files", () => {
  it("all five modules load with the right operation and the first task", () => {
    for (const m of MODULES) {
      const s = loadScenario(m.id);
      expect(s, m.id).not.toBeNull();
      expect(s!.operation, m.id).toBe(m.op);
      expect(s!.sums[0], m.id).toBe(m.firstText);
      expect(s!.children.map((c) => c.id)).toEqual(["ravi", "arjun", "meena", "sana"]);
    }
  });

  it("sub_2digit still says take-away and starts as today: STUCK Ravi, the others GOT_IT", () => {
    const s = loadScenario("sub_2digit")!;
    expect(s.operation).toBe("sub");
    const st = startState(s, "en", STARTED);
    expect(st.operation).toBe("sub");
    expect(st.currentSum).toEqual([52, 27]);
    expect(st.children.map((c) => [c.id, c.bug, c.state, c.engagement])).toEqual([
      ["ravi", "smallerFromLarger", "STUCK", 3],
      ["arjun", null, "GOT_IT", 2],
      ["meena", null, "GOT_IT", 2],
      ["sana", null, "GOT_IT", 0],
    ]);
  });
});

describe("add_2digit_carry, turn by turn", () => {
  it("starts on 27 + 35 with operation add", () => {
    const s = fresh("add_2digit_carry");
    expect(s.operation).toBe("add");
    expect(s.currentSum).toEqual([27, 35]);
    expect(s.children.map((c) => [c.id, c.bug, c.state, c.engagement])).toEqual([
      ["ravi", "forgetCarry", "STUCK", 3],
      ["arjun", null, "GOT_IT", 2],
      ["meena", null, "GOT_IT", 2],
      ["sana", null, "GOT_IT", 0],
    ]);
  });

  it("'What is 27 plus 35?' → Ravi 52, Arjun 62, Meena 62, Sana silent", () => {
    const ask = d("new_sum", "27+35");
    const s = applyMove(fresh("add_2digit_carry"), ask);
    expect(s.currentSum).toEqual([27, 35]);
    expect(pickSpeakers(s, ask)).toEqual([
      { child: "ravi", mode: "answer", mustSay: 52 },
      { child: "arjun", mode: "answer", mustSay: 62 },
      { child: "meena", mode: "answer", mustSay: 62 },
    ]);
  });

  it("'No, it is 62' → everyone parrots 62; asking 27 + 35 again keeps it; 48 + 17 brings Ravi's 55 back", () => {
    let s = applyMove(fresh("add_2digit_carry"), d("tell_answer"));
    expect(s.parrots.ravi).toEqual({ sum: [27, 35], answer: 62 });
    expect(pickSpeakers(s, d("tell_answer")).map((x) => [x.child, x.mode, x.mustSay])).toEqual([
      ["ravi", "parrot", 62],
      ["arjun", "parrot", 62],
      ["meena", "parrot", 62],
    ]);
    expect(child(s, "ravi").state).toBe("STUCK"); // the mistake stays

    s = applyMove(s, d("new_sum", "27+35"));
    expect(s.currentSum).toEqual([27, 35]);
    expect(said(s, "ravi")).toBe(62);

    s = applyMove(s, d("new_sum", "48+17"));
    expect(s.currentSum).toEqual([48, 17]);
    expect(s.parrots).toEqual({});
    expect(pickSpeakers(s, d("new_sum", "48+17")).map((x) => x.mustSay)).toEqual([55, 65, 65]);
  });

  it("reveal then two fixes: Ravi explains 'so 52', goes WOBBLY, then GOT_IT and says 62", () => {
    const explain = d("ask_to_explain", "", ["ravi"]);
    let s = applyMove(fresh("add_2digit_carry"), explain);
    const [speaker] = pickSpeakers(s, explain);
    expect(speaker).toMatchObject({ child: "ravi", mode: "explain", mustSay: 52 });
    expect(speaker!.steps!.at(-1)).toBe("so 52");
    expect(child(s, "ravi")).toMatchObject({ revealed: true, state: "STUCK" });

    const fix1 = d("concrete_materials", "", ["ravi"]);
    s = applyMove(s, fix1);
    expect(child(s, "ravi")).toMatchObject({ state: "WOBBLY", workedSum: [27, 35] });
    expect(pickSpeakers(s, fix1)).toEqual([{ child: "ravi", mode: "answer", mustSay: 62 }]);

    const fix2 = d("targeted_question", "", ["ravi"]);
    s = applyMove(s, fix2);
    expect(child(s, "ravi").state).toBe("GOT_IT");
    expect(pickSpeakers(s, fix2)).toEqual([{ child: "ravi", mode: "answer", mustSay: 62 }]);

    // GOT_IT is right on every sum, and explains the right steps.
    s = applyMove(s, d("new_sum", "48+17"));
    expect(said(s, "ravi")).toBe(65);
    const again = d("ask_to_explain", "", ["ravi"]);
    const [got] = pickSpeakers(applyMove(s, again), again);
    expect(got).toMatchObject({ child: "ravi", mode: "explain", mustSay: 65 });
    expect(got!.steps!.at(-1)).toBe("so 65");
  });

  it("a fix given as a column step ('7 + 5') stays on 27 + 35 — the engine decides what is a step", () => {
    let s = applyMove(fresh("add_2digit_carry"), d("ask_to_explain", "", ["ravi"]));
    s = applyMove(s, d("concrete_materials", "7+5", ["ravi"]));
    expect(s.currentSum).toEqual([27, 35]);
    expect(child(s, "ravi")).toMatchObject({ state: "WOBBLY", workedSum: [27, 35] });
    s = applyMove(s, d("targeted_question", "2+3", ["ravi"]));
    expect(s.currentSum).toEqual([27, 35]);
    expect(child(s, "ravi").state).toBe("GOT_IT");
  });

  it("a take-away task in the adding lesson: nothing changes, one child says 'today we are adding'", () => {
    const before = applyMove(fresh("add_2digit_carry"), d("tell_answer"));
    const s = applyMove(before, d("new_sum", "43-18"));
    expect(s).toEqual(before);
    expect(pickSpeakers(s, d("new_sum", "43-18"))).toEqual([{ child: "ravi", mode: "not_today", mustSay: null }]);
    expect(pickSpeakers(s, d("new_sum", "43-18", ["meena"]))).toEqual([
      { child: "meena", mode: "not_today", mustSay: null },
    ]);
  });

  it("Sana speaks only when invited, and then says the right answer", () => {
    const s = fresh("add_2digit_carry");
    expect(pickSpeakers(applyMove(s, d("new_sum", "", ["sana"])), d("new_sum", "", ["sana"]))).toEqual([]);
    const invite = d("invite_quiet_child", "", ["sana"]);
    const after = applyMove(s, invite);
    expect(child(after, "sana").engagement).toBe(1);
    expect(pickSpeakers(after, invite)).toEqual([{ child: "sana", mode: "answer", mustSay: 62 }]);
  });
});

describe.each(MODULES)("$id ($op)", (m) => {
  it("starts on the first task with Ravi STUCK and the others right", () => {
    const s = fresh(m.id);
    expect(s.operation).toBe(m.op);
    expect(s.currentSum).toEqual(m.first);
    expect(s.children.map((c) => [c.id, c.bug, c.state, c.engagement])).toEqual([
      ["ravi", m.bug, "STUCK", 3],
      ["arjun", null, "GOT_IT", 2],
      ["meena", null, "GOT_IT", 2],
      ["sana", null, "GOT_IT", 0],
    ]);
  });

  it(`the first task → Ravi ${m.ravi}, Arjun and Meena ${m.right}, Sana silent`, () => {
    const ask = d("new_sum", m.firstText);
    const s = applyMove(fresh(m.id), ask);
    expect(s.currentSum).toEqual(m.first);
    expect(pickSpeakers(s, ask)).toEqual([
      { child: "ravi", mode: "answer", mustSay: m.ravi },
      { child: "arjun", mode: "answer", mustSay: m.right },
      { child: "meena", mode: "answer", mustSay: m.right },
    ]);
    expect(answerOf(m.op, m.first[0], m.first[1])).toBe(m.right);
  });

  it(`tell_answer → all parrot ${m.right}; the same task keeps it; ${m.second} brings Ravi's ${m.ravi2}`, () => {
    let s = applyMove(fresh(m.id), d("tell_answer"));
    for (const id of ["ravi", "arjun", "meena", "sana"] as const) {
      expect(s.parrots[id]).toEqual({ sum: m.first, answer: m.right });
    }
    expect(pickSpeakers(s, d("tell_answer")).map((x) => [x.child, x.mode, x.mustSay])).toEqual([
      ["ravi", "parrot", m.right],
      ["arjun", "parrot", m.right],
      ["meena", "parrot", m.right],
    ]);
    expect(child(s, "ravi").state).toBe("STUCK");

    s = applyMove(s, d("new_sum", m.firstText));
    expect(s.currentSum).toEqual(m.first);
    expect(said(s, "ravi")).toBe(m.right);

    s = applyMove(s, d("new_sum", m.second));
    expect(s.currentSum).toEqual(m.secondSum);
    expect(s.parrots).toEqual({});
    expect(["ravi", "arjun", "meena", "sana"].map((id) => said(s, id as ChildId))).toEqual([
      m.ravi2,
      m.right2,
      m.right2,
      m.right2,
    ]);
  });

  it(`reveal: Ravi explains 'so ${m.ravi}'; two fixes → GOT_IT and ${m.right}; right on ${m.second} too`, () => {
    const explain = d("ask_to_explain", "", ["ravi"]);
    let s = applyMove(fresh(m.id), explain);
    const [speaker] = pickSpeakers(s, explain);
    expect(speaker).toMatchObject({ child: "ravi", mode: "explain", mustSay: m.ravi });
    expect(speaker!.steps!.length).toBeGreaterThan(0);
    expect(speaker!.steps!.at(-1)).toBe(`so ${m.ravi}`);

    s = applyMove(s, d("concrete_materials", "", ["ravi"]));
    expect(child(s, "ravi")).toMatchObject({ state: "WOBBLY", workedSum: m.first });
    expect(said(s, "ravi")).toBe(m.right);

    const fix = d("targeted_question", "", ["ravi"]);
    s = applyMove(s, fix);
    expect(child(s, "ravi").state).toBe("GOT_IT");
    expect(pickSpeakers(s, fix)).toEqual([{ child: "ravi", mode: "answer", mustSay: m.right }]);

    s = applyMove(s, d("new_sum", m.second));
    expect(said(s, "ravi")).toBe(m.right2);
  });

  it("a fix without a reveal stops at WOBBLY: right on the worked task, the mistake back on the next", () => {
    let s = applyMove(fresh(m.id), d("concrete_materials", "", ["ravi"]));
    s = applyMove(s, d("targeted_question", "", ["ravi"]));
    expect(child(s, "ravi").state).toBe("WOBBLY");
    expect(said(s, "ravi")).toBe(m.right);
    s = applyMove(s, d("new_sum", m.second));
    expect(said(s, "ravi")).toBe(m.ravi2);
  });

  it(`a task with another sign (${m.wrongSign}) changes nothing; one child says it is not today's skill`, () => {
    const before = applyMove(fresh(m.id), d("tell_answer"));
    const s = applyMove(before, d("new_sum", m.wrongSign));
    expect(s).toEqual(before);
    expect(pickSpeakers(s, d("new_sum", m.wrongSign))).toEqual([{ child: "ravi", mode: "not_today", mustSay: null }]);
    expect(applyMove(fresh(m.id), d("concrete_materials", m.wrongSign, ["ravi"]))).toEqual(fresh(m.id));
  });

  it("a 3-digit task is not today's skill either", () => {
    const big = { add: "125+30", sub: "125-30", mul: "123x4", div: "120/3" }[m.op];
    const s = applyMove(fresh(m.id), d("new_sum", big));
    expect(s.currentSum).toEqual(m.first);
    expect(pickSpeakers(s, d("new_sum", big))).toEqual([{ child: "ravi", mode: "not_today", mustSay: null }]);
  });

  it("'other' is a plain reaction with no number, even after a told answer", () => {
    const s = applyMove(fresh(m.id), d("tell_answer"));
    const speakers = pickSpeakers(s, d("other"));
    expect(speakers.length).toBeGreaterThan(0);
    expect(speakers.every((x) => x.mode === "react" && x.mustSay === null)).toBe(true);
  });
});

describe("div_sharing — sharing that does not come out equal", () => {
  it("'12 shared among 5' or 'by 0': nothing changes, one child says we can't share it equally", () => {
    const before = applyMove(fresh("div_sharing"), d("tell_answer"));
    for (const t of ["12/5", "12/0", "10÷4"]) {
      const s = applyMove(before, d("new_sum", t));
      expect(s).toEqual(before);
      expect(pickSpeakers(s, d("new_sum", t))).toEqual([{ child: "ravi", mode: "cannot", mustSay: null }]);
    }
    expect(pickSpeakers(before, d("new_sum", "12/5", ["arjun"]))).toEqual([
      { child: "arjun", mode: "cannot", mustSay: null },
    ]);
  });
});

describe("mul_2x1_carry — the ones step is not a new task", () => {
  it("'3 × 4' while working on 23 × 4 is a step: Ravi goes WOBBLY on 23 × 4", () => {
    let s = applyMove(fresh("mul_2x1_carry"), d("ask_to_explain", "", ["ravi"]));
    s = applyMove(s, d("concrete_materials", "3x4", ["ravi"]));
    expect(s.currentSum).toEqual([23, 4]);
    expect(child(s, "ravi")).toMatchObject({ state: "WOBBLY", workedSum: [23, 4] });
    expect(said(s, "ravi")).toBe(92);
  });
});

describe("beliefAnswer / spokenAnswer / believesMistake with an operation", () => {
  const ravi = (bug: string, state: ChildState["state"] = "STUCK", workedSum: Sum | null = null): ChildState => ({
    id: "ravi",
    bug,
    state,
    revealed: false,
    engagement: 3,
    workedSum,
  });

  it("add: STUCK believes the mistake, WOBBLY is right only on the worked sum, GOT_IT everywhere", () => {
    expect(beliefAnswer(ravi("forgetCarry"), [27, 35], "add")).toBe(52);
    expect(beliefAnswer(ravi("forgetCarry", "WOBBLY", [27, 35]), [27, 35], "add")).toBe(62);
    expect(beliefAnswer(ravi("forgetCarry", "WOBBLY", [27, 35]), [48, 17], "add")).toBe(55);
    expect(beliefAnswer(ravi("forgetCarry", "GOT_IT"), [48, 17], "add")).toBe(65);
    expect(believesMistake(ravi("forgetCarry"), [27, 35], "add")).toBe(true);
    expect(believesMistake(ravi("forgetCarry", "GOT_IT"), [27, 35], "add")).toBe(false);
    const parrots = { ravi: { sum: [27, 35] as Sum, answer: 62 } };
    expect(spokenAnswer(ravi("forgetCarry"), [27, 35], parrots, "add")).toBe(62);
    expect(spokenAnswer(ravi("forgetCarry"), [48, 17], parrots, "add")).toBe(55);
  });

  it("mul and div", () => {
    expect(beliefAnswer(ravi("addInstead"), [3, 4], "mul")).toBe(7);
    expect(beliefAnswer(ravi("addInstead", "GOT_IT"), [3, 4], "mul")).toBe(12);
    expect(beliefAnswer(ravi("forgetCarryMul"), [23, 4], "mul")).toBe(82);
    expect(beliefAnswer(ravi("subtractInstead"), [12, 3], "div")).toBe(9);
    expect(beliefAnswer(ravi("subtractInstead", "WOBBLY", [12, 3]), [12, 3], "div")).toBe(4);
    expect(believesMistake(ravi("subtractInstead"), [12, 3], "div")).toBe(true);
    expect(spokenAnswer(ravi("subtractInstead"), [12, 3], { ravi: { sum: [12, 3], answer: 4 } }, "div")).toBe(4);
    expect(spokenAnswer(ravi("subtractInstead"), [12, 3], {}, "div")).toBe(9);
  });

  it("a child with no mistake is always right for the module's operation", () => {
    const sana: ChildState = {
      id: "sana",
      bug: null,
      state: "GOT_IT",
      revealed: false,
      engagement: 0,
      workedSum: null,
    };
    expect(beliefAnswer(sana, [27, 35], "add")).toBe(62);
    expect(beliefAnswer(sana, [23, 4], "mul")).toBe(92);
    expect(beliefAnswer(sana, [12, 3], "div")).toBe(4);
    expect(beliefAnswer(sana, [52, 27])).toBe(25); // default: take-away
    expect(believesMistake(sana, [27, 35], "add")).toBe(false);
  });

  it("a stored state with no operation field is a take-away lesson, as today", () => {
    const old: EngineState = {
      scenarioId: "sub_2digit",
      scenarioVersion: 5,
      lang: "en",
      currentSum: [52, 27],
      children: [
        { id: "ravi", bug: "smallerFromLarger", state: "STUCK", revealed: false, engagement: 3, workedSum: null },
        { id: "arjun", bug: null, state: "GOT_IT", revealed: false, engagement: 2, workedSum: null },
      ],
      parrots: {},
      turnCount: 3,
      startedAt: STARTED,
    };
    const s = applyMove(old, d("tell_answer"));
    expect(s.parrots.ravi).toEqual({ sum: [52, 27], answer: 25 });
    expect(pickSpeakers(applyMove(old, d("new_sum", "43-18")), d("new_sum", "43-18")).map((x) => x.mustSay)).toEqual([
      35, 25,
    ]);
  });
});

describe("the line check uses the module's right answer", () => {
  const stuck: ChildState = {
    id: "ravi",
    bug: "forgetCarry",
    state: "STUCK",
    revealed: false,
    engagement: 3,
    workedSum: null,
  };
  const gotIt: ChildState = { ...stuck, state: "GOT_IT" };

  it("add: a STUCK child must say 52 and must not drift to 62", () => {
    expect(checkLine("52, Teacher! I did it first!", 52, [27, 35], stuck, undefined, "add")).toEqual({ ok: true });
    expect(checkLine("52… no wait, 62!", 52, [27, 35], stuck, undefined, "add")).toEqual({
      ok: false,
      reason: "says_correct",
    });
    expect(checkLine("Teacher, I think 62.", 52, [27, 35], stuck, undefined, "add")).toEqual({
      ok: false,
      reason: "missing_number",
    });
    // The same line is fine from a child who understands, or when 62 is what the child was told to repeat.
    expect(checkLine("62! I tied a new bundle.", 62, [27, 35], gotIt, undefined, "add")).toEqual({ ok: true });
    expect(checkLine("62, Teacher.", 62, [27, 35], stuck, undefined, "add")).toEqual({ ok: true });
  });

  it("mul and div: the drift check knows 23 × 4 = 92 and 12 ÷ 3 = 4", () => {
    const mulStuck: ChildState = { ...stuck, bug: "forgetCarryMul" };
    expect(checkLine("82, Teacher!", 82, [23, 4], mulStuck, undefined, "mul")).toEqual({ ok: true });
    expect(checkLine("82… or 92?", 82, [23, 4], mulStuck, undefined, "mul")).toEqual({
      ok: false,
      reason: "says_correct",
    });
    const divStuck: ChildState = { ...stuck, bug: "subtractInstead" };
    expect(checkLine("9, Teacher! Just take away.", 9, [12, 3], divStuck, undefined, "div")).toEqual({ ok: true });
    expect(checkLine("9! Or 4 each?", 9, [12, 3], divStuck, undefined, "div")).toEqual({
      ok: false,
      reason: "says_correct",
    });
  });

  it("the default is still take-away: 35 on 52 − 27 passes, 25 is a drift", () => {
    const sub: ChildState = { ...stuck, bug: "smallerFromLarger" };
    expect(checkLine("35, Teacher!", 35, [52, 27], sub)).toEqual({ ok: true });
    expect(checkLine("35… or 25?", 35, [52, 27], sub)).toEqual({ ok: false, reason: "says_correct" });
  });
});

/* ----------------------------------------------------------------------------
 * Fixes from the adversarial review of the modules (1 Nov)
 * ------------------------------------------------------------------------- */

describe("the line check lets a child restate a task whose answer is one of its own numbers (item D)", () => {
  const stuck: ChildState = {
    id: "ravi",
    bug: "addInstead",
    state: "STUCK",
    revealed: false,
    engagement: 3,
    workedSum: null,
  };

  it("1 × 4 = 4 and 4 × 1 = 4: one 4 is fine when the line names the 1 as well", () => {
    expect(checkLine("4 and 1 is 5, Teacher!", 5, [4, 1], stuck, undefined, "mul")).toEqual({ ok: true });
    expect(checkLine("1 and 4 is 5, Teacher!", 5, [1, 4], stuck, undefined, "mul")).toEqual({ ok: true });
    // Without the other number it is a drift; two 4s are one too many.
    expect(checkLine("5, Teacher! Or 4?", 5, [4, 1], stuck, undefined, "mul")).toEqual({
      ok: false,
      reason: "says_correct",
    });
    expect(checkLine("4 and 1 is 5… or 4?", 5, [4, 1], stuck, undefined, "mul")).toEqual({
      ok: false,
      reason: "says_correct",
    });
  });

  it("12 ÷ 1 = 12: the same for sharing", () => {
    const divStuck: ChildState = { ...stuck, bug: "subtractInstead" };
    expect(checkLine("12 shared by 1 is 11, Teacher!", 11, [12, 1], divStuck, undefined, "div")).toEqual({
      ok: true,
    });
  });
});

describe("explain mode may pass through the right answer inside the engine's own steps (item E)", () => {
  const stuck: ChildState = {
    id: "ravi",
    bug: "countOnOffByOne",
    state: "STUCK",
    revealed: true,
    engagement: 3,
    workedSum: null,
  };
  const line = "5, 6, 7, 8, 9, so 9, Teacher!";

  it("counting on 5 + 3 says 8 once: allowed with one extra mention, a drift without", () => {
    expect(checkLine(line, 9, [5, 3], stuck, undefined, "add", 1)).toEqual({ ok: true });
    expect(checkLine(line, 9, [5, 3], stuck, undefined, "add")).toEqual({ ok: false, reason: "says_correct" });
    expect(checkLine(line, 9, [5, 3], stuck, undefined, "add", 0)).toEqual({ ok: false, reason: "says_correct" });
    // One extra mention is not a licence to answer 8 as well.
    expect(checkLine("5, 6, 7, 8, 9… or 8?", 9, [5, 3], stuck, undefined, "add", 1)).toEqual({
      ok: false,
      reason: "says_correct",
    });
  });

  it("the retry reminder does not forbid the number when the steps pass through it", () => {
    expect(strictReminder("Ravi", 9, 8, stuck)).toBe(
      "Ravi's line MUST contain 9 as digits. Do NOT say 8. At most 20 words.",
    );
    const soft = strictReminder("Ravi", 9, 8, stuck, 1);
    expect(soft).not.toContain("Do NOT say 8");
    expect(soft).toContain("MUST contain 9");
    expect(soft).toContain("8");
  });
});

describe("cleanDirector rewrites ':' as a sharing sign only in a sharing lesson (item F)", () => {
  const d: DirectorOutput = {
    move: "new_sum",
    addressedTo: ["whole_class"],
    newTask: "43:18",
    evidenceQuote: "x",
    confidence: "high",
  };

  it("'43:18' in a take-away lesson is no task; '12 : 3' in a sharing lesson is 12/3", () => {
    expect(cleanDirector(d, ["ravi"], [52, 27]).newTask).toBe("");
    expect(cleanDirector(d, ["ravi"], [52, 27], "sub").newTask).toBe("");
    expect(cleanDirector({ ...d, newTask: "10:30" }, ["ravi"], [27, 35], "add").newTask).toBe("");
    expect(cleanDirector({ ...d, newTask: "12 : 3" }, ["ravi"], [10, 2], "div").newTask).toBe("12/3");
    expect(cleanDirector({ ...d, newTask: "12 ÷ 3" }, ["ravi"], [10, 2], "div").newTask).toBe("12/3");
  });
});
