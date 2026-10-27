/**
 * The children's voices for one turn, made when the browser first asks for them — so the turn's text comes back
 * ~2 s sooner and the audio downloads while the teacher reads. Made once (parallel requests share one synthesis),
 * then served from the media table for an hour.
 */
import type { ChildLine, Lang } from "@/lib/contracts";
import { loadMedia, saveMedia } from "@/lib/media/store";
import { trackedSpeakLines } from "@/lib/voice/tracked";

type Clip = { mime: string; data: Buffer };
const store = globalThis as unknown as { shkTurnAudio?: Map<string, Promise<string>> };
const made = (store.shkTurnAudio ??= new Map<string, Promise<string>>());

export function turnAudioPath(sessionId: string, turn: number): string {
  return `/api/sessions/${sessionId}/turns/${turn}/audio`;
}

export async function turnAudio(sessionId: string, turn: number, lines: ChildLine[], lang: Lang): Promise<Clip> {
  const key = `${sessionId}:${turn}`;
  const existing = made.get(key);
  if (existing) {
    const cached = await loadMedia((await existing).split("/").pop()!).catch(() => null);
    if (cached) return cached;
    made.delete(key); // expired or failed earlier: make it again
  }
  let data: Buffer | undefined;
  const job = (async () => {
    data = await trackedSpeakLines(lines, lang, "mp3", { sessionId, turn });
    return saveMedia(data, "audio/mpeg");
  })();
  made.set(key, job);
  try {
    await job;
  } catch (err) {
    made.delete(key);
    throw err;
  }
  return data ? { mime: "audio/mpeg", data } : (await loadMedia((await job).split("/").pop()!))!;
}
