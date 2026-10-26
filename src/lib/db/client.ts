/**
 * Database client. Neon Postgres through postgres.js + Drizzle.
 * Use Neon's POOLED connection string (host has "-pooler"). prepare: false is needed with the pooler.
 * The connection opens on the first query, so importing this file without DATABASE_URL is safe (mock mode, CI).
 *
 * Which database: DATABASE_URL (locally = Neon DEV branch; on Render = MAIN branch).
 * Scripts run with DB_TARGET=prod (db:seed:prod, evals that save to the live admin page) use DATABASE_URL_PROD.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as auth from "./schema/auth";
import * as core from "./schema/core";
import * as whatsapp from "./schema/whatsapp";

export const schema = { ...auth, ...core, ...whatsapp };

const url = process.env.DB_TARGET === "prod" ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL;

const globalForDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };

export const sql = globalForDb.sql ?? postgres(url ?? "", { prepare: false, max: 5, connect_timeout: 10 });
if (process.env.NODE_ENV !== "production") globalForDb.sql = sql; // reuse across hot reloads

export const db = drizzle(sql, { schema });
