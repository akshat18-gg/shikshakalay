import { after } from "next/server";
import twilio from "twilio";
import { enqueueJob, processJob } from "@/lib/jobs/queue";
import { log, logError } from "@/lib/log";

const TWIML_OK = new Response("<Response></Response>", { headers: { "content-type": "text/xml" } });

/**
 * Twilio calls this for every WhatsApp message. Check the signature, save a job (a Twilio retry with the same
 * MessageSid never makes a second one), answer at once, and do the work right after the response.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) return new Response("bad request", { status: 400 });
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string") params[k] = v;

  const url = `${process.env.PUBLIC_BASE_URL ?? ""}/api/whatsapp/webhook`;
  const signature = req.headers.get("x-twilio-signature") ?? "";
  const token = process.env.TWILIO_AUTH_TOKEN ?? "";
  if (!token || !twilio.validateRequest(token, signature, url, params)) {
    log("wa_bad_signature", {});
    return new Response("forbidden", { status: 403 });
  }

  const sid = params.MessageSid;
  if (!sid) return TWIML_OK.clone();
  try {
    const id = await enqueueJob("wa_inbound", params, { dedupeKey: sid });
    after(() => processJob(id));
  } catch (err) {
    logError("wa_enqueue_failed", err, {});
  }
  return TWIML_OK.clone();
}
