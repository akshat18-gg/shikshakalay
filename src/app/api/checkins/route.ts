import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { loadOwnSession } from "@/lib/engine/access";
import { saveCheckin } from "@/lib/history";
import { json, parseOr400, readJson, withRoute } from "@/lib/http";

const Body = z.object({ sessionId: z.string().min(1).max(64), triedInClass: z.boolean() }).strict();

/** "Did you try yesterday's line in class?" — one answer per lesson, only for your own lesson. */
export const POST = withRoute("checkins.save", async (req, _ctx: unknown, meta) => {
  const body = parseOr400(Body, await readJson(req), "check-in");
  const user = await requireUser(req, ["teacher", "admin"]);
  meta.user = user.code;
  await loadOwnSession(body.sessionId, user);
  await saveCheckin(body.sessionId, body.triedInClass);
  return json({ ok: true });
});
