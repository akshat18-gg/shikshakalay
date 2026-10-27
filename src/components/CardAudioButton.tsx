"use client";

/** Plays the coach saying the "say this tomorrow" line (the words are printed right above it — the caption). */
import { useRef, useState } from "react";
import { useT } from "./LangProvider";

export function CardAudioButton({ sessionId }: { sessionId: string }) {
  const t = useT();
  const audio = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "failed">("idle");

  function play() {
    audio.current ??= new Audio(`/api/sessions/${sessionId}/card/audio`);
    setState("loading");
    audio.current.play().then(
      () => setState("idle"),
      () => setState("failed"),
    );
  }

  return (
    <button
      type="button"
      onClick={play}
      disabled={state === "loading"}
      className="mt-3 inline-flex min-h-11 items-center gap-2 border border-white/60 px-4 font-semibold outline-none focus-visible:ring-3 focus-visible:ring-mint disabled:opacity-70"
    >
      ▶ {state === "loading" ? t("common.loading") : t("card.play")}
      {state === "failed" && <span className="sr-only">{t("errors.internal")}</span>}
    </button>
  );
}
