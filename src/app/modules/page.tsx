import type { Metadata } from "next";
import { StartButton } from "@/components/StartButton";
import { requirePageUser } from "@/lib/auth";
import { type MessageKey, t } from "@/lib/i18n";
import { currentLang } from "@/lib/lang";
import { GRADES, MODULES, SUBJECTS, liveModules } from "@/lib/modules";

export async function generateMetadata(): Promise<Metadata> {
  return { title: t("modules.title", await currentLang()) };
}

/**
 * The catalogue: every class and subject up to Class 5, the one live module with its Start button, the rest
 * marked "coming soon" — so the shape of the product is visible without pretending anything is built.
 */
export default async function ModulesPage() {
  const user = await requirePageUser();
  const lang = await currentLang(user);
  const canStart = user.role === "teacher" || user.role === "admin";
  const live = liveModules().length;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-semibold text-heading sm:text-4xl">{t("modules.title", lang)}</h1>
        <p className="mt-2 text-muted-foreground">{t("modules.intro", lang, { n: live })}</p>
      </header>

      {GRADES.map((grade) => {
        const subjects = SUBJECTS.filter((s) => MODULES.some((m) => m.grade === grade && m.subject === s));
        return (
          <section key={grade} aria-labelledby={`grade-${grade}`} className="flex flex-col gap-4">
            <h2 id={`grade-${grade}`} className="text-2xl font-semibold">
              {t("modules.grade", lang, { n: grade })}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {subjects.map((subject) => (
                <div key={subject}>
                  <h3 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                    {t(`subject.${subject}` as MessageKey, lang)}
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {MODULES.filter((m) => m.grade === grade && m.subject === subject).map((m) =>
                      m.status === "live" ? (
                        <li key={m.id} className="tile border-primary p-4">
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-medium">{t(m.name, lang)}</p>
                            <span className="shrink-0 rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                              {t("modules.live", lang)}
                            </span>
                          </div>
                          {canStart && <StartButton />}
                        </li>
                      ) : (
                        <li key={m.id} className="tile-alt flex items-start justify-between gap-3 p-4">
                          <p className="text-muted-foreground">{t(m.name, lang)}</p>
                          <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                            {t("modules.soon", lang)}
                          </span>
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
