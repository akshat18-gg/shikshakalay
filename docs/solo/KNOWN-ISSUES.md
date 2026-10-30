# Known issues — parked bugs and deliberate shortcuts

> The agent adds a bug here when it survives 3 honest attempts (MASTER_PROMPT §6), and moves on unless it blocks
> a gate. The bug bash on Sat 31 works through "Open", worst first. Every fix starts with a failing test.
> Shortcuts we took on purpose also go into the README's "Known limitations".

## Template
```
### KI-001 · <short title> · blocker | major | minor · found <date>, Phase <n>
Expected: …
Actual: …
Ruled out: …
Next idea: …
Repro: 1. … 2. … 3. …
Status: open | fixed in #<PR> (test: <file>)
```

## Open
- (none yet)

## Fixed
### KI-001 · Sums outside the lesson were ignored · major · found 28 Oct, Phase 3 (operator's phone test, live)
Expected: "Arjun subtract 5 from 10", "10 minus 5 is 5", "subtract 2 from 1", "add 10 plus 5" get sensible replies.
Actual: newTask was only accepted as a 2-digit borrowing sum, so the lesson stayed on 52 − 27 and Arjun kept saying
25 (a parrot), even "Ten plus five… 25?"; the Director carried "arjun" into turns that named nobody; "10 + 7" was
treated as too short ("say it again").
Fix: `parseTask` (any a − b ≤ 99 plays; b > a → `cannot`; +, ×, ÷, 3 digits → `not_today`; steps of the current sum
are not tasks), a react never parrots, number rule in the line check, digits count as words, director@3 (this
turn's names only; newTask for any sum she asks or answers; romanised Hindi numbers).
Status: fixed in #22 (tests: `tests/unit/anySum.test.ts`, fixture lines t31–t36; real replay of the phone sequence).

## Shortcuts we took on purpose
- Login lockout counter (5 wrong PINs → 15 minutes) lives in memory: fine on one server, resets on restart.
- Logout clears the cookie, but a copied session token stays valid until it expires (7 days): no server-side
  session list. Fine for a demo with test logins.
- Schema changes use `drizzle-kit push` from the schema files in git (no migration files). The schema can be
  rebuilt from empty with one command.
- Offline recording queue (P2-T12) cut — first item on the plan's cut list: offline, the app shell and the last
  pages open (service worker) and the fixed clips play, but a turn needs the network; a failed send shows the error
  with Retry (same idempotency key, so no double turn).
- TTS is Sarvam Bulbul (no Azure key): it has no child-pitched boy voice, so Ravi and Arjun sound older than
  Meena and Sana; and it can't make ogg/opus, so WhatsApp gets the children's audio as an MP3 file (not a voice
  note) or text only — decide in Phase 5. Audio is 128 kbps (≈ 16 KB/s); 8 kHz (64 kbps) is the data-saver option.
- Short-lived audio clips live in Postgres (`media`, 60-minute expiry) instead of object storage: they are small
  and deleted by the sweep.
