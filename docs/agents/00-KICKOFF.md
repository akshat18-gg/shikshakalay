# 00 · Kickoff — set up the repo (today, Sat 24 Oct, ~90 minutes, all three together)

> **SOLO MODE (from Mon 26 Oct):** the coding agent runs steps 2–8 itself, with the changes listed in
> `docs/solo/IMPLEMENTATION_PLAN.md` → Phase 0 (temp folder for create-next-app, Prettier, extra npm scripts,
> `npm run env:init`). Steps 1, 10, 11 and 12 are team-only; the operator does step 9 (GitHub settings).

**Who drives:** P2 types, everyone watches. **Who must click GitHub settings:** the repo owner (`sourin-git`).
Every command below was tested on 24 Oct 2026 with Node 22, Next.js 16.4.3 and the kit files.

Think of it like building a house: first mark where the pipes and wires go (the shared types, the mock
lesson, the folder rules). After that, the plumber, the electrician and the painter can all work on the
same day without waiting for each other.

---

## Step 1 · Decide roles (5 min)

Write the names here and in the group chat:

- P1 (AI & backend): ____________  GitHub: ____________
- P2 (frontend): ____________  GitHub: ____________
- P3 (content, voice & pilot): ____________  GitHub: ____________

The repo owner adds the other two: **GitHub → repo → Settings → Collaborators → Add people → Write**.
Both accept the email invite.

## Step 2 · Create the Next.js app (P2's laptop, 5 min)

Everyone needs **Node.js 22** (`node -v`). Then:

```bash
git clone https://github.com/sourin-git/shikshakalay.git
cd shikshakalay
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --disable-git --yes --no-agent-feedback
```

It must run inside the empty clone (only `.git` is there). If it says the folder is not empty, check for
stray files and remove them.

## Step 3 · Add shadcn/ui (P2, 5 min — answer its questions yourself)

```bash
npx shadcn@latest init -t next -b radix
```
If it asks: preset **Nova** (any is fine), yes to the rest. Then:
```bash
npx shadcn@latest add button card input dialog tabs chart badge sonner -y
```
If the radix init fails, run `npx shadcn@latest init -d` instead (it uses Base UI — that's OK; tell the
team, because then `asChild` becomes the `render` prop in components).

## Step 4 · Install our packages (2 min)

```bash
npm i @anthropic-ai/sdk zod drizzle-orm postgres jose twilio yaml idb-keyval server-only
npm i -D drizzle-kit vitest tsx @playwright/test @types/node@22
```
(`@types/node@22` is needed: create-next-app installs v20 types, and Vitest 5 refuses them.)

Why `next typegen` in the typecheck script: Next 16's layout uses route types (`LayoutProps`) that only exist
after Next generates them. On a fresh clone (and in CI) plain `tsc` fails without it.

## Step 5 · Copy in the agent kit (2 min)

Unzip `shikshakalay-agent-kit.zip` **into the repo root** (the folders line up with the repo).
Say **yes / replace** for `AGENTS.md` — our version already contains the block Next.js adds.

You should now have: `AGENTS.md`, `CLAUDE.md`, `.env.example`, `.github/`, `content/`, `docs/agents/`,
`drizzle.config.ts`, `vitest.config.mts`, `src/lib/contracts.ts`, `src/lib/mocks/lesson.ts`,
`src/lib/ai/claude.ts`, `src/lib/auth/index.ts`, `src/lib/db/…`, `tests/unit/mocks.test.ts`.

## Step 6 · Four small edits (5 min)

1. **`next.config.ts`** — delete these two lines (we turn Cache Components off on purpose; keep everything else):
   ```ts
   cacheComponents: true,
   partialPrefetching: true,
   ```
2. **Scripts** — run this once:
   ```bash
   npm pkg set scripts.lint="eslint ." scripts.typecheck="next typegen && tsc --noEmit" scripts.test="vitest run" scripts.e2e="playwright test" "scripts.db:push=drizzle-kit push" "scripts.db:seed=tsx --env-file-if-exists=.env.local scripts/seed.ts" scripts.evals="tsx --env-file-if-exists=.env.local evals/run.ts" "scripts.gen:lessons=tsx --env-file-if-exists=.env.local evals/generate.ts" engines.node=">=22"
   ```
