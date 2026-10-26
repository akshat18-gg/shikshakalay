import { StartButton } from "@/components/StartButton";
import { getUser } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { currentLang } from "@/lib/lang";

/** Teacher home: greeting, today's skill and the big Start button. */
export default async function Home() {
  const user = await getUser();
  const lang = await currentLang(user);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">{t("home.greeting", lang, { code: user?.code ?? "" })}</h1>
        <p className="mt-1 text-muted-foreground">{t("app.tagline", lang)}</p>
      </div>

      <section aria-labelledby="skill" className="border-l-4 border-teal bg-pale p-4">
        <h2 id="skill" className="text-lg font-semibold">
          {t("home.skillTitle", lang)}
        </h2>
        <p className="mt-2 text-muted-foreground">{t("home.skillHint", lang)}</p>
        <StartButton />
      </section>

      <section aria-labelledby="last-card">
        <h2 id="last-card" className="text-lg font-semibold">
          {t("home.lastCard", lang)}
        </h2>
        <p className="mt-2 text-muted-foreground">{t("home.noCards", lang)}</p>
      </section>
    </div>
  );
}
