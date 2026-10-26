import { requireUser } from "@/lib/auth";
import { loadOwnSession } from "@/lib/engine/access";
import { json, withRoute } from "@/lib/http";

export const GET = withRoute("sessions.get", async (req, ctx: RouteContext<"/api/sessions/[id]">, meta) => {
  const user = await requireUser(req);
  meta.user = user.code;
  const { id } = await ctx.params;
  return json(await loadOwnSession(id, user, { adminCanRead: true }));
});
