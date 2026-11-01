import type { Metadata } from "next";
import { BundlesSticks } from "@/components/art/BundlesSticks";
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
      {/* 52 as five bundles and two sticks — the first sum of the lesson, as the hero image */}
      <BundlesSticks tens={5} ones={2} className="mx-auto h-28 w-auto max-w-full" />
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-heading sm:text-4xl">{t("login.title", lang)}</h1>
        <p className="mt-2 text-xl text-muted-foreground">{t("app.tagline", lang)}</p>
      </div>
      <LoginForm next={safeNext(typeof next === "string" ? next : null)} />
      <p className="tile-alt p-4 text-sm">{t("login.judgeNote", lang)}</p>
    </div>
  );
}
