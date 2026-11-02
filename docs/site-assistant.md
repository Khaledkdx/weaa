# مساعد الموقع (الروبوت)

روبوت صغير يعيش في زاوية الصفحات العامة، يعرف كل أقسام الموقع، ويأخذ الزائر إلى الخدمة أو النموذج أو الصفحة التي يطلبها، كتابةً أو بالصوت.

## كيف يعمل

| الطبقة | الملف | الدور |
| --- | --- | --- |
| فهرس الموقع | `frontend/src/assistantBrain.ts` → `buildSiteIndex` | يُبنى من محتوى الـ CMS وقت التشغيل: الصفحات، الخدمات (حسب الفئة)، نماذج الانضمام، فرص التقبيل، وبيانات التواصل. أي تعديل في لوحة الإدارة ينعكس بدون نشر. |
| العقل المحلي | `localAnswer` في نفس الملف | مطابقة عربية بدون أي خدمة خارجية: تطبيع الحروف والتشكيل، حذف كلمات الحشو (أبي، ودّني، لو سمحت…)، تجذير خفيف، نوايا (تحية، شكر، تواصل، مساعدة)، ثم ترتيب حسب الدرجة. يسأل بدل أن يخمّن عند التعادل، ولا ينتقل إلا عند تطابق قوي. |
| العقل البعيد | `supabase/functions/assistant/index.ts` | دالة Supabase Edge تستدعي Claude مع أداة `navigate` محصورة بمسارات الفهرس. يُستخدم تلقائياً عندما يكون المفتاح مضبوطاً؛ وإلا تعود الواجهة إلى العقل المحلي (الدالة ترد بـ 503). |
| الصوت | `frontend/src/assistantSpeech.ts` | التعرّف الحي على الكلام العربي (`ar-SA`) بواجهة المتصفح، والردود المنطوقة بصوت عربي فقط، مع تفضيل صوت خليجي إن توفر. يتوقف الاستماع أثناء نطق الرد حتى لا يسمع الروبوت نفسه. |
| الواجهة | `frontend/src/assistant.tsx` + `assistant.css` | الكرة المضيئة (دائرة بيدين وعينين) وحالاتها: تستمع، تفكر، تتحدث، تتجول على الحافة السفلية، وعيناها تتبعان المؤشر، ومزاجها مبسوط أو زعلان حسب الرد. لوحة المحادثة زجاجية، وعلى الجوال تتحول إلى شيت سفلي. ضغطة المايك تفتح شريط المحادثة الصوتية أسفل الشاشة والصفحة تبقى قابلة للاستخدام. |

الروبوت يُعرض في `main.tsx` بجانب الصفحات (لا داخل `Shell`) حتى تبقى المحادثة أثناء التنقل، ويرافق الزائر إلى صفحات النماذج (على الجوال يرتفع فوق زر الإرسال، واللوحة تنطوي بعد الانتقال حتى يظهر النموذج). لا يظهر في لوحة الإدارة.

## العربية وفهم المقصود

