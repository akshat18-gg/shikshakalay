/**
 * The coaching card (AGENTS.md 7.9–7.10). Sonnet 5.5 writes it; code checks every quote against her real words.
 *   1. Coach call (one retry if the call fails; if both fail → the plain card built from her own words).
 *   2. Quote check. Any quote she didn't say → one rewrite call that shows her real words.
 *   3. Still wrong → drop that score; a strength/fix quote is replaced by her first ≤ 12 words of that turn.
 * A made-up quote never reaches the card.
 */
import { ClaudeCallError, askJson } from "@/lib/ai/claude";
import { type CoachTurn, coachSystem, coachUser, rewriteNote, version } from "@/lib/ai/prompts/coach";
import { CoachCard, type Lang } from "@/lib/contracts";
import type { Scenario } from "./scenario";
import { moveEffects } from "./scenario";
import { firstWords, simpleCard } from "./simpleCard";
import type { AiTurnContext } from "./types";

const SIMILAR_ENOUGH = 0.9;

/** NFKC, lower case, no punctuation (incl. the Devanagari danda), single spaces. */
export function normaliseQuote(s: string): string {
  return s.normalize("NFKC").toLowerCase().replace(/\p{P}/gu, " ").replace(/\s+/g, " ").trim();
}

export function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const up = prev[j]!;
      prev[j] = Math.min(prev[j]! + 1, prev[j - 1]! + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = up;
    }
  }
  return prev[b.length]!;
}

/** Is the quote inside her words — exactly, or ≥ 90% similar to a same-length window (small STT/typing slips)? */
export function quoteFound(quote: string, said: string): boolean {
  const q = normaliseQuote(quote);
  const s = normaliseQuote(said);
  if (!q || !s) return false;
  if (s.includes(q)) return true;
  const similar = (w: string) => 1 - levenshtein(q, w) / Math.max(q.length, w.length) >= SIMILAR_ENOUGH;
  if (q.length >= s.length) return similar(s);
  for (let i = 0; i + q.length <= s.length; i++) if (similar(s.slice(i, i + q.length))) return true;
  return false;
}

export type BadQuote = { field: string; turn: number; quote: string; realWords: string };

/** Every quote on the card that is not in her words of the turn it names. */
export function badQuotes(card: CoachCard, said: Map<number, string>): BadQuote[] {
  const items = [
    { field: "strength", turn: card.strength.turn, quote: card.strength.quote },
    { field: "fix", turn: card.fix.turn, quote: card.fix.quote },
    ...card.teachScores.map((s, i) => ({ field: `teachScores.${i}`, turn: s.turn, quote: s.quote })),
  ];
  return items
    .filter((x) => !quoteFound(x.quote, said.get(x.turn) ?? ""))
    .map((x) => ({ ...x, realWords: said.get(x.turn) ?? "(no such turn)" }));
}

/** Last line of defence: no unverified quote survives, scores are whole numbers 1–5. */
export function enforceQuotes(card: CoachCard, said: Map<number, string>): { card: CoachCard; dropped: number } {
  const bad = new Set(badQuotes(card, said).map((b) => b.field));
  const firstTurn = [...said.keys()].sort((a, b) => a - b)[0] ?? 0;
  let dropped = 0;
  const repair = <T extends { turn: number; quote: string }>(field: string, part: T): T => {
    if (!bad.has(field)) return part;
    dropped++;
    const turn = said.has(part.turn) ? part.turn : firstTurn;
    return { ...part, turn, quote: firstWords(said.get(turn) ?? "") };
  };
  const teachScores = card.teachScores
    .filter((s, i) => {
      if (!bad.has(`teachScores.${i}`)) return true;
      dropped++;
      return false;
    })
    .map((s) => ({ ...s, score: Math.min(5, Math.max(1, Math.round(s.score))) }));
  return {
    card: { ...card, strength: repair("strength", card.strength), fix: repair("fix", card.fix), teachScores },
    dropped,
  };
}

export type CardOutcome = {
  card: CoachCard;
  quotesVerified: boolean;
  droppedPoints: number;
  source: "coach" | "plain";
};

export async function writeCard(o: {
  scenario: Scenario;
  lang: Lang;
  turns: CoachTurn[];
  model: string;
  sessionId?: string;
  ai?: AiTurnContext["ai"];
  /** false when today's AI budget is used up: go straight to the plain card. */
  allowClaude?: boolean;
}): Promise<CardOutcome> {
  const played = o.turns.filter((t) => t.turn > 0 && t.director !== null && t.teacherText.trim());
  const said = new Map(played.map((t) => [t.turn, t.teacherText]));
  const plain = (): CardOutcome => ({
    card: simpleCard(o.turns, o.lang, moveEffects(o.scenario)),
    quotesVerified: true,
    droppedPoints: 0,
    source: "plain",
  });
  if (o.allowClaude === false || played.length === 0) return plain();

  const names = Object.fromEntries(o.scenario.children.map((c) => [c.id, c.name[o.lang]]));
  const finalStates = o.turns.at(-1)?.statesAfter ?? [];
  const user = coachUser({ lang: o.lang, turns: o.turns, names, finalStates });
  const ask = (extra = "") =>
    askJson(
      {
        purpose: "coach",
        model: o.model,
        promptVersion: version,
        schema: CoachCard,
        system: coachSystem(o.scenario),
        user: user + extra,
        maxTokens: 4000,
        sessionId: o.sessionId,
      },
      o.ai,
    );

  let card: CoachCard | null = null;
  for (let attempt = 0; attempt < 2 && !card; attempt++) {
    try {
      card = (await ask()).data;
    } catch (err) {
      if (!(err instanceof ClaudeCallError)) throw err;
    }
  }
  if (!card) return plain();

  let bad = badQuotes(card, said);
  if (bad.length) {
    try {
      card = (await ask(rewriteNote(bad))).data;
      bad = badQuotes(card, said);
    } catch (err) {
      if (!(err instanceof ClaudeCallError)) throw err;
    }
  }
  const { card: safe, dropped } = enforceQuotes(card, said);
  return { card: safe, quotesVerified: bad.length === 0, droppedPoints: dropped, source: "coach" };
}
