import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { currentLang } from "@/lib/lang";

export async function generateMetadata(): Promise<Metadata> {
  return { title: t("admin.title", await currentLang()) };
}

export default async function AdminPage() {
  const user = await requirePageUser(["admin"]);
  const lang = await currentLang(user);
  const link = "flex min-h-11 items-center border-l-4 border-teal bg-pale p-4 font-semibold text-navy underline";
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-navy">{t("admin.title", lang)}</h1>
      <Link href="/admin/trace" className={link}>
        {t("admin.trace", lang)}
      </Link>
      <Link href="/admin/evals" className={link}>
        {t("admin.evals", lang)}
      </Link>
      <Link href="/trainer" className={link}>
        {t("trainer.title", lang)}
      </Link>
    </div>
  );
}
