/**
 * Fake lesson engine (owner: P1). Lets P2 build screens and P3 build WhatsApp before the real engine exists.
 * Routes and channels use these when process.env.USE_MOCKS === "1". Same signatures as the real orchestrator.
 *
 * A scripted "52 − 27" lesson. It reacts to a few words, so the UI can show every kind of turn.
 * The checks run in this order (first match wins):
 *   "end" / "खत्म"  (the whole message)  → lesson over
 *   "bundle" / "बंडल"                     → Ravi starts to change (WOBBLY)          — sample 4, part 1
 *   "take away" / "13"                    → Ravi gets it (GOT_IT)                  — sample 4, part 2
 *   "how" / "कैसे"                        → Ravi explains his mistake (revealed)  — sample 3
 *   "sana" / "सना"                        → Sana speaks for the first time         — sample 5
 *   "61"                                  → new sum 61 − 24: mistakes show
 *   "43"                                  → new sum 43 − 18: the mistakes come back — sample 2, part 2
 *   "25"                                  → children parrot 25 (weak move)          — sample 2, part 1
 *   anything else                         → 52 − 27: Ravi 35, Arjun 35, Meena 26    — sample 1
 * After 12 turns the lesson is over, like the real engine.
 */
import type {
  ChildId,
  ChildLine,
  ChildState,
  CoachCard,
  DirectorOutput,
  EndLesson,
  GetCard,
  GetSession,
  Lang,
  Move,
  RunTurn,
  StartLesson,
  TurnResult,
} from "@/lib/contracts";

type MockSession = { turn: number; lang: Lang; userId: string; startedAt: string; turns: TurnResult[]; ended: boolean };
// Kept on globalThis: Next.js may load this module once per route, and every route must see the same lessons.
const store = globalThis as unknown as { shkMockSessions?: Map<string, MockSession> };
const sessions = (store.shkMockSessions ??= new Map<string, MockSession>());

const START: ChildState[] = [
  { id: "ravi", bug: "smallerFromLarger", state: "STUCK", revealed: false, engagement: 3, workedSum: null },
  { id: "arjun", bug: "borrowNoDecrement", state: "STUCK", revealed: false, engagement: 2, workedSum: null },
  { id: "meena", bug: "countBackOffByOne", state: "STUCK", revealed: false, engagement: 2, workedSum: null },
  { id: "sana", bug: null, state: "GOT_IT", revealed: false, engagement: 0, workedSum: null },
];

/** Returns START with some fields changed for one child. */
function withChild(id: ChildId, patch: Partial<ChildState>): ChildState[] {
  return START.map((c) => (c.id === id ? { ...c, ...patch } : c));
}

function director(move: Move, quote: string, to: DirectorOutput["addressedTo"], newTask = ""): DirectorOutput {
  return { move, addressedTo: to, newTask, evidenceQuote: quote, confidence: "high" };
}

/** [child, English line, Hindi line] → ChildLine[] in the lesson's language. */
function say(lang: Lang, rows: [ChildId, string, string][]): ChildLine[] {
  return rows.map(([child, en, hi]) => ({ child, text: lang === "hi" ? hi : en }));
}

function result(
  sessionId: string,
  turn: number,
  transcript: string,
  d: DirectorOutput | null,
  lines: ChildLine[],
  states: ChildState[],
  lessonOver = false,
): TurnResult {
  return { sessionId, turn, transcript, director: d, lines, statesAfter: states, audioUrl: null, lessonOver, ms: 900 };
}

export const mockStartLesson: StartLesson = async (userId, body) => {
  const sessionId = `mock-${Math.random().toString(36).slice(2, 10)}`;
  const s: MockSession = {
    turn: 0,
    lang: body.lang,
    userId,
    startedAt: new Date().toISOString(),
    turns: [],
    ended: false,
  };
  sessions.set(sessionId, s);
  const hello = result(
    sessionId,
    0,
    "",
    null,
    say(body.lang, [
      ["ravi", "Good morning, Teacher!", "नमस्ते टीचर जी!"],
      ["arjun", "Good morning!", "नमस्ते!"],
      ["meena", "Good morning, Teacher.", "नमस्ते टीचर जी।"],
    ]),
    START,
  );
  s.turns.push(hello);
  return { sessionId, scenarioId: body.scenarioId, lang: body.lang, firstSum: "52-27", hello };
};

export const mockRunTurn: RunTurn = async (sessionId, input) => {
  const r = await scriptedTurn(sessionId, input.text);
  const s = sessions.get(sessionId);
  if (s) {
    s.turns.push(r);
    if (r.lessonOver) s.ended = true;
  }
  return r;
};

