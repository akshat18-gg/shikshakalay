/**
 * Reads the multipart body of POST /api/sessions/[id]/turns: `text?`, `audio?` (File), `idempotencyKey`.
 * A turn needs text or audio. Audio over 2 MB (≈ well past 30 s of speech) is refused before it reaches
 * speech-to-text, so a big upload can't cost money or memory.
 */
import { type Audio, TurnFields } from "@/lib/contracts";
import { HttpError, parseOr400 } from "@/lib/http";

export const MAX_AUDIO_BYTES = 2 * 1024 * 1024;
export const MAX_TEXT_CHARS = 1000;
const ALLOWED_FIELDS = new Set(["text", "audio", "idempotencyKey"]);

export type TurnInput = { text?: string; audio?: Audio; idempotencyKey: string };

export async function readTurnForm(req: Request): Promise<TurnInput> {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new HttpError("bad_request", "Send the turn as multipart form data.");
  }
  for (const key of form.keys()) {
    if (!ALLOWED_FIELDS.has(key)) throw new HttpError("bad_request", `Unknown field: ${key.slice(0, 40)}.`);
  }

  const rawText = form.get("text");
  const rawKey = form.get("idempotencyKey");
  const fields = parseOr400(
    TurnFields.strict(),
    {
      ...(typeof rawText === "string" ? { text: rawText } : {}),
      idempotencyKey: typeof rawKey === "string" ? rawKey : undefined,
    },
    "turn",
  );
  const text = fields.text?.trim() || undefined;
  if (text && text.length > MAX_TEXT_CHARS) throw new HttpError("bad_request", "That message is too long.");

  const file = form.get("audio");
  let audio: Audio | undefined;
  if (file !== null) {
    if (typeof file === "string" || !file.type.startsWith("audio/")) {
      throw new HttpError("bad_request", "The recording must be an audio file.");
    }
    if (file.size > MAX_AUDIO_BYTES) throw new HttpError("audio_too_long", "The recording is too long.");
    audio = { bytes: Buffer.from(await file.arrayBuffer()), mime: file.type };
  }

  if (!text && !audio) throw new HttpError("bad_request", "Say or type something first.");
  return { text, audio, idempotencyKey: fields.idempotencyKey };
}
