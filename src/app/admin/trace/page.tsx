import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/auth";
import { formatIst } from "@/lib/history";
import { t } from "@/lib/i18n";
import { currentLang } from "@/lib/lang";

export async function generateMetadata(): Promise<Metadata> {
  return { title: t("admin.trace", await currentLang()) };
}

/** The last 50 lessons, newest first. Each opens its turn-by-turn trace. */
export default async function TraceListPage() {
  const user = await requirePageUser(["admin"]);
  const lang = await currentLang(user);
  if (process.env.USE_MOCKS === "1") return <p className="text-muted-foreground">{t("admin.mockOnly", lang)}</p>;
  const rows = await (await import("@/lib/db/queries/admin")).recentLessons(50);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-navy">{t("admin.trace", lang)}</h1>
      <p className="text-sm text-muted-foreground">
        {t("admin.recent", lang)} — {t("admin.lessonCols", lang)}
      </p>
      <ul className="flex flex-col gap-2">
        {rows.map((r) => (
          <li key={r.id}>
            <Link
              href={`/admin/trace/${r.id}`}
              className="flex min-h-11 flex-wrap items-center gap-x-3 border border-border p-3 hover:bg-pale"
            >
              <span className="font-semibold text-navy">{r.code}</span>
              <span className="text-sm">
                {r.lang} · {r.channel} · {t("history.turns", lang, { n: r.turnCount })}
              </span>
              <span className="text-sm text-muted-foreground">{formatIst(r.startedAt, lang)}</span>
              <span className="ml-auto text-sm tabular-nums">${r.costUsd.toFixed(4)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
