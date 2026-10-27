/**
 * Speech → text with Sarvam Saaras (AGENTS.md 8). The recording is sent once and never stored.
 * `keyterms` (the lesson's names and words, ≤ 50) help it hear "Ravi", "bundle", "दहाई" right.
 */
import type { Audio, Lang } from "@/lib/contracts";

const URL = "https://api.sarvam.ai/speech-to-text";
const TIMEOUT_MS = 15_000;
const MAX_KEYTERMS = 50;

export class SttError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SttError";
  }
}

const EXT: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-m4a": "m4a",
};

export function sttAvailable(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.SARVAM_API_KEY);
}

export async function transcribeWith(
  deps: { apiKey: string; fetch?: typeof fetch; model?: string },
  audio: Audio,
  lang: Lang,
  keyterms: string[] = [],
): Promise<string> {
  const mime = audio.mime.split(";")[0]!.trim();
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(audio.bytes)], { type: mime }), `turn.${EXT[mime] ?? "webm"}`);
  form.append("model", deps.model ?? "saaras:v4");
  form.append("language_code", lang === "hi" ? "hi-IN" : "en-IN");
  if (keyterms.length)
    form.append("keyterms", JSON.stringify(keyterms.slice(0, MAX_KEYTERMS).map((k) => k.slice(0, 64))));

  let res: Response;
  try {
    res = await (deps.fetch ?? fetch)(URL, {
      method: "POST",
      headers: { "api-subscription-key": deps.apiKey },
      body: form,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new SttError(`Sarvam STT unreachable: ${err instanceof Error ? err.message : String(err)}`);
  }
  const body = (await res.json().catch(() => null)) as { transcript?: string; error?: { message?: string } } | null;
  if (!res.ok || typeof body?.transcript !== "string") {
    throw new SttError(`Sarvam STT HTTP ${res.status}: ${body?.error?.message ?? "no transcript"}`);
  }
  return body.transcript.trim();
}

export function transcribe(audio: Audio, lang: Lang, keyterms?: string[]): Promise<string> {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) throw new SttError("SARVAM_API_KEY is not set");
  return transcribeWith({ apiKey }, audio, lang, keyterms);
}
