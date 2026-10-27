/**
 * The children's words: one Claude call (Haiku 5.5, fast) for every speaker, then the line check.
 * Children whose line fails get ONE retry with a firm reminder, then their backup line. If Claude itself fails
 * (timeout, refusal), everyone gets a backup line at once — the teacher never waits for a second slow call.
 */
import { ClaudeCallError, askJson } from "@/lib/ai/claude";
import { type SpeakerBrief, childrenSystem, childrenUser, version } from "@/lib/ai/prompts/children";
import { type ChildId, type ChildLine, ChildLines } from "@/lib/contracts";
import { namesFor } from "./director";
import { checkLine, fillBackup, strictReminder } from "./guardrails";
import type { AiTurnContext, Speaker } from "./types";

/** One row of child_lines: what was said and how the check went. */
export type LineRecord = {
  child: ChildId;
  text: string;
  expectedAnswer: number | null;
  /** The first generated line passed the check. */
  passed: boolean;
  retries: number;
  usedBackup: boolean;
};

export async function writeLines(
  ctx: AiTurnContext,
  speakers: Speaker[],
): Promise<{ lines: ChildLine[]; records: LineRecord[] }> {
  if (speakers.length === 0) return { lines: [], records: [] };
  const names = namesFor(ctx);
  const sum = ctx.state.currentSum;
  const correct = sum[0] - sum[1];
  const childOf = (id: ChildId) => ctx.state.children.find((c) => c.id === id)!;
  const brief = (sp: Speaker): SpeakerBrief => ({ ...sp, name: names[sp.child], state: childOf(sp.child).state });

  async function ask(group: Speaker[], strict?: string[]): Promise<Map<ChildId, string>> {
    const r = await askJson(
      {
        purpose: "children",
        model: ctx.models.child,
        promptVersion: version,
        schema: ChildLines,
        system: childrenSystem(ctx.scenario),
        user: childrenUser({
          lang: ctx.state.lang,
          currentSum: `${sum[0]}-${sum[1]}`,
          recent: ctx.recent,
          names,
          speakers: group.map(brief),
          teacher: ctx.teacher,
          strict,
        }),
        maxTokens: 600,
        fast: true,
        sessionId: ctx.sessionId,
        turn: ctx.turn,
      },
      ctx.ai,
    );
    const wanted = new Set(group.map((g) => g.child));
    const out = new Map<ChildId, string>();
    for (const l of r.data.lines) if (wanted.has(l.child) && !out.has(l.child)) out.set(l.child, l.text.trim());
    return out; // lines for anyone not asked to speak are dropped
  }

  const passes = (sp: Speaker, text: string | undefined) =>
    text !== undefined && checkLine(text, sp.mustSay, sum, childOf(sp.child)).ok;

  const final = new Map<ChildId, LineRecord>();
  let first = new Map<ChildId, string>();
  let callFailed = false;
  try {
    first = await ask(speakers);
  } catch (err) {
    if (!(err instanceof ClaudeCallError)) throw err;
    callFailed = true;
  }

  const failing = speakers.filter((sp) => !passes(sp, first.get(sp.child)));
  for (const sp of speakers) {
    if (!failing.includes(sp)) {
      final.set(sp.child, record(sp, first.get(sp.child)!, true, 0, false));
    }
  }

  let second = new Map<ChildId, string>();
  if (failing.length > 0 && !callFailed) {
    const strict = failing.map((sp) => strictReminder(names[sp.child], sp.mustSay, correct, childOf(sp.child)));
    try {
      second = await ask(failing, strict);
    } catch (err) {
      if (!(err instanceof ClaudeCallError)) throw err;
    }
  }
  for (const sp of failing) {
    const retried = second.get(sp.child);
    const retries = callFailed ? 0 : 1;
    final.set(
      sp.child,
      passes(sp, retried)
        ? record(sp, retried!, false, retries, false)
        : record(sp, fillBackup(ctx.scenario, ctx.state.lang, sp, childOf(sp.child)), false, retries, true),
    );
  }

  const records = speakers.map((sp) => final.get(sp.child)!);
  return { lines: records.map((r) => ({ child: r.child, text: r.text })), records };
}

function record(sp: Speaker, text: string, passed: boolean, retries: number, usedBackup: boolean): LineRecord {
  return { child: sp.child, text, expectedAnswer: sp.mustSay, passed, retries, usedBackup };
}
