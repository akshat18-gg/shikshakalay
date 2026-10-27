"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiClientError, agreeToConsent } from "@/lib/api";
import { ErrorNote } from "./ErrorNote";
import { reloadTo } from "@/lib/navigation";
import { useT } from "./LangProvider";

export function ConsentForm({ next }: { next: string }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiClientError | null>(null);

  async function agree() {
    setBusy(true);
    setError(null);
    try {
      await agreeToConsent();
      reloadTo(next);
    } catch (err) {
      setError(err instanceof ApiClientError ? err : new ApiClientError("internal"));
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button size="lg" onClick={agree} disabled={busy} aria-busy={busy}>
        {busy ? t("common.loading") : t("consent.agree")}
      </Button>
      {error && <ErrorNote error={error} />}
    </div>
  );
}
