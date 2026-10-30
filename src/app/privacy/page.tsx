import type { Metadata } from "next";
import { type MessageKey, t } from "@/lib/i18n";
import { currentLang } from "@/lib/lang";
import { CONTACT_EMAIL } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  return { title: t("privacy.title", await currentLang()) };
}

/** Short and true (open to everyone, no login). */
export default async function Page() {
  const lang = await currentLang();
  return (
    <article className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-bold text-navy">{t("privacy.title", lang)}</h1>
      {Array.from({ length: 5 }, (_, i) => (
        <p key={i}>{t(`privacy.p${i + 1}` as MessageKey, lang, { email: CONTACT_EMAIL })}</p>
      ))}
    </article>
  );
}
