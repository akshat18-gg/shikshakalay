/** The bar on every page: app name (home link), the language switch and, when logged in, Log out. */
import Link from "next/link";
import type { Lang } from "@/lib/contracts";
import { t } from "@/lib/i18n";
import { LangToggle } from "./LangToggle";
import { LogoutButton } from "./LogoutButton";

export function TopBar({ lang, loggedIn }: { lang: Lang; loggedIn: boolean }) {
  return (
    <header className="sticky top-0 z-10 bg-navy text-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2">
        <Link
          href="/"
          className="flex min-h-11 items-center text-lg font-bold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-mint"
        >
          {t("app.name", lang)}
        </Link>
        <div className="flex items-center gap-2">
          <LangToggle />
          {loggedIn && <LogoutButton />}
        </div>
      </div>
    </header>
  );
}
