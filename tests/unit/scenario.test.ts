/**
 * The lesson-file loader: the real sub_2digit.yaml loads; broken files fail with a message that says where.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse, stringify } from "yaml";
import {
  type Scenario,
  ScenarioError,
  backupLine,
  findScenario,
  listScenarios,
  loadScenario,
  parseScenario,
  startState,
} from "@/lib/engine/scenario";
import type { Move } from "@/lib/contracts";
import { DEFAULT_MOVE_EFFECTS } from "@/lib/engine/types";

const REAL = readFileSync("content/scenarios/sub_2digit.yaml", "utf8");

/** The real file with one change applied to its parsed form. */
function broken(change: (doc: Scenario & Record<string, unknown>) => void): string {
  const doc = parse(REAL) as Scenario & Record<string, unknown>;
  change(doc);
  return stringify(doc);
}

function errorOf(yamlText: string): string {
  try {
    parseScenario(yamlText, "test.yaml");
  } catch (e) {
    expect(e).toBeInstanceOf(ScenarioError);
    return (e as Error).message;
  }
  throw new Error("expected the file to be refused");
}

describe("sub_2digit.yaml", () => {
  it("loads, lists and matches the moves in AGENTS.md 7.3", () => {
    const s = loadScenario("sub_2digit");
    expect(s?.sums[0]).toBe("52-27");
    expect(s?.moves).toEqual(DEFAULT_MOVE_EFFECTS);
    expect(listScenarios().map((x) => x.id)).toContain("sub_2digit");
    expect(findScenario("sub_2digit")?.title.hi).toContain("घटाव");
  });

  it("starts the lesson as AGENTS.md 7.2 describes", () => {
    const st = startState(loadScenario("sub_2digit")!, "hi", "2026-10-27T10:00:00.000Z");
    expect(st.currentSum).toEqual([52, 27]);
    expect(st.children.map((c) => [c.id, c.bug, c.state, c.engagement])).toEqual([
      ["ravi", "smallerFromLarger", "STUCK", 3],
      ["arjun", "borrowNoDecrement", "STUCK", 2],
      ["meena", "countBackOffByOne", "STUCK", 2],
      ["sana", null, "GOT_IT", 0],
    ]);
    expect(st).toMatchObject({ lang: "hi", turnCount: 0, parrots: {} });
  });

  it("fills {answer} in backup lines", () => {
    const s = loadScenario("sub_2digit")!;
    expect(backupLine(s, "en", "STUCK", 35)).toBe("35, Teacher!");
    expect(backupLine(s, "hi", "hello")).toBe("नमस्ते टीचर जी!");
  });

  it("returns null for a missing file or an unsafe id", () => {
    expect(loadScenario("no_such_lesson")).toBeNull();
    expect(loadScenario("../package")).toBeNull();
  });
});

describe("broken lesson files are refused with a clear message", () => {
  it("a missing Hindi backup line", () => {
    expect(errorOf(broken((d) => Reflect.deleteProperty(d.backupLines.hi, "repeat")))).toMatch(
      /test\.yaml is not valid: backupLines\.hi\.repeat/,
    );
  });

  it("a backup line without {answer}, or a reaction with one", () => {
    expect(errorOf(broken((d) => (d.backupLines.en.STUCK = "Teacher!")))).toMatch(
      /backupLines\.en\.STUCK: must contain \{answer\}/,
    );
    expect(errorOf(broken((d) => (d.backupLines.hi.react = "{answer}!")))).toMatch(/backupLines\.hi\.react/);
  });

  it("a mistake that bugs.ts doesn't know", () => {
    expect(errorOf(broken((d) => (d.children[0]!.bug = "guessRandomly")))).toMatch(
      /children\.0\.bug: is not a mistake/,
    );
  });

  it("a sum without borrowing, an unknown move, a missing Hindi name", () => {
    expect(errorOf(broken((d) => d.sums.push("57-23")))).toMatch(/sums\.6: must be a 2-digit sum that needs borrowing/);
    expect(errorOf(broken((d) => d.moves.fix.push("shout" as Move)))).toMatch(/moves\.fix\.2/);
    expect(errorOf(broken((d) => Reflect.deleteProperty(d.children[2]!.name, "hi")))).toMatch(/children\.2\.name\.hi/);
  });

  it("bad YAML and unknown keys", () => {
    expect(errorOf("id: [unclosed")).toMatch(/YAML/);
    expect(errorOf(broken((d) => (d.extraThing = 1)))).toMatch(/test\.yaml is not valid/);
  });
});
