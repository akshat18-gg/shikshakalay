/**
 * Claude prices in USD per million tokens — the one place they live. Checked against
 * https://platform.claude.com/docs/en/about-claude/pricing on 27 Oct 2026.
 * Cache reads on Opus 5.5 / Sonnet 5.5 are 0.05× input; on Haiku 5.5 0.1×. Writes (5-minute cache) are 1.25×.
 */
export type Price = { input: number; cacheWrite5m: number; cacheRead: number; output: number };
type ModelPrice = { base: Price; /** prompts over `above` tokens */ long?: { above: number; price: Price } };

export const PRICES: Record<string, ModelPrice> = {
  "claude-haiku-5-5": {
    base: { input: 0.1, cacheWrite5m: 0.125, cacheRead: 0.01, output: 0.5 },
    long: { above: 100_000, price: { input: 0.5, cacheWrite5m: 0.625, cacheRead: 0.05, output: 2.5 } },
  },
  "claude-sonnet-5-5": { base: { input: 2, cacheWrite5m: 2.5, cacheRead: 0.1, output: 10 } },
  "claude-opus-5-5": { base: { input: 4, cacheWrite5m: 5, cacheRead: 0.2, output: 20 } },
};

/** The Batch API is half price on input and output. */
export const BATCH_DISCOUNT = 0.5;

export type Usage = { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number };

/** Cost of one call, or null for a model we have no price for (logged by the caller). */
export function costUsd(model: string, u: Usage, opts: { batch?: boolean } = {}): number | null {
  const m = PRICES[model];
  if (!m) return null;
  const promptTokens = u.inputTokens + u.cacheReadTokens + u.cacheWriteTokens;
  const p = m.long && promptTokens > m.long.above ? m.long.price : m.base;
  const usd =
    (u.inputTokens * p.input +
      u.cacheWriteTokens * p.cacheWrite5m +
      u.cacheReadTokens * p.cacheRead +
      u.outputTokens * p.output) /
    1_000_000;
  return opts.batch ? usd * BATCH_DISCOUNT : usd;
}
