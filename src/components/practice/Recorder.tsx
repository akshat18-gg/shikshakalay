"use client";

/**
 * The microphone button. Hold to talk (release sends, sliding off cancels), or tap once to start and tap again to
 * send — that also works from the keyboard. A ring fills over 30 seconds and the recording stops itself there.
 */
import { useEffect, useRef, useState } from "react";
import { MAX_RECORD_MS, pickMimeType, releaseAction, ringProgress } from "@/lib/recorder";
import { useT } from "../LangProvider";

type Phase = "idle" | "starting" | "holding" | "tapped";

export function Recorder({
  disabled,
  onStart,
  onRecorded,
  onMicDenied,
}: {
  disabled: boolean;
  /** Called on the first press — the room uses it to unlock audio playback on phones. */
  onStart: () => void;
  onRecorded: (audio: Blob) => void;
  onMicDenied: () => void;
}) {
  const t = useT();
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const pressedAt = useRef(0);
  const startedAt = useRef(0);
  const discard = useRef(false);
  /** Released (or cancelled) while the browser was still asking for the mic: drop that recording. */
  const cancelledWhileStarting = useRef(false);

  useEffect(() => {
    if (phase !== "holding" && phase !== "tapped") return;
    const id = setInterval(() => {
      const ms = Date.now() - startedAt.current;
      setElapsed(ms);
      if (ms >= MAX_RECORD_MS) stop(true);
    }, 200);
    return () => clearInterval(id);
  });

  useEffect(() => () => recorder.current?.stream.getTracks().forEach((tr) => tr.stop()), []);

  async function start() {
    onStart();
    setPhase("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      const mimeType = pickMimeType((type) => MediaRecorder.isTypeSupported(type));
      const rec = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 24_000 });
      chunks.current = [];
      discard.current = false;
      rec.ondataavailable = (e) => e.data.size > 0 && chunks.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(chunks.current, { type: rec.mimeType || mimeType || "audio/webm" });
        if (!discard.current && blob.size > 0) onRecorded(blob);
      };
      rec.start();
      recorder.current = rec;
      if (cancelledWhileStarting.current) {
        cancelledWhileStarting.current = false;
        return stop(false);
      }
      startedAt.current = Date.now();
      setElapsed(0);
      setPhase((p) => (p === "starting" ? "holding" : p));
    } catch {
      setPhase("idle");
      onMicDenied();
    }
  }

  function stop(send: boolean) {
    if (!recorder.current && phase === "starting") cancelledWhileStarting.current = true;
    discard.current = !send;
    if (recorder.current?.state === "recording") recorder.current.stop();
    recorder.current = null;
    setPhase("idle");
    setElapsed(0);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (disabled || e.button > 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (phase === "tapped") return stop(true);
    pressedAt.current = Date.now();
    void start();
  }

  function onPointerUp() {
    if (phase !== "holding" && phase !== "starting") return;
    if (releaseAction(Date.now() - pressedAt.current) === "keep_recording") setPhase("tapped");
    else stop(true);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    if (phase === "idle") {
      pressedAt.current = 0;
      void start().then(() => setPhase("tapped"));
    } else stop(true);
  }

  const recording = phase === "holding" || phase === "tapped";
  const label =
    phase === "starting"
      ? t("common.loading") // the browser is still opening the mic (the first time it may ask permission)
      : recording
        ? phase === "tapped"
          ? t("practice.tapToSend")
          : t("practice.recording")
        : t("practice.holdToTalk");
  const r = 26;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={disabled}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => stop(false)}
        onKeyDown={onKeyDown}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={recording ? t("practice.stopRecording") : t("practice.recordLabel")}
        aria-pressed={recording}
        className="relative grid size-16 shrink-0 touch-none place-items-center rounded-full bg-navy text-white outline-none select-none focus-visible:ring-3 focus-visible:ring-mint disabled:opacity-50 aria-pressed:bg-destructive"
      >
        <svg viewBox="0 0 60 60" className="absolute inset-0 size-16 -rotate-90" aria-hidden="true">
          <circle
            cx="30"
            cy="30"
            r={r}
            fill="none"
            stroke="var(--mint)"
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - ringProgress(elapsed))}
          />
        </svg>
        <svg viewBox="0 0 24 24" className="size-7" fill="currentColor" aria-hidden="true">
          <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z" />
        </svg>
      </button>
      <span className="text-sm text-muted-foreground" aria-live="polite">
        {label}
      </span>
    </div>
  );
}
