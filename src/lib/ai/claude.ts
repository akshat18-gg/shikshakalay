/**
 * One helper for every Claude call. Checked against @anthropic-ai/sdk 1.3.0 on 27 Oct 2026.
 *
 * - Structured output: Claude must return JSON matching the Zod schema (messages.parse + zodOutputFormat).
 * - Prompt caching: the long, unchanging system prompt (rules + lesson pack) is cached for 5 minutes.
 * - fast = Director and Children on Haiku 5.5: thinking off, effort low. The Coach (Sonnet 5.5) leaves thinking at
 *   its default — Sonnet 5.5 rejects thinking "disabled". No temperature/top_p/top_k: the 5.5 models reject them.
 * - A refusal, a cut-off answer (max_tokens) or missing JSON counts as a failed call: the caller's fallback runs.
 * - Every call, ok or not, writes one ai_calls row (tokens, cache, ms, cost) and one log line — never the prompt.
 * - The client and the recorder are passed in for tests; the real ones are made on first use (no key needed to
 *   import this file, so CI and mock mode are fine).
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import type { AiCallRow } from "@/lib/db/queries/aiCalls";
import { log, logError } from "@/lib/log";
import { type Usage, costUsd } from "./pricing";

export type Purpose = "director" | "children" | "coach" | "eval_gen";

/** Director and Children answer inside a turn; the Coach writes a whole card. */
const TIMEOUT_MS: Record<Purpose, number> = { director: 15_000, children: 15_000, coach: 45_000, eval_gen: 120_000 };

export type ClaudeClient = Pick<Anthropic, "messages">;
export type RecordCall = (row: AiCallRow) => Promise<void>;

export type AskJsonOptions<S extends z.ZodType> = {
  purpose: Purpose;
  model: string; // from env: DIRECTOR_MODEL / CHILD_MODEL / COACH_MODEL
  promptVersion: string; // e.g. "director@3" — saved with every call
  schema: S;
  system: string; // long, unchanging part: rules + scenario pack (gets cached)
  user: string; // short, changing part: recent turns + <teacher_said>…</teacher_said>
  maxTokens: number;
  fast?: boolean;
  sessionId?: string;
  turn?: number;
};

export type AskJsonDeps = { client?: ClaudeClient; record?: RecordCall; now?: () => number };

export type AskJsonResult<T> = { data: T; usage: Usage; ms: number; costUsd: number | null };

/** A call that ran but gave no usable answer. `reason` says why (for the AI trace and the fallback path). */
export class ClaudeCallError extends Error {
  constructor(
    public readonly reason: "refusal" | "max_tokens" | "no_json" | "api_error",
    message: string,
  ) {
    super(message);
    this.name = "ClaudeCallError";
  }
}

let defaultClient: Anthropic | undefined;
function realClient(): Anthropic {
  // maxRetries 1: a user is waiting; one quick retry on 429/5xx/connection errors, then the fallback.
  defaultClient ??= new Anthropic({ maxRetries: 1 });
  return defaultClient;
}

const realRecord: RecordCall = async (row) => {
  const { insertAiCall } = await import("@/lib/db/queries/aiCalls");
  await insertAiCall(row);
};

function readUsage(u: Anthropic.Usage | undefined): Usage {
  return {
    inputTokens: u?.input_tokens ?? 0,
    outputTokens: u?.output_tokens ?? 0,
    cacheReadTokens: u?.cache_read_input_tokens ?? 0,
    cacheWriteTokens: u?.cache_creation_input_tokens ?? 0,
  };
}

export async function askJson<S extends z.ZodType>(
  o: AskJsonOptions<S>,
  deps: AskJsonDeps = {},
): Promise<AskJsonResult<z.infer<S>>> {
  const now = deps.now ?? Date.now;
  const record = deps.record ?? realRecord;
  const started = now();
  let usage = readUsage(undefined);

  async function finish(ok: boolean, error: string | null) {
    const ms = now() - started;
    const cost = costUsd(o.model, usage);
    const row: AiCallRow = {
      sessionId: o.sessionId ?? null,
      turn: o.turn ?? null,
      purpose: o.purpose,
      provider: "anthropic",
      model: o.model,
      promptVersion: o.promptVersion,
      ...usage,
      ms,
      costUsd: cost,
      ok,
      error,
    };
    log("ai_call", row);
    try {
      await record(row);
    } catch (err) {
      logError("ai_call_record_failed", err, { purpose: o.purpose, sessionId: o.sessionId });
    }
    return { ms, cost };
  }

  let msg: Awaited<ReturnType<Anthropic["messages"]["parse"]>>;
  try {
    msg = await (deps.client ?? realClient()).messages.parse(
      {
        model: o.model,
        max_tokens: o.maxTokens,
        ...(o.fast ? { thinking: { type: "disabled" as const } } : {}),
        output_config: {
          ...(o.fast ? { effort: "low" as const } : {}),
          format: zodOutputFormat(o.schema),
        },
        system: [{ type: "text", text: o.system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: o.user }],
      },
      { timeout: TIMEOUT_MS[o.purpose] },
    );
  } catch (err) {
    // The SDK's message comes from the API (status, "Request timed out."), never from the prompt.
    const detail = err instanceof Anthropic.APIError ? `HTTP ${err.status ?? "none"}: ${err.message}` : String(err);
    await finish(false, detail.slice(0, 300));
    throw new ClaudeCallError("api_error", `Claude call failed (${o.purpose}): ${detail}`);
  }

  usage = readUsage(msg.usage);
  const reason = msg.stop_reason === "refusal" ? "refusal" : msg.stop_reason === "max_tokens" ? "max_tokens" : null;
  if (reason || msg.parsed_output == null) {
    const why = reason ?? "no_json";
    await finish(false, why);
    throw new ClaudeCallError(why, `Claude gave no usable answer (${o.purpose}: ${why})`);
  }

  const { ms, cost } = await finish(true, null);
  return { data: msg.parsed_output as z.infer<S>, usage, ms, costUsd: cost };
}
