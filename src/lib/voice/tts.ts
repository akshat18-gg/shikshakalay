/**
 * Text → speech for the children's lines and the coach's "say tomorrow" line (AGENTS.md 8).
 * One small backend interface, so a provider can be swapped without touching callers: Sarvam Bulbul today,
 * Azure Neural TTS later (add an `azure` backend and pick it in `activeBackend()`).
 * If speech fails, callers send text only — audio never breaks a turn.
 */
import type { ChildLine, Lang, SpeakLines, SpeakText } from "@/lib/contracts";
import { SARVAM_VOICES, type SarvamVoice } from "./voices";

export type AudioFormat = "mp3" | "ogg";
export type VoiceId = ChildLine["child"] | "coach";
export type SpeechPart = { voice: VoiceId; text: string };

export interface TtsBackend {
  name: string;
  formats: AudioFormat[];
  /** All parts as one audio clip, in order. */
  speak(parts: SpeechPart[], lang: Lang, format: AudioFormat): Promise<Buffer>;
}

export class TtsError extends Error {
  constructor(
    public readonly reason: "unsupported_format" | "provider_error" | "not_configured",
    message: string,
  ) {
    super(message);
    this.name = "TtsError";
  }
}

const TIMEOUT_MS = 10_000;
/**
 * 22050 Hz → 128 kbps MP3 (≈ 16 KB per second of speech). 8000 Hz halves that (64 kbps) but sounds like a phone
 * call — the data-saver option for weak networks (P2-T12).
 */
const SAMPLE_RATE = 22050;
const SARVAM_URL = "https://api.sarvam.ai/text-to-speech";

/** Removes an ID3v2 tag from the front of an MP3, so clips can be joined into one stream. */
export function stripId3(mp3: Buffer): Buffer {
  if (mp3.length < 10 || mp3.toString("latin1", 0, 3) !== "ID3") return mp3;
  // The tag size is 4 bytes of 7 bits each ("syncsafe"), after a 10-byte header.
  const size = (mp3[6]! << 21) | (mp3[7]! << 14) | (mp3[8]! << 7) | mp3[9]!;
  const footer = mp3[5]! & 0x10 ? 10 : 0;
  return mp3.subarray(Math.min(mp3.length, 10 + size + footer));
}

export function sarvamBackend(deps: { apiKey: string; fetch?: typeof fetch }): TtsBackend {
  const doFetch = deps.fetch ?? fetch;
  async function one(text: string, voice: SarvamVoice, lang: Lang): Promise<Buffer> {
    let res: Response;
    try {
      res = await doFetch(SARVAM_URL, {
        method: "POST",
        headers: { "api-subscription-key": deps.apiKey, "content-type": "application/json" },
        body: JSON.stringify({
          text,
          language_code: lang === "hi" ? "hi-IN" : "en-IN",
          model: voice.model,
          speaker: voice.speaker,
          pace: voice.pace,
          speech_sample_rate: SAMPLE_RATE, // every clip the same, so joined MP3s play as one stream
          output_audio_codec: "mp3",
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      throw new TtsError(
        "provider_error",
        `Sarvam TTS unreachable: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    const body = (await res.json().catch(() => null)) as { audios?: string[]; error?: { message?: string } } | null;
    if (!res.ok || !body?.audios?.[0]) {
      throw new TtsError("provider_error", `Sarvam TTS HTTP ${res.status}: ${body?.error?.message ?? "no audio"}`);
    }
    return stripId3(Buffer.from(body.audios[0], "base64"));
  }

  return {
    name: "sarvam",
    formats: ["mp3"], // Bulbul v3/v4-flash can't make opus on this endpoint (WhatsApp voice notes: Phase 5)
    async speak(parts, lang, format) {
      if (format !== "mp3") throw new TtsError("unsupported_format", `Sarvam TTS can't make ${format}`);
      const voiceFor = (v: VoiceId) => (v === "coach" ? SARVAM_VOICES.coach : SARVAM_VOICES.children[v]);
      // One request per line (one voice per request), all at once; joined in order.
      const clips = await Promise.all(parts.map((p) => one(p.text, voiceFor(p.voice), lang)));
      return Buffer.concat(clips);
    },
  };
}

/** The provider in use. Azure (when a key arrives) slots in here. */
export function activeBackend(env: Record<string, string | undefined> = process.env): TtsBackend {
  if (env.SARVAM_API_KEY) return sarvamBackend({ apiKey: env.SARVAM_API_KEY });
  throw new TtsError("not_configured", "No text-to-speech key is set");
}

export function ttsAvailable(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.SARVAM_API_KEY);
}

export const speakLines: SpeakLines = (lines, lang, format) =>
  activeBackend().speak(
    lines.filter((l) => l.text.trim()).map((l) => ({ voice: l.child, text: l.text })),
    lang,
    format,
  );

export const speakText: SpeakText = (text, lang, format) =>
  activeBackend().speak([{ voice: "coach", text }], lang, format);
