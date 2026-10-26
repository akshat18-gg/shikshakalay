# Agent prompts — how to use them

> **SOLO BUILD MODE (from Mon 26 Oct 2026):** one coding agent builds everything on one machine.
> Use **`docs/solo/MASTER_PROMPT.md`** (paste it into Claude Code in VS Code). The P1/P2/P3 files below are
> still the detailed **task specs** the master prompt points to — ignore their "You own / Don't edit /
> How to work with me / First message / Daily restart" parts and their dates.

| File | Who | When |
|---|---|---|
| `00-KICKOFF.md` | Team mode: all three (P2 drives). Solo mode: the agent runs it in Phase 0 | Repo setup |
| `P1-ai-backend.md` | Task specs: engine, AI, DB, lesson API, evals runner, deploy | Read when the plan names a P1 task |
| `P2-frontend.md` | Task specs: screens, recorder, logins, dashboards, offline, Playwright | Read when the plan names a P2 task |
| `P3-content-voice-pilot.md` | Task specs: lesson file, voice, WhatsApp, jobs, eval lessons, pilot | Read when the plan names a P3 task |

**Cursor:** open the repo folder in Cursor. Cursor reads `AGENTS.md` and `.cursor/rules/shikshakalay.mdc` by itself.
If you use a tool that does NOT read the repo (a plain chat window), paste the FULL version from the
`Shikshakalay-Starter-Prompts` folder instead — it has AGENTS.md attached at the end.

**Rules for humans:** skim every PR before the end of the day. You must be able to explain the code to a judge.
