import { requireUser } from "@/lib/auth";
import { endLesson } from "@/lib/engine";
import { loadOwnSession } from "@/lib/engine/access";
import { json, withRoute } from "@/lib/http";

/** Idempotent: ending an ended lesson returns the same card. */
export const POST = withRoute("sessions.end", async (req, ctx: RouteContext<"/api/sessions/[id]/end">, meta) => {
  const user = await requireUser(req);
  meta.user = user.code;
  const { id } = await ctx.params;
  await loadOwnSession(id, user);
  return json(await endLesson(id));
});
