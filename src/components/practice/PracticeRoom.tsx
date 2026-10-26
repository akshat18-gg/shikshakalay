"use client";

/**
 * The practice room: a WhatsApp-style chat with the four children. The teacher types a turn (the recorder comes in
 * P2-T4); the reply shows as text first. One turn at a time: sending is disabled while the children "think".
 */
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiClientError, endLesson, sendTurn } from "@/lib/api";
import type { SessionView, TurnResult } from "@/lib/contracts";
import { CHILDREN, formatClock, latestStates, msLeft } from "@/lib/practice";
import { ErrorNote } from "../ErrorNote";
import { useT } from "../LangProvider";
import { CHILD_STYLE } from "./childStyle";
import { TeacherBubble, Turn } from "./Turn";

function asClientError(err: unknown): ApiClientError {
  return err instanceof ApiClientError ? err : new ApiClientError("internal");
}

export function PracticeRoom({ initial }: { initial: SessionView }) {
  const t = useT();
  const router = useRouter();
  const sessionId = initial.sessionId;
  const [turns, setTurns] = useState<TurnResult[]>(initial.turns);
  const [text, setText] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [over, setOver] = useState(initial.status === "ended" || Boolean(initial.turns.at(-1)?.lessonOver));
  const [now, setNow] = useState(() => Date.now());
  // The same key is reused if the teacher retries the same words, so a lost reply never makes a double turn.
  const idempotencyKey = useRef<string | null>(null);

  const left = msLeft(initial.startedAt, now);
  const timeUp = left === 0;
  const states = latestStates(turns);
  const busy = pending !== null || ending;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Scroll the page (not an element) so the newest line sits above the sticky composer, never under it.
  useEffect(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight });
  }, [turns, pending]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const words = text.trim();
    if (!words || busy || over) return;
    idempotencyKey.current ??= crypto.randomUUID();
    setPending(words);
    setError(null);
    try {
      const result = await sendTurn(sessionId, { text: words, idempotencyKey: idempotencyKey.current });
      idempotencyKey.current = null;
      setTurns((prev) => [...prev, result]);
      setText("");
      if (result.lessonOver) setOver(true);
    } catch (err) {
      const apiErr = asClientError(err);
      if (apiErr.code === "lesson_over") setOver(true);
      setError(apiErr);
    } finally {
      setPending(null);
    }
  }

  async function finish() {
    setEnding(true);
    setError(null);
    try {
      await endLesson(sessionId);
      router.push(`/card/${sessionId}`);
    } catch (err) {
      setError(asClientError(err));
      setEnding(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col gap-3">
      <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
        <ul className="flex flex-wrap gap-x-3 gap-y-1" aria-label={t("practice.title")}>
          {CHILDREN.map((id) => {
            const quiet = states.find((c) => c.id === id)?.engagement === 0;
            return (
              <li key={id} className={`font-semibold ${quiet ? "text-muted-foreground" : CHILD_STYLE[id].text}`}>
                {t(CHILD_STYLE[id].name)}
              </li>
            );
          })}
        </ul>
        <p className="shrink-0 text-sm tabular-nums text-muted-foreground" aria-live="off">
          {t("practice.timeLeft", { time: formatClock(left) })}
        </p>
      </div>

      <ol role="log" aria-live="polite" className="flex flex-1 flex-col gap-2">
        {turns.map((turn) => (
          <Turn key={turn.turn} turn={turn} />
        ))}
        {pending && (
          <>
            <TeacherBubble text={pending} />
            <li className="text-sm text-muted-foreground" aria-busy="true">
              {t("practice.thinking")}
            </li>
          </>
        )}
      </ol>

      {error && <ErrorNote error={error} onRetry={error.code === "lesson_over" ? undefined : () => send()} />}

      <div className="sticky bottom-0 flex flex-col gap-2 border-t border-border bg-background pt-3 pb-2">
        {over || timeUp ? (
          <>
            <p className="font-semibold">{t("practice.lessonOver")}</p>
            <Button size="lg" onClick={finish} disabled={ending} aria-busy={ending}>
              {ending ? t("card.loading") : t("practice.seeCard")}
            </Button>
          </>
        ) : (
          <>
            <form onSubmit={send} className="flex gap-2">
              <label htmlFor="turn-text" className="sr-only">
                {t("practice.typeHere")}
              </label>
              <input
                id="turn-text"
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  idempotencyKey.current = null;
                }}
                placeholder={t("practice.typeHere")}
                maxLength={1000}
                autoComplete="off"
                disabled={busy}
                className="h-11 min-w-0 flex-1 border border-input px-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <Button type="submit" disabled={busy || !text.trim()}>
                {t("practice.send")}
              </Button>
            </form>
            <Button variant="outline" onClick={finish} disabled={busy} className="self-end">
              {ending ? t("card.loading") : t("practice.end")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
