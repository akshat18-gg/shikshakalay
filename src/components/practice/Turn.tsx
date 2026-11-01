"use client";

/** One turn of the chat: the teacher's words on the right, then each child's reply on the left. */
import type { TurnResult } from "@/lib/contracts";
import { silentChildren } from "@/lib/practice";
import { useT } from "../LangProvider";
import { CHILD_STYLE } from "./childStyle";

export function TeacherBubble({ text }: { text: string }) {
  const t = useT();
  return (
    <li className="bubble-in flex justify-end">
      <p className="max-w-[85%] bg-teal-strong px-3 py-2 text-white shadow-sm">
        <span className="sr-only">{t("practice.you")}: </span>
        {text}
      </p>
    </li>
  );
}

/** `onPlay` adds a small button that plays the children's voices for this turn again. */
export function Turn({ turn, onPlay }: { turn: TurnResult; onPlay?: () => void }) {
  const t = useT();
  return (
    <>
      {turn.transcript && <TeacherBubble text={turn.transcript} />}
      {turn.lines.map((line, i) => {
        const style = CHILD_STYLE[line.child];
        return (
          <li key={i} className="bubble-in flex justify-start">
            <div className={`max-w-[85%] border-l-4 glass px-3 py-2 ${style.border}`}>
              <p className={`text-sm font-semibold tracking-wide ${style.text}`}>{t(style.name)}</p>
              <p>{line.text}</p>
            </div>
          </li>
        );
      })}
      {onPlay && turn.lines.length > 0 && (
        <li className="bubble-in">
          <button
            type="button"
            onClick={onPlay}
            className="press min-h-11 text-sm font-semibold text-mint underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            ▶ {t("practice.playReply")}
          </button>
        </li>
      )}
      {silentChildren(turn).map((id) => (
        <li key={id} className="bubble-in text-sm text-muted-foreground italic">
          {t("practice.silent", { name: t(CHILD_STYLE[id].name) })}
        </li>
      ))}
    </>
  );
}