3. **`.gitignore`** — Next.js ignores every `.env*` file, which would hide `.env.example`. Add at the bottom:
   ```
   # Shikshakalay
   !.env.example
   /drizzle
   /playwright-report
   /test-results
   ```
4. **`.github/CODEOWNERS`** — replace `@P1_USER`, `@P2_USER`, `@P3_USER` with your real GitHub usernames.

## Step 7 · Check that everything is green (3 min)

```bash
cp .env.example .env.local        # USE_MOCKS=1 is already set — no keys needed yet
npm run lint && npm run typecheck && npm test && npm run build
npm run dev                       # open http://localhost:3000 — the default page should load
```
All four commands must pass. (The Vitest test plays the 5 judge samples on the mock lesson.)

## Step 8 · First commit, straight to main (2 min — the only time we skip a PR)

```bash
git add -A
git commit -m "chore: Next.js 16 + shadcn skeleton, shared contracts, mock lesson, DB schema starters, agent docs"
git branch -M main
git push -u origin main
```

## Step 9 · GitHub settings (repo owner, 10 min)

1. **Settings → Branches → Add branch ruleset** (or "branch protection rule") for `main`:
   require a pull request before merging (0 approvals required — we review, but don't block),
   require status checks to pass → pick **`check`** (it appears after the first CI run), block force pushes.
2. **Settings → General → Pull Requests:** allow **squash merging** only; tick "automatically delete head branches".
3. **Labels:** `p1`, `p2`, `p3`, `bug`, `pilot`.
4. **Issues:** one issue per task in each person's list (`docs/agents/P1…`, `P2…`, `P3…`), labelled with the person.
   With the GitHub CLI: `gh issue create --title "engine: bugs.ts + tests" --label p1 --body "See docs/agents/P1-ai-backend.md, task 2"`.
5. **Projects:** create a board (Todo · Doing · Done) and add all issues.

## Step 10 · Read the shared types together (P1 leads, 30 min)

Open `src/lib/contracts.ts` and go through every type. Agree on the API list (AGENTS.md section 12) and
the folder owners (section 6). Change anything you disagree with **now**, in one PR that all three approve.
After tonight, `contracts.ts` changes need all three to approve.

## Step 11 · Split the accounts (10 min)

| Who | Accounts | Keys go to |
|---|---|---|
| P1 | Anthropic Console (API key + **monthly spend limit**), Neon (free project, Singapore/nearest region, pooled URL), Render | private chat / password manager, `.env.local`, Render settings |
| P3 | Sarvam (free ₹100), Azure Speech **Free F0** (region Central India if offered), Twilio trial (join the WhatsApp sandbox), UptimeRobot | same |
| P2 | GitHub Actions (already on), Playwright | — |

**Never paste a key into git, an issue, a PR or an agent prompt that gets committed.**

## Step 12 · Start your agents

Each person opens their own prompt and pastes it into their coding agent, in the repo folder:

- P1 → `docs/agents/P1-ai-backend.md`
- P2 → `docs/agents/P2-frontend.md`
- P3 → `docs/agents/P3-content-voice-pilot.md`

If your agent reads `AGENTS.md` / `CLAUDE.md` by itself (Claude Code, Codex, Cursor do), paste the short
file from `docs/agents/`. If it doesn't (e.g. a plain chat window), paste the **FULL** version from the
`Shikshakalay-Starter-Prompts` folder, which has AGENTS.md attached at the end.

## Tonight's goal — check-point H1

- [ ] Everything above is done and `main` is protected.
- [ ] P1: mock-backed API routes merged; Render service live; `https://<app>.onrender.com/api/healthz` says `ok`.
- [ ] P2: app shell + practice room playing the fake 52 − 27 lesson in the browser.
- [ ] P3: accounts made, first Sarvam + Azure test calls done, voice candidates shared in the group.
- [ ] **Everyone has merged at least one PR** from their own GitHub account.
- [ ] 15-minute stand-up at night: what I merged, what's next, what blocks me.
