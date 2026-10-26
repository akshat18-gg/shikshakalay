/**
 * Login tables (owner: P2). STARTER — P2 may add columns through a normal PR.
 * Only P1 runs `npm run db:push` on the shared Neon database.
 */
import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Login ID and the name used in every log: "teacher_demo", "T07", or "W03" for WhatsApp teachers. */
  code: text("code").notNull().unique(),
  role: text("role", { enum: ["teacher", "trainer", "admin"] })
    .notNull()
    .default("teacher"),
  lang: text("lang", { enum: ["en", "hi"] })
    .notNull()
    .default("en"),
  /** "scrypt$<saltHex>$<hashHex>" from node:crypto. Null for WhatsApp-only teachers. */
  pinHash: text("pin_hash"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const consents = pgTable("consents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  textVersion: text("text_version").notNull(), // "v1"
  channel: text("channel", { enum: ["web", "whatsapp"] }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
