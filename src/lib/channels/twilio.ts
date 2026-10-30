/**
 * Twilio for WhatsApp: send messages (REST, 10 s timeout) and download a teacher's voice note (Basic auth).
 * Messages go out one at a time with ~3.1 s between them (the testing number's rate limit), audio before its text.
 * Phone numbers are never logged.
 */
import { log, logError } from "@/lib/log";
import type { Outgoing } from "./whatsapp";

const TIMEOUT_MS = 10_000;
const GAP_MS = 3100;
const MAX_MEDIA_BYTES = 2 * 1024 * 1024;

function creds() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error("Twilio keys are not set");
  return { sid, token, auth: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}` };
}

export async function sendWhatsApp(
  to: string,
  messages: Outgoing[],
  deps: { fetch?: typeof fetch; sleep?: (ms: number) => Promise<void> } = {},
): Promise<void> {
  const { sid, auth } = creds();
  const from = process.env.TWILIO_WHATSAPP_FROM ?? "";
  const doFetch = deps.fetch ?? fetch;
  const sleep = deps.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  for (const [i, m] of messages.entries()) {
    if (i > 0) await sleep(GAP_MS);
    const form = new URLSearchParams({ From: from, To: to });
    if (m.body) form.set("Body", m.body.slice(0, 1600));
    if (m.mediaUrl) form.set("MediaUrl", m.mediaUrl);
    const res = await doFetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: { authorization: auth, "content-type": "application/x-www-form-urlencoded" },
      body: form,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      const detail = ((await res.json().catch(() => null)) as { code?: number; message?: string } | null) ?? {};
      logError(
        "wa_send_failed",
        new Error(`Twilio HTTP ${res.status} ${detail.code ?? ""} ${detail.message ?? ""}`.trim()),
      );
      throw new Error(`Twilio send failed (HTTP ${res.status})`);
    }
    log("wa_sent", { kind: m.mediaUrl ? "audio" : "text" });
  }
}

/** The teacher's voice note (ogg/opus from WhatsApp). Never stored: transcribed and dropped. */
export async function downloadMedia(
  url: string,
  deps: { fetch?: typeof fetch } = {},
): Promise<{ bytes: Buffer; mime: string }> {
  const res = await (deps.fetch ?? fetch)(url, {
    headers: { authorization: creds().auth },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`media download failed (HTTP ${res.status})`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length > MAX_MEDIA_BYTES) throw Object.assign(new Error("voice note too long"), { code: "audio_too_long" });
  return { bytes, mime: res.headers.get("content-type")?.split(";")[0] ?? "audio/ogg" };
}
