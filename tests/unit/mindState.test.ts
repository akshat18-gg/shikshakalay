/**
 * The mind-state rules (AGENTS.md 7.4–7.6), with hand-made Director decisions — no Claude involved.
 */
import { describe, expect, it } from "vitest";
import type { ChildId, ChildState, DirectorOutput, Move } from "@/lib/contracts";
import { applyMove, beliefAnswer, spokenAnswer } from "@/lib/engine/mindState";
import { helloSpeakers, mostEager, pickSpeakers } from "@/lib/engine/speakers";
import type { EngineState } from "@/lib/engine/types";

function start(): EngineState {
  return {
    scenarioId: "sub_2digit",
    scenarioVersion: 1,
    lang: "en",
    currentSum: [52, 27],
    children: [
      { id: "ravi", bug: "smallerFromLarger", state: "STUCK", revealed: false, engagement: 3, workedSum: null },
      { id: "arjun", bug: "borrowNoDecrement", state: "STUCK", revealed: false, engagement: 2, workedSum: null },
      { id: "meena", bug: "countBackOffByOne", state: "STUCK", revealed: false, engagement: 2, workedSum: null },
      { id: "sana", bug: null, state: "GOT_IT", revealed: false, engagement: 0, workedSum: null },
    ],
    parrots: {},
    turnCount: 0,
    startedAt: "2026-10-27T10:00:00.000Z",
  };
}

type To = DirectorOutput["addressedTo"];
function d(
  move: Move,
  addressedTo: To = ["whole_class"],
  newTask = "",
  confidence: DirectorOutput["confidence"] = "high",
) {
  return { move, addressedTo, newTask, evidenceQuote: "…", confidence } satisfies DirectorOutput;
}

const child = (s: EngineState, id: ChildId): ChildState => s.children.find((c) => c.id === id)!;
const said = (s: EngineState, id: ChildId) => spokenAnswer(child(s, id), s.currentSum, s.parrots);
const believed = (s: EngineState, id: ChildId) => beliefAnswer(child(s, id), s.currentSum);

describe("Ravi across 7 turns (AGENTS.md 7.6)", () => {
  it("believes 35, 35, 35, 35, 25, 25, 37 and says 35, 25, 35, 35, 25, 25, 37", () => {
    const turns: DirectorOutput[] = [
      d("new_sum", ["whole_class"], "52-27"),
      d("tell_answer"),
      d("new_sum", ["whole_class"], "43-18"),
      d("ask_to_explain", ["ravi"]),
      d("concrete_materials", ["ravi"]),
      d("targeted_question", ["ravi"]),
      d("new_sum", ["whole_class"], "61-24"),
    ];
    let s = start();
    const beliefs: number[] = [];
    const spoken: number[] = [];
    const states: string[] = [];
    for (const turn of turns) {
      s = applyMove(s, turn);
      beliefs.push(believed(s, "ravi"));
      spoken.push(said(s, "ravi"));
      states.push(child(s, "ravi").state);
    }
    expect(beliefs).toEqual([35, 35, 35, 35, 25, 25, 37]);
    expect(spoken).toEqual([35, 25, 35, 35, 25, 25, 37]);
    expect(states).toEqual(["STUCK", "STUCK", "STUCK", "STUCK", "WOBBLY", "GOT_IT", "GOT_IT"]);
    expect(child(s, "ravi").workedSum).toEqual([43, 18]);
  });

  it("gives each turn the right speakers, modes and numbers", () => {
    let s = applyMove(start(), d("new_sum", ["whole_class"], "52-27"));
    expect(pickSpeakers(s, d("new_sum", ["whole_class"], "52-27"))).toEqual([
      { child: "ravi", mode: "answer", mustSay: 35 },
      { child: "arjun", mode: "answer", mustSay: 35 },
      { child: "meena", mode: "answer", mustSay: 26 },
    ]); // Sana stays quiet

    s = applyMove(s, d("tell_answer"));
    expect(pickSpeakers(s, d("tell_answer")).map((x) => [x.child, x.mode, x.mustSay])).toEqual([
      ["ravi", "parrot", 25],
      ["arjun", "parrot", 25],
      ["meena", "parrot", 25],
    ]);

    s = applyMove(s, d("new_sum", ["whole_class"], "43-18"));
    expect(pickSpeakers(s, d("new_sum")).map((x) => x.mustSay)).toEqual([35, 35, 26]); // the mistakes are back

    const explain = d("ask_to_explain", ["ravi"]);
    s = applyMove(s, explain);
    expect(pickSpeakers(s, explain)).toEqual([
      { child: "ravi", mode: "explain", mustSay: 35, steps: ["8 - 3 = 5", "4 - 1 = 3", "so 35"] },
    ]);

    const fix = d("concrete_materials", ["ravi"]);
    s = applyMove(s, fix);
    expect(pickSpeakers(s, fix)).toEqual([{ child: "ravi", mode: "answer", mustSay: 25 }]);
  });
});

