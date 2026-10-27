/**
 * 5 wrong PINs for one ID → that ID waits 15 minutes. In memory: fine on one server (a restart clears it —
 * listed in KNOWN-ISSUES as a deliberate shortcut). The clock is passed in so tests don't wait.
 */
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;

type Entry = { fails: number; lockedUntil: number };

export function createLockout(now: () => number = Date.now) {
  const entries = new Map<string, Entry>();
  return {
    /** Milliseconds left on the lock, or 0. */
    lockedFor(id: string): number {
      const e = entries.get(id);
      return e ? Math.max(0, e.lockedUntil - now()) : 0;
    },
    fail(id: string): void {
      const e = entries.get(id) ?? { fails: 0, lockedUntil: 0 };
      if (e.lockedUntil && e.lockedUntil <= now()) e.fails = 0; // an old lock has run out: start again
      e.fails += 1;
      e.lockedUntil = e.fails >= MAX_FAILS ? now() + LOCK_MS : 0;
      entries.set(id, e);
    },
    reset(id: string): void {
      entries.delete(id);
    },
  };
}

export const loginLockout = createLockout();
