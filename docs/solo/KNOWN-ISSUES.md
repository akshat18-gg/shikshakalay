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
- (none yet)

## Shortcuts we took on purpose
- Login lockout counter (5 wrong PINs → 15 minutes) lives in memory: fine on one server, resets on restart.
- Logout clears the cookie, but a copied session token stays valid until it expires (7 days): no server-side
  session list. Fine for a demo with test logins.
- Schema changes use `drizzle-kit push` from the schema files in git (no migration files). The schema can be
  rebuilt from empty with one command.
- TTS is Sarvam Bulbul (no Azure key): it has no child-pitched boy voice, so Ravi and Arjun sound older than
  Meena and Sana; and it can't make ogg/opus, so WhatsApp gets the children's audio as an MP3 file (not a voice
  note) or text only — decide in Phase 5. Audio is 128 kbps (≈ 16 KB/s); 8 kHz (64 kbps) is the data-saver option.
- Short-lived audio clips live in Postgres (`media`, 60-minute expiry) instead of object storage: they are small
  and deleted by the sweep.
