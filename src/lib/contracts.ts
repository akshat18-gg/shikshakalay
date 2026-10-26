/**
 * Shared types for Shikshakalay — used by P1 (AI & backend), P2 (frontend) and P3 (content, voice & pilot).
 *
 * RULE: change this file only through a pull request that all three people approve.
 * SOLO MODE (from Mon 26 Oct, one coding agent builds everything): additive changes are allowed;
 * write a line in docs/solo/PROGRESS.md → Decisions; a breaking change needs the human's OK first.
 * Every API body, every Claude output and every hand-off between people uses these types.
 */
import { z } from "zod";

/* ----------------------------------------------------------------------------
 * Basic enums
 * ------------------------------------------------------------------------- */

export const Lang = z.enum(["en", "hi"]);
export const Role = z.enum(["teacher", "trainer", "admin"]);
export const Channel = z.enum(["web", "whatsapp"]);
export const ChildId = z.enum(["ravi", "arjun", "meena", "sana"]);
export const Mind = z.enum(["STUCK", "WOBBLY", "GOT_IT"]);

/** The 12 teaching moves + 2 extra tags. Effects are defined in AGENTS.md ("Teaching moves"). */
export const Move = z.enum([
  "ask_to_explain",
  "compare_methods",
  "concrete_materials",
  "targeted_question",
  "think_aloud",
  "new_sum",
  "check_whole_class",
  "invite_quiet_child",
  "specific_praise",
  "tell_answer",
  "repeat_same_way",
  "move_on_or_scold",
  "other",
  "off_task",
]);

/** World Bank Teach elements the coach scores (1–5). */
export const TeachElement = z.enum([
  "lesson_facilitation",
  "checks_for_understanding",
  "feedback",
  "critical_thinking",
  "supportive_environment",
]);

/* ----------------------------------------------------------------------------
 * Engine state (kept by P1's engine in TypeScript — Claude never fills this in)
 * ------------------------------------------------------------------------- */

export const ChildState = z.object({
  id: ChildId,
  /** Name of a function in src/lib/engine/bugs.ts, or null for a child with no mistake (Sana). */
  bug: z.string().nullable(),
  state: Mind,
  /** Has the teacher found out how this child thinks? (set by reveal moves) */
  revealed: z.boolean(),
  /** 0 = silent … 3 = eager */
  engagement: z.number().int().min(0).max(3),
  /** [a, b] — the sum this child was fixed on together with the teacher (WOBBLY is right only here). */
  workedSum: z.tuple([z.number(), z.number()]).nullable(),
});

/* ----------------------------------------------------------------------------
 * Claude outputs. Keep these SIMPLE (strings, numbers, booleans, enums, arrays, objects):
 * structured outputs support a subset of JSON Schema. Check ranges in code, not in the schema.
 * ------------------------------------------------------------------------- */

export const DirectorOutput = z.object({
  move: Move,
  addressedTo: z.array(z.enum(["ravi", "arjun", "meena", "sana", "whole_class"])),
  /** A new sum the teacher gave, as "a-b" (e.g. "43-18"), or "" if none. Numbers may be spoken as words. */
  newTask: z.string(),
  /** The teacher's exact words that show the move. */
  evidenceQuote: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
});

export const ChildLine = z.object({ child: ChildId, text: z.string() });
export const ChildLines = z.object({ lines: z.array(ChildLine) });

export const CoachCard = z.object({
  strength: z.object({ turn: z.number(), quote: z.string(), why: z.string() }),
  fix: z.object({
    turn: z.number(),
    quote: z.string(),
    whatHappened: z.string(),
    tryInstead: z.string(),
  }),
  sayTomorrow: z.string(),
  teachScores: z.array(
    z.object({
      element: TeachElement,
      score: z.number(), // 1–5, clamp in code
      turn: z.number(),
      quote: z.string(),
    }),
  ),
});

/* ----------------------------------------------------------------------------
 * API shapes (web door). The WhatsApp door uses the same engine functions.
 * ------------------------------------------------------------------------- */

/** POST /api/sessions — body */
export const StartLessonBody = z.object({
  scenarioId: z.string(), // e.g. "sub_2digit"
  lang: Lang,
});

