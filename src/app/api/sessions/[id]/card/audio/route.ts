import { requireUser } from "@/lib/auth";
import { getCard } from "@/lib/engine";
import { loadOwnSession } from "@/lib/engine/access";
import { cardAudio } from "@/lib/engine/cardAudio";
import { HttpError, withRoute } from "@/lib/http";
import { audioResponse } from "@/lib/media/serve";
import { ttsAvailable } from "@/lib/voice/tts";

/** The "say this tomorrow" line in the coach's voice (owner or admin). 404 when there is no card or no voice. */
export const GET = withRoute(
  "sessions.cardAudio",
  async (req, ctx: RouteContext<"/api/sessions/[id]/card/audio">, meta) => {
    const user = await requireUser(req);
    meta.user = user.code;
    const { id } = await ctx.params;
    const session = await loadOwnSession(id, user, { adminCanRead: true });
    const card = await getCard(id);
    if (!card || process.env.USE_MOCKS === "1" || !ttsAvailable())
      throw new HttpError("not_found", "No audio for this card.");
    const audio = await cardAudio(id, card.sayTomorrow, session.lang);
    return audioResponse(audio.data, audio.mime, req.headers.get("range"));
  },
);
