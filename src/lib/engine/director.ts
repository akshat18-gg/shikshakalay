/**
 * Asks Claude (Haiku 5.5, fast) which teaching move the teacher made. If the call fails, the turn goes on as
 * "other, low confidence" — nothing changes in the children's minds, and they react politely.
 */
import { askJson } from "@/lib/ai/claude";
import { directorSystem, directorUser, version } from "@/lib/ai/prompts/director";
import { DirectorOutput } from "@/lib/contracts";
import { normaliseDigits } from "./guardrails";
import type { AiTurnContext } from "./types";

export type DirectorResult = { director: DirectorOutput; ok: boolean };

export function namesFor(ctx: Pick<AiTurnContext, "scenario" | "state">): Record<string, string> {
  return Object.fromEntries(ctx.scenario.children.map((c) => [c.id, c.name[ctx.state.lang]]));
}

/** Tidies Claude's answer: known children only, "43 − 18" → "43-18", quote trimmed. */
export function cleanDirector(d: DirectorOutput, childIds: string[]): DirectorOutput {
  const to = [...new Set(d.addressedTo)].filter((x) => x === "whole_class" || childIds.includes(x));
  const newTask = normaliseDigits(d.newTask).replace(/[−–—]/g, "-").replace(/\s+/g, "");
  return {
    ...d,
    addressedTo: to.length === 0 || to.includes("whole_class") ? ["whole_class"] : to,
    newTask,
    evidenceQuote: d.evidenceQuote.trim().slice(0, 300),
  };
}

export const UNSURE: DirectorOutput = {
  move: "other",
  addressedTo: ["whole_class"],
  newTask: "",
  evidenceQuote: "",
  confidence: "low",
};

export async function tagMove(ctx: AiTurnContext): Promise<DirectorResult> {
  const [a, b] = ctx.state.currentSum;
  try {
    const r = await askJson(
      {
        purpose: "director",
        model: ctx.models.director,
        promptVersion: version,
        schema: DirectorOutput,
        system: directorSystem(ctx.scenario),
        user: directorUser({ currentSum: `${a}-${b}`, recent: ctx.recent, names: namesFor(ctx), teacher: ctx.teacher }),
        maxTokens: 300,
        fast: true,
        sessionId: ctx.sessionId,
        turn: ctx.turn,
      },
      ctx.ai,
    );
    return {
      director: cleanDirector(
        r.data,
        ctx.scenario.children.map((c) => c.id),
      ),
      ok: true,
    };
  } catch {
    return { director: UNSURE, ok: false }; // the failure is already in ai_calls and the log
  }
}
