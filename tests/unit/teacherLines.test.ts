/**
 * Keeps the teacher-line fixture honest: valid labels, every move covered, real lesson sums, a language mix.
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { EvalTurn, Move } from "@/lib/contracts";
import { parseLessonSum } from "@/lib/engine/bugs";
import fixture from "../fixtures/teacher_lines.json";

const Line = EvalTurn.extend({
  id: z.string(),
  lang: z.enum(["en", "hi", "mixed"]),
  note: z.string().optional(),
}).strict();
const lines = z.object({ about: z.string(), lines: z.array(Line) }).parse(fixture).lines;

describe("teacher_lines.json", () => {
  it("has 30 lines with unique ids", () => {
    expect(lines).toHaveLength(30);
    expect(new Set(lines.map((l) => l.id)).size).toBe(30);
  });

  it("covers all 14 move tags", () => {
    expect(new Set(lines.map((l) => l.label))).toEqual(new Set(Move.options));
  });

  it("every newTask is empty or a real lesson sum", () => {
    for (const l of lines) if (l.newTask) expect(parseLessonSum(l.newTask), l.id).not.toBeNull();
  });

  it("mixes English, Hindi and Hinglish", () => {
    const count = (lang: string) => lines.filter((l) => l.lang === lang).length;
    expect(count("hi")).toBeGreaterThanOrEqual(8);
    expect(count("mixed")).toBeGreaterThanOrEqual(4);
    expect(count("en")).toBeGreaterThanOrEqual(12);
  });
});