- الترحيب والردود الموجهة تستخدم لهجة خليجية سعودية بسيطة، مع فهم لهجات الزوار العربية الأخرى وأخطاء الكتابة الواضحة.
- المصحح المحلي يتعامل مع مفردات الموقع والأخطاء الواضحة مثل «مناذيب الداهل»، ولا يغير بيانات الناس أو أرقامهم.
- يُمرر آخر سياق محادثة للعقل المحلي أيضًا؛ بعد سؤال تسجيل المندوب يفهم الرد «الداخل» أو «الخارج». «افتحه» يرجع لآخر طلب واضح، ولا يخمن وجهة بلا سياق.
- الكلمات المتشابهة فقط لا تكفي لتنقل غير مؤكد؛ يعرض اقتراحًا أو سؤالًا محددًا. يحترم طلب عدم فتح الصفحة.
- الرد البعيد الفارغ أو الإنجليزي بالكامل على سؤال عربي، أو الذي يكرر عدم الفهم، يستبدل بمساعدة محلية تراعي السياق.
- النطق مرتبط بأصوات الجهاز؛ عند غياب صوت عربي لا يستخدم صوتًا أجنبيًا بدلًا منه. لا تعادل هذه التعديلات صوتًا مولدًا أو قدرات فهم غير محدودة.
- الردود الصوتية مفعلة افتراضيًا، مع حفظ اختيار إيقافها محليًا. يوجد زر «تجربة الصوت» لتشغيل عبارة عربية بتفاعل مباشر من الزائر. ينتظر تحميل الأصوات العربية حتى ثانيتين، ولا يكتفي بقائمة إنجليزية مبكرة. إذا لم يبدأ النطق خلال خمس ثوانٍ أو رفض المتصفح تشغيله، يعرض رسالة بدل البقاء صامتًا في حالة «يتحدث».
- تحديث توجيهات الذكاء الاصطناعي يتطلب إعادة نشر دالة `assistant`؛ تعديل الملف المحلي وحده لا ينشرها على Supabase.

## تفعيل الذكاء الاصطناعي (اختياري)

بدون مفتاح، المساعد يعمل بالعقل المحلي. لتفعيل Claude:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

```bash
supabase functions deploy assistant
```

النموذج الافتراضي `claude-opus-5-5` بجهد `low` (مناسب للمحادثة). لتغييره:

```bash
supabase secrets set ASSISTANT_MODEL=claude-haiku-5-5
```

الدالة تفعّل `fallbacks: "default"` (تحويل تلقائي لنموذج آخر إذا رفض نموذج الطلب لأسباب أمان)، وتستخدم `cache_control` على فهرس الموقع فيُقرأ من الكاش بين الطلبات المتقاربة.

كل طلب يرسل: السؤال (≤500 حرف)، آخر 8 رسائل، فهرس الموقع (≤80 عنصر)، الصفحة الحالية، وبيانات التواصل. الدالة تتحقق من أن أي مسار يعيده النموذج موجود في الفهرس، والواجهة تتحقق مرة ثانية قبل الانتقال.

## دعم المتصفحات للصوت

- التعرّف على الكلام: Chrome، Edge، Safari (iOS 14.5+). Firefox لا يدعمه، فيختفي زر المايك تلقائياً.
- الردود المنطوقة: كل المتصفحات الحديثة؛ جودة الصوت العربي تعتمد على أصوات النظام المثبتة. إن لم يوجد صوت عربي، يخبر الروبوت الزائر مرة واحدة ويُبقي الردود مكتوبة.
- يحتاج الموقع إلى HTTPS (أو localhost) ليسمح المتصفح بالمايكروفون.

### لماذا «ما يرد» بالصوت؟

الروبوت لا يبقى «يستمع» بصمت أبداً؛ كل حالة لها رسالة في المحادثة:

| ما يحدث | الرسالة | السبب والحل |
| --- | --- | --- |
| المايك محجوب | «ما قدرت أوصل للمايكروفون…» | المتصفح رفض الإذن، أو الصفحة داخل لوحة معاينة تحجب الالتقاط (مثل لوحة المتصفح في تطبيق Claude). افتح الموقع في Chrome أو Safari مباشرة واسمح بالمايك. |
| لا إنترنت لخدمة التعرّف | «ما قدرت أوصل لخدمة التعرّف على الصوت…» | Chrome يرسل الصوت لخدمة Google؛ يحتاج اتصالاً. |
| صمت طويل | «أنا معك وأسمعك…» ثم «وقفت الاستماع…» | بعد نحو 30 ثانية بلا كلام يطمئن الروبوت الزائر مرة واحدة ويواصل الاستماع؛ بعد نحو 80 ثانية يغلق المايك حتى لا يبقى مفتوحاً بلا داعٍ. |
| متصفح بلا دعم | «المتصفح هذا ما يدعم التعرّف على الصوت…» | Firefox وبعض المتصفحات المدمجة. |

الكتابة تعمل في كل الحالات، وبدون أي خدمة خارجية.

