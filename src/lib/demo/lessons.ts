/**
 * Synthetic demo lessons for the seed (no Claude, no cost): scripted teacher turns played through the real step()
 * with a fake Director (the scripted move) and fake children (their backup lines with the engine's numbers).
 * So the trainer dashboard and the AI trace show real engine behaviour on made-up teachers.
 */
import type { ChildLine, CoachCard, DirectorOutput, Lang, Move, TeachElement, TurnResult } from "@/lib/contracts";
import type { LineRecord } from "@/lib/engine/children";
import { type StepDeps, step } from "@/lib/engine/core";
import { fillBackup } from "@/lib/engine/guardrails";
import { type Scenario, moveEffects, startState } from "@/lib/engine/scenario";
import { simpleCard } from "@/lib/engine/simpleCard";
import type { EngineState } from "@/lib/engine/types";

type To = DirectorOutput["addressedTo"];
export type ScriptTurn = { en: string; hi: string; move: Move; to?: To; newTask?: string };

/** Three teaching styles, so the dashboard shows a real mix of weak and strong moves. */
export const TEMPLATES: Record<"weak" | "strong" | "mixed", ScriptTurn[]> = {
  weak: [
    { en: "What is 52 minus 27?", hi: "बावन में से सत्ताईस कितना?", move: "new_sum", newTask: "52-27" },
    { en: "No, it is 25. Everyone say 25.", hi: "नहीं, पच्चीस है। सब बोलो पच्चीस।", move: "tell_answer" },
    { en: "Now 43 minus 18?", hi: "अब तैंतालीस में से अठारह?", move: "new_sum", newTask: "43-18" },
    {
      en: "I told you, take one ten. Same way again!",
      hi: "मैंने बताया ना, एक दस लो। फिर से वैसे ही!",
      move: "repeat_same_way",
    },
    { en: "Wrong. Sit down. Next.", hi: "गलत। बैठ जाओ। अगला।", move: "move_on_or_scold", to: ["arjun"] },
    { en: "The answer is 25. Write it.", hi: "जवाब पच्चीस है। लिख लो।", move: "tell_answer" },
  ],
  strong: [
    { en: "What is 52 minus 27?", hi: "बावन में से सत्ताईस कितना?", move: "new_sum", newTask: "52-27" },
    {
      en: "Ravi, tell me how you got 35.",
      hi: "रवि, तुमने 35 कैसे निकाला? बताओ।",
      move: "ask_to_explain",
      to: ["ravi"],
    },
    {
      en: "Show 52 with bundles and sticks. Can you take 7 sticks from 2?",
      hi: "बावन को बंडल और तीलियों से दिखाओ। 2 में से 7 कैसे लोगे?",
      move: "concrete_materials",
      to: ["ravi"],
    },
    {
      en: "Yes! Open a bundle. 12 take away 7?",
      hi: "हाँ! एक बंडल खोलो। 12 में से 7?",
      move: "targeted_question",
      to: ["ravi"],
    },
    {
      en: "Sana, what do you think? Take your time.",
      hi: "सना, तुम क्या सोचती हो? आराम से बताओ।",
      move: "invite_quiet_child",
      to: ["sana"],
    },
    {
      en: "Good, Ravi, you opened a bundle! Now 61 minus 24?",
      hi: "शाबाश रवि, तुमने बंडल खोला! अब इकसठ में से चौबीस?",
      move: "new_sum",
      newTask: "61-24",
    },
  ],
  mixed: [
    { en: "What is 52 minus 27?", hi: "बावन में से सत्ताईस कितना?", move: "new_sum", newTask: "52-27" },
    { en: "Thumbs up if you agree with Ravi.", hi: "जो रवि से सहमत है, अंगूठा ऊपर करो।", move: "check_whole_class" },
    { en: "No, it is 25.", hi: "नहीं, पच्चीस है।", move: "tell_answer" },
    { en: "Arjun, how did you get 35?", hi: "अर्जुन, तुम्हारा 35 कैसे आया?", move: "ask_to_explain", to: ["arjun"] },
    {
      en: "Where did the ten you borrowed go?",
      hi: "जो दस उधार लिया, वो कहाँ गया?",
      move: "targeted_question",
      to: ["arjun"],
    },
    {
      en: "Well done, Arjun, you took one ten away from the tens!",
      hi: "बहुत बढ़िया अर्जुन, तुमने दहाई में से एक कम किया!",
      move: "specific_praise",
      to: ["arjun"],
    },
  ],
};

