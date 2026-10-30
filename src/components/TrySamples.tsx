"use client";

/** Plays a sample: a fresh lesson, its turns sent in order, the children's replies shown like the practice room. */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiClientError, sendTurn, startLesson } from "@/lib/api";
import type { TurnResult } from "@/lib/contracts";
import type { MessageKey } from "@/lib/i18n";
import { SAMPLES, SANA_AUDIO_PATH } from "@/lib/samples";
import { ErrorNote } from "./ErrorNote";
import { useLang, useT } from "./LangProvider";
import { Turn } from "./practice/Turn";

export function TrySamples({ hasSanaAudio }: { hasSanaAudio: boolean }) {
  const t = useT();
  const screenLang = useLang();
  const [active, setActive] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [turns, setTurns] = useState<TurnResult[]>([]);
  const [error, setError] = useState<ApiClientError | null>(null);

  async function play(id: number) {
    const sample = SAMPLES.find((s) => s.id === id)!;
    setActive(id);
    setRunning(true);
    setTurns([]);
    setError(null);
    try {
      const lesson = await startLesson({
        scenarioId: "sub_2digit",
        lang: sample.lang === "screen" ? screenLang : sample.lang,
      });
      const shown: TurnResult[] = [lesson.hello];
      setTurns([...shown]);
      for (const text of sample.turns) {
        const audio = sample.voice && hasSanaAudio ? await (await fetch(SANA_AUDIO_PATH)).blob() : undefined;
        const r = await sendTurn(lesson.sessionId, {
          ...(audio ? { audio: new File([audio], "sana-hi.m4a", { type: "audio/mp4" }) } : { text }),
          idempotencyKey: crypto.randomUUID(),
        });
        shown.push(r);
        setTurns([...shown]);
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err : new ApiClientError("internal"));
    } finally {
      setRunning(false);
    }
  }

  const playAudio = (url: string) => void new Audio(url).play().catch(() => {});

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-2">
        {SAMPLES.map((s) => (
          <li key={s.id}>
            <Button
              variant={active === s.id ? "default" : "outline"}
              className="h-auto min-h-11 w-full justify-start py-2 text-left whitespace-normal"
              onClick={() => play(s.id)}
              disabled={running}
            >
              {s.id}. {t(s.label as MessageKey)}
            </Button>
          </li>
        ))}
      </ol>
      {active === 5 && !hasSanaAudio && <p className="text-sm text-muted-foreground">{t("try.typedFallback")}</p>}
      {running && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {t("try.running")}
        </p>
      )}
      {error && <ErrorNote error={error} />}
      {turns.length > 0 && (
        <ol role="log" aria-live="polite" className="flex flex-col gap-2 border-t border-border pt-3">
          {turns.map((turn) => (
            <Turn key={turn.turn} turn={turn} onPlay={turn.audioUrl ? () => playAudio(turn.audioUrl!) : undefined} />
          ))}
        </ol>
      )}
      {turns.length > 1 && !running && (
        <p className="text-sm text-muted-foreground">
          {t("try.minds")}{" "}
          {turns
            .at(-1)!
            .statesAfter.map((c) => `${t(`child.${c.id}` as MessageKey)} ${c.state}`)
            .join(" · ")}
        </p>
      )}
    </div>
  );
}