## ماذا يحتاج «العقل البعيد» للعمل في الإنتاج

الدالة تعمل على خادم Supabase، لذلك تحتاج **مفتاح API** مخزّناً في أسرار المشروع. لا نقرأ ملفات تسجيل دخول Codex الشخصية ولا نعرض تنفيذ Codex لزوار الموقع. توصي وثائق OpenAI بعدم تعريض تنفيذ Codex لبيئات عامة غير موثوقة. تشغيل المساعد للجميع على حساب صاحب الموقع يكون من خلال تكامل API على الخادم؛ أما Sign in with ChatGPT فهو مسار تسجيل رسمي منفصل لكل مستخدم حسب أهلية التطبيق والحساب، وليس إعادة استعمال جلسة المالك. الخيارات:

- Anthropic: `ANTHROPIC_API_KEY` من console.anthropic.com (الدالة الحالية جاهزة).
- OpenAI: مفتاح `OPENAI_API_KEY` من platform.openai.com، مع استبدال استدعاء النموذج في الدالة (ملف واحد).

في الحالتين، الموقع يعمل بالعقل المحلي حتى يُضبط المفتاح.

لم تُضف خدمة OpenAI جديدة ولم تُنسخ بيانات اعتماد شخصية ضمن تعديل الصوت. لا يضمن صوت المتصفح تشغيلًا على كل جهاز؛ خدمة صوت خادمية مستقلة تحتاج إعداد مزود وصلاحيات وحدود استخدام قبل إطلاقها.

المراجع الرسمية:
- https://learn.chatgpt.com/docs/auth
- https://developers.openai.com/siwc

## التعبئة بالصوت (لمن لا يقرأ ولا يكتب)

الكرة تقرأ النموذج وتكتب فيه من خلال الصفحة نفسها، بلا تعديل في ملفات النماذج: نفس الحقول والأزرار، فيعمل تحقق النموذج وإرساله كما هو.

| الطبقة | الملف | الدور |
| --- | --- | --- |
| قراءة النموذج والكتابة فيه | `frontend/src/assistantForm.ts` | `discoverFields` يجد الحقول بترتيب القراءة (نص، جوال، بريد، رقم، تاريخ، قائمة، اختيار واحد، اختيارات متعددة، مرفق) مع أسمائها وخياراتها. `writeField` يكتب كما يكتب الزائر (المُعيّن الأصلي + حدث `input`/`change` حتى يراه React). `formButtons`/`formErrors`/`formSuccess` تقرأ أزرار النموذج ورسائله، و`describePage` تقرأ الصفحة بصوت الكرة. |
| فهم الإجابة | `frontend/src/assistantFill.ts` | قواعد محلية بلا خادم: الأرقام المنطوقة («صفر خمسة واحد…»، «خمسة وعشرين»، «ألفين وثلاثين»)، التواريخ، البريد المنطوق، مطابقة الخيارات («نقل خفيف»، «الثالث»، «ما عندي رخصة» → «لا توجد رخصة»)، تنظيف النص («اسمي خالد» → «خالد»)، والأوامر: وقف، تخطي، ارجع، عيد، اقرأ، تم. |
| المحادثة | `frontend/src/assistantFillFlow.ts` | حقلاً حقلاً بلا توقف: تسأل بصوتها، تكتب، تقول «تم» وتنتقل للحقل التالي من دون إعادة قراءة ولا «صح؟». تضغط «التالي» بنفسها بين الخطوات، وفي نهاية النموذج تقرأ كل القيم مرة واحدة: «كله مظبوط؟ قل نعم وأرسل الطلب، أو قل لي أي خانة أعدّلها»، ولا تُرسل إلا بـ«نعم» صريحة. من يسمّي خانة بعد المراجعة (ومعها القيمة الجديدة في الجملة نفسها إن شاء) تُعدَّل ويُعاد قراءة النموذج مرة أخرى؛ ولو كانت الخانة في خطوة سابقة ترجع لها بزر «رجوع» ثم تتقدم بزر «التالي» إلى المراجعة من جديد. قبل كل ضغطة زر تنتظر لحظة حتى تلتقط الصفحة ما كُتب، ولا تكرر ضغطة لم تغيّر شيئاً. تقرأ أخطاء النموذج وترجع للحقل المعني. المرفقات لا تُرفع بالصوت: تشير للزر وتنتظر «تم». |

