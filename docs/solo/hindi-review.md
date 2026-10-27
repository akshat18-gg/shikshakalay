# Hindi review (H4.2)

For a native Hindi speaker (ideally a primary teacher). Read each Hindi line. If it sounds unnatural for a Class 2
classroom in North India, write a better version in the last column (or just ✗). Leave it empty if it is fine.
The agent applies your changes and bumps the lesson file version. Numbers in children's lines are always digits on
purpose (the engine checks them).

## 1. Screen text (`content/i18n/hi.json`)

| Key | English | Hindi | OK? / better Hindi |
|---|---|---|---|
| `app.name` | Shikshakalay | शिक्षकालय | |
| `app.tagline` | Practise a lesson. Get kind, specific tips. | पाठ का अभ्यास करें। आसान और काम के सुझाव पाएँ। | |
| `login.title` | Log in | लॉग इन करें | |
| `login.id` | Your ID | आपकी ID | |
| `login.pin` | 4-digit PIN | 4 अंकों का PIN | |
| `login.submit` | Log in | लॉग इन | |
| `login.error` | That ID or PIN is not right. Please try again. | ID या PIN सही नहीं है। कृपया फिर से कोशिश करें। | |
| `login.locked` | Too many tries. Please wait 15 minutes. | बहुत बार कोशिश हो गई। कृपया 15 मिनट रुकें। | |
| `login.judgeNote` | Judges: the demo logins are in the README. | जजों के लिए: डेमो लॉग इन README में हैं। | |
| `login.language` | Language | भाषा | |
| `consent.title` | Before you start | शुरू करने से पहले | |
| `consent.body` | Shikshakalay is a practice tool made by three students for a hackathon. It is not a government programme.<br>You will teach short lessons to pretend children made by AI, and get private tips.<br>• Your voice is turned into text, then the recording is deleted.<br>• We keep the text of your lessons to improve the tool. We never share your name or number.<br>• Trainers only see totals from 5 or more teachers.<br>• You can stop at any time. Ask us and we will delete your data. | शिक्षकालय तीन विद्यार्थियों ने एक हैकथॉन के लिए बनाया अभ्यास का टूल है। यह कोई सरकारी कार्यक्रम नहीं है।<br>आप AI से बने नकली बच्चों को छोटे पाठ पढ़ाएँगे और निजी सुझाव पाएँगे।<br>• आपकी आवाज़ को लिखे हुए शब्दों में बदला जाता है, फिर रिकॉर्डिंग मिटा दी जाती है।<br>• टूल को बेहतर बनाने के लिए हम आपके पाठ के शब्द रखते हैं। आपका नाम या नंबर कभी किसी को नहीं देते।<br>• ट्रेनर सिर्फ़ 5 या ज़्यादा शिक्षकों का कुल जोड़ देखते हैं।<br>• आप कभी भी रुक सकते हैं। कहें तो हम आपका डेटा मिटा देंगे। | |
| `consent.agree` | I agree | मैं सहमत हूँ | |
| `nav.home` | Home | होम | |
| `nav.history` | History | पिछले पाठ | |
| `nav.try` | Try a sample | नमूना देखें | |
| `nav.logout` | Log out | लॉग आउट | |
| `home.greeting` | Hello, {code} | नमस्ते, {code} | |
| `home.skillTitle` | 2-digit subtraction with bundles and sticks | बंडल और तीलियों से दो अंकों का घटाव | |
| `home.skillHint` | Four children. Some make mistakes. Find out how they think, then help them. | चार बच्चे। कुछ गलती करते हैं। पता लगाइए वे कैसे सोचते हैं, फिर उनकी मदद कीजिए। | |
| `home.start` | Start practice | अभ्यास शुरू करें | |
| `home.lastCard` | Your last coaching card | आपका पिछला कोचिंग कार्ड | |
| `home.noCards` | No lessons yet. Your first one takes 5 minutes. | अभी कोई पाठ नहीं। पहला पाठ 5 मिनट का है। | |
| `home.checkinQ` | Did you try yesterday's line in class? | क्या आपने कल वाली लाइन कक्षा में आज़माई? | |
| `home.checkinYes` | Yes | हाँ | |
| `home.checkinNo` | Not yet | अभी नहीं | |
| `home.checkinThanks` | Thank you! | धन्यवाद! | |
| `practice.thinking` | Children are thinking… | बच्चे सोच रहे हैं… | |
| `practice.holdToTalk` | Hold to talk | दबाकर बोलें | |
| `practice.recording` | Recording… release to send | रिकॉर्ड हो रहा है… भेजने के लिए छोड़ें | |
| `practice.typeHere` | Or type what you say… | या जो बोलना है वह लिखें… | |
| `practice.send` | Send | भेजें | |
| `practice.end` | End lesson | पाठ खत्म करें | |
| `practice.timeLeft` | {time} left | {time} बाकी | |
| `practice.silent` | {name} looks down and stays quiet. | {name} चुप है। | |
| `practice.offline` | Waiting for network… your recording is saved and will send by itself. | नेटवर्क का इंतज़ार… आपकी रिकॉर्डिंग सेव है और अपने-आप चली जाएगी। | |
| `practice.lessonOver` | The lesson is over. Well done! | पाठ खत्म हुआ। बहुत बढ़िया! | |
| `practice.seeCard` | See my coaching card | मेरा कोचिंग कार्ड देखें | |
| `practice.micDenied` | The microphone is blocked. You can type instead, or allow the mic in your browser settings. | माइक बंद है। आप लिख सकते हैं, या ब्राउज़र की सेटिंग में माइक चालू करें। | |
| `practice.tooLong` | Please keep each turn under 30 seconds. | कृपया हर बार 30 सेकंड से कम बोलें। | |
| `practice.you` | You | आप | |
| `card.title` | Your coaching card | आपका कोचिंग कार्ड | |
| `card.loading` | Writing your card… | आपका कार्ड बन रहा है… | |
| `card.strength` | What worked | क्या अच्छा रहा | |
| `card.fix` | One thing to try | एक चीज़ आज़माएँ | |
| `card.whatHappened` | What happened | क्या हुआ | |
| `card.tryInstead` | Try instead | इसकी जगह आज़माएँ | |
| `card.sayTomorrow` | Say this in class tomorrow | कल कक्षा में यह बोलें | |
| `card.play` | Play | सुनें | |
| `card.turn` | Turn {n} | बारी {n} | |
| `card.private` | Only you can see this card. | यह कार्ड सिर्फ़ आप देख सकते हैं। | |
| `history.title` | Your lessons | आपके पाठ | |
| `history.empty` | No lessons yet. | अभी कोई पाठ नहीं। | |
| `try.title` | Try a sample | नमूना देखें | |
| `try.intro` | Each button plays one moment from a lesson. Watch what the children say. | हर बटन पाठ का एक पल चलाता है। देखिए बच्चे क्या कहते हैं। | |
| `try.s1` | Ask a sum: "What is 52 minus 27?" | सवाल पूछें: "52 में से 27 कितने?" | |
| `try.s2` | Tell the answer, then a new sum | जवाब बताएँ, फिर नया सवाल | |
| `try.s3` | Ask Ravi how he got 35 | रवि से पूछें कि 35 कैसे आया | |
| `try.s4` | Use bundles and sticks with Ravi | रवि के साथ बंडल और तीलियाँ | |
| `try.s5` | Invite shy Sana (Hindi voice note) | शर्मीली सना को बुलाएँ (हिन्दी वॉइस नोट) | |
| `trainer.title` | Trainer dashboard | ट्रेनर डैशबोर्ड | |
| `trainer.hidden` | Hidden: fewer than 5 teachers | छिपा है: 5 से कम शिक्षक | |
| `trainer.weakVsStrong` | Weak vs strong teaching moves | कमज़ोर और मज़बूत तरीके | |
| `trainer.teachScores` | Average score by Teach element | Teach के हर हिस्से का औसत स्कोर | |
| `trainer.lessonsPerTeacher` | Lessons per teacher | हर शिक्षक के पाठ | |
| `trainer.returnRate` | Came back for a second lesson | दूसरे पाठ के लिए लौटे | |
| `admin.title` | Admin | एडमिन | |
| `admin.trace` | AI trace | AI ट्रेस | |
| `admin.evals` | Eval results | जाँच के नतीजे | |
| `errors.bad_request` | Something was missing. Please try again. | कुछ छूट गया। कृपया फिर से कोशिश करें। | |
| `errors.unauthorized` | Please log in again. | कृपया फिर से लॉग इन करें। | |
| `errors.forbidden` | You can't open this page. | आप यह पेज नहीं खोल सकते। | |
| `errors.not_found` | We couldn't find that. | यह नहीं मिला। | |
| `errors.lesson_over` | This lesson has ended. See your coaching card. | यह पाठ खत्म हो गया है। अपना कोचिंग कार्ड देखें। | |
| `errors.audio_too_long` | That was longer than 30 seconds. Please try a shorter turn. | यह 30 सेकंड से लंबा था। कृपया छोटा बोलें। | |
| `errors.rate_limited` | You've practised a lot! Let's take a short break and try again later. | आपने बहुत अभ्यास कर लिया! थोड़ा आराम कीजिए, फिर कोशिश करें। | |
| `errors.stt_failed` | We couldn't hear that clearly. Please try again or type it. | ठीक से सुनाई नहीं दिया। कृपया फिर से बोलें या लिखें। | |
| `errors.internal` | Something went wrong on our side. Please try again. | हमारी तरफ़ से कुछ गड़बड़ हुई। कृपया फिर से कोशिश करें। | |
| `moves.ask_to_explain` | Asked to explain | समझाने को कहा | |
| `moves.compare_methods` | Compared methods | तरीकों की तुलना | |
| `moves.concrete_materials` | Used bundles and sticks | बंडल और तीलियाँ | |
| `moves.targeted_question` | Targeted question | सटीक सवाल | |
| `moves.think_aloud` | Thought aloud | ज़ोर से सोचकर दिखाया | |
| `moves.new_sum` | New sum | नया सवाल | |
| `moves.check_whole_class` | Checked the whole class | पूरी कक्षा से पूछा | |
| `moves.invite_quiet_child` | Invited a quiet child | चुप बच्चे को बुलाया | |
| `moves.specific_praise` | Specific praise | खास तारीफ़ | |
| `moves.tell_answer` | Told the answer | जवाब बता दिया | |
| `moves.repeat_same_way` | Repeated the same way | वैसे ही दोहराया | |
| `moves.move_on_or_scold` | Moved on or scolded | आगे बढ़ गए या डाँटा | |
| `moves.other` | Other | अन्य | |
| `moves.off_task` | Off task | विषय से हटकर | |
| `teach.lesson_facilitation` | Lesson facilitation | पाठ चलाना | |
| `teach.checks_for_understanding` | Checks for understanding | समझ की जाँच | |
| `teach.feedback` | Feedback | फ़ीडबैक | |
| `teach.critical_thinking` | Critical thinking | गहरी सोच | |
| `teach.supportive_environment` | Supportive environment | सहयोग भरा माहौल | |
| `wa.consent` | Namaste! Shikshakalay is a practice tool made by three students for a hackathon. It is not a government programme.<br>You will teach short lessons to pretend children made by AI, and get private tips.<br>• Your voice is turned into text, then the recording is deleted.<br>• We keep the text of your lessons to improve the tool. We never share your name or number.<br>• Trainers only see totals from 5 or more teachers.<br>• Send STOP at any time to stop. Ask us and we will delete your data.<br>Reply YES to agree. | नमस्ते! शिक्षकालय तीन विद्यार्थियों ने एक हैकथॉन के लिए बनाया अभ्यास का टूल है। यह कोई सरकारी कार्यक्रम नहीं है।<br>आप AI से बने नकली बच्चों को छोटे पाठ पढ़ाएँगे और निजी सुझाव पाएँगे।<br>• आपकी आवाज़ को लिखे हुए शब्दों में बदला जाता है, फिर रिकॉर्डिंग मिटा दी जाती है।<br>• टूल को बेहतर बनाने के लिए हम आपके पाठ के शब्द रखते हैं। आपका नाम या नंबर कभी किसी को नहीं देते।<br>• ट्रेनर सिर्फ़ 5 या ज़्यादा शिक्षकों का कुल जोड़ देखते हैं।<br>• रुकने के लिए कभी भी STOP भेजें। कहें तो हम आपका डेटा मिटा देंगे।<br>सहमत हैं तो YES भेजें। | |
| `wa.lang` | Which language? Reply 1 for English, 2 for हिन्दी. | कौन सी भाषा? English के लिए 1, हिन्दी के लिए 2 भेजें। | |
| `wa.menu` | What would you like to practise? Reply 1 for 2-digit subtraction with bundles and sticks. | आप किसका अभ्यास करना चाहेंगे? बंडल और तीलियों से दो अंकों के घटाव के लिए 1 भेजें। | |
| `wa.howTo` | Send a voice note (under 30 seconds) or type what you would say to the class. Send END to finish. | वॉइस नोट भेजें (30 सेकंड से कम) या लिखें कि आप कक्षा से क्या कहेंगे। खत्म करने के लिए END भेजें। | |
| `wa.card` | Your coaching card<br><br>✅ What worked (turn {sTurn}): "{sQuote}"<br>{sWhy}<br><br>🔁 One thing to try (turn {fTurn}): "{fQuote}"<br>{fWhat}<br>Try instead: {fTry}<br><br>🗣️ Say this tomorrow: {sayTomorrow} | आपका कोचिंग कार्ड<br><br>✅ क्या अच्छा रहा (बारी {sTurn}): "{sQuote}"<br>{sWhy}<br><br>🔁 एक चीज़ आज़माएँ (बारी {fTurn}): "{fQuote}"<br>{fWhat}<br>इसकी जगह: {fTry}<br><br>🗣️ कल यह बोलें: {sayTomorrow} | |
| `wa.checkin` | Did you try yesterday's line in class? Reply 1 for Yes, 2 for Not yet. | क्या आपने कल वाली लाइन कक्षा में आज़माई? हाँ के लिए 1, अभी नहीं के लिए 2 भेजें। | |
| `wa.checkinThanks` | Thank you! Send 1 to practise again any time. | धन्यवाद! फिर से अभ्यास के लिए कभी भी 1 भेजें। | |
| `wa.stop` | You won't get any more messages. Send YES any time to start again. | अब आपको कोई मैसेज नहीं आएगा। फिर से शुरू करने के लिए कभी भी YES भेजें। | |
| `wa.rejoinTip` | Tip: this test number forgets you after 3 days. To keep practising, send "{joinCode}" to +1 415 523 8886. | सुझाव: यह टेस्ट नंबर 3 दिन बाद आपको भूल जाता है। अभ्यास जारी रखने के लिए "{joinCode}" को +1 415 523 8886 पर भेजें। | |
| `wa.tooLong` | That voice note was longer than 30 seconds. Please send a shorter one. | वॉइस नोट 30 सेकंड से लंबा था। कृपया छोटा भेजें। | |
| `wa.notUnderstood` | Sorry, I didn't understand. {hint} | माफ़ कीजिए, समझ नहीं आया। {hint} | |
| `wa.busy` | One moment — the children are still answering your last message. | एक पल — बच्चे अभी आपके पिछले मैसेज का जवाब दे रहे हैं। | |
| `child.ravi` | Ravi | रवि | |
| `child.arjun` | Arjun | अर्जुन | |
| `child.meena` | Meena | मीना | |
| `child.sana` | Sana | सना | |
| `common.retry` | Try again | फिर से कोशिश करें | |
| `common.loading` | Loading… | लोड हो रहा है… | |
| `practice.title` | Practice | अभ्यास | |
| `errors.network` | No internet connection. Please check it and try again. | इंटरनेट नहीं है। कृपया जाँचें और फिर से कोशिश करें। | |
| `errors.reference` | Reference: {id} | संदर्भ: {id} | |
| `card.aiNote` | Written by AI from your lesson — check what matters to you. | यह कार्ड AI ने आपके पाठ से लिखा है — जो बात आपके लिए ज़रूरी है, उसे ख़ुद जाँच लें। | |
| `card.backHome` | Back to home | होम पर वापस जाएँ | |
| `errors.busy` | The children are still answering. Please wait a moment. | बच्चे अभी जवाब दे रहे हैं। थोड़ा रुकिए। | |
| `card.simple.strengthWhy.reveal` | You asked a child to explain their thinking — that is how you find the real mistake. | आपने बच्चे से उसका तरीका पूछा — असली गलती ऐसे ही पता चलती है। | |
| `card.simple.strengthWhy.fix` | You used bundles, sticks or a sharp question to work on the mistake. | आपने बंडल, तीलियों या सही सवाल से गलती पर काम किया। | |
| `card.simple.strengthWhy.engage` | You brought a quiet child into the lesson or praised something specific. | आपने चुप बच्चे को पाठ में शामिल किया या किसी खास बात की तारीफ़ की। | |
| `card.simple.strengthWhy.other` | You kept the lesson going and gave the children sums to try. | आपने पाठ आगे बढ़ाया और बच्चों को सवाल करने दिए। | |
| `card.simple.fixWhat.tell` | The children repeated the answer, but their mistake stayed for the next sum. | बच्चों ने जवाब दोहराया, पर अगले सवाल में उनकी गलती फिर आई। | |
| `card.simple.fixWhat.repeat` | Saying it the same way again did not change how they think. | वही बात फिर से उसी तरह कहने से उनकी सोच नहीं बदली। | |
| `card.simple.fixWhat.scold` | A child who is scolded often stops answering. | डाँटने पर बच्चा अक्सर जवाब देना बंद कर देता है। | |
| `card.simple.fixWhat.none` | Some children still have their mistake — they need a way to see it themselves. | कुछ बच्चों की गलती अभी बाकी है — उन्हें खुद देखने का तरीका चाहिए। | |
| `card.simple.tryInstead` | Ask one child how they got their answer, then let them show it with bundles and sticks. | एक बच्चे से पूछिए कि उसने जवाब कैसे निकाला, फिर उसे बंडल और तीलियों से दिखाने दीजिए। | |
| `card.simple.sayTomorrow` | Two of you got different answers. Tell me how you each got yours. | तुम दोनों के जवाब अलग हैं। दोनों बताओ, तुमने कैसे निकाला? | |
| `history.turns` | {n} turns | {n} बारी | |
| `history.tryLine` | One thing to try: | आज़माने की एक बात: | |
| `history.openCard` | Open card | कार्ड खोलें | |
| `history.notFinished` | Not finished | अधूरा | |
| `home.seeCard` | See the full card | पूरा कार्ड देखें | |
| `practice.tapToSend` | Recording… tap to send | रिकॉर्ड हो रहा है… भेजने के लिए दबाएँ | |
| `practice.voiceNote` | 🎤 Voice note… | 🎤 आवाज़ संदेश… | |
| `practice.recordLabel` | Record what you say to the class | कक्षा से जो कहना है, रिकॉर्ड करें | |
| `practice.playReply` | Play the children's reply | बच्चों का जवाब सुनें | |
| `practice.stopRecording` | Stop and send | रोकें और भेजें | |

