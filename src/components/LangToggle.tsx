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
    // a segmented control, like iOS: a pill track, the chosen language on a white pill
    <div role="group" aria-label={t("login.language")} className="flex rounded-full bg-white/15 p-0.5">
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={l === lang}
          disabled={pending}
          onClick={() => choose(l)}
          className="press min-h-10 min-w-11 rounded-full px-3 text-xs font-medium text-white outline-none focus-visible:ring-3 focus-visible:ring-white/60 aria-pressed:bg-white aria-pressed:text-foreground disabled:opacity-70"
        >
          {t(l === "en" ? "lang.en" : "lang.hi")}
        </button>
      ))}
    </div>
  );
}
