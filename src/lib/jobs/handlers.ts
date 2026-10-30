/**
 * Job handlers. wa_inbound runs one WhatsApp message through the conversation; wa_checkin asks "did you try the
 * line?" the next evening (skipped if she stopped or WhatsApp's 24-hour window has closed).
 */
import { z } from "zod";
import { type WhatsAppDeps, checkinTime, handleMessage } from "@/lib/channels/whatsapp";
import { downloadMedia, sendWhatsApp } from "@/lib/channels/twilio";
import { endLesson, runTurn, startLesson } from "@/lib/engine";
import { t } from "@/lib/i18n";
import { log } from "@/lib/log";

const Inbound = z.object({
  From: z.string().startsWith("whatsapp:"),
  Body: z.string().default(""),
  MessageSid: z.string().min(8),
  NumMedia: z.string().default("0"),
  MediaUrl0: z.string().url().optional(),
  MediaContentType0: z.string().optional(),
});

const Checkin = z.object({ contactId: z.string().uuid(), sessionId: z.string() });

async function db() {
  return import("@/lib/db/queries/whatsapp");
}

function depsFor(phone: string): WhatsAppDeps {
  return {
    now: () => new Date(),
    baseUrl: process.env.PUBLIC_BASE_URL ?? "",
    joinCode: process.env.TWILIO_SANDBOX_JOIN_CODE ?? "",
    send: (messages) => sendWhatsApp(phone, messages),
    download: (url) => downloadMedia(url),
    engine: {
      startLesson: (userId, lang) => startLesson(userId, { scenarioId: "sub_2digit", lang }, "whatsapp"),
      runTurn: (sessionId, input) => runTurn(sessionId, input, "whatsapp"),
      endLesson: (sessionId) => endLesson(sessionId),
      sayTomorrowAudio: async (sessionId, text, lang) => {
        if (process.env.USE_MOCKS === "1") return null;
        const [{ trackedSpeakText }, { saveMedia }] = await Promise.all([
          import("@/lib/voice/tracked"),
          import("@/lib/media/store"),
        ]);
        return saveMedia(await trackedSpeakText(text, lang, "ogg", { sessionId }), "audio/ogg", 24 * 60);
      },
    },
    store: {
      update: async (id, patch) => (await db()).updateContact(id, patch),
      createUser: async (lang) => (await db()).createWhatsAppUser(lang),
      saveConsent: async (userId) => (await import("@/lib/auth/users")).saveConsent(userId),
      setLang: async (userId, lang) => (await import("@/lib/auth/users")).setUserLang(userId, lang),
      saveCheckin: async (sessionId, tried) => (await db()).saveWaCheckin(sessionId, tried),
      enqueueCheckin: async (contactId, sessionId) => {
        const { enqueueJob } = await import("./queue");
        await enqueueJob("wa_checkin", { contactId, sessionId }, { runAt: checkinTime(new Date()) });
      },
    },
  };
}

export const HANDLERS = {
  wa_inbound: async (payload: unknown) => {
    const p = Inbound.parse(payload);
    const contact = await (await db()).findOrCreateContact(p.From);
    log("wa_inbound", { user: contact.userCode ?? "new", step: contact.step, voice: p.NumMedia !== "0" });
    const audio =
      p.NumMedia !== "0" && p.MediaUrl0 && p.MediaContentType0?.startsWith("audio/") ? p.MediaUrl0 : undefined;
    await handleMessage(
      contact,
      { text: p.Body, audioUrl: audio, audioMime: p.MediaContentType0, messageSid: p.MessageSid },
      depsFor(p.From),
    );
  },
  wa_checkin: async (payload: unknown) => {
    const { contactId, sessionId } = Checkin.parse(payload);
    const c = await (await db()).contactById(contactId);
    const windowOpen = c?.lastInboundAt && Date.now() - c.lastInboundAt.getTime() < 24 * 3600_000;
    if (!c || !c.userId || c.step === "stopped" || c.step === "in_lesson" || !windowOpen) return;
    const lang = await (await db()).userLang(c.userId);
    await (await db()).updateContact(contactId, { step: "checkin", activeSessionId: sessionId });
    await sendWhatsApp(c.phone, [{ body: t("wa.checkin", lang) }]);
  },
};