/** What the API returns for every turn (and for the children's hello). */
export const TurnResult = z.object({
  sessionId: z.string(),
  turn: z.number().int(), // 0 = the children's hello
  transcript: z.string(), // what the teacher said ("" for the hello)
  director: DirectorOutput.nullable(), // null for the hello
  lines: z.array(ChildLine),
  statesAfter: z.array(ChildState),
  audioUrl: z.string().nullable(), // null in text-only mode
  lessonOver: z.boolean(), // true after 5 min / 12 turns / "end"
  ms: z.number(), // time taken, shown on the AI trace page
});

/** POST /api/sessions — response */
export const StartLessonResult = z.object({
  sessionId: z.string(),
  scenarioId: z.string(),
  lang: Lang,
  firstSum: z.string(), // e.g. "52-27"
  hello: TurnResult,
});

/** GET /api/sessions/[id] — the whole lesson so far, so the practice room survives a page reload. */
export const SessionView = z.object({
  sessionId: z.string(),
  scenarioId: z.string(),
  lang: Lang,
  channel: Channel,
  status: z.enum(["active", "ended"]),
  startedAt: z.string(), // ISO time, for the 5-minute timer
  turns: z.array(TurnResult), // turn 0 (hello) first
  hasCard: z.boolean(),
});

/**
 * POST /api/sessions/[id]/turns — multipart/form-data fields:
 *   text?: string            (typed turn)
 *   audio?: File             (recorded turn, max 30 s, webm/ogg/mp4)
 *   idempotencyKey: string   (required; a retry with the same key returns the same TurnResult)
 */
export const TurnFields = z.object({
  text: z.string().optional(),
  idempotencyKey: z.string().min(8),
});

/** Logged-in user, as returned by getUser() (P2). */
export const SessionUser = z.object({
  id: z.string(),
  code: z.string(), // e.g. "T07" — use this in logs, never names or phone numbers
  role: Role,
  lang: Lang,
});

/** GET /api/scenarios — response is ScenarioSummary[] */
export const ScenarioSummary = z.object({
  id: z.string(), // "sub_2digit"
  title: z.object({ en: z.string(), hi: z.string() }),
  grade: z.number().int(),
  languages: z.array(Lang),
});

/** Every API error uses this body, with a matching HTTP status. P2 maps `code` to a friendly message. */
export const ApiErrorCode = z.enum([
  "bad_request", // 400
  "unauthorized", // 401 — not logged in
  "forbidden", // 403 — wrong role, or not your lesson
  "not_found", // 404
  "lesson_over", // 409 — turn sent after the lesson ended
  "audio_too_long", // 413 — over 30 seconds
  "rate_limited", // 429 — over TURNS_PER_HOUR_LIMIT
  "stt_failed", // 502 — speech-to-text failed; UI offers the text box
  "internal", // 500
]);
export const ApiError = z.object({
  error: z.object({
    code: ApiErrorCode,
    message: z.string(),
    /** Same id as in the server log line, so "it broke" becomes a lookup. Shown on error screens. */
    requestId: z.string().optional(),
  }),
});

/* ----------------------------------------------------------------------------
 * Eval lessons (P3 writes them in evals/lessons/*.json, P1's evals/run.ts reads them)
 * ------------------------------------------------------------------------- */

export const EvalTurn = z.object({
  teacher: z.string(), // what the teacher says
  label: Move, // the right move — the hand-checked answer key
  addressedTo: z.array(z.enum(["ravi", "arjun", "meena", "sana", "whole_class"])),
  newTask: z.string(), // "43-18", or ""
});

export const EvalLesson = z.object({
  id: z.string(), // "sub_2digit-weak-hi-07"
  scenarioId: z.string(), // "sub_2digit"
  lang: Lang,
  kind: z.enum(["weak", "strong"]),
  /** Strong lessons: the child the teacher works on. Weak lessons: null. */
  focusChild: ChildId.nullable(),
  turns: z.array(EvalTurn),
  /** The fresh sum asked at the very end, e.g. "61-24". Used for "resist" and "teachable". */
  finalSum: z.string(),
  /** true once every label is confirmed (see labelSource). Only reviewed lessons count in the numbers. */
  reviewed: z.boolean(),
  /**
   * How the labels were confirmed (say this honestly in the README):
   * "generator" = only the generating model's label · "agreed" = a second, independent model pass agreed
   * on every turn · "human" = a person settled the disagreements by hand.
   */
  labelSource: z.enum(["generator", "agreed", "human"]).optional(),
});