describe("the rules of 7.4", () => {
  it("tell_answer never changes a mistake, and the parrot is only for this sum", () => {
    let s = applyMove(start(), d("tell_answer"));
    expect(child(s, "arjun").state).toBe("STUCK");
    expect(said(s, "arjun")).toBe(25);
    expect(believed(s, "arjun")).toBe(35);
    s = applyMove(s, d("new_sum", ["whole_class"], "61-24"));
    expect(s.parrots).toEqual({});
    expect(said(s, "arjun")).toBe(47);
  });

  it("a fix without a reveal stops at WOBBLY, and WOBBLY is right only on the worked sum", () => {
    let s = applyMove(start(), d("concrete_materials", ["meena"]));
    s = applyMove(s, d("targeted_question", ["meena"]));
    s = applyMove(s, d("concrete_materials", ["meena"]));
    expect(child(s, "meena").state).toBe("WOBBLY");
    expect(said(s, "meena")).toBe(25);
    s = applyMove(s, d("new_sum", ["whole_class"], "70-35"));
    expect(said(s, "meena")).toBe(36); // back to her mistake on a new sum
  });

  it("a fix on a WOBBLY child without a reveal moves the worked sum to the current sum", () => {
    let s = applyMove(start(), d("concrete_materials", ["ravi"]));
    s = applyMove(s, d("new_sum", ["whole_class"], "43-18"));
    s = applyMove(s, d("targeted_question", ["ravi"]));
    expect(child(s, "ravi").workedSum).toEqual([43, 18]);
    expect(said(s, "ravi")).toBe(25);
  });

  it("reveal then fix reaches GOT_IT, which is right on every sum", () => {
    let s = applyMove(start(), d("compare_methods", ["ravi", "arjun"]));
    s = applyMove(s, d("concrete_materials", ["arjun"]));
    s = applyMove(s, d("targeted_question", ["arjun"]));
    expect(child(s, "arjun").state).toBe("GOT_IT");
    s = applyMove(s, d("new_sum", ["whole_class"], "92-46"));
    expect(said(s, "arjun")).toBe(46);
    expect(child(s, "ravi")).toMatchObject({ revealed: true, state: "STUCK" });
  });

  it("think_aloud never reaches GOT_IT, even after a reveal", () => {
    let s = applyMove(start(), d("ask_to_explain", ["ravi"]));
    for (let i = 0; i < 3; i++) s = applyMove(s, d("think_aloud"));
    expect(child(s, "ravi").state).toBe("WOBBLY");
    expect(child(s, "meena").state).toBe("WOBBLY");
  });

  it("engagement stays between 0 and 3", () => {
    let s = start();
    for (let i = 0; i < 5; i++) s = applyMove(s, d("specific_praise"));
    expect(s.children.map((c) => c.engagement)).toEqual([3, 3, 3, 3]);
    for (let i = 0; i < 5; i++) s = applyMove(s, d("move_on_or_scold"));
    expect(s.children.map((c) => c.engagement)).toEqual([0, 0, 0, 0]);
  });

  it("Sana at engagement 0 stays silent, even when named, until she is invited", () => {
    let s = start();
    expect(pickSpeakers(applyMove(s, d("new_sum", ["sana"])), d("new_sum", ["sana"]))).toEqual([]);
    const invite = d("invite_quiet_child", ["sana"]);
    s = applyMove(s, invite);
    expect(child(s, "sana").engagement).toBe(1);
    expect(pickSpeakers(s, invite)).toEqual([{ child: "sana", mode: "answer", mustSay: 25 }]);
  });

  it("a child with no mistake never changes state", () => {
    let s = applyMove(start(), d("invite_quiet_child", ["sana"]));
    s = applyMove(s, d("concrete_materials", ["sana"]));
    s = applyMove(s, d("think_aloud", ["sana"]));
    expect(child(s, "sana")).toMatchObject({ state: "GOT_IT", workedSum: null });
  });

  it("a low-confidence move is treated as 'other' and changes nothing", () => {
    const unsure = d("concrete_materials", ["ravi"], "61-24", "low");
    const s = applyMove(start(), unsure);
    expect(child(s, "ravi").state).toBe("STUCK");
    expect(s.currentSum).toEqual([61, 24]); // the new sum still counts
    expect(pickSpeakers(s, unsure)).toEqual([{ child: "ravi", mode: "react", mustSay: null }]);
  });

  it("keeps the current sum for tasks it can't play (bigger from smaller, addition, 3 digits, words)", () => {
    for (const bad of ["18-43", "10+5", "125-30", "43 minus 18"]) {
      expect(applyMove(start(), d("new_sum", ["whole_class"], bad)).currentSum).toEqual([52, 27]);
    }
    // Any a − b with 0 ≤ b ≤ a ≤ 99 is now a sum (28 Oct): one-digit and no-borrowing sums too.
    expect(applyMove(start(), d("new_sum", ["whole_class"], "57-23")).currentSum).toEqual([57, 23]);
    expect(applyMove(start(), d("new_sum", ["whole_class"], "4-1")).currentSum).toEqual([4, 1]);
  });

  it("does not change the input state (pure)", () => {
    const s = start();
    const copy = structuredClone(s);
    applyMove(s, d("concrete_materials"));
    applyMove(s, d("tell_answer"));
    expect(s).toEqual(copy);
  });
});

