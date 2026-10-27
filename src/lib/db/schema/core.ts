/**
 * Lesson tables (owner: P1). STARTER — P1 may add columns through a normal PR.
 * P2's pages read these tables (trainer dashboard, AI trace, history). P1 keeps them filled.
 */
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import type { CoachCard, DirectorOutput, ChildState, TurnResult } from "@/lib/contracts";
import { users } from "./auth";

/*
 * Indexes: every foreign key, and every column a page filters or sorts on (history = user + newest first,
 * AI trace = newest first, budget guard = today's ai_calls). turns(session_id) is covered by its unique keys.
 */

/** One lesson. `state` holds the engine's full state (EngineState, defined by P1 in src/lib/engine/types.ts). */
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scenarioId: text("scenario_id").notNull(),
    scenarioVersion: integer("scenario_version").notNull(),
    lang: text("lang", { enum: ["en", "hi"] }).notNull(),
    channel: text("channel", { enum: ["web", "whatsapp"] }).notNull(),
    status: text("status", { enum: ["active", "ended"] })
      .notNull()
      .default("active"),
    state: jsonb("state").notNull(),
    turnCount: integer("turn_count").notNull().default(0),
    bytesIn: integer("bytes_in").notNull().default(0),
    bytesOut: integer("bytes_out").notNull().default(0),
    isDemo: boolean("is_demo").notNull().default(false), // seeded demo data
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (t) => [index("sessions_user_started_idx").on(t.userId, t.startedAt), index("sessions_started_idx").on(t.startedAt)],
);

/** One teacher turn. `result` is the full TurnResult, so a retry with the same idempotency key gets the same answer. */
export const turns = pgTable(
  "turns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    turn: integer("turn").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    teacherText: text("teacher_text").notNull(),
    audioMs: integer("audio_ms"),
    director: jsonb("director").$type<DirectorOutput>(),
    statesBefore: jsonb("states_before").$type<ChildState[]>().notNull(),
    statesAfter: jsonb("states_after").$type<ChildState[]>().notNull(),
    result: jsonb("result").$type<TurnResult>().notNull(),
    ms: integer("ms").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.sessionId, t.idempotencyKey), unique().on(t.sessionId, t.turn)],
);

/** Every child line, with the result of the line check. */
export const childLines = pgTable(
  "child_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    turnId: uuid("turn_id")
      .notNull()
      .references(() => turns.id, { onDelete: "cascade" }),
    child: text("child").notNull(),
    text: text("text").notNull(),
    expectedAnswer: integer("expected_answer"), // null when no number was needed (hello, "say again")
    passed: boolean("passed").notNull(),
    retries: integer("retries").notNull().default(0),
    usedBackup: boolean("used_backup").notNull().default(false),
  },
  (t) => [index("child_lines_turn_idx").on(t.turnId)],
);

export const coachCards = pgTable("coach_cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .unique()
    .references(() => sessions.id, { onDelete: "cascade" }),
  card: jsonb("card").$type<CoachCard>().notNull(),
  quotesVerified: boolean("quotes_verified").notNull(),
  droppedPoints: integer("dropped_points").notNull().default(0),
  lang: text("lang", { enum: ["en", "hi"] }).notNull(),
  shared: boolean("shared").notNull().default(false), // private by default
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Every Claude, Sarvam and Azure call. The AI trace page and the cost numbers come from here. */
export const aiCalls = pgTable(
  "ai_calls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "set null" }),
    turn: integer("turn"),
    purpose: text("purpose", { enum: ["director", "children", "coach", "stt", "tts", "eval_gen"] }).notNull(),
    provider: text("provider", { enum: ["anthropic", "sarvam", "azure"] }).notNull(),
    model: text("model").notNull(),
    promptVersion: text("prompt_version"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    cacheReadTokens: integer("cache_read_tokens"),
    cacheWriteTokens: integer("cache_write_tokens"),
    ms: integer("ms").notNull(),
    costUsd: doublePrecision("cost_usd"),
    ok: boolean("ok").notNull(),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ai_calls_session_turn_idx").on(t.sessionId, t.turn), index("ai_calls_created_idx").on(t.createdAt)],
);

export const evalRuns = pgTable(
  "eval_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    promptVersions: jsonb("prompt_versions").$type<Record<string, string>>().notNull(),
    metrics: jsonb("metrics").$type<Record<string, number>>().notNull(),
    details: jsonb("details"), // confusion table, failures list
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("eval_runs_created_idx").on(t.createdAt)],
);

/** "Did you try the line in class?" answers (WhatsApp check-in or web). */
export const checkins = pgTable(
  "checkins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    triedInClass: boolean("tried_in_class"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("checkins_session_idx").on(t.sessionId)],
);

/** Ease-of-use answers: two 1–7 questions (UMUX-Lite) and open answers. */
export const feedback = pgTable(
  "feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    doesWhatINeed: integer("does_what_i_need"),
    easyToUse: integer("easy_to_use"),
    openAnswers: jsonb("open_answers").$type<Record<string, string>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("feedback_user_idx").on(t.userId)],
);
