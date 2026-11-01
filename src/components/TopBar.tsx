/** The bar on every page: app name (home link), History, the language switch and, when logged in, Log out. */
import Link from "next/link";
import type { Lang } from "@/lib/contracts";
import { t } from "@/lib/i18n";
import { LangToggle } from "./LangToggle";
import { LogoutButton } from "./LogoutButton";

export function TopBar({ lang, loggedIn }: { lang: Lang; loggedIn: boolean }) {
  return (
    // apple.com's global nav: dark translucent material, small quiet links; the page scrolls under it.
    <header className="material-navy edge-bottom sticky top-0 z-10 text-white">
      {/* Phones: name + language on the first row, History and Log out on a second row. Wider: one row. */}
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-3 px-4 py-1">
        <Link
          href="/"
          className="press flex min-h-11 items-center text-base font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-white/60"
        >
          {t("app.name", lang)}
        </Link>
        <div className="sm:order-last">
          <LangToggle />
        </div>
        {loggedIn && (
          <nav className="flex w-full justify-end gap-5 border-t border-white/15 sm:ml-auto sm:w-auto sm:border-0">
            <Link
              href="/modules"
              className="press min-h-11 content-center px-1 text-xs text-white/85 outline-none hover:text-white focus-visible:ring-3 focus-visible:ring-white/60"
            >
              {t("nav.modules", lang)}
            </Link>
            <Link
              href="/try"
              className="press min-h-11 content-center px-1 text-xs text-white/85 outline-none hover:text-white focus-visible:ring-3 focus-visible:ring-white/60"
            >
              {t("nav.try", lang)}
            </Link>
            <Link
              href="/history"
              className="press min-h-11 content-center px-1 text-xs text-white/85 outline-none hover:text-white focus-visible:ring-3 focus-visible:ring-white/60"
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
