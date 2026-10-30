import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ChildState } from "@/lib/contracts";
import { requirePageUser } from "@/lib/auth";
import type { TraceTurn } from "@/lib/db/queries/admin";
import { formatIst } from "@/lib/history";
import { type MessageKey, t } from "@/lib/i18n";
import { currentLang } from "@/lib/lang";

export async function generateMetadata(): Promise<Metadata> {
  return { title: t("admin.trace", await currentLang()) };
}

function Minds({ before, after, lang }: { before: ChildState[]; after: ChildState[]; lang: "en" | "hi" }) {
  return (
    <ul className="grid grid-cols-2 gap-1 text-sm sm:grid-cols-4">
      {after.map((a) => {
        const b = before.find((x) => x.id === a.id)!;
        const changed = b.state !== a.state || b.revealed !== a.revealed || b.engagement !== a.engagement;
        return (
          <li key={a.id} className={`border p-2 ${changed ? "border-teal bg-pale font-semibold" : "border-border"}`}>
            <div>{t(`child.${a.id}` as MessageKey, lang)}</div>
            <div className="text-xs">
              {b.state}
              {b.state !== a.state && ` → ${a.state}`} · eng {b.engagement}
              {b.engagement !== a.engagement && ` → ${a.engagement}`}
              {!b.revealed && a.revealed && " · revealed"}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function TurnBlock({ turn, lang }: { turn: TraceTurn; lang: "en" | "hi" }) {
  const ms = turn.calls.reduce((n, c) => n + c.ms, 0);
  const cost = turn.calls.reduce((n, c) => n + (c.costUsd ?? 0), 0);
  return (
    <section className="flex flex-col gap-3 border-l-4 border-navy bg-white p-4 shadow-sm">
      <h2 className="font-bold text-navy">
        {turn.turn === 0 ? t("admin.hello", lang) : t("admin.turn", lang, { n: turn.turn })}
      </h2>
      {turn.turn > 0 && (
        <>
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground">1 · {t("admin.said", lang)}</h3>
            <p className="mt-1">“{turn.teacherText}”</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground">2 · {t("admin.director", lang)}</h3>
            <pre className="mt-1 overflow-x-auto bg-pale p-2 text-xs whitespace-pre-wrap">
              {turn.director ? JSON.stringify(turn.director, null, 1) : "—"}
            </pre>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground">3 · {t("admin.minds", lang)}</h3>
            <Minds before={turn.statesBefore} after={turn.statesAfter} lang={lang} />
          </div>
        </>
      )}
      {turn.lines.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground">4 · {t("admin.lines", lang)}</h3>
          <ul className="mt-1 flex flex-col gap-1 text-sm">
            {turn.lines.map((l, i) => (
              <li key={i}>
                <span className="font-semibold">{t(`child.${l.child}` as MessageKey, lang)}:</span> {l.text}{" "}
                <span className="text-xs text-muted-foreground">
                  (
                  {l.expectedAnswer === null
                    ? t("admin.noNumber", lang)
                    : t("admin.mustSay", lang, { n: l.expectedAnswer })}{" "}
                  ·{" "}
                  {l.usedBackup
                    ? t("admin.backup", lang)
                    : l.retries
                      ? t("admin.retried", lang)
                      : t("admin.passed", lang)}
                  )
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {turn.calls.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground">5 · {t("admin.calls", lang)}</h3>
          <ul className="mt-1 text-xs">
            {turn.calls.map((c, i) => (
              <li key={i} className={c.ok ? "" : "text-destructive"}>
                {c.purpose} · {c.model} · {c.promptVersion ?? "—"} · {c.ms} ms · ${(c.costUsd ?? 0).toFixed(5)}
                {c.cacheReadTokens ? ` · cache ${c.cacheReadTokens}` : ""}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs font-semibold">{t("admin.total", lang, { ms, cost: cost.toFixed(5) })}</p>
        </div>
      )}
    </section>
  );
}

/** One lesson, turn by turn, so a judge can follow how the rules and Claude work together. */
export default async function TracePage({ params }: PageProps<"/admin/trace/[sessionId]">) {
  const user = await requirePageUser(["admin"]);
  const lang = await currentLang(user);
  if (process.env.USE_MOCKS === "1") return <p className="text-muted-foreground">{t("admin.mockOnly", lang)}</p>;
  const { sessionId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) notFound();
  const trace = await (await import("@/lib/db/queries/admin")).lessonTrace(sessionId);
  if (!trace) notFound();
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold text-navy">
          {t("admin.trace", lang)} · {trace.session.code}
        </h1>
        <p className="text-sm text-muted-foreground">
          {trace.session.lang} · {formatIst(trace.session.startedAt, lang)} · v{trace.session.scenarioVersion}
        </p>
        <p className="mt-2 text-sm">{t("admin.traceHelp", lang)}</p>
      </header>
      {trace.turns.map((turn) => (
        <TurnBlock key={turn.turn} turn={turn} lang={lang} />
      ))}
      {trace.coach.length > 0 && (
        <p className="text-sm text-muted-foreground">
          coach ·{" "}
          {trace.coach
            .map((c) => `${c.model} ${c.promptVersion ?? ""} ${c.ms} ms $${(c.costUsd ?? 0).toFixed(4)}`)
            .join(" · ")}
        </p>
      )}
    </div>
  );
}
