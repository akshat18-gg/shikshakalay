import { describe, expect, it } from "vitest";
import { assertWithinBudget, startOfIstDay } from "@/lib/ai/budget";
import { costUsd } from "@/lib/ai/pricing";
import { HttpError } from "@/lib/http";

const M = 1_000_000;

describe("costUsd", () => {
  it("prices input, cache writes, cache reads and output separately", () => {
    const u = { inputTokens: M, outputTokens: M, cacheReadTokens: M, cacheWriteTokens: M };
    expect(costUsd("claude-sonnet-5-5", u)).toBeCloseTo(2 + 10 + 0.1 + 2.5);
    expect(costUsd("claude-opus-5-5", u)).toBeCloseTo(4 + 20 + 0.2 + 5);
  });

  it("uses Haiku's long-prompt price above 100,000 prompt tokens", () => {
    const short = { inputTokens: 50_000, outputTokens: 0, cacheReadTokens: 50_000, cacheWriteTokens: 0 };
    const long = { ...short, cacheReadTokens: 50_001 };
    expect(costUsd("claude-haiku-5-5", short)).toBeCloseTo((50_000 * 0.1 + 50_000 * 0.01) / M);
    expect(costUsd("claude-haiku-5-5", long)).toBeCloseTo((50_000 * 0.5 + 50_001 * 0.05) / M);
  });

  it("halves the price for the Batch API and returns null for unknown models", () => {
    const u = { inputTokens: M, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
    expect(costUsd("claude-opus-5-5", u, { batch: true })).toBeCloseTo(2);
    expect(costUsd("gpt-x", u)).toBeNull();
  });
});

describe("daily budget", () => {
  it("starts the day at midnight IST", () => {
    expect(startOfIstDay(new Date("2026-10-27T20:00:00Z")).toISOString()).toBe("2026-10-27T18:30:00.000Z");
    expect(startOfIstDay(new Date("2026-10-27T17:00:00Z")).toISOString()).toBe("2026-10-26T18:30:00.000Z");
  });

  it("lets turns through under the limit and answers 429 with Retry-After at the limit", async () => {
    const now = new Date("2026-10-27T17:30:00Z"); // 23:00 IST → one hour to midnight
    let asked: Date | undefined;
    await assertWithinBudget({ limitUsd: 10, now, spendSince: async (d) => ((asked = d), 9.99) });
    expect(asked?.toISOString()).toBe("2026-10-26T18:30:00.000Z");

    const err = await assertWithinBudget({ limitUsd: 10, now, spendSince: async () => 10 }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).code).toBe("rate_limited");
    expect(new Headers((err as HttpError).headers).get("retry-after")).toBe("3600");
  });
});