async function scriptedTurn(sessionId: string, typed: string | undefined): Promise<TurnResult> {
  const s: MockSession = sessions.get(sessionId) ?? {
    turn: 0,
    lang: "en",
    userId: "mock-teacher",
    startedAt: new Date().toISOString(),
    turns: [],
    ended: false,
  };
  s.turn += 1;
  sessions.set(sessionId, s);
  const { turn, lang } = s;
  const text = (typed ?? "(voice note)").trim();
  const t = text.toLowerCase();
  const has = (...words: string[]) => words.some((w) => t.includes(w));

  if (["end", "end lesson", "खत्म", "समाप्त"].includes(t) || turn > 12) {
    return result(sessionId, turn, text, director("other", text, ["whole_class"]), [], START, true);
  }
  const over = turn >= 12;

  if (has("bundle", "बंडल")) {
    return result(
      sessionId,
      turn,
      text,
      director("concrete_materials", text, ["ravi"]),
      say(lang, [
        [
          "ravi",
          "Open one bundle? Then 13 sticks… 13 take 8 is 5. Is it 25?",
          "एक बंडल खोलें? फिर 13 तीलियाँ… 13 में से 8 गए तो 5। 25 है क्या?",
        ],
      ]),
      withChild("ravi", { revealed: true, state: "WOBBLY", workedSum: [43, 18] }),
      over,
    );
  }
  if (has("take away", "13")) {
    return result(
      sessionId,
      turn,
      text,
      director("targeted_question", text, ["ravi"]),
      say(lang, [["ravi", "5! And 3 bundles take 1 is 2. So 25!", "5! और 3 बंडल में से 1 गया तो 2। तो 25!"]]),
      withChild("ravi", { revealed: true, state: "GOT_IT", workedSum: [43, 18] }),
      over,
    );
  }
  if (/\bhow\b/.test(t) || has("कैसे")) {
    return result(
      sessionId,
      turn,
      text,
      director("ask_to_explain", text, ["ravi"]),
      say(lang, [
        ["ravi", "8 minus 3 is 5, 4 minus 1 is 3. So 35!", "8 में से 3 गए तो 5, 4 में से 1 गया तो 3। तो 35!"],
      ]),
      withChild("ravi", { revealed: true }),
      over,
    );
  }
  if (has("sana", "सना")) {
    return result(
      sessionId,
      turn,
      text,
      director("invite_quiet_child", text, ["sana"]),
      say(lang, [["sana", "Umm… 25, Teacher?", "उम्म… 25, टीचर जी?"]]),
      withChild("sana", { engagement: 1 }),
      over,
    );
  }
  if (has("61")) {
    return result(
      sessionId,
      turn,
      text,
      director("new_sum", text, ["whole_class"], "61-24"),
      say(lang, [
        ["ravi", "43!", "43!"],
        ["arjun", "47, Teacher!", "47, टीचर जी!"],
        ["meena", "38.", "38।"],
      ]),
      START,
      over,
    );
  }
  if (has("43")) {
    return result(
      sessionId,
      turn,
      text,
      director("new_sum", text, ["whole_class"], "43-18"),
      say(lang, [
        ["ravi", "35!", "35!"],
        ["arjun", "Me also 35!", "मेरा भी 35!"],
        ["meena", "26, Teacher.", "26, टीचर जी।"],
      ]),
      START,
      over,
    );
  }
  if (has("25")) {
    return result(
      sessionId,
      turn,
      text,
      director("tell_answer", text, ["whole_class"]),
      say(lang, [
        ["ravi", "25, Teacher.", "25, टीचर जी।"],
        ["arjun", "25.", "25।"],
        ["meena", "25.", "25।"],
      ]),
      START,
      over,
    );
  }
  return result(
    sessionId,
    turn,
    text,
    director("new_sum", text, ["whole_class"], "52-27"),
    say(lang, [
      ["ravi", "35, Teacher!", "35, टीचर जी!"],
      ["arjun", "Me also 35!", "मेरा भी 35!"],
      ["meena", "26.", "26।"],
    ]),
    START,
    over,
  );
}

export const mockGetSession: GetSession = async (sessionId) => {
  const s = sessions.get(sessionId);
  if (!s) return null;
  return {
    sessionId,
    userId: s.userId,
    scenarioId: "sub_2digit",
    lang: s.lang,
    channel: "web",
    status: s.ended ? "ended" : "active",
    startedAt: s.startedAt,
    turns: s.turns,
    hasCard: s.ended,
  };
};

export const mockCard: CoachCard = {
  strength: {
    turn: 4,
    quote: "Ravi, tell me how you got 35",
    why: "You found out how Ravi was thinking before correcting him.",
  },
  fix: {
    turn: 2,
    quote: "No, it is 25. Say 25.",
    whatHappened: "Ravi repeated 25 but made the same mistake on the next sum.",
    tryInstead: "Ask Ravi to show 43 with bundles and sticks.",
  },
  sayTomorrow: "Two of you got 35. Tell me how you each got it.",
  teachScores: [
    { element: "checks_for_understanding", score: 4, turn: 4, quote: "tell me how you got 35" },
    { element: "feedback", score: 2, turn: 2, quote: "No, it is 25" },
  ],
};

export const mockEndLesson: EndLesson = async (sessionId) => {
  const s = sessions.get(sessionId);
  if (s) s.ended = true;
  return mockCard;
};

export const mockGetCard: GetCard = async (sessionId) => (sessions.get(sessionId)?.ended ? mockCard : null);
