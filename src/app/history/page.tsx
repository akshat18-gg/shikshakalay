import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/auth";
import { formatIst, getHistory } from "@/lib/history";
import { t } from "@/lib/i18n";
import { currentLang } from "@/lib/lang";

export async function generateMetadata(): Promise<Metadata> {
  return { title: t("history.title", await currentLang()) };
}

/** Her past lessons, newest first (at most 50), each with the card's "one thing to try". */
export default async function HistoryPage() {
  const user = await requirePageUser(["teacher", "admin"]);
  const lang = await currentLang(user);
  const rows = await getHistory(user.id);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-navy">{t("history.title", lang)}</h1>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">{t("history.empty", lang)}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.sessionId} className="border-l-4 border-teal bg-pale p-4">
              <p className="text-sm text-muted-foreground">
                {formatIst(r.startedAt, lang)} · {t("history.turns", lang, { n: r.turnCount })}
              </p>
              {r.card ? (
                <>
                  <p className="mt-2">
                    <span className="font-semibold">{t("history.tryLine", lang)} </span>
                    {r.card.fix.tryInstead}
                  </p>
                  <Link
                    href={`/card/${r.sessionId}`}
                    className="mt-2 inline-flex min-h-11 items-center font-semibold text-navy underline"
                  >
                    {t("history.openCard", lang)}
                  </Link>
                </>
              ) : (
                <p className="mt-2 text-muted-foreground">{t("history.notFinished", lang)}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
