/**
 * getUser() — STARTER STUB (owner: P2). P2 replaces this with the real cookie login
 * (jose-signed `sk_session` cookie, see AGENTS.md section 11). Until then, P1's routes can already call it.
 *
 * Mock mode: everyone is teacher_demo. Real mode: nobody is logged in yet (routes return 401).
 */
import type { Role, SessionUser } from "@/lib/contracts";
import { HttpError } from "@/lib/http";

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- the real version reads the cookie from req (P2-T3)
export async function getUser(req?: Request): Promise<SessionUser | null> {
  if (process.env.USE_MOCKS === "1") {
    return { id: "mock-teacher", code: "teacher_demo", role: "teacher", lang: "en" };
  }
  return null;
}

/** For API routes: the logged-in user, or 401 (not logged in) / 403 (wrong role). Roles never come from the body. */
export async function requireUser(req: Request, roles?: Role[]): Promise<SessionUser> {
  const user = await getUser(req);
  if (!user) throw new HttpError("unauthorized", "Please log in.");
  if (roles && !roles.includes(user.role)) throw new HttpError("forbidden", "You can't do this with your role.");
  return user;
}
