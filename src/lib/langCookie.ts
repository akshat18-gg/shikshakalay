/** The language toggle's cookie: not secret, but httpOnly anyway — the server reads it and renders the page. */
import type { Lang } from "@/lib/contracts";
import { LANG_COOKIE } from "@/lib/i18n";

const ONE_YEAR_S = 365 * 24 * 60 * 60;

export function langCookie(lang: Lang): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${LANG_COOKIE}=${lang}; Path=/; Max-Age=${ONE_YEAR_S}; HttpOnly; SameSite=Lax${secure}`;
}
