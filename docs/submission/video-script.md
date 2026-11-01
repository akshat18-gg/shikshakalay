# 3-minute video — script and shot list

> For: the operator (recording) · Length: **under 2:55** (judges may stop at 3:00) · Screen recording on a phone (or Chrome device mode 360×640) plus
> the laptop for the admin pages. Speak slowly; on-screen captions for every Hindi line. Record the voice-over in
> one take per section. Public on YouTube.

**Before recording:** log in as `teacher_demo` on the phone in Hindi and English (fresh lessons); have `admin_demo`
open on the laptop (incognito, zoom 110–125 %). Phone on Do Not Disturb. Close `.env.local`, Render's Environment
page, UptimeRobot and email — no keys, real teachers' PINs or phone numbers on screen (the demo PIN is fine).
WhatsApp is **Plan B** (not live): no WhatsApp chat on screen.

| Time | On screen | Voice-over (say this) |
|---|---|---|
| **0:00–0:20** · The problem | Title card: "Shikshakalay — a practice classroom for teachers". Then a still of a crowded classroom (stock, no real children's faces) | "A primary teacher in India gets almost no chance to practise *how* she responds when a child makes a mistake. The usual move — telling the right answer — feels quick, but the child's wrong idea stays. We built a safe place to practise." |
| **0:20–0:45** · Meet the class | Phone: log in → Start practice → the hello. Say (voice, Hindi): "बावन में से सत्ताईस कितना होगा?" → Ravi 35, Arjun 25, Meena 25, "Sana looks down" | "In five minutes she teaches subtraction to four AI children, by voice, in Hindi or English. Most of the class gets it right. Ravi's mistake is real and consistent: he takes the smaller digit from the bigger one. Sana is right too — but shy." |
| **0:45–1:10** · A weak move is resisted | Say: "नहीं, जवाब 25 है। सब बोलो 25।" → Ravi parrots 25 → "अब 43 में से 18?" → Ravi says 35 again | "If she just tells him the answer, he repeats it… and on the next sum, the mistake is back. Exactly like a real classroom." |
| **1:10–1:30** · A strong move works | Say: "रवि, तुमने 35 कैसे निकाला?" → Ravi explains his steps. Then: "43 को बंडल और तीलियों से दिखाओ… 3 तीलियों में से 8 ले सकते हो?" → "13 में से 8?" → Ravi gets 25 | "But when she asks *how* Ravi got 35, his thinking is revealed. Then bundles and sticks — and Ravi changes step by step, until he gets it right." |
| **1:30–1:40** · Sana speaks | Say: "सना, तुम क्या सोचती हो? आराम से बताओ।" → Sana answers in Hindi | "Inviting the quiet child by name works too." |
| **1:40–2:05** · The coaching card | End lesson → the card: "What worked" with her quote, "One thing to try", "Say this in class tomorrow" → tap Play | "At the end she gets a private coaching card. One strength and one fix — each quoting her own words — and one line to try in class tomorrow, which she can listen to. Kind, specific, never an inspection." |
| **2:05–2:40** · Under the hood | Laptop: admin → AI trace of this lesson: her words → Director's move → each child's mind before/after → line check → cost. Then `/admin/evals`. Then a 2-second look at `src/lib/engine/bugs.ts` | "Here is the key idea: Claude never decides a child's answer. A plain TypeScript engine decides what each child believes and the exact number they say; Claude only turns it into a child's words, and a line check enforces it. The coach's quotes are checked against her real words. Every AI call is logged with its cost. In all 50 test lessons with weak teaching, the children kept their mistakes." |
| **2:40–2:50** · Weak networks (Plan B) | Phone: (1) open the app once on mobile data → (2) airplane mode on → reopen it: the app shell and the last card still open, with the offline note → (3) airplane mode off → a typed turn: text arrives first, audio follows. Then 2 s of the architecture diagram's WhatsApp turn (`docs/ARCHITECTURE.md`) | "On weak networks, text arrives first and audio follows, and the app installs and opens offline. The WhatsApp voice-note door is built and tested in code; it switches on with a paid WhatsApp number." |
| **2:50–2:55** · Roadmap | End card: live link, GitHub link, team names | "Next: Tamil and more languages, more skills, and Glific for WhatsApp at scale. Shikshakalay — practise, then teach." |

**Captions:** English subtitles for every Hindi line (YouTube auto-captions + a quick fix). **Never show** a real
teacher's name, phone number or face without written OK; use teacher codes only.

**Numbers used:** children resisted weak moves in 100 % of 50 weak test lessons (`docs/submission/deck-numbers.md`).

**WhatsApp:** Plan B is final (Twilio's free trial can't receive messages). Do not show a WhatsApp chat that didn't
really happen.
