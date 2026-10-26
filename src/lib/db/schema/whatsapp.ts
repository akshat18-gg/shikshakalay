/**
 * WhatsApp, jobs and media tables (owner: P3). STARTER — P3 may add columns through a normal PR.
 */
import { customType, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { sessions } from "./core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

/** One row per WhatsApp number. The phone number lives ONLY here. Never log it — log users.code instead. */
export const waContacts = pgTable("wa_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: text("phone").notNull().unique(), // "whatsapp:+91…", exactly as Twilio sends it
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  step: text("step", { enum: ["new", "consent", "lang", "menu", "in_lesson", "checkin", "stopped"] })
    .notNull()
    .default("new"),
  activeSessionId: uuid("active_session_id").references(() => sessions.id, { onDelete: "set null" }),
  /** WhatsApp only allows free messages within 24 hours of her last message. */
  lastInboundAt: timestamp("last_inbound_at", { withTimezone: true }),
  /** The sandbox drops people after 3 days; we remind her to re-join at most every 2 days. */
  lastRejoinTipAt: timestamp("last_rejoin_tip_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Background work. The webhook saves a job, replies to Twilio at once, then runs it with after().
 * The sweep (every 5 min) picks up jobs that are due (run_at) or stuck (running for over 2 minutes).
 */
export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull(), // "wa_inbound" | "wa_checkin" | …
    payload: jsonb("payload").notNull(),
    status: text("status", { enum: ["pending", "running", "done", "failed"] })
      .notNull()
      .default("pending"),
    attempts: integer("attempts").notNull().default(0),
    runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lastError: text("last_error"),
    /** e.g. Twilio's MessageSid, so a webhook retry never creates a second job. */
    dedupeKey: text("dedupe_key").unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("jobs_due_idx").on(t.status, t.runAt)],
);

/** Short-lived audio served at /api/media/<token>. Deleted by the sweep after expires_at. */
export const media = pgTable("media", {
  token: text("token").primaryKey(), // 32 random hex characters
  mime: text("mime").notNull(), // "audio/mpeg" or "audio/ogg"
  data: bytea("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
