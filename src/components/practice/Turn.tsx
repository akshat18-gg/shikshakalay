"use client";

/**
 * One turn of the chat, in the Messages style: the teacher's words in a blue bubble on the right, each child's
 * reply in a grey bubble on the left with the child's avatar.
 */
import { ChildAvatar } from "@/components/art/ChildAvatar";
import type { TurnResult } from "@/lib/contracts";
import { silentChildren } from "@/lib/practice";
import { useT } from "../LangProvider";
import { CHILD_STYLE } from "./childStyle";

export function TeacherBubble({ text }: { text: string }) {
  const t = useT();
  return (
    <li className="bubble-in flex justify-end">
      <p className="max-w-[85%] rounded-[18px] rounded-br-md bg-teal-strong px-4 py-2 text-white">
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
        const name = t(style.name);
        return (
          <li key={i} className="bubble-in flex items-end justify-start gap-2">
            <ChildAvatar id={line.child} name={name} size={28} />
            <div className="max-w-[80%] rounded-[18px] rounded-bl-md bg-bubble px-4 py-2">
              <p className={`text-xs font-semibold ${style.text}`}>{name}</p>
              <p>{line.text}</p>
            </div>
          </li>
        );
      })}
      {onPlay && turn.lines.length > 0 && (
        <li className="bubble-in pl-9">
          <button
            type="button"
            onClick={onPlay}
            className="press min-h-11 text-sm text-mint outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            ▶ {t("practice.playReply")}
          </button>
        </li>
      )}
      {silentChildren(turn).map((id) => (
        <li key={id} className="bubble-in pl-9 text-sm text-muted-foreground italic">
          {t("practice.silent", { name: t(CHILD_STYLE[id].name) })}
        </li>
      ))}
    </>
  );
}
