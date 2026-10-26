/**
 * Every word on screen comes from content/i18n/{en,hi}.json through t(). Keys are typed from en.json, so a
 * typo is a compile error. Missing Hindi falls back to English (and warns in development).
 *
 *   t("home.greeting", "hi", { code: "T07" }) → "नमस्ते, T07"
 */
import type { Lang } from "@/lib/contracts";
import en from "../../content/i18n/en.json";
import hi from "../../content/i18n/hi.json";

export type MessageKey = keyof typeof en;
export type Vars = Record<string, string | number>;

const MESSAGES: Record<Lang, Partial<Record<string, string>>> = { en, hi };

export const LANG_COOKIE = "sk_lang";

export function isLang(v: unknown): v is Lang {
  return v === "en" || v === "hi";
}

export function t(key: MessageKey, lang: Lang, vars?: Vars): string {
  let text = MESSAGES[lang][key];
  if (text === undefined) {
    if (process.env.NODE_ENV === "development") console.warn(`[i18n] missing "${key}" in ${lang}.json`);
    text = MESSAGES.en[key] ?? key;
  }
  return vars ? text.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m)) : text;
}
