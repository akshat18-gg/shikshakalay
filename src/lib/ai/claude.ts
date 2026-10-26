/**
 * One helper for every Claude call (owner: P1). STARTER — P1 adds logging into the ai_calls table.
 * Checked against @anthropic-ai/sdk 1.3.0 on 24 Oct 2026.
 *
 * - Structured output: Claude must return JSON that matches the Zod schema (messages.parse + zodOutputFormat).
 * - Prompt caching: the long system prompt (rules + scenario pack) is cached for 5 minutes.
 * - fast = Director and Children on Haiku 5.5: thinking off, effort low.
 *   If the children move to Sonnet 5.5, call with fast: false and thinking: { type: "between_tools" } or leave the default.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY

export type AskJsonOptions<S extends z.ZodType> = {
  purpose: "director" | "children" | "coach" | "eval_gen";
  model: string; // from env: DIRECTOR_MODEL / CHILD_MODEL / COACH_MODEL
  promptVersion: string; // e.g. "director@3" — saved with every call
  schema: S;
  system: string; // long, unchanging part: rules + scenario pack (gets cached)
  user: string; // short, changing part: recent turns + <teacher_said>…</teacher_said>
  fast?: boolean;
  maxTokens?: number;
  sessionId?: string;
  turn?: number;
};

export type AskJsonResult<T> = {
  data: T;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
  };
  ms: number;
};

export async function askJson<S extends z.ZodType>(o: AskJsonOptions<S>): Promise<AskJsonResult<z.infer<S>>> {
  const started = Date.now();
  const msg = await client.messages.parse({
    model: o.model,
    max_tokens: o.maxTokens ?? 1500,
    ...(o.fast ? { thinking: { type: "disabled" as const } } : {}),
    output_config: {
      ...(o.fast ? { effort: "low" as const } : {}),
      format: zodOutputFormat(o.schema),
    },
    system: [{ type: "text", text: o.system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: o.user }],
  });
  const ms = Date.now() - started;
  if (msg.parsed_output == null) {
    throw new Error(`Claude returned no JSON (purpose: ${o.purpose}, stop_reason: ${msg.stop_reason})`);
  }
  const usage = {
    inputTokens: msg.usage.input_tokens,
    outputTokens: msg.usage.output_tokens,
    cacheReadTokens: msg.usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: msg.usage.cache_creation_input_tokens ?? 0,
  };
  // TODO(P1): insert one row into ai_calls: purpose, model, promptVersion, usage, ms, ok/error, sessionId, turn.
  return { data: msg.parsed_output as z.infer<S>, usage, ms };
}
