/**
 * getUser() — STARTER STUB (owner: P2). P2 replaces this on Sun 25 with the real cookie login
 * (jose-signed `sk_session` cookie, see AGENTS.md section 11). Until then, P1's routes can already call it.
 *
 * Mock mode: everyone is teacher_demo. Real mode: nobody is logged in yet (routes return 401).
 */
import type { SessionUser } from "@/lib/contracts";

export async function getUser(): Promise<SessionUser | null> {
  if (process.env.USE_MOCKS === "1") {
    return { id: "mock-teacher", code: "teacher_demo", role: "teacher", lang: "en" };
  }
  return null;
}
