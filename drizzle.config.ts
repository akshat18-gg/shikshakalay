import { defineConfig } from "drizzle-kit";

// Loads .env.local when it exists (Node 22). On Render and CI the variables are already set.
try {
  process.loadEnvFile(".env.local");
} catch {
  /* no .env.local here — that's fine */
}

// Default = DATABASE_URL (locally the Neon DEV branch). `npm run db:push:prod` sets DB_TARGET=prod → MAIN branch.
const url = process.env.DB_TARGET === "prod" ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema/*.ts",
  out: "./drizzle",
  dbCredentials: { url: url ?? "" },
});
