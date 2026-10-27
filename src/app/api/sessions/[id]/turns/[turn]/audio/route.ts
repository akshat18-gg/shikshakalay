import { requireUser } from "@/lib/auth";
import { loadTurnResult } from "@/lib/db/queries/lessons";
import { loadOwnSession } from "@/lib/engine/access";
import { turnAudio } from "@/lib/engine/turnAudio";
import { HttpError, withRoute } from "@/lib/http";
import { audioResponse } from "@/lib/media/serve";
import { ttsAvailable } from "@/lib/voice/tts";

/** The children's voices for one turn (owner or admin), made on first request. 404 when there is nothing to say. */
export const GET = withRoute(
  "sessions.turnAudio",
  async (req, ctx: RouteContext<"/api/sessions/[id]/turns/[turn]/audio">, meta) => {
    const user = await requireUser(req);
    meta.user = user.code;
    const { id, turn } = await ctx.params;
    const n = Number(turn);
    const session = await loadOwnSession(id, user, { adminCanRead: true });
    if (process.env.USE_MOCKS === "1" || !ttsAvailable() || !Number.isInteger(n) || n < 1)
      throw new HttpError("not_found", "No audio.");
    const result = await loadTurnResult(id, n);
    if (!result || result.lines.length === 0) throw new HttpError("not_found", "No audio.");
    const clip = await turnAudio(id, n, result.lines, session.lang);
    return audioResponse(clip.data, clip.mime, req.headers.get("range"));
  },
);
