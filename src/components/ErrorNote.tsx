"use client";

/** A friendly error with the server's reference id, so "it broke" becomes a log lookup. */
import type { ApiClientError } from "@/lib/api";
import type { MessageKey } from "@/lib/i18n";
import { useT } from "./LangProvider";

export function ErrorNote({ error, onRetry }: { error: ApiClientError; onRetry?: () => void }) {
  const t = useT();
  return (
    <div role="alert" className="border-l-4 border-destructive bg-red-50 p-3 text-sm">
      <p>{t(`errors.${error.code}` as MessageKey)}</p>
      {error.requestId && (
        <p className="mt-1 text-muted-foreground">{t("errors.reference", { id: error.requestId.slice(0, 8) })}</p>
      )}
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-2 min-h-11 font-semibold text-navy underline">
          {t("common.retry")}
        </button>
      )}
    </div>
  );
}