export type DemoTurn = {
  turn: number;
  teacherText: string;
  director: DirectorOutput | null;
  statesBefore: EngineState["children"];
  statesAfter: EngineState["children"];
  result: TurnResult;
  records: LineRecord[];
};

/** Fake children: each speaker says its backup line, which always carries the engine's number. */
function fakeDeps(script: ScriptTurn[], scenario: Scenario): StepDeps {
  let i = 0;
  return {
    tagMove: async () => {
      const s = script[i++]!;
      const director: DirectorOutput = {
        move: s.move,
        addressedTo: s.to ?? ["whole_class"],
        newTask: s.newTask ?? "",
        evidenceQuote: "",
        confidence: "high",
      };
      return { director, ok: true };
    },
    writeLines: async (ctx, speakers) => {
      const records: LineRecord[] = speakers.map((sp) => {
        const child = ctx.state.children.find((c) => c.id === sp.child)!;
        const text = fillBackup(scenario, ctx.state.lang, sp, child);
        return { child: sp.child, text, expectedAnswer: sp.mustSay, passed: true, retries: 0, usedBackup: false };
      });
      return { lines: records.map((r): ChildLine => ({ child: r.child, text: r.text })), records };
    },
  };
}

/** A believable card: the plain card from her words, plus Teach scores from the moves she used. */
function demoCard(turns: DemoTurn[], lang: Lang, scenario: Scenario): CoachCard {
  const card = simpleCard(turns, lang, moveEffects(scenario));
  const used = (moves: Move[]) => turns.find((t) => t.director && moves.includes(t.director.move));
  const weak = Boolean(used(["tell_answer", "repeat_same_way", "move_on_or_scold"]));
  const score = (e: TeachElement, moves: Move[], high: number): CoachCard["teachScores"][number] | null => {
    const t = used(moves);
    return t
      ? {
          element: e,
          score: weak ? high - 1 : high,
          turn: t.turn,
          quote: t.teacherText.split(" ").slice(0, 8).join(" "),
        }
      : null;
  };
  const scores = [
    score("checks_for_understanding", ["ask_to_explain", "check_whole_class", "new_sum"], 4),
    score("lesson_facilitation", ["concrete_materials", "think_aloud"], 4),
    score("feedback", ["targeted_question", "tell_answer"], weak && !used(["targeted_question"]) ? 3 : 4),
    score(
      "supportive_environment",
      ["invite_quiet_child", "specific_praise", "move_on_or_scold"],
      used(["move_on_or_scold"]) ? 2 : 5,
    ),
    score("critical_thinking", ["compare_methods", "ask_to_explain"], 3),
  ].filter((x): x is NonNullable<typeof x> => x !== null);
  return { ...card, teachScores: scores };
}

export async function playDemoLesson(o: {
  scenario: Scenario;
  lang: Lang;
  script: ScriptTurn[];
  startedAt: Date;
  sessionId: string;
}): Promise<{ turns: DemoTurn[]; state: EngineState; card: CoachCard }> {
  const deps = fakeDeps(o.script, o.scenario);
  let state = startState(o.scenario, o.lang, o.startedAt.toISOString());
  const turns: DemoTurn[] = [];
  for (const [n, s] of o.script.entries()) {
    const now = new Date(o.startedAt.getTime() + (n + 1) * 20_000);
    const r = await step(
      {
        scenario: o.scenario,
        state,
        teacherText: s[o.lang],
        now,
        recent: [],
        models: { director: "demo", child: "demo" },
      },
      deps,
    );
    turns.push({
      turn: n + 1,
      teacherText: r.teacherText,
      director: r.director,
      statesBefore: r.statesBefore,
      statesAfter: r.state.children,
      records: r.records,
      result: {
        sessionId: o.sessionId,
        turn: n + 1,
        transcript: r.teacherText,
        director: r.director,
        lines: r.lines,
        statesAfter: r.state.children,
        audioUrl: null,
        lessonOver: r.lessonOver,
        ms: 2800 + ((n * 937) % 1900),
      },
    });
    state = r.state;
  }
  return { turns, state, card: demoCard(turns, o.lang, o.scenario) };
}