describe("who speaks (7.5)", () => {
  it("a whole-class question takes at most 3, most eager first", () => {
    let s = applyMove(start(), d("invite_quiet_child", ["sana"]));
    s = applyMove(s, d("specific_praise", ["sana"]));
    s = applyMove(s, d("specific_praise", ["sana"])); // Sana 3: now as eager as Ravi
    expect(pickSpeakers(s, d("check_whole_class")).map((x) => x.child)).toEqual(["ravi", "sana", "arjun"]);
  });

  it("off_task: only the most eager child reacts, puzzled, with no number", () => {
    expect(pickSpeakers(start(), d("off_task"))).toEqual([{ child: "ravi", mode: "puzzled", mustSay: null }]);
  });

  it("'other' gets a reaction with no number", () => {
    expect(pickSpeakers(start(), d("other")).every((x) => x.mode === "react" && x.mustSay === null)).toBe(true);
  });

  it("a GOT_IT child explains the correct steps", () => {
    let s = applyMove(start(), d("ask_to_explain", ["ravi"]));
    s = applyMove(s, d("concrete_materials", ["ravi"]));
    s = applyMove(s, d("concrete_materials", ["ravi"]));
    const explain = d("ask_to_explain", ["ravi"]);
    expect(pickSpeakers(applyMove(s, explain), explain)[0]).toEqual({
      child: "ravi",
      mode: "explain",
      mustSay: 25,
      steps: ["12 - 7 = 5", "4 - 2 = 2", "so 25"],
    });
  });

  it("hello: everyone not withdrawn; most eager is Ravi", () => {
    expect(helloSpeakers(start()).map((c) => c.id)).toEqual(["ravi", "arjun", "meena"]);
    expect(mostEager(start())?.id).toBe("ravi");
  });
});
