/**
 * The coach voice saying the card's "say this tomorrow" line. Made once per card and kept in the media table for a
 * day (the token is remembered in memory; after a restart it is simply made again, about ₹0.1).
 */
import type { Lang } from "@/lib/contracts";
import { loadMedia, saveMedia } from "@/lib/media/store";
import { trackedSpeakText } from "@/lib/voice/tracked";

const DAY_MINUTES = 24 * 60;
const store = globalThis as unknown as { shkCardAudio?: Map<string, string> };
const tokens = (store.shkCardAudio ??= new Map<string, string>());

export async function cardAudio(sessionId: string, text: string, lang: Lang): Promise<{ mime: string; data: Buffer }> {
  const known = tokens.get(sessionId);
  const cached = known ? await loadMedia(known) : null;
  if (cached) return cached;
  const data = await trackedSpeakText(text, lang, "mp3", { sessionId });
  const url = await saveMedia(data, "audio/mpeg", DAY_MINUTES);
  tokens.set(sessionId, url.split("/").pop()!);
  return { mime: "audio/mpeg", data };
}
