import Link from "next/link";
import { CheckinPrompt } from "@/components/CheckinPrompt";
import { StartButton } from "@/components/StartButton";
import { requirePageUser } from "@/lib/auth";
import { checkinDue, getHistory } from "@/lib/history";
import { t } from "@/lib/i18n";
import { currentLang } from "@/lib/lang";

/** Teacher home: greeting, today's skill and the big Start button, the last card, and the check-in. */
export default async function Home() {
  const user = await requirePageUser();
  const lang = await currentLang(user);
  const history = await getHistory(user.id);
  const last = history.find((r) => r.card !== null);
  const due = checkinDue(history, new Date());

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">{t("home.greeting", lang, { code: user.code })}</h1>
        <p className="mt-1 text-muted-foreground">{t("app.tagline", lang)}</p>
      </div>

      {due && (
        <section className="border-l-4 border-mint bg-white p-4 shadow-sm">
          <CheckinPrompt sessionId={due.sessionId} />
        </section>
      )}

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
              className="inline-flex min-h-11 items-center font-semibold text-navy underline"
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
