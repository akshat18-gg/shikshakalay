"use client";

/** A page crashed: friendly words, the reference (Next's digest, also in the server log), a way home. No stack trace. */
import Link from "next/link";
import { useLang } from "@/components/LangProvider";
import { t } from "@/lib/i18n";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const lang = useLang();
  return (
    <div role="alert" className="flex flex-col gap-3">
      <h1 className="text-2xl font-bold text-navy">{t("error.title", lang)}</h1>
      <p>{t("error.body", lang)}</p>
      {error.digest && (
        <p className="text-sm text-muted-foreground">{t("errors.reference", lang, { id: error.digest })}</p>
      )}
      <div className="flex gap-4">
        <button type="button" onClick={reset} className="min-h-11 font-semibold text-navy underline">
          {t("common.retry", lang)}
        </button>
        <Link href="/" className="inline-flex min-h-11 items-center font-semibold text-navy underline">
          {t("error.home", lang)}
        </Link>
      </div>
    </div>
  );
}
