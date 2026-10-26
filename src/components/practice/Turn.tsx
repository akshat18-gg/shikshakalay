"use client";

/** One turn of the chat: the teacher's words on the right, then each child's reply on the left. */
import type { TurnResult } from "@/lib/contracts";
import { silentChildren } from "@/lib/practice";
import { useT } from "../LangProvider";
import { CHILD_STYLE } from "./childStyle";

export function TeacherBubble({ text }: { text: string }) {
  const t = useT();
  return (
    <li className="flex justify-end">
      <p className="max-w-[85%] bg-teal-strong px-3 py-2 text-white">
        <span className="sr-only">{t("practice.you")}: </span>
        {text}
      </p>
    </li>
  );
}

export function Turn({ turn }: { turn: TurnResult }) {
  const t = useT();
  return (
    <>
      {turn.transcript && <TeacherBubble text={turn.transcript} />}
      {turn.lines.map((line, i) => {
        const style = CHILD_STYLE[line.child];
        return (
          <li key={i} className="flex justify-start">
            <div className={`max-w-[85%] border-l-4 bg-white px-3 py-2 shadow-sm ${style.border}`}>
              <p className={`text-sm font-semibold ${style.text}`}>{t(style.name)}</p>
              <p>{line.text}</p>
            </div>
          </li>
        );
      })}
      {silentChildren(turn).map((id) => (
        <li key={id} className="text-sm text-muted-foreground italic">
          {t("practice.silent", { name: t(CHILD_STYLE[id].name) })}
        </li>
      ))}
    </>
  );
}
