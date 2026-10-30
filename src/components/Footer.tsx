import Link from "next/link";
import type { Lang } from "@/lib/contracts";
import { t } from "@/lib/i18n";
import { CONTACT_EMAIL, REPO_URL } from "@/lib/site";

export function Footer({ lang }: { lang: Lang }) {
  const link = "inline-flex min-h-11 items-center underline";
  return (
    <footer className="border-t border-border bg-pale">
      <div className="mx-auto flex max-w-3xl flex-col gap-1 px-4 py-4 text-sm text-muted-foreground">
        <p>{t("footer.team", lang)}</p>
        <nav className="flex flex-wrap gap-x-4">
          <a className={link} href={`mailto:${CONTACT_EMAIL}`}>
            {t("footer.contact", lang)}: {CONTACT_EMAIL}
          </a>
          <a className={link} href={REPO_URL} rel="noopener noreferrer" target="_blank">
            {t("footer.code", lang)}
          </a>
          <Link className={link} href="/privacy">
            {t("footer.privacy", lang)}
          </Link>
          <Link className={link} href="/terms">
            {t("footer.terms", lang)}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
