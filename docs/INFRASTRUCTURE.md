# Infrastructure — every outside service, what we changed, where each secret lives

Everything runs on free tiers except the Claude credits (hackathon credits) and Sarvam (small prepaid balance).

| Service | What it does for us | Settings we changed |
|---|---|---|
| **GitHub** `akshat18-gg/shikshakalay` | Code, CI (GitHub Actions), Dependabot | Ruleset on `main`: PR required, CI `check` must pass, squash merge only, branches auto-deleted. Dependabot alerts on |
| **Render** (web service, Singapore, free) | Runs the Next.js app (`npm ci && npm run build`, `npm start`) | Health check path `/api/healthz`; Node 22 from `.node-version`; auto-deploy on `main` (turned **off** after the submission tag); environment variables below |
| **Neon** (Postgres, free) | The database | Project in AWS Singapore; branch `main` (Render) and branch `dev` (local work); pooled connection strings |
| **Anthropic Console** | Claude API | The app has its own API key, separate from the coding agent's; workspace spend limit set |
| **Sarvam AI** | Speech → text (Saaras v4), text → speech (Bulbul v4-flash) | One API key; prepaid balance |
| **Twilio** (trial) | WhatsApp testing number +1 737 250 8034, join code `join twilio-trial` | "When a message comes in" webhook → `https://shikshakalay.onrender.com/api/whatsapp/webhook` (POST); verified tester numbers (max 5) |
| **UptimeRobot** (free) | Keeps Render awake; runs background jobs | Monitor 1: `GET /api/healthz` every 5 min (email alerts). Monitor 2: `GET /api/cron/sweep?key=<CRON_SECRET>` every 5 min |

## Secrets map

| Secret | Local (`.env.local`, git-ignored) | Render environment | Notes |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | ✓ | ✓ | The app's own key |
| `DATABASE_URL` | dev branch | main branch | Pooled URL (`-pooler` host), `?sslmode=require` |
| `DATABASE_URL_PROD` | main branch | — | Only for `npm run db:*:prod` (needs `DB_TARGET=prod`) |
| `SESSION_SECRET` | ✓ (random) | ✓ (different random) | Signs login cookies (HS256) |
| `DEMO_PIN` | ✓ | ✓ | Demo-only, published in the README |
| `SARVAM_API_KEY` | ✓ | ✓ | |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | ✓ | ✓ | The auth token also checks webhook signatures |
| `CRON_SECRET` | ✓ | ✓ + in UptimeRobot monitor 2's URL | |
| Non-secret config | `USE_MOCKS`, `PUBLIC_BASE_URL`, model names, `TURNS_PER_HOUR_LIMIT`, `AI_DAILY_BUDGET_USD`, `TWILIO_WHATSAPP_FROM`, `TWILIO_SANDBOX_JOIN_CODE` | ✓ | Names in `.env.example` |

No secret is ever sent to the browser (no `NEXT_PUBLIC_` variables) or written to logs.

## Rotating a key (each under 10 minutes)

Render redeploys by itself when an environment variable is saved (~3–5 min). After each rotation run
`npm run smoke:live -- --url https://shikshakalay.onrender.com --full`.

| Key | Steps |
|---|---|
| Anthropic | Console → API keys → create a new key → Render → Environment → `ANTHROPIC_API_KEY` → save → after the deploy, delete the old key in the Console. Update `.env.local` |
| Sarvam | Sarvam dashboard → API keys → new key → Render `SARVAM_API_KEY` → save → revoke the old one |
| Twilio auth token | Twilio Console → Account → API keys & tokens → "Request a secondary token" → promote it → Render `TWILIO_AUTH_TOKEN` → save. (The token also validates webhook signatures, so update it promptly) |
| Neon password | Neon → Roles → reset the password → copy the new pooled URL → Render `DATABASE_URL` (main) and `.env.local` |
| `SESSION_SECRET` | Generate 48+ random characters → Render → save. Everyone is logged out (cookies no longer verify) |
| `CRON_SECRET` | New random string → Render → save → edit UptimeRobot monitor 2's URL |
| `DEMO_PIN` | Render → save → `npm run db:seed:prod` (re-hashes the demo PINs) → update the README |

## Deploys and rollback

- Every merge to `main` deploys automatically until the submission tag; after that auto-deploy is off and a deploy
  is a manual "Deploy latest commit" (or a specific commit) in Render.
- `GET /api/version` shows the live commit (first 7 characters of `RENDER_GIT_COMMIT`).
- **Rollback:** Render → the service → **Events** → pick the last good deploy → **Rollback**. The database schema
  only grows (columns are added, never removed), so an older build keeps working.
- If a bad env value breaks start-up, the env check makes every route answer 500, Render's health check fails, and
  the previous deploy stays live.

## Database operations

- `npm run db:push` / `db:seed` → dev branch (safe). `npm run db:push:prod` / `db:seed:prod` → main branch — only with
  the operator's OK.
- Backups: Neon keeps point-in-time history (free plan: 1 day). Before submission we create a branch
  `backup-submission` from `main` in the Neon console (a full copy, kept).
- Rebuild from empty: create a Neon branch → `DATABASE_URL=<its URL> npm run db:push && npm run db:seed`.
- Delete one person's data: `scripts/delete-user.ts --code <code>` (dry run first; `--yes` to delete).
