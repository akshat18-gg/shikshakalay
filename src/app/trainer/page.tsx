import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth";
import { type MessageKey, t } from "@/lib/i18n";
import { currentLang } from "@/lib/lang";
import { mockDashboard } from "@/lib/mocks/dashboard";
import { dashboardView } from "@/lib/trainer";

export async function generateMetadata(): Promise<Metadata> {
  return { title: t("trainer.title", await currentLang()) };
}

/** Anonymised skill gaps across teachers. Numbers from fewer than 5 teachers show as "hidden". */
export default async function TrainerPage() {
  const user = await requirePageUser(["trainer", "admin"]);
  const lang = await currentLang(user);
  const data =
    process.env.USE_MOCKS === "1" ? mockDashboard : await (await import("@/lib/db/queries/trainer")).dbDashboard();
  const v = dashboardView(data);
  const hidden = <span className="text-muted-foreground italic">{t("trainer.hidden", lang)}</span>;
  const maxUses = Math.max(1, ...v.moves.map((m) => m.uses ?? 0));
  const bar = (pct: number, cls: string) => (
    <div className="h-3 w-full bg-pale" aria-hidden="true">
      <div className={`h-3 ${cls}`} style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} />
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-navy">{t("trainer.title", lang)}</h1>
        <p className="mt-1 text-muted-foreground">
          {t("trainer.teachers", lang, { n: v.teachers })} · {t("trainer.lessons", lang, { n: v.lessons })}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{t("trainer.privacy", lang)}</p>
      </header>

      {v.lessons === 0 ? (
        <p className="text-muted-foreground">{t("trainer.empty", lang)}</p>
      ) : (
        <>
          <section aria-labelledby="wvs" className="border-l-4 border-teal bg-white p-4 shadow-sm">
            <h2 id="wvs" className="font-semibold">
              {t("trainer.weakVsStrong", lang)}
            </h2>
            <dl className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-muted-foreground">{t("trainer.strong", lang)}</dt>
                <dd className="text-2xl font-bold text-teal-strong">
                  {v.strongShare === null ? hidden : `${v.strongShare}%`}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">{t("trainer.weak", lang)}</dt>
                <dd className="text-2xl font-bold text-child-ravi">
                  {v.weakShare === null ? hidden : `${v.weakShare}%`}
                </dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="moves">
            <h2 id="moves" className="font-semibold">
              {t("trainer.moves", lang)}
            </h2>
            <ul className="mt-2 flex flex-col gap-2">
              {v.moves.map((m) => (
                <li key={m.move} className="grid grid-cols-[minmax(0,10rem)_1fr_3rem] items-center gap-2 text-sm">
                  <span>{t(`moves.${m.move}` as MessageKey, lang)}</span>
                  {m.uses === null
                    ? hidden
                    : bar(
                        (m.uses / maxUses) * 100,
                        m.kind === "weak" ? "bg-child-ravi" : m.kind === "strong" ? "bg-teal-strong" : "bg-navy/50",
                      )}
                  <span className="text-right tabular-nums">{m.uses ?? ""}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="scores">
            <h2 id="scores" className="font-semibold">
              {t("trainer.teachScores", lang)}
            </h2>
            <ul className="mt-2 flex flex-col gap-2">
              {v.scores.map((s) => (
                <li key={s.element} className="grid grid-cols-[minmax(0,10rem)_1fr_4rem] items-center gap-2 text-sm">
                  <span>{t(`teach.${s.element}` as MessageKey, lang)}</span>
                  {s.avg === null ? hidden : bar((s.avg / 5) * 100, "bg-navy")}
                  <span className="text-right tabular-nums">{s.avg === null ? "" : `${s.avg} / 5`}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="lpt" className="grid gap-4 sm:grid-cols-2">
            <div>
              <h2 id="lpt" className="font-semibold">
                {t("trainer.lessonsPerTeacher", lang)}
              </h2>
              <ul className="mt-2 flex flex-col gap-1 text-sm">
                {v.lessonBuckets.map((b) => (
                  <li key={b.lessons} className="flex justify-between border-b border-border py-1">
                    <span>{t("trainer.lessonBucket", lang, { n: b.lessons })}</span>
                    <span className="tabular-nums">
                      {b.teachers === null ? hidden : t("trainer.teachers", lang, { n: b.teachers })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="font-semibold">{t("trainer.returnRate", lang)}</h2>
              <p className="mt-2 text-3xl font-bold text-navy">{v.returnRate === null ? hidden : `${v.returnRate}%`}</p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
