/**
 * Short-lived audio (the children's replies, the coach line) served at /api/media/<token>.
 * The token is the key: 16 random bytes, unguessable. Rows expire (default 60 min) and the sweep deletes them.
 * The teacher's own recordings are never saved here — they are transcribed and dropped.
 */
import { randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import type { SaveMedia } from "@/lib/contracts";
import { db } from "@/lib/db/client";
import { media } from "@/lib/db/schema/whatsapp";

export const TOKEN_RE = /^[0-9a-f]{32}$/;

export const saveMedia: SaveMedia = async (bytes, mime, ttlMinutes = 60) => {
  const token = randomBytes(16).toString("hex");
  await db.insert(media).values({ token, mime, data: bytes, expiresAt: new Date(Date.now() + ttlMinutes * 60_000) });
  return `/api/media/${token}`;
};

export async function loadMedia(token: string): Promise<{ mime: string; data: Buffer } | null> {
  if (!TOKEN_RE.test(token)) return null;
  const [m] = await db
    .select({ mime: media.mime, data: media.data })
    .from(media)
    .where(and(eq(media.token, token), gt(media.expiresAt, new Date())))
    .limit(1);
  return m ?? null;
}
