/**
 * The WhatsApp conversation with a fake engine, sender and store (no Twilio, no database, no Claude).
 */
import { describe, expect, it } from "vitest";
import {
  type Contact,
  type Outgoing,
  type WhatsAppDeps,
  cardText,
  checkinTime,
  handleMessage,
  whoSaidWhat,
} from "@/lib/channels/whatsapp";
import type { TurnResult } from "@/lib/contracts";
import { mockCard } from "@/lib/mocks/lesson";

function world(start: Partial<Contact> = {}) {
  const contact: Contact = {
    id: "c1",
    step: "new",
    userId: null,
    userCode: null,
    lang: "hi",
    activeSessionId: null,
    lastRejoinTipAt: null,
    ...start,
  };
  const sent: Outgoing[][] = [];
  const log: string[] = [];
  let turnError: { code: string } | null = null;
  const turn = (over: Partial<TurnResult> = {}): TurnResult => ({
    sessionId: "s1",
    turn: 1,
    transcript: "x",
    director: null,
    lines: [
      { child: "ravi", text: "35, टीचर जी!" },
      { child: "arjun", text: "मेरा भी 35!" },
    ],
    statesAfter: [],
    audioUrl: "/api/media/abc",
    lessonOver: false,
    ms: 1,
    ...over,
  });
  const deps: WhatsAppDeps = {
    now: () => new Date("2026-10-30T10:00:00Z"),
    baseUrl: "https://app.test",
    joinCode: "join twilio-trial",
    send: async (m) => void sent.push(m),
    download: async () => ({ bytes: Buffer.from("ogg"), mime: "audio/ogg" }),
    engine: {
      startLesson: async () => ({
        sessionId: "s1",
        scenarioId: "sub_2digit",
        lang: "hi",
        firstSum: "52-27",
        hello: turn({ turn: 0, audioUrl: "/audio/hello-hi.mp3" }),
      }),
      runTurn: async (_s, input) => {
        log.push(input.audio ? `audio:${input.idempotencyKey}` : `text:${input.text}`);
        if (turnError) throw turnError;
        return turn();
      },
      endLesson: async () => mockCard,
      sayTomorrowAudio: async () => "/api/media/tomorrow",
    },
    store: {
      update: async (_id, patch) => void Object.assign(contact, patch),
      createUser: async () => ({ id: "u1", code: "W01" }),
      saveConsent: async () => void log.push("consent"),
      setLang: async (_u, lang) => void ((contact.lang = lang), log.push(`lang:${lang}`)),
      saveCheckin: async (_s, tried) => void log.push(`checkin:${tried}`),
      enqueueCheckin: async () => void log.push("checkin-job"),
    },
  };
  const say = (text: string, extra: Partial<Parameters<typeof handleMessage>[1]> = {}) =>
    handleMessage(contact, { text, messageSid: `SM${Math.random().toString(36).slice(2, 12)}`, ...extra }, deps);
  return { contact, sent, log, say, setTurnError: (e: { code: string } | null) => (turnError = e) };
}

describe("WhatsApp conversation", () => {
  it("consent → language → menu → hello (audio + text)", async () => {
    const w = world();
    await w.say("hi");
    expect(w.contact.step).toBe("consent");
    expect(w.sent[0]![0]!.body).toMatch(/YES/);
    await w.say("haan");
    expect(w.contact).toMatchObject({ step: "lang", userId: "u1" });
    expect(w.log).toContain("consent");
    await w.say("2");
    expect(w.contact).toMatchObject({ step: "menu", lang: "hi" });
    await w.say("1");
    expect(w.contact).toMatchObject({ step: "in_lesson", activeSessionId: "s1" });
    const hello = w.sent.at(-1)!;
    expect(hello[0]).toEqual({ mediaUrl: "https://app.test/audio/hello-hi.mp3" });
    expect(hello[1]!.body).toMatch(/रवि: 35/);
  });

  it("a voice note → one audio + one text, keyed by MessageSid (a Twilio retry can't double a turn)", async () => {
    const w = world({ step: "in_lesson", userId: "u1", activeSessionId: "s1" });
    await w.say("", { audioUrl: "https://api.twilio.com/media/1", messageSid: "SM12345678" });
    expect(w.log).toEqual(["audio:SM12345678"]);
    expect(w.sent.at(-1)).toEqual([
      { mediaUrl: "https://app.test/api/media/abc" },
      { body: "रवि: 35, टीचर जी!\nअर्जुन: मेरा भी 35!" },
    ]);
  });

  it("END sends the card as text (with the rejoin tip) + the say-tomorrow audio, and schedules the check-in", async () => {
    const w = world({ step: "in_lesson", userId: "u1", activeSessionId: "s1", lang: "en" });
    await w.say("END");
    const [card, audio] = w.sent.at(-1)!;
    expect(card!.body).toContain(mockCard.sayTomorrow);
    expect(card!.body).toContain("join twilio-trial");
    expect(audio).toEqual({ mediaUrl: "https://app.test/api/media/tomorrow" });
    expect(w.log).toContain("checkin-job");
    expect(w.contact.step).toBe("menu");
  });

  it("the rejoin tip comes at most every 2 days", async () => {
    const w = world({
      step: "in_lesson",
      userId: "u1",
      activeSessionId: "s1",
      lang: "en",
      lastRejoinTipAt: new Date("2026-10-29T10:00:00Z"),
    });
    await w.say("end");
    expect(w.sent.at(-1)![0]!.body).not.toContain("join twilio-trial");
  });

  it("busy → 'one moment'; STOP stops at any step; YES starts again at the menu", async () => {
    const w = world({ step: "in_lesson", userId: "u1", activeSessionId: "s1", lang: "en" });
    w.setTurnError({ code: "busy" });
    await w.say("What is 52 minus 27?");
    expect(w.sent.at(-1)![0]!.body).toMatch(/One moment/);
    await w.say("STOP");
    expect(w.contact.step).toBe("stopped");
    await w.say("yes");
    expect(w.contact.step).toBe("menu");
  });

  it("check-in answers are saved and thanked", async () => {
    const w = world({ step: "checkin", userId: "u1", activeSessionId: "s1", lang: "en" });
    await w.say("1");
    expect(w.log).toContain("checkin:true");
    expect(w.contact.step).toBe("menu");
  });

  it("formats who-said-what and the card from i18n", () => {
    expect(whoSaidWhat([{ child: "meena", text: "26." }], "en")).toBe("Meena: 26.");
    expect(cardText(mockCard, "en")).toContain(`"${mockCard.fix.quote}"`);
  });

  it("asks the check-in next evening ~6:30 pm IST, but inside the 24-hour window", () => {
    expect(checkinTime(new Date("2026-10-30T04:30:00Z")).toISOString()).toBe("2026-10-31T03:30:00.000Z"); // 23 h cap
    expect(checkinTime(new Date("2026-10-30T16:00:00Z")).toISOString()).toBe("2026-10-31T13:00:00.000Z"); // 6:30 pm IST
  });
});
