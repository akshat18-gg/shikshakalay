import { describe, expect, it } from "vitest";
import type { ChildState } from "@/lib/contracts";
import { checkLine, fillBackup, normaliseDigits, numbersIn, strictReminder } from "@/lib/engine/guardrails";
import { loadScenario } from "@/lib/engine/scenario";

const stuck: ChildState = {
  id: "ravi",
  bug: "smallerFromLarger",
  state: "STUCK",
  revealed: false,
  engagement: 3,
  workedSum: null,
};
const gotIt: ChildState = { ...stuck, state: "GOT_IT" };

describe("numbers in a line", () => {
  it("reads Devanagari digits and whole numbers only", () => {
    expect(normaliseDigits("३५, टीचर जी!")).toBe("35, टीचर जी!");
    expect(numbersIn("35, Teacher! Not 125.")).toEqual([35, 125]);
  });
});

describe("checkLine", () => {
  it("passes a line with the engine's number", () => {
    expect(checkLine("35, Teacher! I did it first!", 35, [52, 27], stuck)).toEqual({ ok: true });
    expect(checkLine("३५, टीचर जी!", 35, [52, 27], stuck)).toEqual({ ok: true });
  });

  it("fails a missing number, a number inside a bigger one, words instead of digits", () => {
    expect(checkLine("Thirty-five, Teacher!", 35, [52, 27], stuck)).toMatchObject({ reason: "missing_number" });
    expect(checkLine("I got 135!", 35, [52, 27], stuck)).toMatchObject({ reason: "missing_number" });
  });

  it("fails a stuck child who drifts to the right answer, unless told to repeat it", () => {
    expect(checkLine("35… or maybe 25?", 35, [52, 27], stuck)).toMatchObject({ reason: "says_correct" });
    expect(checkLine("25, Teacher.", 25, [52, 27], stuck)).toEqual({ ok: true }); // parrot
    expect(checkLine("Yes! It is 25.", null, [52, 27], stuck)).toMatchObject({ reason: "says_correct" });
    expect(checkLine("25! I opened a bundle.", 25, [52, 27], gotIt)).toEqual({ ok: true });
  });

  it("allows the sum's own number when the answer equals it (70 − 35 = 35)", () => {
    expect(checkLine("70 minus 35 is 45!", 45, [70, 35], stuck)).toEqual({ ok: true });
    expect(checkLine("45! No… 35?", 45, [70, 35], stuck)).toMatchObject({ reason: "says_correct" });
  });

  it("fails empty and over-long lines", () => {
    expect(checkLine("  ", null, [52, 27], stuck)).toMatchObject({ reason: "empty" });
    expect(checkLine(`35 ${"very ".repeat(30)}`, 35, [52, 27], stuck)).toMatchObject({ reason: "too_long" });
  });
});

describe("backups and reminders", () => {
  const s = loadScenario("sub_2digit")!;
  it("fills the backup line for the child's state or mode", () => {
    expect(fillBackup(s, "en", { child: "ravi", mode: "answer", mustSay: 35 }, stuck)).toBe("35, Teacher!");
    expect(fillBackup(s, "hi", { child: "ravi", mode: "parrot", mustSay: 25 }, stuck)).toBe("25, टीचर जी!");
    expect(fillBackup(s, "en", { child: "ravi", mode: "puzzled", mustSay: null }, stuck)).toBe(
      "Teacher, what is that?",
    );
    expect(fillBackup(s, "hi", { child: "ravi", mode: "react", mustSay: null }, stuck)).toBe("जी, टीचर जी!");
  });

  it("writes the firm retry reminder", () => {
    expect(strictReminder("Ravi", 35, 25, stuck)).toBe(
      "Ravi's line MUST contain 35 as digits. Do NOT say 25. At most 20 words.",
    );
    expect(strictReminder("Ravi", 25, 25, gotIt)).toBe("Ravi's line MUST contain 25 as digits. At most 20 words.");
  });
});
