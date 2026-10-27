/**
 * Who is logged in. Route handlers pass their Request (so tests need no Next.js); pages call without one and
 * the cookie comes from next/headers. Roles always come from the signed cookie, never from a request body.
 */
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role, SessionUser } from "@/lib/contracts";
import { HttpError } from "@/lib/http";
import { homeFor } from "./access";
import { SESSION_COOKIE, type SessionClaims, readCookie, verifySession } from "./session";

export async function getClaims(req?: Request): Promise<SessionClaims | null> {
  const token = req
    ? readCookie(req.headers.get("cookie"), SESSION_COOKIE)
    : (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

export async function getUser(req?: Request): Promise<SessionUser | null> {
  const claims = await getClaims(req);
  return claims && { id: claims.id, code: claims.code, role: claims.role, lang: claims.lang };
}

/** For API routes: the logged-in user, or 401 (not logged in) / 403 (wrong role). */
export async function requireUser(req: Request, roles?: Role[]): Promise<SessionUser> {
  const user = await getUser(req);
  if (!user) throw new HttpError("unauthorized", "Please log in.");
  if (roles && !roles.includes(user.role)) throw new HttpError("forbidden", "You can't do this with your role.");
  return user;
}

/** For pages: the logged-in user, or a redirect to /login (not logged in) or their own home (wrong role). */
export async function requirePageUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}
