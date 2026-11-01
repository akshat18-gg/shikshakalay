# Numbers for the deck and video

> For: the operator (deck + video) and the README. Every number has a date and a source. Replace a row when a newer
> run lands; never round up. Status: **final for the submission** (Sun 1 Nov) — pilot numbers still to add.

## Evals — run 2 (Sun 1 Nov 16:46 IST · director@4, children@3, coach@2, lesson file v3) — use these
Source: `evals/results/2026-11-01T11-17-52.json` (run 2 scored on the final key) · 100 lessons (50 weak, 50 strong;
50 English, 50 Hindi/Hinglish), 800 teacher turns, 1,744 child lines, coach on 20 lessons · Claude spend **$0.54**.
Both runs are scored against the same answer key (see "How the answer key was checked").

| Metric | Target | Run 2 (director@4) | Run 1 (director@3) | Notes |
|---|---|---|---|---|
| Children resist weak moves | ≥ 90 % | **100 %** (50/50) | 100 % | At the probe every bugged child still gave its own wrong answer |
| Children can be taught (strong lessons) | ≥ 80 % | **100 %** (50/50) | 100 % | The focus child answered the fresh probe sum right |
| Director accuracy (move tag), all 800 turns | ≥ 85 % | **89.1 %** | 84.1 % | director@4 fixed run 1's top confusions (repeats, hands-on materials, the opening sum) |
| Director: who was addressed / which sum | — | 95.0 % / 99.8 % | 94.8 % / 99.9 % | The sum is what changes the children, and it is almost always right |
| Line check passed first try | ≥ 98 % | **96.9 %** | 97.6 % | Below target; retry + backup line make it 100 % |
| Lines with the engine's number after retry/backup | 100 % | **100 %** | 100 % | Guaranteed in code |
| Coach quotes valid, first pass / after the check | 100 % | **100 % / 100 %** | 100 % / 100 % | 20 cards |
| Red-team cases as expected | 20/20 | **20/20** | 20/20 | `evals/results/redteam-2026-11-01T11-19-31.json` ($0.003) |

Run 1 rescored on the final key: `evals/results/2026-11-01T11-17-50.json` (raw run `2026-10-30T21-01-31.json`, $0.53).

## How the answer key was checked
- 100 lessons written and labelled by Claude Opus 5.5 (Batch API, ≈ $0.90).
- A second, independent model (Claude Sonnet 5.5) labelled all 800 teacher lines **without seeing** the first label:
  **735/800 agree (91.9 %)**; 50 of 100 lessons agree on every line. Cost $0.22.
- 33 of the 65 disagreements are `new_sum` vs `other` (neither changes a child's mind).
- A third model pass (Claude as arbiter, using the Director's tag definitions) settled the 65 disagreements and
  re-checked 40 random agreed lines: **35/40 confirmed**, 5 corrected (Sun 1 Nov). Recorded as `labelSource: "arbiter"`;
  no person has confirmed the picks yet — say "model-arbitrated answer key", not "human-labelled".

## Speed and cost (live)
- Reply time, spoken Hindi on the live site (28 Oct, `npm run speed:check`): text **p50 3.3 s / p90 5.1 s**; audio
  p50 5.0 s / p90 6.6 s. Target ≤ 6 s / ≤ 10 s.
- One 12-turn lesson + card ≈ **$0.017** of Claude (coach ≈ $0.014) + ≈ **₹2** of Sarvam speech.
- Prompt caching: from turn 2 the Director reads 3,265 and the Children 2,195 cached tokens per call.
- Audio: ≈ 16 KB/s MP3 (web), ≈ 3 KB/s Ogg/Opus (WhatsApp).

## Engineering
- 219 unit tests, Playwright end-to-end + axe accessibility in CI; 37 pull requests, each through green CI.
- gitleaks over the full history: clean. No GPL/AGPL dependencies.

## Pilot (real teachers) — pending
- 10 pilot logins (P01–P10) issued Sat 31 Oct. Report counts only with ≥ 5 teachers: teachers, lessons, teachers
  who came back for a 2nd lesson (target ≥ 60 %), average "does what I need" and "easy to use" (1–7), one quote
  (with OK, no name) and one change we made (`docs/pilot/changes.md`).
- **Sun 1 Nov 17:20 IST (prod, read-only): 0 of 10 pilot logins used — 0 lessons, 0 feedback forms, 0 check-ins.** Say so honestly; update with `npm run pilot:stats` if teachers try it before submitting.

## Not measured yet (say so)
- Coach vs. expert agreement (≥ 80 % promised): needs 2 expert raters on 20 lessons — not done in this build.
