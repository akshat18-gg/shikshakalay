"use client";

/** The two 1–7 ease questions under the coaching card (UMUX-Lite) and an optional "what should we change?". */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiClientError, sendFeedback } from "@/lib/api";
import type { MessageKey } from "@/lib/i18n";
import { ErrorNote } from "./ErrorNote";
import { useT } from "./LangProvider";

const SCALE = [1, 2, 3, 4, 5, 6, 7];

function Scale({ label, value, onPick }: { label: MessageKey; value: number | null; onPick: (n: number) => void }) {
  const t = useT();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-medium">{t(label)}</legend>
      <div className="grid grid-cols-7 gap-1">
        {SCALE.map((n) => (
          <Button
            key={n}
            type="button"
            variant={value === n ? "default" : "outline"}
            aria-pressed={value === n}
            className="h-11 w-full min-w-0 px-0"
            onClick={() => onPick(n)}
          >
            {n}
          </Button>
        ))}
      </div>
    </fieldset>
  );
}

export function FeedbackForm() {
  const t = useT();
  const [need, setNeed] = useState<number | null>(null);
  const [easy, setEasy] = useState<number | null>(null);
  const [change, setChange] = useState("");
  const [state, setState] = useState<"ask" | "busy" | "done">("ask");
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<ApiClientError | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (need === null || easy === null) return setMissing(true);
    setMissing(false);
    setState("busy");
    setError(null);
    try {
      await sendFeedback({ doesWhatINeed: need, easyToUse: easy, openAnswers: change.trim() ? { change } : {} });
      setState("done");
    } catch (err) {
      setError(err instanceof ApiClientError ? err : new ApiClientError("internal"));
      setState("ask");
    }
  }

  if (state === "done") return <p className="font-semibold text-teal-strong">{t("feedback.thanks")}</p>;
  return (
    <form onSubmit={send} className="flex flex-col gap-4 border p-3" aria-labelledby="feedback-title">
      <div>
        <h2 id="feedback-title" className="font-semibold">
          {t("feedback.title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("feedback.scale")}</p>
      </div>
      <Scale label="feedback.q1" value={need} onPick={setNeed} />
      <Scale label="feedback.q2" value={easy} onPick={setEasy} />
      <label className="flex flex-col gap-1">
        <span className="font-medium">{t("feedback.change")}</span>
        <textarea
          value={change}
          onChange={(e) => setChange(e.target.value)}
          maxLength={1000}
          rows={2}
          className="border p-2"
        />
      </label>
      {missing && (need === null || easy === null) && <p role="alert">{t("feedback.pick")}</p>}
      <Button type="submit" disabled={state === "busy"} className="self-start">
        {t("feedback.send")}
      </Button>
      {error && <ErrorNote error={error} />}
    </form>
  );
}
