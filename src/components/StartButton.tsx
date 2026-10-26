"use client";

/** "Start practice": creates a lesson in the screen language, then opens the practice room. */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiClientError, startLesson } from "@/lib/api";
import { ErrorNote } from "./ErrorNote";
import { useLang, useT } from "./LangProvider";

export function StartButton() {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiClientError | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const lesson = await startLesson({ scenarioId: "sub_2digit", lang });
      router.push(`/practice/${lesson.sessionId}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err : new ApiClientError("internal"));
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <Button size="lg" className="w-full sm:w-auto" onClick={start} disabled={busy} aria-busy={busy}>
        {busy ? t("common.loading") : t("home.start")}
      </Button>
      {error && <ErrorNote error={error} />}
    </div>
  );
}
