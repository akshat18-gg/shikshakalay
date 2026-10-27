import { describe, expect, it } from "vitest";
import { problems, specs } from "../../evals/generate";
import { parseLessonSum } from "@/lib/engine/bugs";

describe("eval lesson plan", () => {
  const all = specs();

  it("plans 100 lessons: 50 weak + 50 strong, half Hindi, unique ids, valid final sums", () => {
    expect(all).toHaveLength(100);
    expect(all.filter((s) => s.kind === "weak")).toHaveLength(50);
    expect(all.filter((s) => s.lang === "hi")).toHaveLength(50);
    expect(new Set(all.map((s) => s.id)).size).toBe(100);
    for (const s of all) expect(parseLessonSum(s.finalSum), s.id).not.toBeNull();
    expect(all.filter((s) => s.kind === "strong").every((s) => s.focusChild !== null)).toBe(true);
  });

  it("rejects a weak lesson with a strong move and a strong lesson without reveal → fix → fix", () => {
    const weak = all.find((s) => s.kind === "weak")!;
    const strong = { ...all.find((s) => s.kind === "strong")!, focusChild: "ravi" as const };
    const turn = (label: string, to = ["whole_class"], newTask = "") =>
      ({ teacher: "x", label, addressedTo: to, newTask }) as never;
    const six = (extra: never[]) => [...extra, ...Array.from({ length: 6 - extra.length }, () => turn("other"))];
    expect(problems(weak, six([turn("ask_to_explain", ["ravi"])]))).toContain(
      "turn 1: ask_to_explain in a weak lesson",
    );
    expect(problems(strong, six([turn("concrete_materials", ["ravi"])]))).toContain("no reveal for ravi");
    expect(
      problems(
        strong,
        six([
          turn("ask_to_explain", ["ravi"]),
          turn("concrete_materials", ["ravi"]),
          turn("targeted_question", ["ravi"]),
        ]),
      ),
    ).toEqual([]);
    expect(problems(weak, six([turn("new_sum", ["whole_class"], "57-23")]))).toContain('turn 1: bad newTask "57-23"');
  });
});
