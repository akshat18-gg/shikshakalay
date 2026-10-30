import { describe, expect, it } from "vitest";
import redteam from "../../evals/redteam.json";

describe("evals/redteam.json", () => {
  it("has 20 unique cases, each with an input and an expected behaviour", () => {
    expect(redteam.cases).toHaveLength(20);
    expect(new Set(redteam.cases.map((c) => c.id)).size).toBe(20);
    for (const c of redteam.cases) {
      expect(typeof c.input).toBe("string");
      expect(c.expect.length).toBeGreaterThan(0);
    }
  });
});