تبدأ بقول «عبّي لي النموذج» (كتابة أو صوتاً)، أو بـ«نعم» بعد عرضها لما تفتح نموذجاً في وضع الصوت. «اقرأ لي الصفحة» يقرأ أي صفحة، و«أرسل» يعرض الملخص ويطلب التأكيد.

## التنقل المباشر وبلا روابط

عقل المساعد يأخذ الزائر إلى الصفحة بدل أن يسأله «تبي أفتحها؟» أو يقرأ له عنوانها. موجّه الخادم (`assistant-server.cjs`) يطلب وضع المسار في `navigateTo` في الرد نفسه متى كان الطلب يخص صفحة من الفهرس، حتى لو فُتحت من قبل في المحادثة، ويمنع كتابة أي رابط أو مسار أو http في النص. وفي الواجهة (`assistantBrain.ts`): `plainText` يحذف العناوين والمسارات من أي رد قادم من النموذج قبل عرضه أو نطقه، والرد الذي يكتفي بعرض فتح الصفحة يتحوّل إلى التنقل نفسه اعتماداً على المطابق المحلي لكلمات الزائر.

## ذاكرة الزائر على جهازه

`frontend/src/assistantMemory.ts`: بعد إرسال ناجح تسأل الكرة «أحفظ بياناتك على هذا الجهاز؟». عند «نعم» تُحفظ القيم باسم حقولها في `localStorage` (مفتاح `weaa-assistant-profile`) على هذا الجهاز والمتصفح فقط، بلا خادم. لا تُحفظ أرقام الهوية والإقامة والجواز والحسابات والتواريخ ولا أي مستند. في الزيارة التالية ترحّب بالاسم، وتكتب القيمة المحفوظة في حقلها وتقولها بدل أن تسأل عنها («حطيت رقم الجوال من المرة الماضية: …»)، وتظهر في المراجعة الأخيرة حيث يمكن تعديلها، و«انسَ بياناتي» يمسح كل شيء.

## الاختبارات

- `frontend/src/assistantBrain.test.ts`: الفهرس، التطبيع، وأسئلة عربية حقيقية ومسارها المتوقع.
- `frontend/src/assistant.test.tsx`: فتح اللوحة، إرسال سؤال، الانتقال للصفحة، شرائح الاقتراح، وضع الصوت وشدّ الورقة، تعبئة نموذج كامل بالإجابات والتأكيد والإرسال والحفظ، والإخفاء في لوحة الإدارة.
- `frontend/src/assistantFill.test.ts` و`assistantForm.test.ts` و`assistantMemory.test.ts`: الأرقام والتواريخ والخيارات المنطوقة، قراءة النماذج والكتابة فيها، والذاكرة المحلية.
# OpenRouter server integration

The Node host now serves `/api/assistant` (Gemini 2.5 Flash Lite text) and
`/api/assistant/speech` (GPT Audio Mini, Alloy voice, 24 kHz PCM wrapped as WAV).
Speech is AI-generated, not a real team member. Gulf Arabic is requested;
accent quality needs human review. There is no fallback to device voices.

For local preview, put `OPENROUTER_API_KEY` in ignored `supabase/.env.local`.
Run Node >=20.12 with `WEAA_PREVIEW=1 PORT=3007 node server.js` after building
the frontend. Vite dev mode proxies assistant requests to port 3008.
For production, set the secret in host environment variables, never in Vite
variables or static assets. Optional server-only model overrides:
`ASSISTANT_CHAT_MODEL` and `ASSISTANT_AUDIO_MODEL`.

