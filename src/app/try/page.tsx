import { existsSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { TrySamples } from "@/components/TrySamples";
import { requirePageUser } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { currentLang } from "@/lib/lang";
import { SANA_AUDIO_PATH } from "@/lib/samples";

export async function generateMetadata(): Promise<Metadata> {
  return { title: t("try.title", await currentLang()) };
}

/** Five one-tap moments from a lesson, for judges (log in as teacher_demo). */
export default async function TryPage() {
  const user = await requirePageUser(["teacher", "admin"]);
  const lang = await currentLang(user);
  // Sample 5 switches to the recorded voice note by itself once the file is added.
  const hasSanaAudio = existsSync(path.join(process.cwd(), "public", SANA_AUDIO_PATH));
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-navy">{t("try.title", lang)}</h1>
      <p className="text-muted-foreground">{t("try.intro", lang)}</p>
      <TrySamples hasSanaAudio={hasSanaAudio} />
    </div>
  );
}
