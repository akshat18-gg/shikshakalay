/**
 * The pure pieces around the orchestrator: the fallback card, the "may this turn play?" checks, conflict detection.
 */
import { describe, expect, it } from "vitest";
import { CoachCard, type DirectorOutput, type TurnResult } from "@/lib/contracts";
import { isUniqueViolation } from "@/lib/db/queries/lessons";
import { type CardTurn, firstWords, simpleCard } from "@/lib/engine/simpleCard";
import { assertLessonOpen, assertUnderTurnLimit } from "@/lib/engine/turnGate";
import { DEFAULT_MOVE_EFFECTS } from "@/lib/engine/types";
import { HttpError } from "@/lib/http";

const d = (move: DirectorOutput["move"]): DirectorOutput => ({
  move,
  addressedTo: ["whole_class"],
  newTask: "",
  evidenceQuote: "",
  confidence: "high",
});
const T = (turn: number, teacherText: string, move: DirectorOutput["move"] | null): CardTurn => ({
  turn,
  teacherText,
  director: move ? d(move) : null,
});

describe("simpleCard", () => {
  const lesson = [
    T(0, "", null),
    T(1, "What is 52 minus 27?", "new_sum"),
    T(2, "No, it is 25. Everyone say 25 together now, loudly, all of you, again please.", "tell_answer"),
    T(3, "Ravi, tell me how you got 35.", "ask_to_explain"),
  ];

  it("quotes her own words: a reveal as the strength, telling the answer as the fix", () => {
    const card = CoachCard.parse(simpleCard(lesson, "en", DEFAULT_MOVE_EFFECTS));
    expect(card.strength).toMatchObject({ turn: 3, quote: "Ravi, tell me how you got 35." });
    expect(card.fix).toMatchObject({ turn: 2, quote: "No, it is 25. Everyone say 25 together now, loudly, all of" });
    expect(card.fix.whatHappened).toMatch(/repeated the answer/);
    expect(card.teachScores).toEqual([]);
  });

  it("with no weak move, the fix points at a different turn than the strength", () => {
    const turns = [T(1, "What is 52 minus 27?", "new_sum"), T(2, "Sana, what do you think?", "invite_quiet_child")];
    const card = simpleCard(turns, "en", DEFAULT_MOVE_EFFECTS);
    expect([card.strength.turn, card.fix.turn]).toEqual([2, 1]);
  });

  it("writes in Hindi and copes with a lesson with no turns", () => {
    expect(simpleCard(lesson, "hi", DEFAULT_MOVE_EFFECTS).sayTomorrow).toMatch(/दोनों बताओ/);
    const empty = CoachCard.parse(simpleCard([T(0, "", null)], "en", DEFAULT_MOVE_EFFECTS));
    expect(empty.strength).toMatchObject({ turn: 0, quote: "" });
  });

  it("firstWords keeps at most 12 words", () => {
    expect(firstWords(" a  b c ")).toBe("a b c");
    expect(firstWords("1 2 3 4 5 6 7 8 9 10 11 12 13").split(" ")).toHaveLength(12);
  });
});

describe("turn gate", () => {
  const start = new Date("2026-10-27T10:00:00Z");
  const at = (min: number) => new Date(start.getTime() + min * 60_000);
  const over = { lessonOver: true } as TurnResult;

  it("refuses ended lessons, a turn after the last one, and turns long after 5 minutes", () => {
    expect(() => assertLessonOpen({ status: "active", last: undefined, startedAt: start, now: at(5.5) })).not.toThrow();
    for (const bad of [
      { status: "ended" as const, last: undefined, now: at(1) },
      { status: "active" as const, last: over, now: at(1) },
      { status: "active" as const, last: undefined, now: at(6.1) },
    ]) {
      expect(() => assertLessonOpen({ ...bad, startedAt: start })).toThrow(HttpError);
    }
  });

  it("limits turns per hour", () => {
    expect(() => assertUnderTurnLimit(39, 40)).not.toThrow();
    expect(() => assertUnderTurnLimit(40, 40)).toThrow(/Too many turns/);
  });
});

describe("isUniqueViolation", () => {
  it("spots Postgres 23505, bare or wrapped", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(isUniqueViolation({ cause: { code: "23505" } })).toBe(true);
    expect(isUniqueViolation(new Error("other"))).toBe(false);
  });
});