Limits: 64 KiB request bodies, 600-character spoken replies, concurrency 3,
12 requests/minute per socket IP, 200 requests/hour per Node process. These
reset on restart and do not coordinate across replicas. Configure a provider
spending cap and edge/shared rate limiter before public deployment. Proxies
may share a socket IP; forwarded IP headers are deliberately not trusted.
Provider errors and keys are never returned to visitors. Local text matching
remains available if the chat provider fails.

One press of the mic starts a live conversation: the robot listens, answers
aloud, and listens again until the visitor presses the mic once more, closes
the assistant, or hides the tab. Browser microphone recognition records one
sentence at a time with MediaRecorder when it is supported. The microphone
opens once per live conversation and stays open between turns, so the
browser's recording indicator stays on for the whole conversation. An adaptive
level meter (noise floor follows quiet frames; voice has to clear three times
the floor for three frames) ends a sentence after 1.2 s of silence following
speech, so nothing has to be pressed; the `خلصت كلامي` button appears only
when no level meter is available. A round with no voice ends after 9 s and the
robot listens again; it checks in once after three quiet rounds and closes the
mic after eight. Recordings stop after 25 s and have a 2.5 MB limit. Audio is
sent to `/api/assistant/transcribe` for Arabic transcription, then the complete
text goes to the chat endpoint. No audio is persisted. If the server answers
503/404 for transcription, later sentences use the browser's native
recognition, which batches partial results into a full sentence. Hidden tabs
stop recording/playback.

The assistant's body is an orb: a glowing circle with two hands and a pair of
eyes (`Orb` in `assistant.tsx`, styled in `assistant.css`). Its states
(listening, thinking, speaking, walking) and moods (`data-mood`: happy after a
greeting or a navigation, sad after an error or a reply it could not help
with, neutral again after 3.6 s) move the core, the eyes and the hands; the
hands' idle bob and gestures animate the `translate`/`rotate` properties so
poses compose with them. The aura follows the microphone level while the
server recorder meters it.

What the orb is doing is shown on its body and said on a badge beside it
(`StateBadge` in `assistant.tsx`): a thought bubble with bouncing dots while
it thinks (eyes glance up, one narrows, a hand taps the chin), a mic badge
with sonar rings rippling from the body while it listens, sound bars and a
moving mouth while it talks, and a pen while it writes into a field
(`data-doing="writing"`, raised for 1.4 s by the fill flow's `acting`
option). The mouth otherwise appears only as a smile or a frown with a mood.
In the voice bar the badge floats above the orb without its words, since the
bar already says the status; on phones, where the open panel hides the orb, a
small orb in the panel header (`.orb.is-mini`) shows the same state.

The microphone opens a voice bar at the foot of the screen, not a modal: a
pill with the orb at its start, the live caption (status, the last reply or
what is being heard, and on a form a pointer to the first field) in the
middle, and mute/end controls at its end. The page stays fully usable: the
visitor can scroll, read and fill in a form while the orb listens and answers.
`html.has-voice-bar` keeps the page's last stretch clear of the bar and hides
the call button. The orb travels between its corner seat and the bar in one
movement (a FLIP animation), so it is clearly the same orb.

A voice-initiated navigation is a short performance (about 1.8 s, WAAPI on the
orb and on a sheet, transform and clip-path only). The page becomes a sheet of
paper: a still copy of what is on screen, pinned in place, with the next page
rendered underneath as soon as the orb has hold of it. The orb flies from the
bar to the sheet's far top corner (420 ms), closes a hand on it (90 ms), lifts
the corner so the paper's back folds over it and the next page shows through
the fold (360 ms: a clip-path cuts the corner while a gradient flap grows from
it), drags the whole sheet off toward its own corner with the fold fluttering
and the sheet turning a little about the held tip (520 ms), and comes back
(380 ms). The hands and face follow the act through `data-act`/`data-side`.
Reduced motion navigates plainly. Ending the voice bar stops audio, recording,
the performance and pending navigation; the text panel remains available with
the whole conversation.
