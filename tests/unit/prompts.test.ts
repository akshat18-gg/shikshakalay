/**
 * The Director and Children system prompts, built from each lesson file (director@5, children@4): the lesson pack
 * tells Claude the operation, how a step differs from a new task, and the module's own words — nothing per-turn.
 */
import { describe, expect, it } from "vitest";
import { childAge, childrenSystem, gotItHint, version as childrenVersion } from "@/lib/ai/prompts/children";
import { directorSystem, directorUser, version as directorVersion } from "@/lib/ai/prompts/director";
import { loadScenario } from "@/lib/engine/scenario";

const load = (id: string) => {
  const s = loadScenario(id);
  if (!s) throw new Error(`lesson file ${id} missing`);
  return s;
};
const sub = load("sub_2digit");
const addSmall = load("add_to_9");
const addCarry = load("add_2digit_carry");
const mulGroups = load("mul_groups");
const mulCarry = load("mul_2x1_carry");
const div = load("div_sharing");

describe("directorSystem", () => {
  it("keeps the version bumped for tonight's changes", () => {
    expect(directorVersion).toBe("director@5");
    expect(childrenVersion).toBe("children@4");
  });

  it("item 1: in times and sharing lessons, the other-sign question with the task's own numbers is a step", () => {
    const mul = directorSystem(mulGroups);
    expect(mul).toContain('"3 plus 4 is 7, but 3 times 4 means 3 groups of 4"');
    expect(mul).toContain('"4 plus 4 plus 4?" are steps → newTask ""');
    expect(mul.replace(/\s+/g, " ")).toContain(
      "the move is what she did: targeted_question, think_aloud, concrete_materials",
    );
    const share = directorSystem(div);
    expect(share).toContain(`"12 take away 3? That's not sharing"`);
    expect(share).toContain('"3 and 3 and 3 and 3?" are steps → newTask ""');
    // The general rule and the per-op example come in every lesson, including the one-digit adding lesson.
    for (const s of [sub, addSmall, addCarry, mulGroups, mulCarry, div]) {
      const text = directorSystem(s);
      expect(text).toContain("Only a genuinely NEW sum — numbers that are not the current task's own — is a new task");
      expect(text).toContain("it is a STEP even if she says it with another sign");
      expect(text).toContain("A genuinely new task of another kind");
    }
  });

  it("item 2: the two-digit factor comes first in a times task", () => {
    const text = directorSystem(mulCarry);
    expect(text).toContain('"four times twenty-three" = "23x4"');
    expect(text).toContain('"4 का 23 गुना" = "23x4"');
    expect(text).toContain('"23 into 4" = "23x4"');
    expect(text).toContain("The two-digit factor\n  comes FIRST");
  });

  it("item 3: operation words in Devanagari and Indian-English 'into', with a Devanagari example per sign", () => {
    const text = directorSystem(sub);
    for (const w of [
      "जोड़",
      "जोड़ो",
      "मिलाओ",
      "मिलाकर",
      "गुना",
      "गुणा",
      "बार",
      "का पहाड़ा",
      "भाग",
      "बाँटो",
      "में बाँटो",
    ]) {
      expect(text).toContain(`"${w}"`);
    }
    expect(text).toContain('"into" ("3 into 4" = 3x4');
    expect(directorSystem(sub)).toContain('"बावन में से सत्ताईस" = "52-27"');
    expect(directorSystem(addCarry)).toContain('"सत्ताईस और पैंतीस मिलाकर" = "27+35"');
    expect(directorSystem(mulGroups)).toContain('"तीन बार चार" = "3x4"');
    expect(directorSystem(div)).toContain('"12 को 3 में बाँटो" = "12/3"');
  });

  it("item 6: a one-digit adding lesson counts on (a step); a two-digit one keeps the column text", () => {
    const small = directorSystem(addSmall);
    expect(small).toContain('counting on one at a time: on 5+3 that is "5 and 1 more", "6, 7, 8"');
    expect(small).not.toContain("one column or the carry");
    const carry = directorSystem(addCarry);
    expect(carry).toContain("one column or the carry: on 27+35 that is 7, 5, 12, 2, 3, 1");
    expect(carry).not.toContain("counting on one at a time");
  });

  it("stays the same for every turn of a lesson (cached); the per-turn part lives in the user message", () => {
    expect(directorSystem(mulGroups)).toBe(directorSystem(mulGroups));
    const user = directorUser({ currentSum: "3x4", recent: [], names: {}, teacher: "4 plus 4 plus 4?" });
    expect(user).toContain("<current_sum>3x4</current_sum>");
    expect(user).toContain("<teacher_said>4 plus 4 plus 4?</teacher_said>");
    // The system block names the tag in its rules but never carries her words or the current sum of a turn.
    expect(directorSystem(mulGroups)).not.toContain("4 plus 4 plus 4?</teacher_said>");
    expect(directorSystem(mulGroups)).not.toContain("<current_sum>");
  });
});

describe("childrenSystem", () => {
  it("item 4: the GOT_IT hint is the module's own method, from its GOT_IT backup line", () => {
    expect(gotItHint(sub)).toBe("I opened a bundle.");
    expect(gotItHint(addSmall)).toBe("I counted on with my fingers.");
    expect(gotItHint(addCarry)).toBe("I tied a new bundle.");
    expect(gotItHint(mulGroups)).toBe("I counted all the groups.");
    expect(gotItHint(mulCarry)).toBe("I added the carry.");
    expect(gotItHint(div)).toBe("Everyone gets the same.");
    expect(childrenSystem(addSmall)).toContain('you may add how you did it ("I counted on with my fingers.")');
    expect(childrenSystem(addSmall)).not.toContain("new bundle");
    expect(childrenSystem(mulCarry)).toContain('how you did it ("I added the carry.")');
    expect(childrenSystem(mulCarry)).not.toContain("counting the groups");
  });

  it("item 5: no 'a adding sum'; the age and class follow the lesson's grade", () => {
    for (const s of [sub, addSmall, addCarry, mulGroups, mulCarry, div]) {
      const text = childrenSystem(s);
      expect(text).not.toMatch(/\ba adding\b|\ba a/);
      expect(text).not.toContain("about 7 years old");
      expect(text).toContain(`sums ("${s.backupLines.en.notToday}")`);
    }
    expect(childAge(addSmall)).toBe("6–7");
    expect(childAge(sub)).toBe("7–8");
    expect(childAge(mulCarry)).toBe("9–10");
    expect(childrenSystem(addSmall)).toContain("Class 1 children (about 6–7 years old)");
    expect(childrenSystem(addSmall)).toContain("the way a Class 1 child talks");
    expect(childrenSystem(sub)).toContain("Class 2 children (about 7–8 years old)");
    expect(childrenSystem(addCarry)).toContain("that is not adding (another kind of sum, very big numbers)");
  });
});
