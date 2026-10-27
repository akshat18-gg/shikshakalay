/**
 * askJson with a fake Claude client: what we send, what we record, and how failures surface. No real API calls.
 */
import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { DirectorOutput } from "@/lib/contracts";
import { type AskJsonOptions, ClaudeCallError, type ClaudeClient, askJson } from "@/lib/ai/claude";
import type { AiCallRow } from "@/lib/db/queries/aiCalls";

const good = {
  move: "new_sum",
  addressedTo: ["whole_class"],
  newTask: "52-27",
  evidenceQuote: "52 minus 27",
  confidence: "high",
};
const usage = { input_tokens: 200, output_tokens: 40, cache_read_input_tokens: 3000, cache_creation_input_tokens: 0 };

type Sent = { params: Record<string, unknown>; options: { timeout?: number } };

/** A stand-in for the SDK client: returns `reply` (or throws it) and remembers what was sent. */
function fakeClient(reply: Record<string, unknown> | Error) {
  const sent: Sent[] = [];
  const client = {
    messages: {
      parse: async (params: Record<string, unknown>, options: { timeout?: number }) => {
        sent.push({ params, options });
        if (reply instanceof Error) throw reply;
        return reply;
      },
    },
  } as unknown as ClaudeClient; // only messages.parse is used
  return { client, sent };
}

function opts(over: Partial<AskJsonOptions<typeof DirectorOutput>> = {}): AskJsonOptions<typeof DirectorOutput> {
  return {
    purpose: "director",
    model: "claude-haiku-5-5",
    promptVersion: "director@1",
    schema: DirectorOutput,
    system: "rules",
    user: "<teacher_said>What is 52 minus 27?</teacher_said>",
    maxTokens: 400,
    fast: true,
    sessionId: "00000000-0000-0000-0000-000000000001",
    turn: 3,
    ...over,
  };
}

function recorder() {
  const rows: AiCallRow[] = [];
  return { rows, record: async (r: AiCallRow) => void rows.push(r) };
}

let clock = 0;
const now = () => (clock += 250);

describe("askJson", () => {
  it("returns the parsed answer and records tokens, cache and cost", async () => {
    const { client, sent } = fakeClient({ parsed_output: good, stop_reason: "end_turn", usage });
    const { rows, record } = recorder();
    const r = await askJson(opts(), { client, record, now });

    expect(r.data.newTask).toBe("52-27");
    expect(r.usage).toEqual({ inputTokens: 200, outputTokens: 40, cacheReadTokens: 3000, cacheWriteTokens: 0 });
    // 200 × 0.10 + 3000 × 0.01 + 40 × 0.50 per million
    expect(r.costUsd).toBeCloseTo(0.00007, 10);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      purpose: "director",
      provider: "anthropic",
      promptVersion: "director@1",
      ok: true,
      turn: 3,
    });
    expect(rows[0]?.ms).toBe(250);

    const p = sent[0]!.params;
    expect(p.thinking).toEqual({ type: "disabled" });
    expect(p.output_config).toMatchObject({ effort: "low" });
    expect(p.max_tokens).toBe(400);
    expect(p.system).toEqual([{ type: "text", text: "rules", cache_control: { type: "ephemeral" } }]);
    for (const banned of ["temperature", "top_p", "top_k"]) expect(p).not.toHaveProperty(banned);
    expect(sent[0]!.options.timeout).toBe(15_000);
  });

  it("leaves thinking and effort alone for the Coach, with a longer timeout", async () => {
    const { client, sent } = fakeClient({ parsed_output: good, stop_reason: "end_turn", usage });
    await askJson(opts({ purpose: "coach", model: "claude-sonnet-5-5", fast: false }), {
      client,
      record: recorder().record,
    });
    expect(sent[0]!.params).not.toHaveProperty("thinking");
    expect(sent[0]!.params.output_config).not.toHaveProperty("effort");
    expect(sent[0]!.options.timeout).toBe(45_000);
  });

  it.each([
    ["refusal", { parsed_output: null, stop_reason: "refusal", usage }],
    ["max_tokens", { parsed_output: null, stop_reason: "max_tokens", usage }],
    ["no_json", { parsed_output: null, stop_reason: "end_turn", usage }],
  ])("treats %s as a failed call and still records it", async (reason, reply) => {
    const { client } = fakeClient(reply);
    const { rows, record } = recorder();
    const err = await askJson(opts(), { client, record }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ClaudeCallError);
    expect((err as ClaudeCallError).reason).toBe(reason);
    expect(rows[0]).toMatchObject({ ok: false, error: reason, inputTokens: 200 });
  });

  it("records an API error (no tokens) and throws a ClaudeCallError", async () => {
    const apiErr = new Anthropic.APIConnectionTimeoutError();
    const { client } = fakeClient(apiErr);
    const { rows, record } = recorder();
    await expect(askJson(opts(), { client, record })).rejects.toMatchObject({ reason: "api_error" });
    expect(rows[0]).toMatchObject({ ok: false, inputTokens: 0, costUsd: 0 });
    expect(rows[0]?.error).toMatch(/timed out/i);
  });

  it("still answers when saving the ai_calls row fails", async () => {
    const { client } = fakeClient({ parsed_output: good, stop_reason: "end_turn", usage });
    const r = await askJson(opts(), { client, record: async () => Promise.reject(new Error("db down")) });
    expect(r.data.move).toBe("new_sum");
  });

  it("records a null cost for a model with no price", async () => {
    const { client } = fakeClient({ parsed_output: good, stop_reason: "end_turn", usage });
    const { rows, record } = recorder();
    await askJson(opts({ model: "claude-unknown-9" }), { client, record });
    expect(rows[0]?.costUsd).toBeNull();
  });
});
