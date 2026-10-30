# 3-minute video — script and shot list

> For: the operator (recording) · Length: 3:00 · Screen recording on a phone (or Chrome device mode 360×640) plus
> the laptop for the admin pages. Speak slowly; on-screen captions for every Hindi line. Record the voice-over in
> one take per section. Public on YouTube.

**Before recording:** log in as `teacher_demo` on the phone in Hindi and English (fresh lessons); have `admin_demo`
open on the laptop; have WhatsApp joined to the trial number (+1 737 250 8034, `join twilio-trial`).

| Time | On screen | Voice-over (say this) |
|---|---|---|
| **0:00–0:20** · The problem | Title card: "Shikshakalay — a practice classroom for teachers". Then a still of a crowded classroom (stock, no real children's faces) | "A primary teacher in India gets almost no chance to practise *how* she responds when a child makes a mistake. The usual move — telling the right answer — feels quick, but the child's wrong idea stays. We built a safe place to practise." |
| **0:20–0:45** · Meet the class | Phone: log in → Start practice → the hello. Say (voice, Hindi): "बावन में से सत्ताईस कितना होगा?" → Ravi 35, Arjun 35, Meena 26, "Sana looks down" | "In five minutes she teaches subtraction to four AI children, by voice, in Hindi or English. Their mistakes are real and consistent: Ravi takes the smaller digit from the bigger one, Arjun forgets the borrowed ten, Meena counts one too many. Sana is right — but shy." |
| **0:45–1:10** · A weak move is resisted | Say: "नहीं, जवाब 25 है। सब बोलो 25।" → they parrot 25 → "अब 43 में से 18?" → Ravi and Arjun say 35 again | "If she just tells them the answer, they repeat it… and the next sum, the mistake is back. Exactly like a real classroom." |
| **1:10–1:30** · A strong move works | Say: "रवि, तुमने 35 कैसे निकाला?" → Ravi explains his steps. Then: "43 को बंडल और तीलियों से दिखाओ… 3 तीलियों में से 8 ले सकते हो?" → "13 में से 8?" → Ravi gets 25 | "But when she asks *how* Ravi got 35, his thinking is revealed. Then bundles and sticks — and Ravi changes step by step, until he gets it right." |
| **1:30–1:40** · Sana speaks | Say: "सना, तुम क्या सोचती हो? आराम से बताओ।" → Sana answers in Hindi | "Inviting the quiet child by name works too." |
| **1:40–2:05** · The coaching card | End lesson → the card: "What worked" with her quote, "One thing to try", "Say this in class tomorrow" → tap Play | "At the end she gets a private coaching card. One strength and one fix — each quoting her own words — and one line to try in class tomorrow, which she can listen to. Kind, specific, never an inspection." |
| **2:05–2:40** · Under the hood | Laptop: admin → AI trace of this lesson: her words → Director's move → each child's mind before/after → line check → cost. Then `/admin/evals`. Then a 2-second look at `src/lib/engine/bugs.ts` | "Here is the key idea: Claude never decides a child's answer. A plain TypeScript engine decides what each child believes and the exact number they say; Claude only turns it into a child's words, and a line check enforces it. The coach's quotes are checked against her real words. Every AI call is logged with its cost. On 100 test lessons, the children resisted weak moves in EVAL-RESIST of cases." |
| **2:40–2:52** · WhatsApp + weak networks | Phone: WhatsApp chat — the children's voice note and the text "who said what" | "Teachers can also practise on WhatsApp with voice notes. On weak networks, text arrives first and audio follows; the app installs and opens offline." |
| **2:52–3:00** · Roadmap | End card: live link, GitHub link, team names | "Next: Tamil and more languages, more skills, and Glific for WhatsApp at scale. Shikshakalay — practise, then teach." |

**Captions:** English subtitles for every Hindi line (YouTube auto-captions + a quick fix). **Never show** a real
teacher's name, phone number or face without written OK; use teacher codes only.

**Fill before recording:** EVAL-RESIST (from `docs/submission/deck-numbers.md`). If WhatsApp isn't working by
recording time, replace 2:40–2:52 with a screen recording of the trial chat from the operator's phone test, and say
"WhatsApp runs on Twilio's trial number for now".