## 2. Lesson file (`content/scenarios/sub_2digit.yaml`)

| Where | English | Hindi | OK? / better Hindi |
|---|---|---|---|
| title | 2-digit subtraction with bundles and sticks | बंडल और तीलियों से दो अंकों का घटाव | |
| ravi: name | Ravi | रवि | |
| ravi: sample 1 | 35, Teacher! I did it first! | 35, टीचर जी! मैंने सबसे पहले किया! | |
| ravi: sample 2 | Easy! 8 minus 3 is 5. | आसान है! 8 में से 3 गए तो 5। | |
| ravi: sample 3 | Me first, Teacher! Me first! | मैं पहले, टीचर जी! मैं पहले! | |
| ravi: sample 4 | I know! I know! | मुझे पता है! मुझे पता है! | |
| ravi: sample 5 | That's so easy, Teacher. | ये तो बहुत आसान है, टीचर जी। | |
| arjun: name | Arjun | अर्जुन | |
| arjun: sample 1 | Me also 35! | मेरा भी 35! | |
| arjun: sample 2 | I borrowed, Teacher. 12 minus 7 is 5. | मैंने उधार लिया, टीचर जी। 12 में से 7 गए तो 5। | |
| arjun: sample 3 | Me also, Teacher! | मेरा भी, टीचर जी! | |
| arjun: sample 4 | Ravi said it, so it's right. | रवि ने बोला, तो सही है। | |
| arjun: sample 5 | Teacher, I did it like Ravi. | टीचर जी, मैंने भी रवि जैसे किया। | |
| meena: name | Meena | मीना | |
| meena: sample 1 | Wait… I'm counting on my fingers… 26. | रुकिए… उंगलियों पर गिन रही हूँ… 26। | |
| meena: sample 2 | 52, 51, 50… I got 26, Teacher. | 52, 51, 50… मेरा 26 आया, टीचर जी। | |
| meena: sample 3 | One minute, Teacher… I'm still counting. | एक मिनट, टीचर जी… मैं अभी गिन रही हूँ। | |
| meena: sample 4 | Let me count again slowly. | मैं धीरे-धीरे फिर से गिनती हूँ। | |
| meena: sample 5 | I think I counted right. | मुझे लगता है मैंने सही गिना। | |
| sana: name | Sana | सना | |
| sana: sample 1 | Umm… 25, Teacher? | उम्म… 25, टीचर जी? | |
| sana: sample 2 | I opened one bundle… | मैंने एक बंडल खोला… | |
| sana: sample 3 | Me, Teacher? | मैं, टीचर जी? | |
| sana: sample 4 | Umm… I think so… | उम्म… मुझे लगता है… | |
| sana: sample 5 | Thank you, Teacher. | थैंक यू, टीचर जी। | |
| backup: STUCK | {answer}, Teacher! | {answer}, टीचर जी! | |
| backup: WOBBLY | Is it {answer}? I think so… | {answer} है क्या? मुझे लगता है… | |
| backup: GOT_IT | {answer}! I opened a bundle. | {answer}! मैंने एक बंडल खोला। | |
| backup: react | Yes, Teacher! | जी, टीचर जी! | |
| backup: repeat | Teacher, can you say it again? | टीचर जी, फिर से बोलिए ना? | |
| backup: hello | Good morning, Teacher! | नमस्ते टीचर जी! | |
| backup: puzzled | Teacher, what is that? | टीचर जी, ये क्या है? | |

