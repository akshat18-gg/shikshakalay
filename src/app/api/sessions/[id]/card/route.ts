import { requireUser } from "@/lib/auth";
import { getCard } from "@/lib/engine";
import { loadOwnSession } from "@/lib/engine/access";
import { HttpError, json, withRoute } from "@/lib/http";

export const GET = withRoute("sessions.card", async (req, ctx: RouteContext<"/api/sessions/[id]/card">, meta) => {
  const user = await requireUser(req);
  meta.user = user.code;
  const { id } = await ctx.params;
  await loadOwnSession(id, user, { adminCanRead: true });
  const card = await getCard(id);
  if (!card) throw new HttpError("not_found", "This lesson has no card yet.");
  return json(card);
});
