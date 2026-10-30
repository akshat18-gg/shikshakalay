import { describe, expect, it } from "vitest";
import type { EvalLesson } from "../../src/lib/contracts";
import { applyReview, compare, parseReview, pickSpotChecks, renderReview } from "../../evals/label-check";

const lesson = (id: string, labels: EvalLesson["turns"][number]["label"][]): EvalLesson => ({
  id,
  scenarioId: "sub_2digit",
  lang: "en",
  kind: "weak",
  focusChild: null,
  turns: labels.map((label, i) => ({ teacher: `line ${i + 1}`, label, addressedTo: ["whole_class"], newTask: "" })),
  finalSum: "61-24",
  reviewed: false,
  labelSource: "generator",
});

const lessons = [lesson("a", ["new_sum", "tell_answer"]), lesson("b", ["new_sum", "other", "tell_answer"])];
const checked = { a: ["new_sum", "tell_answer"], b: ["new_sum", "specific_praise", "repeat_same_way"] } as const;

describe("label check", () => {
  it("finds the turns where the two passes disagree", () => {
    const r = compare(lessons, { a: [...checked.a], b: [...checked.b] });
    expect(r.agreedLessons).toEqual(["a"]);
    expect(r.disagreements.map((d) => [d.lessonId, d.turn, d.generator, d.checker])).toEqual([
      ["b", 2, "other", "specific_praise"],
      ["b", 3, "tell_answer", "repeat_same_way"],
    ]);
    expect(r.agreedTurns).toHaveLength(3);
  });

  it("treats a lesson with a missing or wrong-length answer as not checked", () => {
    const r = compare(lessons, { a: ["new_sum"] });
    expect(r.missing).toEqual(["a", "b"]);
    const out = applyReview(lessons, { a: ["new_sum"] }, { picks: [], spots: [] });
    expect(out.every((l) => !l.reviewed)).toBe(true);
  });

  it("picks the same spot checks every time", () => {
    const turns = Array.from({ length: 50 }, (_, i) => ({
      lessonId: "x",
      turn: i + 1,
      teacher: "",
      label: "other" as const,
    }));
    expect(pickSpotChecks(turns, 5)).toEqual(pickSpotChecks(turns, 5));
    expect(new Set(pickSpotChecks(turns, 40).map((t) => t.turn)).size).toBe(40);
  });

  it("round-trips the review file: A, B, a typed tag, blank, and spot-check answers", () => {
    const c = { a: [...checked.a], b: [...checked.b] };
    const { disagreements, agreedTurns } = compare(lessons, c);
    let md = renderReview(disagreements, agreedTurns, 5);
    expect(md).toContain("agree on **3 of 5** lines");
    // Before the operator answers: b stays unreviewed, a is agreed.
    let out = applyReview(lessons, c, parseReview(md));
    expect(out.map((l) => [l.reviewed, l.labelSource])).toEqual([
      [true, "agreed"],
      [false, "generator"],
    ]);
    md = md.replace("Pick:\n", "Pick: B\n").replace("Pick:\n", "Pick: `move_on_or_scold`\n");
    md = md.replace("\nOK: yes", "\nOK: no think_aloud");
    out = applyReview(lessons, c, parseReview(md));
    expect(out[1]!.turns.map((t) => t.label)).toEqual(["new_sum", "specific_praise", "move_on_or_scold"]);
    expect(out[1]!.reviewed).toBe(true);
    expect(out[1]!.labelSource).toBe("human");
    // The first spot check (lesson a, turn 1 in render order) was changed by hand.
    expect(out[0]!.turns[0]!.label).toBe("think_aloud");
    expect(out[0]!.labelSource).toBe("human");
    // "A" keeps the first label.
    const keep = parseReview(renderReview(disagreements, [], 5).replace("Pick:\n", "Pick: A\n"));
    expect(keep.picks[0]!.move).toBe("other");
    expect(keep.picks[1]!.move).toBeNull();
  });
});

describe("eval rescore", () => {
  it("swaps in today's labels and keeps only reviewed lessons", async () => {
    const { rescore } = await import("../../evals/run");
    const saved = ["a", "b"].map((id) => ({
      id,
      kind: "weak" as const,
      lang: "en" as const,
      turns: [{ turn: 2, move: "tell_answer" as const, label: "new_sum" as const, toOk: true, taskOk: true }],
      lines: [],
      probe: [],
      resisted: true,
      taught: null,
    }));
    const now = [{ ...lessons[0]!, reviewed: true }, lessons[1]!];
    const out = rescore(saved, now, false);
    expect(out.map((r) => r.id)).toEqual(["a"]);
    expect(out[0]!.turns[0]!.label).toBe("tell_answer");
    expect(rescore(saved, now, true)).toHaveLength(2);
  });
});
