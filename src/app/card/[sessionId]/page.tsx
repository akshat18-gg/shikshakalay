import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCard } from "@/lib/engine";
import { t } from "@/lib/i18n";
import { currentLang } from "@/lib/lang";
import { pageSession } from "@/lib/pageAccess";

export async function generateMetadata(): Promise<Metadata> {
  return { title: t("card.title", await currentLang()) };
}

/** The private coaching card. A first version — P2-T7 adds the "say tomorrow" audio and history. */
export default async function CardPage({ params }: PageProps<"/card/[sessionId]">) {
  const { sessionId } = await params;
  const { user } = await pageSession(sessionId, { adminCanRead: true });
  const lang = await currentLang(user);
  const card = await getCard(sessionId);
  if (!card) notFound();

  return (
    <article className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-bold text-navy">{t("card.title", lang)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("card.private", lang)}</p>
      </header>

      <section aria-labelledby="strength" className="border-l-4 border-teal bg-pale p-4">
        <h2 id="strength" className="font-semibold">
          {t("card.strength", lang)} · {t("card.turn", lang, { n: card.strength.turn })}
        </h2>
        <blockquote className="mt-2 font-medium">“{card.strength.quote}”</blockquote>
        <p className="mt-2">{card.strength.why}</p>
      </section>

      <section aria-labelledby="fix" className="border-l-4 border-child-ravi bg-white p-4 shadow-sm">
        <h2 id="fix" className="font-semibold">
          {t("card.fix", lang)} · {t("card.turn", lang, { n: card.fix.turn })}
        </h2>
        <blockquote className="mt-2 font-medium">“{card.fix.quote}”</blockquote>
        <p className="mt-2">
          <span className="font-semibold">{t("card.whatHappened", lang)}: </span>
          {card.fix.whatHappened}
        </p>
        <p className="mt-1">
          <span className="font-semibold">{t("card.tryInstead", lang)}: </span>
          {card.fix.tryInstead}
        </p>
      </section>

      <section aria-labelledby="tomorrow" className="bg-navy p-4 text-white">
        <h2 id="tomorrow" className="font-semibold">
          {t("card.sayTomorrow", lang)}
        </h2>
        <p className="mt-2 text-lg">“{card.sayTomorrow}”</p>
      </section>

      <p className="text-sm text-muted-foreground">{t("card.aiNote", lang)}</p>
      <Link href="/" className="min-h-11 font-semibold text-navy underline">
        {t("card.backHome", lang)}
      </Link>
    </article>
  );
}
