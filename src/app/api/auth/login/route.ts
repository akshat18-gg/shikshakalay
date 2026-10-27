import { z } from "zod";
import { loginLockout } from "@/lib/auth/lockout";
import { sessionCookie, signSession } from "@/lib/auth/session";
import { checkLogin, hasConsent } from "@/lib/auth/users";
import { HttpError, json, parseOr400, readJson, withRoute } from "@/lib/http";

const Body = z.object({ code: z.string().trim().min(1).max(40), pin: z.string().regex(/^\d{4}$/) }).strict();

/** ID + 4-digit PIN → signed cookie. 5 wrong PINs for one ID → 15 minutes' wait. */
export const POST = withRoute("auth.login", async (req, _ctx: unknown, meta) => {
  const { code, pin } = parseOr400(Body, await readJson(req), "login");
  const id = code.toLowerCase();
  const wait = loginLockout.lockedFor(id);
  if (wait > 0) {
    throw new HttpError("rate_limited", "Too many tries. Please wait.", {
      "retry-after": String(Math.ceil(wait / 1000)),
    });
  }
  const user = await checkLogin(code, pin);
  if (!user) {
    loginLockout.fail(id);
    throw new HttpError("unauthorized", "That ID or PIN is not right.");
  }
  loginLockout.reset(id);
  meta.user = user.code;
  const token = await signSession({ ...user, consent: await hasConsent(user.id) });
  return json({ user }, 200, { "set-cookie": sessionCookie(token) });
});
