import { requireUser } from "@/lib/auth";
import { listScenarios } from "@/lib/engine/scenario";
import { json, withRoute } from "@/lib/http";

export const GET = withRoute("scenarios.list", async (req, _ctx: unknown, meta) => {
  meta.user = (await requireUser(req)).code;
  return json(listScenarios());
});
