import { requireUser } from "@/lib/auth";
import { FeedbackBody } from "@/lib/contracts";
import { saveFeedback } from "@/lib/history";
import { json, parseOr400, readJson, withRoute } from "@/lib/http";

/** The two 1–7 ease questions under the coaching card. The user comes from the cookie, never the body. */
export const POST = withRoute("feedback.save", async (req, _ctx: unknown, meta) => {
  const body = parseOr400(FeedbackBody, await readJson(req), "feedback");
  const user = await requireUser(req, ["teacher", "admin"]);
  meta.user = user.code;
  await saveFeedback(user.id, body);
  return json({ ok: true });
});