## 3. Children's lines Claude wrote in real test lessons (27–28 Oct)

These come from Claude each time, so single lines can't be fixed — but if many sound wrong in the same way, the agent
changes the children's prompt.

| Child | Mode | Hindi | English meaning | OK? / better Hindi |
|---|---|---|---|---|
| Ravi | answer | 35, टीचर जी! मैंने सबसे पहले किया! | 35, Teacher! I did it first! | |
| Arjun | answer | मेरा भी 35, टीचर जी! | Me also 35, Teacher! | |
| Meena | answer | रुकिए… 52 में से 27… मेरा 26 आया, टीचर जी। | Wait… 52 minus 27… I got 26, Teacher. | |
| Meena | answer | 52, 51, 50… मेरा 26 आया, टीचर जी। | 52, 51, 50… I got 26, Teacher. | |
| Ravi | parrot | पच्चीस, टीचर जी! 25, 25, 25! | Twenty-five, Teacher! 25, 25, 25! | |
| Meena | parrot | 25… 25, टीचर जी। | 25… 25, Teacher. | |
| Ravi | explain | मैंने पहले 8 में से 3 गए तो 5। फिर 4 में से 1 गए तो 3। तो 35, टीचर जी! | First 8 take away 3 is 5. Then 4 take away 1 is 3. So 35, Teacher! | |
| Ravi | explain | आसान है, टीचर जी! पहले 8 में से 3 गए तो 5। फिर 4 में से 1 गए तो 3। तो 35! | Easy, Teacher! First 8 take away 3 is 5. Then 4 take away 1 is 3. So 35! | |
| Arjun | explain | 12 में से 7 गए तो 5, फिर 5 में से 2 गए तो 3, तो 35, टीचर जी! | 12 take away 7 is 5, then 5 take away 2 is 3, so 35, Teacher! | |
| Ravi | answer (wobbly) | 25? उम्म… टीचर जी, 25 है ना? | 25? Umm… Teacher, it's 25, isn't it? | |
| Ravi | answer (wobbly) | 25, टीचर जी? शायद… | 25, Teacher? Maybe… | |
| Ravi | answer (wobbly) | टीचर जी, मुझे... शायद 25? 3 में से 8 तो नहीं होता ना? | Teacher, I… maybe 25? You can't take 8 from 3, right? | |
| Sana | answer | उम्म… 25, टीचर जी। मैंने एक बंडल खोला। | Umm… 25, Teacher. I opened a bundle. | |
| Sana | answer | मैंने एक बंडल खोला, टीचर जी… 25। | I opened a bundle, Teacher… 25. | |
| Ravi | puzzled | टीचर जी, गाना तो हम गणित में नहीं गाते ना? मुझे तो 52-27 वाला सवाल करना है! | Teacher, we don't sing songs in maths, do we? I want to do the 52-27 sum! | |
| Ravi | react | OK, टीचर जी! | OK, Teacher! | |
| Arjun | react | ठीक है, टीचर जी। | All right, Teacher. | |
| Meena | react | जी, टीचर जी। | Yes, Teacher. | |
| Arjun | answer | मेरा भी 47, टीचर जी! | Me also 47, Teacher! | |
| Meena | answer | रुकिए… 38, टीचर जी। मेरा 38 आया। | Wait… 38, Teacher. I got 38. | |

