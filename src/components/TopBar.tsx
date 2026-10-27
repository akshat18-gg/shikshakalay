/** The bar on every page: app name (home link), History, the language switch and, when logged in, Log out. */
import Link from "next/link";
import type { Lang } from "@/lib/contracts";
import { t } from "@/lib/i18n";
import { LangToggle } from "./LangToggle";
import { LogoutButton } from "./LogoutButton";

export function TopBar({ lang, loggedIn }: { lang: Lang; loggedIn: boolean }) {
  return (
    <header className="sticky top-0 z-10 bg-navy text-white">
      {/* Phones: name + language on the first row, History and Log out on a second row. Wider: one row. */}
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-3 px-4 py-1 sm:py-2">
        <Link
          href="/"
          className="flex min-h-11 items-center text-lg font-bold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-mint"
        >
          {t("app.name", lang)}
        </Link>
        <div className="sm:order-last">
          <LangToggle />
        </div>
        {loggedIn && (
          <nav className="flex w-full justify-end gap-4 border-t border-white/20 sm:w-auto sm:border-0 sm:ml-auto">
            <Link
              href="/history"
              className="min-h-11 content-center px-1 text-sm underline outline-none focus-visible:ring-3 focus-visible:ring-mint"
            >
              {t("nav.history", lang)}
            </Link>
            <LogoutButton />
          </nav>
        )}
      </div>
    </header>
  );
}
