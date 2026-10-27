import { z } from "zod";
import { getClaims } from "@/lib/auth";
import { sessionCookie, signSession } from "@/lib/auth/session";
import { setUserLang } from "@/lib/auth/users";
import { Lang } from "@/lib/contracts";
import { json, parseOr400, readJson, withRoute } from "@/lib/http";
import { langCookie } from "@/lib/langCookie";

const Body = z.object({ lang: Lang }).strict();

/** The language toggle. Works before login too; when logged in it also saves the choice and re-signs the cookie. */
export const POST = withRoute("auth.lang", async (req, _ctx: unknown, meta) => {
  const { lang } = parseOr400(Body, await readJson(req), "language");
  const headers = new Headers({ "set-cookie": langCookie(lang) });
  const claims = await getClaims(req);
  if (claims) {
    meta.user = claims.code;
    await setUserLang(claims.id, lang);
    headers.append("set-cookie", sessionCookie(await signSession({ ...claims, lang })));
  }
  return json({ lang }, 200, headers);
});
