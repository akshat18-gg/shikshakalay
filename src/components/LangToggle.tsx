"use client";

/** English · हिन्दी switch in the top bar. Saves the choice in a cookie, then re-renders the page in that language. */
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLang } from "@/lib/api";
import type { Lang } from "@/lib/contracts";
import { useLang, useT } from "./LangProvider";

const LANGS: Lang[] = ["en", "hi"];

export function LangToggle() {
  const lang = useLang();
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: Lang) {
    if (next === lang || pending) return;
    startTransition(async () => {
      try {
        await setLang(next);
        router.refresh();
      } catch {
        // The toggle is a convenience; if the network drops, the page simply stays in its current language.
      }
    });
  }

  return (
    <div role="group" aria-label={t("login.language")} className="flex">
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={l === lang}
          disabled={pending}
          onClick={() => choose(l)}
          className="min-h-11 min-w-11 border border-white/40 px-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-mint aria-pressed:bg-white aria-pressed:text-navy disabled:opacity-70"
        >
          {t(l === "en" ? "lang.en" : "lang.hi")}
        </button>
      ))}
    </div>
  );
}
