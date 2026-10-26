"use client";

/** Gives client components the screen language: `const t = useT(); t("practice.send")`. */
import { createContext, useCallback, useContext } from "react";
import type { Lang } from "@/lib/contracts";
import { type MessageKey, type Vars, t } from "@/lib/i18n";

const LangContext = createContext<Lang>("en");

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LangContext);
}

export function useT(): (key: MessageKey, vars?: Vars) => string {
  const lang = useLang();
  return useCallback((key: MessageKey, vars?: Vars) => t(key, lang, vars), [lang]);
}
