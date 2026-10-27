/**
 * The plain coaching card, built from her own words with no Claude call. Used when the Coach fails twice, so a
 * teacher never ends a lesson on a blank screen. Quotes are the first ≤ 12 words she really said in that turn.
 */
import type { CoachCard, DirectorOutput, Lang, Move } from "@/lib/contracts";
import { type MessageKey, t } from "@/lib/i18n";
import type { MoveEffects } from "./types";

export type CardTurn = { turn: number; teacherText: string; director: DirectorOutput | null };

export function firstWords(text: string, n = 12): string {
  return text.trim().split(/\s+/).filter(Boolean).slice(0, n).join(" ");
}

export function simpleCard(turns: CardTurn[], lang: Lang, effects: MoveEffects): CoachCard {
  const played = turns.filter((x) => x.director !== null && x.teacherText.trim());
  const find = (moves: Move[]) => played.find((x) => moves.includes(x.director!.move));

  const strong =
    (
      [
        [find(effects.reveal), "reveal"],
        [find([...effects.fix, ...effects.halfFix]), "fix"],
        [find(effects.engagementUp), "engage"],
        [played[0], "other"],
      ] as const
    ).find(([turn]) => turn) ?? ([undefined, "other"] as const);

  const weak =
    (
      [
        [find(["tell_answer"]), "tell"],
        [find(["repeat_same_way"]), "repeat"],
        [find(["move_on_or_scold"]), "scold"],
      ] as const
    ).find(([turn]) => turn) ??
    // No weak move: point at a different turn than the strength when there is one.
    ([played.filter((x) => x !== strong[0]).at(-1) ?? played.at(-1), "none"] as const);

  const quoteOf = (x: CardTurn | undefined) => ({ turn: x?.turn ?? 0, quote: x ? firstWords(x.teacherText) : "" });

  return {
    strength: { ...quoteOf(strong[0]), why: t(`card.simple.strengthWhy.${strong[1]}` as MessageKey, lang) },
    fix: {
      ...quoteOf(weak[0]),
      whatHappened: t(`card.simple.fixWhat.${weak[1]}` as MessageKey, lang),
      tryInstead: t("card.simple.tryInstead", lang),
    },
    sayTomorrow: t("card.simple.sayTomorrow", lang),
    teachScores: [],
  };
}
