/**
 * Keeps the fake lesson honest: every mock answer must match the shared types in contracts.ts.
 * (Also gives CI a passing test from the first commit — Vitest fails when there are no tests.)
 */
import { describe, expect, it } from "vitest";
import { CoachCard, SessionView, StartLessonResult, TurnResult } from "@/lib/contracts";
import { mockCard, mockGetSession, mockRunTurn, mockStartLesson } from "@/lib/mocks/lesson";

describe("mock lesson", () => {
  it("starts with a hello that matches StartLessonResult", async () => {
    const start = await mockStartLesson("u1", { scenarioId: "sub_2digit", lang: "en" }, "web");
    expect(StartLessonResult.parse(start).hello.turn).toBe(0);
    expect(start.firstSum).toBe("52-27");
  });

  it("plays the 5 judge samples with valid TurnResults", async () => {
    const { sessionId } = await mockStartLesson("u1", { scenarioId: "sub_2digit", lang: "en" }, "web");
    const run = (text: string) => mockRunTurn(sessionId, { text, idempotencyKey: crypto.randomUUID() }, "web");

    const t1 = TurnResult.parse(await run("What is 52 minus 27?"));
    expect(t1.lines.find((l) => l.child === "ravi")?.text).toContain("35");
    expect(t1.lines.find((l) => l.child === "meena")?.text).toContain("26");

    const t2 = TurnResult.parse(await run("No, the answer is 25. Everyone say 25."));
    expect(t2.director?.move).toBe("tell_answer");

    const t3 = TurnResult.parse(await run("Now 43 minus 18?"));
    expect(t3.lines.find((l) => l.child === "ravi")?.text).toContain("35"); // the mistake comes back

    const t4 = TurnResult.parse(await run("Ravi, tell me how you got 35."));
    expect(t4.director?.move).toBe("ask_to_explain");

    const t5 = TurnResult.parse(await run("Show 43 with bundles and sticks. Can you take 8 sticks from 3?"));
    expect(t5.statesAfter.find((c) => c.id === "ravi")?.state).toBe("WOBBLY");

    const t6 = TurnResult.parse(await run("13 take away 8?"));
    expect(t6.statesAfter.find((c) => c.id === "ravi")?.state).toBe("GOT_IT");

    const t7 = TurnResult.parse(await run("Sana, what do you think? Take your time."));
    expect(t7.lines[0]?.child).toBe("sana");

    const end = TurnResult.parse(await run("end"));
    expect(end.lessonOver).toBe(true);

    const view = SessionView.parse(await mockGetSession(sessionId));
    expect(view.turns).toHaveLength(9); // hello + 8 turns
    expect(view.status).toBe("ended");
  });

  it("has a coaching card that matches CoachCard", () => {
    expect(CoachCard.parse(mockCard).fix.turn).toBe(2);
  });
});
