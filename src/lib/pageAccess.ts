/**
 * For pages (server components): the lesson if this user may see it. Not logged in → /login.
 * A missing lesson and someone else's lesson both show the 404 page (we don't confirm that a lesson exists).
 */
import "server-only";
import { notFound, redirect } from "next/navigation";
import type { SessionUser, SessionView } from "@/lib/contracts";
import { getUser } from "@/lib/auth";
import { loadOwnSession } from "@/lib/engine/access";
import { HttpError } from "@/lib/http";

export async function pageSession(
  sessionId: string,
  opts: { adminCanRead?: boolean } = {},
): Promise<{ user: SessionUser; session: SessionView }> {
  const user = await getUser();
  if (!user) redirect("/login");
  try {
    return { user, session: await loadOwnSession(sessionId, user, opts) };
  } catch (err) {
    if (err instanceof HttpError) notFound();
    throw err;
  }
}
