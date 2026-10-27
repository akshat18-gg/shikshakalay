import type { Metadata } from "next";
import { LoginForm } from "@/components/LoginForm";
import { safeNext } from "@/lib/auth/access";
import { t } from "@/lib/i18n";
import { currentLang } from "@/lib/lang";

export async function generateMetadata(): Promise<Metadata> {
  return { title: t("login.title", await currentLang()) };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const lang = await currentLang();
  const { next } = await searchParams;
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">{t("login.title", lang)}</h1>
        <p className="mt-1 text-muted-foreground">{t("app.tagline", lang)}</p>
      </div>
      <LoginForm next={safeNext(typeof next === "string" ? next : null)} />
      <p className="border-l-4 border-teal bg-pale p-3 text-sm">{t("login.judgeNote", lang)}</p>
    </div>
  );
}
