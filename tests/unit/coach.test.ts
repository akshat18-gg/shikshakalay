/**
 * The Coach with a fake Claude: the quote check, the rewrite call, and the plain-card fallback.
 */
import { describe, expect, it } from "vitest";
import type { ClaudeClient } from "@/lib/ai/claude";
import type { CoachTurn } from "@/lib/ai/prompts/coach";
import { CoachCard, type DirectorOutput } from "@/lib/contracts";
import { badQuotes, enforceQuotes, levenshtein, normaliseQuote, quoteFound, writeCard } from "@/lib/engine/coach";
import { loadScenario, startState } from "@/lib/engine/scenario";

const scenario = loadScenario("sub_2digit")!;
const kids = startState(scenario, "en", "2026-10-27T10:00:00.000Z").children;
const d = (move: DirectorOutput["move"], to: DirectorOutput["addressedTo"] = ["whole_class"]): DirectorOutput => ({
  move,
  addressedTo: to,
  newTask: "",
  evidenceQuote: "",
  confidence: "high",
});
const turn = (n: number, text: string, move: DirectorOutput["move"] | null): CoachTurn => ({
  turn: n,
  teacherText: text,
  director: move ? d(move) : null,
  lines: [],
  statesBefore: kids,
  statesAfter: kids,
});
const LESSON: CoachTurn[] = [
  turn(0, "", null),
  turn(1, "What is 52 minus 27?", "new_sum"),
  turn(2, "No, it is 25. Everyone say 25.", "tell_answer"),
  turn(3, "Ravi, tell me how you got 35.", "ask_to_explain"),
];
const SAID = new Map(LESSON.filter((t) => t.turn > 0).map((t) => [t.turn, t.teacherText]));

function card(over: Partial<CoachCard> = {}): CoachCard {
  return {
    strength: { turn: 3, quote: "tell me how you got 35", why: "You found out how Ravi thinks." },
    fix: { turn: 2, quote: "No, it is 25.", whatHappened: "They repeated 25.", tryInstead: "Use bundles." },
    sayTomorrow: "Two of you got 35. Tell me how you each got it.",
    teachScores: [{ element: "checks_for_understanding", score: 4, turn: 3, quote: "Ravi, tell me how" }],
    ...over,
  };
}

const usage = { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
function fakeClaude(replies: (CoachCard | Error)[]) {
  const users: string[] = [];
  const client = {
    messages: {
      parse: async (p: { messages: { content: string }[] }) => {
        users.push(p.messages[0]!.content);
        const next = replies.shift();
        if (!next || next instanceof Error) throw next ?? new Error("no reply");
        return { parsed_output: next, stop_reason: "end_turn", usage };
      },
    },
  } as unknown as ClaudeClient;
  return { users, ai: { client, record: async () => {} } };
}

const run = (ai: ReturnType<typeof fakeClaude>["ai"], over: Partial<Parameters<typeof writeCard>[0]> = {}) =>
  writeCard({ scenario, lang: "en", turns: LESSON, model: "claude-sonnet-5-5", ai, ...over });

describe("quote matching", () => {
  it("ignores case, punctuation (incl. ।) and spacing", () => {
    expect(normaliseQuote("Ravi,  TELL me… how?")).toBe("ravi tell me how");
    expect(quoteFound("रवि तुमने कैसे किया", "रवि, तुमने कैसे किया? बताओ।")).toBe(true);
  });

  it("accepts a ≥ 90% match for small slips, refuses invented words", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(quoteFound("tell me how you got 35", "Ravi, tell me how you got 35.")).toBe(true);
    expect(quoteFound("tell me how you gott 35", "Ravi, tell me how you got 35.")).toBe(true);
    expect(quoteFound("explain your thinking to me", "Ravi, tell me how you got 35.")).toBe(false);
    expect(quoteFound("", "anything")).toBe(false);
  });

  it("finds every bad quote, including a turn that doesn't exist", () => {
    const bad = badQuotes(card({ fix: { ...card().fix, turn: 9 } }), SAID);
    expect(bad.map((b) => b.field)).toEqual(["fix"]);
    expect(bad[0]?.realWords).toBe("(no such turn)");
  });

  it("enforceQuotes drops a bad score, repairs strength/fix with her words, clamps scores", () => {
    const { card: safe, dropped } = enforceQuotes(
      card({
        strength: { turn: 3, quote: "You are a great teacher", why: "…" },
        teachScores: [
          { element: "feedback", score: 9, turn: 3, quote: "tell me how you got 35" },
          { element: "critical_thinking", score: 3, turn: 1, quote: "compare your methods" },
        ],
      }),
      SAID,
    );
    expect(safe.strength.quote).toBe("Ravi, tell me how you got 35.");
    expect(safe.teachScores).toEqual([{ element: "feedback", score: 5, turn: 3, quote: "tell me how you got 35" }]);
    expect(dropped).toBe(2);
  });
});

describe("writeCard", () => {
  it("keeps a card whose quotes are all hers", async () => {
    const { ai, users } = fakeClaude([card()]);
    const r = await run(ai);
    expect(r).toMatchObject({ source: "coach", quotesVerified: true, droppedPoints: 0 });
    expect(users).toHaveLength(1);
    expect(users[0]).toContain("<teacher_said>Ravi, tell me how you got 35.</teacher_said>");
  });

  it("a made-up quote never reaches the card, even when the rewrite invents again", async () => {
    const invented = card({ fix: { ...card().fix, quote: "You shouted at the children" } });
    const { ai, users } = fakeClaude([invented, invented]);
    const r = await run(ai);
    expect(users).toHaveLength(2);
    expect(users[1]).toContain(
      'you quoted "You shouted at the children" for turn 2, but she said: "No, it is 25. Everyone say 25."',
    );
    expect(r.card.fix.quote).toBe("No, it is 25. Everyone say 25.");
    expect(r).toMatchObject({ quotesVerified: false, droppedPoints: 1 });
    for (const q of [r.card.strength.quote, r.card.fix.quote, ...r.card.teachScores.map((s) => s.quote)]) {
      expect([...SAID.values()].some((w) => quoteFound(q, w))).toBe(true);
    }
  });

  it("the rewrite call can fix the quotes", async () => {
    const invented = card({ strength: { ...card().strength, quote: "Brilliant questioning" } });
    const { ai } = fakeClaude([invented, card()]);
    expect(await run(ai)).toMatchObject({ quotesVerified: true, droppedPoints: 0, source: "coach" });
  });

  it("falls back to the plain card when the Coach fails twice", async () => {
    const { ai, users } = fakeClaude([new Error("timeout"), new Error("timeout")]);
    const r = await run(ai);
    expect(users).toHaveLength(2);
    expect(r.source).toBe("plain");
    expect(CoachCard.parse(r.card).strength.quote).toBe("Ravi, tell me how you got 35.");
  });

  it("uses the plain card without calling Claude when the budget is used up or nothing was said", async () => {
    const { ai, users } = fakeClaude([]);
    expect((await run(ai, { allowClaude: false })).source).toBe("plain");
    expect((await run(ai, { turns: [turn(0, "", null)] })).source).toBe("plain");
    expect(users).toHaveLength(0);
  });
});
