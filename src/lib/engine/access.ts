/**
 * Who may open which lesson. The owner always may; an admin may read (not act) when `adminCanRead` is set.
 * A lesson that isn't there and a lesson that isn't yours both stop the route here with 404 / 403.
 */
import type { SessionUser, SessionView } from "@/lib/contracts";
import { HttpError } from "@/lib/http";
import { getSession } from "./index";

const SESSION_ID = /^[A-Za-z0-9-]{1,64}$/;

export async function loadOwnSession(
  sessionId: string,
  user: SessionUser,
  opts: { adminCanRead?: boolean } = {},
): Promise<SessionView> {
  const found = SESSION_ID.test(sessionId) ? await getSession(sessionId) : null;
  if (!found) throw new HttpError("not_found", "This lesson doesn't exist.");
  const { userId, ...view } = found;
  const isOwner = userId === user.id;
  if (!isOwner && !(opts.adminCanRead && user.role === "admin")) {
    throw new HttpError("forbidden", "This lesson belongs to someone else.");
  }
  return view;
}
