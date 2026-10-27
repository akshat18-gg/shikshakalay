"use client";

/** "Did you try yesterday's line in class?" — Yes / Not yet, then a thank-you. */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiClientError, sendCheckin } from "@/lib/api";
import { ErrorNote } from "./ErrorNote";
import { useT } from "./LangProvider";

export function CheckinPrompt({ sessionId }: { sessionId: string }) {
  const t = useT();
  const [state, setState] = useState<"ask" | "busy" | "done">("ask");
  const [error, setError] = useState<ApiClientError | null>(null);

  async function answer(tried: boolean) {
    setState("busy");
    setError(null);
    try {
      await sendCheckin(sessionId, tried);
      setState("done");
    } catch (err) {
      setError(err instanceof ApiClientError ? err : new ApiClientError("internal"));
      setState("ask");
    }
  }

  if (state === "done") return <p className="font-semibold text-teal-strong">{t("home.checkinThanks")}</p>;
  return (
    <div className="flex flex-col gap-2">
      <p className="font-semibold">{t("home.checkinQ")}</p>
      <div className="flex gap-2">
        <Button onClick={() => answer(true)} disabled={state === "busy"}>
          {t("home.checkinYes")}
        </Button>
        <Button variant="outline" onClick={() => answer(false)} disabled={state === "busy"}>
          {t("home.checkinNo")}
        </Button>
      </div>
      {error && <ErrorNote error={error} />}
    </div>
  );
}
