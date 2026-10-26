/**
 * The screen language for this request (server only): the language toggle's cookie first, then the user's
 * saved language, then English. The login page has a language choice too, so this works before login.
 */
import "server-only";
import { cookies } from "next/headers";
import type { Lang, SessionUser } from "@/lib/contracts";
import { LANG_COOKIE, isLang } from "@/lib/i18n";

export async function currentLang(user?: SessionUser | null): Promise<Lang> {
  const fromCookie = (await cookies()).get(LANG_COOKIE)?.value;
  if (isLang(fromCookie)) return fromCookie;
  return user?.lang ?? "en";
}