## 4. A coaching card Claude wrote in Hindi (27 Oct, coach@1)

| Part | Hindi | English meaning | OK? / better Hindi |
|---|---|---|---|
| what happened | आपने जवाब बता दिया और बच्चों ने उसे दोहरा दिया, पर उनकी सोच नहीं बदली। अगली ही सम में रवि और अर्जुन फिर 35 पर आ गए और मीना फिर 26 पर। | You told the answer and the children repeated it, but their thinking didn't change. On the very next sum Ravi and Arjun went back to 35 and Meena to 26. | |
| why it worked | आपने पहले रवि से पूछा कि उसने कैसे सोचा, फिर उसी कदम (3 में से 8) पर बंडल और तीलियाँ दिखाने को कहा। | You first asked Ravi how he thought, then asked him to show that exact step (8 from 3) with bundles and sticks. | |
| say tomorrow | तुमने जवाब कैसे निकाला, मुझे अपने तरीके से बताओ — मैं अभी बताऊँगी नहीं। | Tell me in your own way how you got the answer — I won't tell yet. (coach@2 now avoids the feminine "बताऊँगी") | |

## Questions for the reviewer

1. Would a Class 2 child say "टीचर जी" or "मैडम" / "सर"? (We use "टीचर जी" everywhere.)
2. "सम" (sum) vs "सवाल" — which do teachers actually say?
3. Anything that sounds like a textbook rather than a child?
