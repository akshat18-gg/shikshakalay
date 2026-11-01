/**
 * Asks Claude (Haiku 5.5, fast) which teaching move the teacher made. If the call fails, the turn goes on as
 * "other, low confidence" — nothing changes in the children's minds, and they react politely.
 */
import { askJson } from "@/lib/ai/claude";
import { directorSystem, directorUser, version } from "@/lib/ai/prompts/director";
import { DirectorOutput } from "@/lib/contracts";
import { type Operation, formatTask, parseTask } from "./bugs";
import { normaliseDigits } from "./guardrails";
import type { Sum } from "./types";
import type { AiTurnContext } from "./types";

export type DirectorResult = { director: DirectorOutput; ok: boolean };

export function namesFor(ctx: Pick<AiTurnContext, "scenario" | "state">): Record<string, string> {
  return Object.fromEntries(ctx.scenario.children.map((c) => [c.id, c.name[ctx.state.lang]]));
}

/**
 * Tidies Claude's answer: known children only, "43 − 18" → "43-18" (also "3 × 4" → "3x4", "12 ÷ 3" → "12/3"),
 * quote trimmed. `operation` is the lesson's, so a step of the current task is read the way the engine reads it.
 */
export function cleanDirector(
  d: DirectorOutput,
  childIds: string[],
  current?: Sum,
  operation: Operation = "sub",
): DirectorOutput {
  const to = [...new Set(d.addressedTo)].filter((x) => x === "whole_class" || childIds.includes(x));
  // ':' is a sharing sign only in a sharing lesson; elsewhere it stays as written (a time like "10:30" is no task).
  const written = normaliseDigits(d.newTask)
    .replace(/[−–—]/g, "-")
    .replace(/[X×*]/g, "x")
    .replace(operation === "div" ? /[÷:]/g : /÷/g, "/")
    .replace(/\s+/g, "");
  // A step of the current sum ("13-8" while on 43 − 18, "7+5" while on 27 + 35) or a slip ("43") is no new task.
  const newTask = parseTask(written, current, operation).kind === "none" ? "" : written;
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
  const op = ctx.scenario.operation;
  try {
    const r = await askJson(
      {
        purpose: "director",
        model: ctx.models.director,
        promptVersion: version,
        schema: DirectorOutput,
        system: directorSystem(ctx.scenario),
        user: directorUser({
          currentSum: formatTask(op, ctx.state.currentSum),
          recent: ctx.recent,
          names: namesFor(ctx),
          teacher: ctx.teacher,
        }),
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
        ctx.state.currentSum,
        op,
      ),
      ok: true,
    };
  } catch {
    return { director: UNSURE, ok: false }; // the failure is already in ai_calls and the log
  }
}
