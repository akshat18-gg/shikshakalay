import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth";
import { formatIst } from "@/lib/history";
import { type MessageKey, t } from "@/lib/i18n";
import { currentLang } from "@/lib/lang";

export async function generateMetadata(): Promise<Metadata> {
  return { title: t("admin.evals", await currentLang()) };
}

/** Targets from AGENTS.md 18. Results come from the latest eval_runs row (npm run evals, Phase 6). */
const TARGETS: { key: string; label: MessageKey; target: string }[] = [
  { key: "resistWeak", label: "evals.resistWeak", target: "≥ 90%" },
  { key: "teachable", label: "evals.teachable", target: "≥ 80%" },
  { key: "directorAccuracy", label: "evals.directorAccuracy", target: "≥ 85%" },
  { key: "lineFirstTry", label: "evals.lineFirstTry", target: "≥ 98%" },
  { key: "lineFinal", label: "evals.lineFinal", target: "100%" },
  { key: "quoteValidity", label: "evals.quoteValidity", target: "100%" },
];

type Confusion = Record<string, Record<string, number>>;

/** The runner stores { counts, confusion }; rows = the answer key's move, cells = what the Director said. */
function confusionOf(details: unknown): Confusion | null {
  const c = (details as { confusion?: unknown } | null)?.confusion;
  return c && typeof c === "object" ? (c as Confusion) : null;
}

function ConfusionTable({ confusion }: { confusion: Confusion }) {
  const rows = Object.keys(confusion).sort();
  const cols = [...new Set(rows.concat(Object.values(confusion).flatMap((r) => Object.keys(r))))].sort();
  return (
    <div className="overflow-x-auto">
      <table className="text-xs tabular-nums">
        <thead>
          <tr>
            <th />
            {cols.map((c) => (
              <th key={c} className="px-1 py-1 align-bottom font-medium [writing-mode:vertical-rl]">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r} className="border-t border-border">
              <th className="pr-2 text-left font-medium whitespace-nowrap">{r}</th>
              {cols.map((c) => (
                <td key={c} className={`px-1 text-center ${r === c ? "bg-pale font-semibold" : ""}`}>
                  {confusion[r]?.[c] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function EvalsPage() {
  const user = await requirePageUser(["admin"]);
  const lang = await currentLang(user);
  const run = process.env.USE_MOCKS === "1" ? null : await (await import("@/lib/db/queries/admin")).latestEvalRun();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-navy">{t("admin.evals", lang)}</h1>
      {!run ? (
        <p className="text-muted-foreground">{t("admin.noEvals", lang)}</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {t("admin.evalRun", lang, { date: formatIst(run.createdAt, lang) })}
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2">{t("admin.metric", lang)}</th>
                <th>{t("admin.target", lang)}</th>
                <th>{t("admin.result", lang)}</th>
              </tr>
            </thead>
            <tbody>
              {TARGETS.map((m) => (
                <tr key={m.key} className="border-b border-border">
                  <td className="py-2">{t(m.label, lang)}</td>
                  <td>{m.target}</td>
                  <td className="font-semibold tabular-nums">
                    {run.metrics[m.key] === undefined ? "—" : `${Math.round(run.metrics[m.key]! * 1000) / 10}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <h2 className="font-semibold">{t("admin.promptVersions", lang)}</h2>
          <p className="text-sm">
            {Object.entries(run.promptVersions)
              .map(([k, v]) => `${k}: ${v}`)
              .join(" · ")}
          </p>
          {confusionOf(run.details) && (
            <>
              <h2 className="font-semibold">{t("admin.confusion", lang)}</h2>
              <ConfusionTable confusion={confusionOf(run.details)!} />
            </>
          )}
        </>
      )}
    </div>
  );
}
