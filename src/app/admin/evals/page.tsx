import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth";
import { formatIst } from "@/lib/history";
import { t } from "@/lib/i18n";
import { currentLang } from "@/lib/lang";

export async function generateMetadata(): Promise<Metadata> {
  return { title: t("admin.evals", await currentLang()) };
}

/** Targets from AGENTS.md 18. Results come from the latest eval_runs row (npm run evals, Phase 6). */
const TARGETS: { key: string; label: string; target: string }[] = [
  { key: "resistWeak", label: "Children resist weak moves", target: "≥ 90%" },
  { key: "teachable", label: "Children can be taught", target: "≥ 80%" },
  { key: "directorAccuracy", label: "Director accuracy", target: "≥ 85%" },
  { key: "lineFirstTry", label: "Line fidelity, first try", target: "≥ 98%" },
  { key: "lineFinal", label: "Line fidelity after fallback", target: "100%" },
  { key: "quoteValidity", label: "Quote validity", target: "100%" },
];

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
                  <td className="py-2">{m.label}</td>
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
          {run.details !== null && (
            <>
              <h2 className="font-semibold">{t("admin.confusion", lang)}</h2>
              <pre className="overflow-x-auto bg-pale p-2 text-xs">
                {JSON.stringify(run.details, null, 1).slice(0, 6000)}
              </pre>
            </>
          )}
        </>
      )}
    </div>
  );
}
