import { describe, expect, it } from "vitest";
import { CoachCard, TurnResult } from "@/lib/contracts";
import { TEMPLATES, playDemoLesson } from "@/lib/demo/lessons";
import { loadScenario } from "@/lib/engine/scenario";

const scenario = loadScenario("sub_2digit")!;
const startedAt = new Date("2026-10-28T08:00:00Z");

describe("demo lessons (seed, no Claude)", () => {
  it("a weak lesson keeps the mistakes: they parrot 25, then say 35 again on 43 − 18", async () => {
    const l = await playDemoLesson({ scenario, lang: "en", script: TEMPLATES.weak, startedAt, sessionId: "s" });
    expect(l.turns[1]!.result.lines.map((x) => x.text)).toEqual(["25, Teacher!", "25, Teacher!", "25, Teacher!"]);
    expect(l.turns[2]!.result.lines.find((x) => x.child === "ravi")?.text).toBe("35, Teacher!");
    for (const t of l.turns) TurnResult.parse(t.result);
  });

  it("a strong lesson teaches Ravi (GOT_IT) and brings Sana in (engagement 0 → 1), in Hindi", async () => {
    const l = await playDemoLesson({ scenario, lang: "hi", script: TEMPLATES.strong, startedAt, sessionId: "s" });
    const ravi = l.state.children.find((c) => c.id === "ravi")!;
    expect(ravi.state).toBe("GOT_IT");
    const sanaTurn = l.turns[4]!;
    expect(sanaTurn.statesBefore.find((c) => c.id === "sana")!.engagement).toBe(0);
    expect(sanaTurn.statesAfter.find((c) => c.id === "sana")!.engagement).toBe(1);
    expect(sanaTurn.result.lines[0]?.child).toBe("sana");
  });

  it("makes a valid card whose quotes are her words, with Teach scores 1–5", async () => {
    for (const script of Object.values(TEMPLATES)) {
      const l = await playDemoLesson({ scenario, lang: "en", script, startedAt, sessionId: "s" });
      const card = CoachCard.parse(l.card);
      const said = l.turns.map((t) => t.teacherText).join(" ");
      expect(said).toContain(card.strength.quote);
      for (const s of card.teachScores) {
        expect(s.score).toBeGreaterThanOrEqual(1);
        expect(s.score).toBeLessThanOrEqual(5);
        expect(said).toContain(s.quote);
      }
    }
  });
});
