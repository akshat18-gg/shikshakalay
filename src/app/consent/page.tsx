import type { Metadata } from "next";
import { ConsentForm } from "@/components/ConsentForm";
import { requirePageUser } from "@/lib/auth";
import { safeNext } from "@/lib/auth/access";
import { t } from "@/lib/i18n";
import { currentLang } from "@/lib/lang";

export async function generateMetadata(): Promise<Metadata> {
  return { title: t("consent.title", await currentLang()) };
}

/** First login: what we do with her words, in plain language. The proxy sends her here until she agrees. */
export default async function ConsentPage({ searchParams }: PageProps<"/consent">) {
  const user = await requirePageUser();
  const lang = await currentLang(user);
  const { next } = await searchParams;
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <h1 className="text-2xl font-bold text-navy">{t("consent.title", lang)}</h1>
      <p className="whitespace-pre-line">{t("consent.body", lang)}</p>
      <ConsentForm next={safeNext(typeof next === "string" ? next : null)} />
    </div>
  );
}
