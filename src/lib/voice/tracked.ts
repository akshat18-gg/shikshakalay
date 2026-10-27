/**
 * The voice calls a turn makes, each recorded as one ai_calls row (provider sarvam, ms, ok, approximate cost) and
 * one log line — never the audio or the words.
 */
import { sttCostUsd, ttsCostUsd } from "@/lib/ai/pricing";
import type { ChildLine, Lang } from "@/lib/contracts";
import type { AiCallRow } from "@/lib/db/queries/aiCalls";
import { log, logError } from "@/lib/log";
import { type AudioFormat, speakLines, speakText } from "./tts";
import { transcribe } from "./stt";

type Ctx = { sessionId?: string; turn?: number; record?: (row: AiCallRow) => Promise<void> };

/** Opus/AAC phone recordings are roughly 4 KB per second; good enough for a cost estimate. */
const BYTES_PER_SECOND = 4000;

async function record(ctx: Ctx, row: Omit<AiCallRow, "sessionId" | "turn" | "provider">) {
  const full: AiCallRow = { ...row, provider: "sarvam", sessionId: ctx.sessionId ?? null, turn: ctx.turn ?? null };
  log("ai_call", full);
  try {
    await (ctx.record ?? (async (r: AiCallRow) => (await import("@/lib/db/queries/aiCalls")).insertAiCall(r)))(full);
  } catch (err) {
    logError("ai_call_record_failed", err, { purpose: row.purpose, sessionId: ctx.sessionId });
  }
}

async function timed<T>(
  ctx: Ctx,
  meta: { purpose: "stt" | "tts"; model: string; costUsd: number },
  run: () => Promise<T>,
): Promise<T> {
  const started = Date.now();
  try {
    const out = await run();
    await record(ctx, { ...meta, ms: Date.now() - started, ok: true, error: null });
    return out;
  } catch (err) {
    const error = (err instanceof Error ? err.message : String(err)).slice(0, 300);
    await record(ctx, { ...meta, costUsd: 0, ms: Date.now() - started, ok: false, error });
    throw err;
  }
}

export function trackedTranscribe(
  audio: { bytes: Buffer; mime: string },
  lang: Lang,
  keyterms: string[],
  ctx: Ctx,
): Promise<string> {
  const seconds = audio.bytes.length / BYTES_PER_SECOND;
  return timed(ctx, { purpose: "stt", model: "saaras:v4", costUsd: sttCostUsd(seconds) }, () =>
    transcribe(audio, lang, keyterms),
  );
}

export function trackedSpeakLines(lines: ChildLine[], lang: Lang, format: AudioFormat, ctx: Ctx): Promise<Buffer> {
  const chars = lines.reduce((n, l) => n + l.text.length, 0);
  return timed(ctx, { purpose: "tts", model: "bulbul:v4-flash", costUsd: ttsCostUsd(chars) }, () =>
    speakLines(lines, lang, format),
  );
}

export function trackedSpeakText(text: string, lang: Lang, format: AudioFormat, ctx: Ctx): Promise<Buffer> {
  return timed(ctx, { purpose: "tts", model: "bulbul:v4-flash", costUsd: ttsCostUsd(text.length) }, () =>
    speakText(text, lang, format),
  );
}
