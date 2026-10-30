/**
 * The WhatsApp conversation (AGENTS.md 9) as a step machine. Everything it touches comes in through `deps`
 * (engine, sender, storage, clock), so the whole flow is unit-tested with fakes.
 *
 *   new → consent (YES) → lang (1 / 2) → menu (1 = subtraction) → in_lesson (voice notes or text) → END → card
 *   → menu · checkin (1 / 2) · STOP anywhere → stopped (YES starts again)
 *
 * Trial limits (Twilio, 30 Oct): 100 free messages — so every lesson turn is exactly one audio + one text.
 */
import type { CoachCard, Lang, StartLessonResult, TurnResult } from "@/lib/contracts";
import { type MessageKey, type Vars, t } from "@/lib/i18n";

export type Step = "new" | "consent" | "lang" | "menu" | "in_lesson" | "checkin" | "stopped";

export type Contact = {
  id: string;
  step: Step;
  userId: string | null;
  userCode: string | null;
  lang: Lang;
  activeSessionId: string | null;
  lastRejoinTipAt: Date | null;
};

export type Inbound = { text: string; audioUrl?: string; audioMime?: string; messageSid: string };

export type Outgoing = { body?: string; mediaUrl?: string };

export type WhatsAppDeps = {
  now: () => Date;
  baseUrl: string;
  joinCode: string;
  send: (messages: Outgoing[]) => Promise<void>;
  download: (url: string) => Promise<{ bytes: Buffer; mime: string }>;
  engine: {
    startLesson: (userId: string, lang: Lang) => Promise<StartLessonResult>;
    runTurn: (
      sessionId: string,
      input: { text?: string; audio?: { bytes: Buffer; mime: string }; idempotencyKey: string },
    ) => Promise<TurnResult>;
    endLesson: (sessionId: string) => Promise<CoachCard>;
    sayTomorrowAudio: (sessionId: string, text: string, lang: Lang) => Promise<string | null>;
  };
  store: {
    update: (
      contactId: string,
      patch: Partial<Pick<Contact, "step" | "userId" | "activeSessionId" | "lastRejoinTipAt">>,
    ) => Promise<void>;
    createUser: (lang: Lang) => Promise<{ id: string; code: string }>;
    saveConsent: (userId: string) => Promise<void>;
    setLang: (userId: string, lang: Lang) => Promise<void>;
    saveCheckin: (sessionId: string, tried: boolean) => Promise<void>;
    enqueueCheckin: (contactId: string, sessionId: string) => Promise<void>;
  };
};

const REJOIN_TIP_EVERY_MS = 2 * 24 * 60 * 60 * 1000;
const YES = new Set(["yes", "y", "haan", "han", "ha", "हाँ", "हां", "ji", "जी", "ok", "okay"]);
const STOP = new Set(["stop", "रुको", "बंद", "unsubscribe"]);
const END = new Set(["end", "end lesson", "खत्म", "समाप्त", "khatam"]);

const norm = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[.!।]+$/u, "");

/** "Ravi: 35, Teacher!" / "रवि: 35, टीचर जी!" — WhatsApp shows no caption on audio, so the words come as text. */
export function whoSaidWhat(lines: TurnResult["lines"], lang: Lang): string {
  return lines.map((l) => `${t(`child.${l.child}` as MessageKey, lang)}: ${l.text}`).join("\n");
}

export function cardText(card: CoachCard, lang: Lang): string {
  return t("wa.card", lang, {
    sTurn: card.strength.turn,
    sQuote: card.strength.quote,
    sWhy: card.strength.why,
    fTurn: card.fix.turn,
    fQuote: card.fix.quote,
    fWhat: card.fix.whatHappened,
    fTry: card.fix.tryInstead,
    sayTomorrow: card.sayTomorrow,
  });
}

