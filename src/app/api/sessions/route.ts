import { requireUser } from "@/lib/auth";
import { StartLessonBody } from "@/lib/contracts";
import { startLesson } from "@/lib/engine";
import { findScenario } from "@/lib/engine/scenario";
import { HttpError, json, parseOr400, readJson, withRoute } from "@/lib/http";

export const POST = withRoute("sessions.start", async (req, _ctx: unknown, meta) => {
  const body = parseOr400(StartLessonBody.strict(), await readJson(req), "lesson request");
  const user = await requireUser(req, ["teacher", "admin"]);
  meta.user = user.code;
  if (!findScenario(body.scenarioId)) throw new HttpError("not_found", "That lesson doesn't exist.");
  return json(await startLesson(user.id, body, "web"), 201);
});