/* ----------------------------------------------------------------------------
 * TypeScript types
 * ------------------------------------------------------------------------- */

export type Lang = z.infer<typeof Lang>;
export type Role = z.infer<typeof Role>;
export type Channel = z.infer<typeof Channel>;
export type ChildId = z.infer<typeof ChildId>;
export type Mind = z.infer<typeof Mind>;
export type Move = z.infer<typeof Move>;
export type TeachElement = z.infer<typeof TeachElement>;
export type ChildState = z.infer<typeof ChildState>;
export type DirectorOutput = z.infer<typeof DirectorOutput>;
export type ChildLine = z.infer<typeof ChildLine>;
export type ChildLines = z.infer<typeof ChildLines>;
export type CoachCard = z.infer<typeof CoachCard>;
export type StartLessonBody = z.infer<typeof StartLessonBody>;
export type StartLessonResult = z.infer<typeof StartLessonResult>;
export type SessionView = z.infer<typeof SessionView>;
export type TurnResult = z.infer<typeof TurnResult>;
export type TurnFields = z.infer<typeof TurnFields>;
export type SessionUser = z.infer<typeof SessionUser>;
export type ScenarioSummary = z.infer<typeof ScenarioSummary>;
export type ApiErrorCode = z.infer<typeof ApiErrorCode>;
export type ApiError = z.infer<typeof ApiError>;
export type EvalTurn = z.infer<typeof EvalTurn>;
export type EvalLesson = z.infer<typeof EvalLesson>;

export type Audio = { bytes: Buffer; mime: string };

/* ----------------------------------------------------------------------------
 * Functions people hand to each other (signatures only)
 * ------------------------------------------------------------------------- */

/** P1 — src/lib/engine/orchestrator.ts */
export type StartLesson = (userId: string, body: StartLessonBody, channel: Channel) => Promise<StartLessonResult>;

/** P1 — src/lib/engine/orchestrator.ts */
export type RunTurn = (
  sessionId: string,
  input: { text?: string; audio?: Audio; idempotencyKey: string },
  channel: Channel,
) => Promise<TurnResult>;

/** P1 — src/lib/engine/orchestrator.ts */
export type EndLesson = (sessionId: string) => Promise<CoachCard>;

/** P1 — src/lib/engine/orchestrator.ts. null if the lesson doesn't exist. (Owner checks happen in the route.) */
export type GetSession = (sessionId: string) => Promise<(SessionView & { userId: string }) | null>;

/** P1 — src/lib/engine/orchestrator.ts. The lesson's coaching card, or null until the lesson has one. */
export type GetCard = (sessionId: string) => Promise<CoachCard | null>;

/** P3 — src/lib/voice/stt.ts (Sarvam Saaras v4, codemix). Max 30 s of audio. */
export type Transcribe = (audio: Audio, lang: Lang, keyterms?: string[]) => Promise<string>;

/** P3 — src/lib/voice/tts.ts (Azure Neural TTS, one SSML call for all lines). */
export type SpeakLines = (lines: ChildLine[], lang: Lang, format: "mp3" | "ogg") => Promise<Buffer>;

/** P3 — src/lib/voice/tts.ts. One adult "coach" voice, for the "say tomorrow" line on the card. */
export type SpeakText = (text: string, lang: Lang, format: "mp3" | "ogg") => Promise<Buffer>;

/**
 * P3 — src/lib/media/store.ts. Saves audio in the `media` table and returns its path,
 * "/api/media/<token>". The file is deleted after `ttlMinutes` (default 60).
 * WhatsApp needs a full URL: `${process.env.PUBLIC_BASE_URL}${path}`.
 */
export type SaveMedia = (bytes: Buffer, mime: string, ttlMinutes?: number) => Promise<string>;
