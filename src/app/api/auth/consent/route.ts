import { getClaims } from "@/lib/auth";
import { sessionCookie, signSession } from "@/lib/auth/session";
import { saveConsent } from "@/lib/auth/users";
import { HttpError, json, withRoute } from "@/lib/http";

/** "I agree" on the consent screen: saved once, then the cookie remembers it. */
export const POST = withRoute("auth.consent", async (req, _ctx: unknown, meta) => {
  const claims = await getClaims(req);
  if (!claims) throw new HttpError("unauthorized", "Please log in.");
  meta.user = claims.code;
  if (!claims.consent) await saveConsent(claims.id);
  const token = await signSession({ ...claims, consent: true });
  return json({ ok: true }, 200, { "set-cookie": sessionCookie(token) });
});
