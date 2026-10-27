"use client";

/**
 * The practice room: a WhatsApp-style chat with the four children. The teacher speaks (hold the mic) or types.
 * The children's words show first; their voices follow and play by themselves (or with a Play button if the phone
 * blocks it). One turn at a time; a lost reply is retried with the same key, so it never becomes two turns.
 */
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiClientError, endLesson, sendTurn } from "@/lib/api";
import type { SessionView, TurnResult } from "@/lib/contracts";
import { CHILDREN, formatClock, latestStates, msLeft } from "@/lib/practice";
import { fileNameFor, retryDelayMs } from "@/lib/recorder";
import { ErrorNote } from "../ErrorNote";
import { useT } from "../LangProvider";
import { CHILD_STYLE } from "./childStyle";
import { Recorder } from "./Recorder";
import { TeacherBubble, Turn } from "./Turn";

/** A 0.1-second silent WAV, played on the first tap so phones allow later replies to play. */
const SILENCE = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";
const MAX_NETWORK_RETRIES = 2;

type Pending = { text?: string; audio?: Blob; label: string };

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
  const [micDenied, setMicDenied] = useState(false);
  const [blockedAudio, setBlockedAudio] = useState<string | null>(null);
  const [over, setOver] = useState(initial.status === "ended" || Boolean(initial.turns.at(-1)?.lessonOver));
  const [now, setNow] = useState(() => Date.now());
  // One key per turn, reused on every retry, so a lost reply never makes a double turn.
  const idempotencyKey = useRef<string | null>(null);
  const [failed, setFailed] = useState<Pending | null>(null);
  const player = useRef<HTMLAudioElement | null>(null);
  const unlocked = useRef(false);

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

  /** Phones only let a page play sound after a tap: play silence on the first one, reuse the same element after. */
  function unlockAudio() {
    player.current ??= new Audio();
    if (unlocked.current) return;
    unlocked.current = true;
    player.current.src = SILENCE;
    player.current.play().catch(() => {});
  }

  function play(url: string) {
    player.current ??= new Audio();
    player.current.src = url;
    player.current.play().then(
      () => setBlockedAudio(null),
      () => setBlockedAudio(url), // the phone said no: show a Play button
    );
  }

  async function submit(turn: Pending) {
    if (busy || over) return;
    idempotencyKey.current ??= crypto.randomUUID();
    setFailed(null);
    setPending(turn.label);
    setError(null);
    try {
      let result: TurnResult | null = null;
      for (let attempt = 0; !result; attempt++) {
        try {
          result = await sendTurn(sessionId, {
            text: turn.text,
            audio: turn.audio
              ? new File([turn.audio], fileNameFor(turn.audio.type), { type: turn.audio.type })
              : undefined,
            idempotencyKey: idempotencyKey.current,
          });
        } catch (err) {
          const e = asClientError(err);
          // Network trouble (not a 4xx answer): wait and send the same turn again.
          if ((e.code !== "network" && e.code !== "busy") || attempt >= MAX_NETWORK_RETRIES) throw e;
          await new Promise((r) => setTimeout(r, retryDelayMs(attempt + 1)));
        }
      }
      idempotencyKey.current = null;
      setTurns((prev) => [...prev, result]);
      if (turn.text) setText("");
      if (result.lessonOver) setOver(true);
      if (result.audioUrl) play(result.audioUrl);
    } catch (err) {
      const apiErr = asClientError(err);
      if (apiErr.code === "lesson_over") setOver(true);
      else setFailed(turn);
      setError(apiErr);
    } finally {
      setPending(null);
    }
  }

  function sendText(e?: React.FormEvent) {
    e?.preventDefault();
    unlockAudio();
    const words = text.trim();
    if (words) void submit({ text: words, label: words });
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
          <Turn
            key={turn.turn}
            turn={turn}
            onPlay={turn.audioUrl ? () => (unlockAudio(), play(turn.audioUrl!)) : undefined}
          />
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

      {blockedAudio && (
        <Button variant="outline" className="self-start" onClick={() => play(blockedAudio)}>
          ▶ {t("practice.playReply")}
        </Button>
      )}
      {error && <ErrorNote error={error} onRetry={failed ? () => submit(failed) : undefined} />}
      {micDenied && (
        <p role="alert" className="border-l-4 border-destructive bg-red-50 p-3 text-sm">
          {t("practice.micDenied")}
        </p>
      )}

      <div className="sticky bottom-0 flex flex-col gap-3 border-t border-border bg-background pt-3 pb-2">
        {over || timeUp ? (
          <>
            <p className="font-semibold">{t("practice.lessonOver")}</p>
            <Button size="lg" onClick={finish} disabled={ending} aria-busy={ending}>
              {ending ? t("card.loading") : t("practice.seeCard")}
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <Recorder
                disabled={busy}
                onStart={() => {
                  unlockAudio();
                  setMicDenied(false);
                }}
                onRecorded={(audio) => void submit({ audio, label: t("practice.voiceNote") })}
                onMicDenied={() => setMicDenied(true)}
              />
              <Button variant="outline" onClick={finish} disabled={busy}>
                {ending ? t("card.loading") : t("practice.end")}
              </Button>
            </div>
            <form onSubmit={sendText} className="flex gap-2">
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
          </>
        )}
      </div>
    </div>
  );
}
