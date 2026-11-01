import Link from "next/link";
import { redirect } from "next/navigation";
import { BundlesSticks } from "@/components/art/BundlesSticks";
import { CheckinPrompt } from "@/components/CheckinPrompt";
import { StartButton } from "@/components/StartButton";
import { requirePageUser } from "@/lib/auth";
import { homeFor } from "@/lib/auth/access";
import { checkinDue, getHistory } from "@/lib/history";
import { t } from "@/lib/i18n";
import { currentLang } from "@/lib/lang";

/** Teacher home: greeting, today's skill and the big Start button, the last card, and the check-in. */
export default async function Home() {
  const user = await requirePageUser();
  if (user.role !== "teacher") redirect(homeFor(user.role)); // trainers → /trainer, admins → /admin
  const lang = await currentLang(user);
  const history = await getHistory(user.id);
  const last = history.find((r) => r.card !== null);
  const due = checkinDue(history, new Date());

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold text-heading sm:text-4xl">
          {t("home.greeting", lang, { code: user.code })}
        </h1>
        <p className="mt-1 text-xl text-muted-foreground">{t("app.tagline", lang)}</p>
      </div>

      {due && (
        <section className="tile p-4">
          <CheckinPrompt sessionId={due.sessionId} />
        </section>
      )}

      {/* The skill tile, apple.com style: headline, one line, the material itself, one button. */}
      <section aria-labelledby="skill" className="tile-alt p-6 sm:p-8">
        <h2 id="skill" className="text-2xl font-semibold">
          {t("home.skillTitle", lang)}
        </h2>
        <p className="mt-2 text-muted-foreground">{t("home.skillHint", lang)}</p>
        <BundlesSticks tens={4} ones={3} className="mt-6 h-24 w-auto max-w-full" />
        <StartButton />
        <Link href="/modules" className="mt-3 inline-flex min-h-11 items-center text-mint hover:underline">
          {t("home.allModules", lang)} →
        </Link>
      </section>

      <section aria-labelledby="last-card">
        <h2 id="last-card" className="text-lg font-semibold">
          {t("home.lastCard", lang)}
        </h2>
        {last?.card ? (
          <div className="mt-2 flex flex-col gap-2">
            <p>
              <span className="font-semibold">{t("card.sayTomorrow", lang)}: </span>“{last.card.sayTomorrow}”
            </p>
            <p>
              <span className="font-semibold">{t("history.tryLine", lang)} </span>
              {last.card.fix.tryInstead}
            </p>
            <Link
              href={`/card/${last.sessionId}`}
              className="inline-flex min-h-11 items-center font-semibold text-mint underline"
            >
              {t("home.seeCard", lang)}
            </Link>
          </div>
        ) : (
          <p className="mt-2 text-muted-foreground">{t("home.noCards", lang)}</p>
        )}
      </section>
    </div>
  );
}
