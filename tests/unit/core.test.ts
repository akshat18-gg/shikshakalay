/**
 * step() with fake Director and Children: the order of operations, counting, and the end of a lesson.
 */
import { describe, expect, it } from "vitest";
import type { DirectorOutput } from "@/lib/contracts";
import { MAX_TURNS, type StepDeps, isEndCommand, step } from "@/lib/engine/core";
import { loadScenario, startState } from "@/lib/engine/scenario";
import type { EngineState, Speaker } from "@/lib/engine/types";

const scenario = loadScenario("sub_2digit")!;
const START = "2026-10-27T10:00:00.000Z";
const at = (sec: number) => new Date(Date.parse(START) + sec * 1000);

/** Fake Claude: the Director always answers `d`; the children say exactly their number. */
function fake(d: DirectorOutput) {
  const calls = { director: 0, children: 0, speakers: [] as Speaker[][] };
  const deps: StepDeps = {
    tagMove: async () => (calls.director++, { director: d, ok: true }),
    writeLines: async (_ctx, speakers) => {
      calls.children++;
      calls.speakers.push(speakers);
      const lines = speakers.map((s) => ({ child: s.child, text: `${s.mustSay ?? "OK"}, Teacher!` }));
      const records = speakers.map((s, i) => ({
        ...lines[i]!,
        expectedAnswer: s.mustSay,
        passed: true,
        retries: 0,
        usedBackup: false,
      }));
      return { lines, records };
    },
  };
  return { deps, calls };
}

const D = (
  move: DirectorOutput["move"],
  addressedTo: DirectorOutput["addressedTo"] = ["whole_class"],
  newTask = "",
): DirectorOutput => ({
  move,
  addressedTo,
  newTask,
  evidenceQuote: "x",
  confidence: "high",
});

function input(state: EngineState, teacherText: string, sec = 10) {
  return { scenario, state, teacherText, now: at(sec), recent: [], models: { director: "h", child: "h" } };
}

describe("step", () => {
  it("plays a normal turn: Director → move → speakers → lines, and counts it", async () => {
    const { deps, calls } = fake(D("tell_answer"));
    const r = await step(input(startState(scenario, "en", START), "No, it is 25. Say 25."), deps);
    expect(r.lines.map((l) => l.text)).toEqual(["25, Teacher!", "25, Teacher!", "25, Teacher!"]);
    expect(r.state.parrots.ravi).toEqual({ sum: [52, 27], answer: 25 });
    expect(r.statesBefore).toEqual(startState(scenario, "en", START).children);
    expect(r).toMatchObject({ counted: true, lessonOver: false });
    expect(r.state.turnCount).toBe(1);
    expect(calls).toMatchObject({ director: 1, children: 1 });
  });

  it("an end command ends the lesson with no Claude call", async () => {
    const { deps, calls } = fake(D("other"));
    for (const words of ["end", "End lesson.", " खत्म ", "समाप्त।"]) {
      const r = await step(input(startState(scenario, "hi", START), words), deps);
      expect(r).toMatchObject({ lessonOver: true, counted: false, director: null, lines: [] });
    }
    expect(calls.director).toBe(0);
    expect(isEndCommand("the end of the sum")).toBe(false);
  });

  it("almost no words: the most eager child asks to hear it again, uncounted, no Claude", async () => {
    const { deps, calls } = fake(D("other"));
    const r = await step(input(startState(scenario, "hi", START), " . "), deps);
    expect(r.lines).toEqual([{ child: "ravi", text: "टीचर जी, फिर से बोलिए ना?" }]);
    expect(r).toMatchObject({ counted: false, director: null });
    expect(r.state.turnCount).toBe(0);
    expect(calls.director).toBe(0);
  });

  it("ends after 12 counted turns", async () => {
    const { deps } = fake(D("new_sum"));
    const r = await step(input({ ...startState(scenario, "en", START), turnCount: MAX_TURNS - 1 }, "Again?"), deps);
    expect(r).toMatchObject({ lessonOver: true });
    expect(r.state.turnCount).toBe(MAX_TURNS);
  });

  it("ends when 5 minutes have passed", async () => {
    const { deps } = fake(D("new_sum"));
    expect((await step(input(startState(scenario, "en", START), "Again?", 299), deps)).lessonOver).toBe(false);
    expect((await step(input(startState(scenario, "en", START), "Again?", 300), deps)).lessonOver).toBe(true);
  });

  it("trims the teacher's words to 1,000 characters", async () => {
    const { deps } = fake(D("other"));
    const r = await step(input(startState(scenario, "en", START), "a".repeat(5000)), deps);
    expect(r.teacherText).toHaveLength(1000);
  });

  it("a Director failure plays as a polite reaction and is reported", async () => {
    const { deps, calls } = fake(D("other"));
    deps.tagMove = async () => ({ director: { ...D("other"), confidence: "low" }, ok: false });
    const r = await step(input(startState(scenario, "en", START), "Something garbled"), deps);
    expect(r.directorOk).toBe(false);
    expect(calls.speakers[0]?.every((s) => s.mode === "react")).toBe(true);
  });
});