export async function handleMessage(contact: Contact, msg: Inbound, deps: WhatsAppDeps): Promise<void> {
  const say = (key: MessageKey, vars?: Vars, lang: Lang = contact.lang) => ({ body: t(key, lang, vars) });
  const abs = (url: string) => (url.startsWith("http") ? url : `${deps.baseUrl}${url}`);
  const word = norm(msg.text);

  // STOP works at every step and silences everything (check-ins too).
  if (STOP.has(word)) {
    await deps.store.update(contact.id, { step: "stopped", activeSessionId: null });
    return deps.send([say("wa.stop")]);
  }

  switch (contact.step) {
    case "new":
      await deps.store.update(contact.id, { step: "consent" });
      // Before she picks a language we don't know it: the consent goes in both.
      return deps.send([{ body: `${t("wa.consent", "hi")}\n\n${t("wa.consent", "en")}` }]);

    case "consent":
    case "stopped": {
      if (!YES.has(word)) return deps.send([{ body: `${t("wa.consent", "hi")}\n\n${t("wa.consent", "en")}` }]);
      if (contact.userId) {
        await deps.store.update(contact.id, { step: "menu" });
        return deps.send([say("wa.menu")]);
      }
      const user = await deps.store.createUser("hi");
      await deps.store.saveConsent(user.id);
      await deps.store.update(contact.id, { step: "lang", userId: user.id });
      return deps.send([{ body: t("wa.lang", "hi") }]);
    }

    case "lang": {
      const lang: Lang | null = word === "1" ? "en" : word === "2" ? "hi" : null;
      if (!lang) return deps.send([{ body: t("wa.lang", contact.lang) }]);
      await deps.store.setLang(contact.userId!, lang);
      await deps.store.update(contact.id, { step: "menu" });
      return deps.send([{ body: t("wa.menu", lang) }]);
    }

    case "menu": {
      if (word !== "1") return deps.send([say("wa.notUnderstood", { hint: t("wa.menu", contact.lang) })]);
      const lesson = await deps.engine.startLesson(contact.userId!, contact.lang);
      await deps.store.update(contact.id, { step: "in_lesson", activeSessionId: lesson.sessionId });
      const hello = lesson.hello;
      return deps.send([
        ...(hello.audioUrl ? [{ mediaUrl: abs(hello.audioUrl) }] : []),
        { body: `${whoSaidWhat(hello.lines, contact.lang)}\n\n${t("wa.howTo", contact.lang)}` },
      ]);
    }

    case "checkin": {
      if (word !== "1" && word !== "2") return deps.send([say("wa.checkin")]);
      if (contact.activeSessionId) await deps.store.saveCheckin(contact.activeSessionId, word === "1");
      await deps.store.update(contact.id, { step: "menu", activeSessionId: null });
      return deps.send([say("wa.checkinThanks")]);
    }

    case "in_lesson": {
      const sessionId = contact.activeSessionId!;
      if (END.has(word)) return finishLesson(contact, sessionId, deps);
      if (!msg.audioUrl && !msg.text.trim()) return deps.send([say("wa.howTo")]);
      const audio = msg.audioUrl ? await deps.download(msg.audioUrl) : undefined;
      let turn: TurnResult;
      try {
        turn = await deps.engine.runTurn(sessionId, {
          ...(audio ? { audio } : { text: msg.text }),
          idempotencyKey: msg.messageSid,
        });
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === "busy") return deps.send([say("wa.busy")]);
        if (code === "lesson_over") return finishLesson(contact, sessionId, deps);
        if (code === "audio_too_long") return deps.send([say("wa.tooLong")]);
        if (code === "stt_failed") return deps.send([say("errors.stt_failed")]);
        throw err;
      }
      // One audio + one text per turn (the trial has 100 messages).
      await deps.send([
        ...(turn.audioUrl ? [{ mediaUrl: abs(turn.audioUrl) }] : []),
        { body: whoSaidWhat(turn.lines, contact.lang) || t("practice.thinking", contact.lang) },
      ]);
      if (turn.lessonOver) await finishLesson(contact, sessionId, deps);
      return;
    }
  }
}

async function finishLesson(contact: Contact, sessionId: string, deps: WhatsAppDeps): Promise<void> {
  const card = await deps.engine.endLesson(sessionId);
  const now = deps.now();
  const tipDue = !contact.lastRejoinTipAt || now.getTime() - contact.lastRejoinTipAt.getTime() >= REJOIN_TIP_EVERY_MS;
  const tip = tipDue ? `\n\n${t("wa.rejoinTip", contact.lang, { joinCode: deps.joinCode })}` : "";
  const audio = await deps.engine.sayTomorrowAudio(sessionId, card.sayTomorrow, contact.lang).catch(() => null);
  await deps.store.update(contact.id, {
    step: "menu",
    activeSessionId: sessionId, // kept for the check-in answer
    ...(tipDue ? { lastRejoinTipAt: now } : {}),
  });
  await deps.store.enqueueCheckin(contact.id, sessionId);
  // The card as text (with the rejoin tip folded in) + the "say tomorrow" line as audio: 2 messages.
  await deps.send([
    { body: cardText(card, contact.lang) + tip },
    ...(audio ? [{ mediaUrl: `${deps.baseUrl}${audio}` }] : []),
  ]);
}

/** When to ask "did you try the line?": next day ~6:30 pm IST, but inside WhatsApp's 24-hour window. */
export function checkinTime(lastInbound: Date): Date {
  const IST = 5.5 * 3600_000;
  const local = new Date(lastInbound.getTime() + IST);
  const nextEvening = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1, 18, 30) - IST;
  return new Date(Math.min(nextEvening, lastInbound.getTime() + 23 * 3600_000));
}
