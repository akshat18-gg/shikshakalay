import Link from "next/link";
import { t } from "@/lib/i18n";
import { currentLang } from "@/lib/lang";

export default async function NotFound() {
  const lang = await currentLang();
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-bold text-navy">{t("error.notFoundTitle", lang)}</h1>
      <p>{t("error.notFoundBody", lang)}</p>
      <Link href="/" className="min-h-11 font-semibold text-navy underline">
        {t("error.home", lang)}
      </Link>
    </div>
  );
}
