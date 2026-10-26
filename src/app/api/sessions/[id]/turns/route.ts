import { requireUser } from "@/lib/auth";
import { runTurn } from "@/lib/engine";
import { loadOwnSession } from "@/lib/engine/access";
import { readTurnForm } from "@/lib/engine/turnInput";
import { HttpError, json, withRoute } from "@/lib/http";

export const POST = withRoute("sessions.turn", async (req, ctx: RouteContext<"/api/sessions/[id]/turns">, meta) => {
  const user = await requireUser(req);
  meta.user = user.code;
  const { id } = await ctx.params;
  const session = await loadOwnSession(id, user);
  if (session.status === "ended") throw new HttpError("lesson_over", "This lesson has ended.");
  const input = await readTurnForm(req);
  return json(await runTurn(id, input, "web"));
});
