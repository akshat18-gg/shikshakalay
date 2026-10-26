# CLAUDE.md

All shared project context lives in AGENTS.md (imported below). Read it fully before writing code.

**SOLO BUILD MODE is ON (from Mon 26 Oct 2026).** One coding agent (you) builds everything on one Mac.
- Full rules + phases: `docs/solo/MASTER_PROMPT.md` and `docs/solo/IMPLEMENTATION_PLAN.md`. Read both at the
  start of every new conversation (the human may forget to say so).
- Where we are: `docs/solo/PROGRESS.md` (imported below). Update it after every task.
- Never read or print `.env.local` (it is blocked). Use `npm run env:check` to see which keys are missing.
- Need something only a human can do (account, key, recording, phone test)? Use the "NEED YOUR HELP" format in
  MASTER_PROMPT §5, keep working on what you can, and never ask for a secret in chat.
- Stuck on the same bug 3 times? Log it in `docs/solo/KNOWN-ISSUES.md` and move on unless it blocks the gate.

@AGENTS.md

@docs/solo/PROGRESS.md

## Quick commands
- `npm run dev` — local app (`USE_MOCKS=1` in `.env.local` runs with no keys)
- `npm run verify` — format check + lint + typecheck + unit tests. Must pass before every commit/push
- `npm run env:init` / `npm run env:check` — make `.env.local` / see what is missing (never shows values)
- `npm run e2e` — Playwright (mock mode)
- `npm run db:push` — schema → Neon DEV branch · `npm run db:push:prod` — MAIN branch (ask the human first)
- `npm run evals` — real Claude calls (costs credits — ask the human first)
