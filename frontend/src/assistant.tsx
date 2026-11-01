import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Icon } from '@iconify/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCms } from './data';
import { askAssistant, defaultSuggestions, type AssistantTurn } from './assistantBrain';
import { listen, releaseMicrophone, speak, speechSupport, stopSpeaking, type Listener, type ListenStatus, type SpeechProblem } from './assistantSpeech';
import { AssistantGuide } from './assistantGuide';

type Message = AssistantTurn & { id: number; suggestions?: string[] };
type PetState = 'idle' | 'listening' | 'thinking' | 'speaking';
type Mood = 'neutral' | 'happy' | 'sad';
// The orb's part in a voice-mode navigation: fly to the far corner of the page, take the corner, lift it so the paper
// folds back, drag the sheet off toward its own corner, and come back.
type Act = 'go' | 'grab' | 'lift' | 'pull' | 'return';
type Side = 'left' | 'right';
const welcome: Message = { id: 0, role: 'assistant', text: 'هلا والله! أنا مساعد وعاء بالذكاء الاصطناعي، وصوتي مولّد آليًا. قل لي وش تحتاج، كتابة أو بالصوت، وأدلّك على المكان المناسب.', suggestions: defaultSuggestions };
const prefersReducedMotion = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasFinePointer = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
// WAAPI cannot read custom properties, so the glass.css curves are repeated here by value.
const easeOut = 'cubic-bezier(.16, 1, .3, 1)';
const easeInOut = 'cubic-bezier(.77, 0, .175, 1)';
const wait = (ms: number) => new Promise<void>(resolve => window.setTimeout(resolve, ms));
// Where the reaching hand's centre sits relative to the orb's box, as fractions of its size (the poses are in assistant.css).
const hand: Record<Side, [number, number]> = { left: [-.285, .235], right: [1.285, .235] };
const plain = (text: string) => text.replace(/[ً-ْـ]/g, '');
// What a reply does to the orb's face and hands.
const moodOf = (text: string, navigated: boolean): Mood => {
  const words = plain(text);
  if (navigated || /اهلا|أهلا|هلا|العفو|أبشر|ابشر/.test(words)) return 'happy';
  if (/ما قدرت|تعذر|ما لقيت|ما سمعت|خارج تفاصيل|ما يدعم|منع/.test(words)) return 'sad';
  return 'neutral';
};

// The assistant's body: a glowing circle with two hands and a pair of eyes. States and moods move it from assistant.css.
function Orb({ eyesRef, auraRef }: { eyesRef: RefObject<HTMLSpanElement | null>; auraRef: RefObject<HTMLSpanElement | null> }) {
  return <>
    <span ref={auraRef} className="orb-aura" aria-hidden="true" />
    <span className="orb-core" aria-hidden="true"><span ref={eyesRef} className="orb-eyes"><span className="orb-eye is-left" /><span className="orb-eye is-right" /></span></span>
    <span className="orb-hand is-left" aria-hidden="true" />
    <span className="orb-hand is-right" aria-hidden="true" />
  </>;
}

// The site assistant: an orb that lives on the public pages and takes visitors to the service or page they ask for,
// by text or live voice. Rendered once at the router root so the conversation survives navigation.
export function SiteAssistant() {
  const { cms } = useCms();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [draft, setDraft] = useState('');
  const [interim, setInterim] = useState('');
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);
  const [listenStatus, setListenStatus] = useState<ListenStatus | 'idle'>('idle');
  const [voiceReplies, setVoiceReplies] = useState(() => { try { return localStorage.getItem('weaa-assistant-voice') !== 'off'; } catch { return true; } });
  const [pet, setPet] = useState<PetState>('idle');
  const [mood, setMood] = useState<Mood>('neutral');
  const [offset, setOffset] = useState(0);
  const [walking, setWalking] = useState(false);
  // Voice mode: the panel gives way to a bar at the foot of the screen, with the orb in it, talking and listening until
  // it is ended. The page stays usable the whole time.
  const [voiceMode, setVoiceMode] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [act, setAct] = useState<Act | null>(null);
  const [side, setSide] = useState<Side>('left');
  const voiceRef = useRef(false);
  const voiceModeRef = useRef(false);
  const conversationEpoch = useRef(0);
  const motions = useRef<Animation[]>([]);
  const sheetRef = useRef<HTMLElement | null>(null);
  const flipFrom = useRef<DOMRect | null>(null);
  const moodTimer = useRef(0);
  const support = useMemo(speechSupport, []);
  const listenerRef = useRef<Listener | null>(null);
  const liveRef = useRef(false);
  const speakingRef = useRef(false);
  const busyRef = useRef(false);
  const hoverRef = useRef(false);
  const messagesRef = useRef(messages);
  const sendRef = useRef<(text: string, viaVoice?: boolean) => void>(() => {});
  const sayRef = useRef<(text: string) => void>(() => {});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const petRef = useRef<HTMLDivElement>(null);
  const actorRef = useRef<HTMLDivElement>(null);
  const auraRef = useRef<HTMLSpanElement>(null);
  const eyesRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);
  // Focus goes back to the orb after the panel closes and the orb is displayed again (phones hide it while the panel is open).
  const restoreFocus = useRef(false);
  const silentEnds = useRef(0);
  const heardSomething = useRef(false);
  const interactedAt = useRef(0);
  const hidden = pathname.startsWith('/admin');
  // On a form page the orb sits above the full-width submit button that phones render at the bottom.
  const onForm = pathname.startsWith('/join-us/');
  messagesRef.current = messages;
  voiceRef.current = voiceReplies;

  const push = useCallback((message: Omit<Message, 'id'>) => setMessages(current => [...current, { ...message, id: nextId.current++ }]), []);

  // A mood is a moment: the face and hands return to neutral a few seconds later.
  const feel = useCallback((next: Mood) => {
    window.clearTimeout(moodTimer.current);
    setMood(next);
    if (next !== 'neutral') moodTimer.current = window.setTimeout(() => setMood('neutral'), 3600);
  }, []);

  // The aura follows the microphone level while it is metered; otherwise the stylesheet breathes it.
  const meter = useCallback((level: number | null) => {
    const aura = auraRef.current, orb = aura?.closest<HTMLElement>('.orb');
    if (!aura || !orb) return;
    if (level === null) { aura.style.transform = ''; delete orb.dataset.meter; return; }
    orb.dataset.meter = '1';
    aura.style.transform = `scale(${(.9 + level * .6).toFixed(3)})`;
  }, []);

  // Ends the orb's performance wherever it is: animations cancelled, the sheet gone, hands down.
  const settle = useCallback(() => {
    motions.current.forEach(animation => animation.cancel());
    motions.current = [];
    sheetRef.current?.remove();
    sheetRef.current = null;
    setAct(null);
    setPulling(false);
  }, []);

  // Live listening ends here and only here, so the microphone is handed back exactly when the orb stops listening.
  const stopListening = useCallback(() => {
    liveRef.current = false;
    setLive(false);
    listenerRef.current?.stop();
    listenerRef.current = null;
    releaseMicrophone();
    meter(null);
    setInterim('');
    setListenStatus('idle');
    setPet(current => !busyRef.current && !speakingRef.current ? 'idle' : current);
  }, [meter]);

  // Live mode is a loop: each sentence ends on its own after a pause, gets answered, and the orb listens again. Silence
  // never cuts it short abruptly: after a while the orb checks in once, and only a long quiet stretch closes the mic.
  // Anything that is not plain silence stops listening with a message: the orb never sits "listening" in vain.
  const beginListening = useCallback(function begin(): Listener | null {
    heardSomething.current = false;
    return listen({
      onStatus: status => {
        setListenStatus(status);
        if (status !== 'listening') meter(null);
        if (status === 'transcribing') setPet('thinking');
        else if (status !== 'opening') setPet(current => current === 'speaking' ? current : 'listening');
      },
      onLevel: meter,
      onInterim: text => { heardSomething.current = true; silentEnds.current = 0; setInterim(text); },
      onFinal: text => { heardSomething.current = true; silentEnds.current = 0; setInterim(''); listenerRef.current?.stop(); listenerRef.current = null; sendRef.current(text, true); },
      onEnd: () => {
        listenerRef.current = null;
        if (!liveRef.current || speakingRef.current || busyRef.current) return;
        if (!heardSomething.current) {
          const rounds = ++silentEnds.current;
          if (rounds >= 8) {
            stopListening();
            push({ role: 'assistant', text: 'وقفت الاستماع عشان ما يبقى المايك شغال بدون داعي. اضغط المايك لما تحتاجني.' });
            return;
          }
          if (rounds === 3) {
            const text = 'أنا معك وأسمعك. لما تكون جاهز قل لي وش تحتاج، أو اكتم المايك.';
            push({ role: 'assistant', text });
            if (voiceRef.current) { sayRef.current(text); return; }
          }
        }
        window.setTimeout(() => { if (liveRef.current && !speakingRef.current && !busyRef.current && !listenerRef.current) listenerRef.current = begin(); }, 250);
      },
      onError: code => {
        if (code === 'no-speech') { heardSomething.current = false; return; }
        if (code === 'aborted') return;
        // The server has no transcription but the browser can listen on its own: the loop carries on with that.
        if (code === 'transcription-unavailable' && speechSupport().listen) { push({ role: 'assistant', text: 'ما قدرت أحوّل كلامك عبر الخادم، فبأسمعك مباشرة من المتصفح. أعد كلامك لو سمحت.' }); return; }
        stopListening();
        feel('sad');
        const text = code === 'network' || code === 'transcription-unavailable' ? 'ما قدرت أوصل لخدمة التعرّف على الصوت. تأكد من اتصال الإنترنت وجرّب مرة ثانية، أو اكتب سؤالك.'
          : code === 'not-allowed' || code === 'service-not-allowed' || code === 'audio-capture' ? 'ما قدرت أوصل للمايكروفون. اسمح للمتصفح باستخدامه ثم اضغط المايك مرة ثانية.'
          : 'تعذّر الاستماع الآن. اكتب سؤالك وأنا أجاوبك.';
        push({ role: 'assistant', text });
      },
    });
  }, [feel, meter, push, stopListening]);

  // One press of the mic: the orb moves into the voice bar and stays live until the visitor ends it.
  const startListening = useCallback(() => {
    stopSpeaking(); speakingRef.current = false;
    listenerRef.current?.stop();
    liveRef.current = true;
    silentEnds.current = 0;
    setLive(true);
    setPet('listening');
    listenerRef.current = beginListening();
    if (!listenerRef.current) { liveRef.current = false; setLive(false); setPet('idle'); feel('sad'); push({ role: 'assistant', text: 'المتصفح هذا ما يدعم التعرّف على الصوت. اكتب سؤالك وأنا أجاوبك.' }); return; }
    if (!voiceModeRef.current) {
      flipFrom.current = petRef.current?.getBoundingClientRect() ?? null;
      setVoiceMode(true); voiceModeRef.current = true;
      feel('happy');
    }
  }, [beginListening, feel, push]);

  // Reply playback and recording never run at the same time.
  const enableVoiceReplies = useCallback((enabled: boolean) => {
    setVoiceReplies(enabled);
    voiceRef.current = enabled;
    try { localStorage.setItem('weaa-assistant-voice', enabled ? 'on' : 'off'); } catch { /* preferences are optional */ }
    if (!enabled) {
      stopSpeaking(); speakingRef.current = false;
      setPet(liveRef.current ? 'listening' : 'idle');
      if (liveRef.current && !listenerRef.current) listenerRef.current = beginListening();
    }
  }, [beginListening]);

  const speechProblem = useCallback((problem: SpeechProblem) => {
    const text = problem === 'no-arabic-voice' ? 'المتصفح ما وفّر صوت عربي. افتح الموقع في متصفح يدعم صوت عربي، أو فعّل صوت عربي من إعدادات الجهاز، ثم جرّب زر تجربة الصوت. الردود المكتوبة تشتغل كالمعتاد.'
      : problem === 'blocked' ? 'المتصفح منع تشغيل الصوت. اضغط تجربة الصوت، وتأكد إن صوت الجهاز والتبويب مو مكتوم.'
      : problem === 'unsupported' ? 'المتصفح ما يدعم الردود الصوتية. تقدر تكمل معي بالكتابة.'
      : 'تعذّر تشغيل الصوت. اضغط تجربة الصوت للمحاولة مرة ثانية.';
    feel('sad');
    push({ role: 'assistant', text });
  }, [feel, push]);

  // The listener pauses while the orb talks so it never transcribes its own voice; the hands and glow move once audio
  // plays, and when the orb falls silent in live mode it listens again by itself.
  const say = useCallback((text: string) => {
    speakingRef.current = true;
    setPet('thinking');
    listenerRef.current?.stop();
    listenerRef.current = null;
    meter(null);
    const resume = () => {
      speakingRef.current = false;
      if (!liveRef.current) { setPet('idle'); return; }
      setPet('listening');
      if (!listenerRef.current && !busyRef.current) listenerRef.current = beginListening();
    };
    let resumed = false;
    const finish = () => { if (!resumed) { resumed = true; resume(); } };
    void speak(text, finish, problem => {
      if (problem === 'no-arabic-voice' || problem === 'unsupported') {
        stopListening(); setVoiceReplies(false); voiceRef.current = false;
      }
      speechProblem(problem);
    }, () => setPet('speaking')).then(started => { if (!started) finish(); }).catch(() => { speechProblem('failed'); finish(); });
  }, [beginListening, meter, speechProblem, stopListening]);
  sayRef.current = say;

  // A voice-mode navigation is a small performance. The page becomes a sheet of paper: a still copy pinned where the page
  // is on screen, with the next page already underneath. The orb flies from the bar to the sheet's far top corner, takes
  // the corner, lifts it so the paper folds back under its hand, drags the whole sheet off toward its own corner with the
  // fold fluttering, and comes back. WAAPI on transform and clip-path; the hands and face follow the act in CSS. Reduced
  // motion, or no stage to perform on, is a plain navigation.
  const pullPageTo = useCallback(async (destination: string, epoch: number) => {
    const actor = actorRef.current, page = document.getElementById('main-content');
    if (!actor || !page || typeof actor.animate !== 'function' || prefersReducedMotion()) { navigate(destination); return; }
    const interrupted = () => epoch !== conversationEpoch.current;
    const run = (target: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      const animation = target.animate(keyframes, options);
      motions.current.push(animation);
      return animation;
    };
    // The sheet shows exactly what is on screen of the page, below the sticky header.
    const rect = page.getBoundingClientRect();
    const header = document.querySelector('.site-header')?.getBoundingClientRect();
    const top = Math.max(rect.top, header?.bottom ?? 0), bottom = Math.min(rect.bottom, window.innerHeight);
    const width = rect.width, height = Math.max(0, bottom - top);
    const homeRight = getComputedStyle(document.documentElement).direction === 'rtl';
    // The orb's seat is at the inline start; the sheet is held by the top corner on the other side and dragged back past the seat.
    const grip: Side = homeRight ? 'left' : 'right';
    const sheet = document.createElement('div');
    sheet.className = 'assistant-sheet';
    sheet.dataset.grip = grip;
    sheet.style.cssText = `left:${rect.left}px;top:${top}px;width:${width}px;height:${height}px;`;
    const clip = document.createElement('div');
    clip.className = 'assistant-sheet-clip';
    const copy = page.cloneNode(true) as HTMLElement;
    copy.removeAttribute('id'); copy.removeAttribute('tabindex');
    copy.setAttribute('aria-hidden', 'true'); copy.inert = true;
    copy.className = 'assistant-sheet-page';
    copy.style.transform = `translateY(${rect.top - top}px)`;
    clip.appendChild(copy);
    // The paper's back, folded over at the corner: a square clipped to a triangle, grown from the corner as the hand lifts it.
    const fold = Math.round(Math.min(width, height) * .42);
    const flap = document.createElement('div');
    flap.className = 'assistant-sheet-flap';
    flap.style.width = flap.style.height = `${fold}px`;
    flap.appendChild(document.createElement('i'));
    sheet.append(clip, flap);
    const seat = actor.getBoundingClientRect();
    const [hx, hy] = [hand[grip][0] * seat.width, hand[grip][1] * seat.height];
    const cornerX = grip === 'left' ? rect.left : rect.left + width;
    const liftX = grip === 'left' ? fold : -fold;
    const d1 = { x: cornerX - hx - seat.left, y: top - hy - seat.top };
    const d2 = { x: d1.x + liftX, y: d1.y + fold };
    const drag = { x: (grip === 'left' ? window.innerWidth + 60 : -60) - (cornerX + liftX), y: window.innerHeight + 60 - (top + fold) };
    const d3 = { x: d2.x + drag.x, y: d2.y + drag.y };
    const tilt = grip === 'left' ? -4 : 4;
    const uncut = grip === 'left' ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0)' : 'polygon(0 0, 100% 0, 100% 0, 100% 100%, 0 100%)';
    const cut = grip === 'left' ? `polygon(${fold}px 0, 100% 0, 100% 100%, 0 100%, 0 ${fold}px)` : `polygon(0 0, calc(100% - ${fold}px) 0, 100% ${fold}px, 100% 100%, 0 100%)`;
    const stop = () => { settle(); navigate(destination); };
    setSide(grip); setPulling(true); setAct('go');
    document.body.appendChild(sheet); sheetRef.current = sheet;
    await run(actor, [{ transform: 'translate(0, 0)' }, { transform: `translate(${d1.x}px, ${d1.y}px)` }], { duration: 420, easing: easeOut, fill: 'forwards' }).finished.catch(() => {});
    if (interrupted()) return stop();
    setAct('grab');
    sheet.classList.add('is-held');
    await wait(90);
    if (interrupted()) return stop();
    // The corner comes up and folds back under the hand; the next page is already there beneath it.
    setAct('lift');
    navigate(destination);
    const lift: KeyframeAnimationOptions = { duration: 360, easing: easeOut, fill: 'forwards' };
    run(actor, [{ transform: `translate(${d1.x}px, ${d1.y}px)` }, { transform: `translate(${d2.x}px, ${d2.y}px)` }], lift);
    run(flap, [{ transform: 'scale(0)' }, { transform: 'scale(1)' }], lift);
    await run(clip, [{ clipPath: uncut }, { clipPath: cut }], lift).finished.catch(() => {});
    if (interrupted()) return settle();
    // Then the whole sheet comes away with the hand, turning a little about the held tip and fluttering as it goes.
    setAct('pull');
    sheet.style.transformOrigin = `${grip === 'left' ? fold : width - fold}px ${fold}px`;
    flap.classList.add('is-fluttering');
    const stroke: KeyframeAnimationOptions = { duration: 520, easing: easeInOut, fill: 'forwards' };
    run(actor, [{ transform: `translate(${d2.x}px, ${d2.y}px)` }, { transform: `translate(${d3.x}px, ${d3.y}px)` }], stroke);
    await run(sheet, [
      { transform: 'translate(0, 0) rotate(0deg)' },
      { transform: `translate(${Math.round(drag.x * .5)}px, ${Math.round(drag.y * .5)}px) rotate(${tilt}deg)`, offset: .5 },
      { transform: `translate(${Math.round(drag.x)}px, ${Math.round(drag.y)}px) rotate(${tilt * 1.5}deg)` },
    ], stroke).finished.catch(() => {});
    sheet.remove(); sheetRef.current = null;
    if (interrupted()) return settle();
    setAct('return');
    await run(actor, [{ transform: `translate(${d3.x}px, ${d3.y}px)` }, { transform: 'translate(0, 0)' }], { duration: 380, easing: easeOut, fill: 'forwards' }).finished.catch(() => {});
    settle();
    feel('happy');
  }, [feel, navigate, settle]);

  const send = useCallback(async (text: string, viaVoice = false) => {
    const query = text.trim();
    if (!query || busyRef.current) return;
    busyRef.current = true;
    const epoch = conversationEpoch.current;
    listenerRef.current?.stop(); listenerRef.current = null;
    meter(null);
    setBusy(true);
    setDraft('');
    setInterim('');
    setListenStatus('idle');
    setPet('thinking');
    const history = messagesRef.current.map(({ role, text: content }) => ({ role, text: content }));
    push({ role: 'user', text: query });
    const reply = await askAssistant(query, history, cms, pathname);
    if (epoch !== conversationEpoch.current) return;
    push({ role: 'assistant', text: reply.text, suggestions: reply.suggestions });
    const destination = reply.navigateTo && reply.navigateTo !== pathname ? reply.navigateTo : undefined;
    feel(moodOf(reply.text, !!destination));
    const spoken = viaVoice || voiceRef.current;
    // The orb talks while it works: a spoken «أفتح لك…» and the page pull happen together.
    if (spoken) say(reply.text + (voiceModeRef.current && destination ? ' تقدر تبدأ من المكان المحدد قدامك.' : ''));
    if (destination) {
      if (voiceModeRef.current) await pullPageTo(destination, epoch);
      else navigate(destination);
      if (epoch !== conversationEpoch.current) return;
      // On a phone the panel is a full sheet; once the reply has had time to be read it steps aside to show the destination.
      // A voice exchange, or any tap or keystroke in the panel meanwhile, keeps it open.
      if (typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 700px)').matches && !spoken && !liveRef.current) {
        const navigatedAt = Date.now();
        window.setTimeout(() => { if (!liveRef.current && !speakingRef.current && interactedAt.current < navigatedAt) setOpen(false); }, 4000);
      }
    }
    busyRef.current = false; setBusy(false);
    // Still talking: the orb listens again on its own when it finishes.
    if (speakingRef.current) return;
    setPet(liveRef.current ? 'listening' : 'idle');
    if (liveRef.current && !listenerRef.current) listenerRef.current = beginListening();
  }, [cms, feel, meter, navigate, pathname, push, say, beginListening, pullPageTo]);
  sendRef.current = send;

  // Leaving voice mode returns to the written conversation, which kept every line of it.
  const exitVoice = useCallback(() => {
    conversationEpoch.current++;
    busyRef.current = false; setBusy(false);
    settle();
    stopListening();
    stopSpeaking(); speakingRef.current = false;
    setPet('idle');
    if (voiceModeRef.current) flipFrom.current = actorRef.current?.getBoundingClientRect() ?? null;
    setVoiceMode(false); voiceModeRef.current = false;
  }, [settle, stopListening]);

  useEffect(() => {
    if (open) { setOffset(0); inputRef.current?.focus(); return; }
    exitVoice();
    if (restoreFocus.current) { restoreFocus.current = false; buttonRef.current?.focus(); }
  }, [open, exitVoice]);
  useEffect(() => { if (hidden) { setOpen(false); stopListening(); stopSpeaking(); } }, [hidden, stopListening]);
  useEffect(() => () => { conversationEpoch.current++; listenerRef.current?.stop(); releaseMicrophone(); stopSpeaking(); motions.current.forEach(animation => animation.cancel()); sheetRef.current?.remove(); window.clearTimeout(moodTimer.current); }, []);
  // The page keeps its last stretch clear of the voice bar, and the call button steps aside (assistant.css).
  useEffect(() => {
    document.documentElement.classList.toggle('has-voice-bar', voiceMode);
    return () => document.documentElement.classList.remove('has-voice-bar');
  }, [voiceMode]);
  useEffect(() => {
    const visibility = () => { if (document.visibilityState === 'hidden') { stopListening(); stopSpeaking(); speakingRef.current = false; setPet('idle'); } };
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, [stopListening]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (voiceModeRef.current) exitVoice();
      else { restoreFocus.current = true; setOpen(false); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, exitVoice]);
  useEffect(() => { logRef.current?.scrollTo?.({ top: logRef.current.scrollHeight }); }, [messages, interim, busy]);

  // Between its seat in the corner and the voice bar the orb travels and changes size in one movement, so it is clearly
  // the same orb in both places.
  useLayoutEffect(() => {
    const target = voiceMode ? actorRef.current : petRef.current;
    const from = flipFrom.current;
    flipFrom.current = null;
    if (!from || !target || typeof target.animate !== 'function' || prefersReducedMotion()) return;
    const to = target.getBoundingClientRect();
    if (!to.height || !from.height) return;
    const dx = from.left + from.width / 2 - (to.left + to.width / 2), dy = from.top + from.height / 2 - (to.top + to.height / 2);
    const trip = target.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${(from.height / to.height).toFixed(3)})` }, { transform: 'translate(0, 0) scale(1)' }], { duration: 460, easing: easeOut });
    return () => trip.cancel();
  }, [voiceMode]);

  // The orb wanders along the bottom edge now and then while the panel is closed, never while the visitor is on it.
  useEffect(() => {
    if (open || hidden || prefersReducedMotion()) return;
    let timer = 0;
    const schedule = () => {
      timer = window.setTimeout(() => {
        if (document.visibilityState === 'visible' && !hoverRef.current) {
          setOffset(-Math.round(Math.random() * Math.min(260, window.innerWidth * .4)));
          setWalking(true);
          window.setTimeout(() => setWalking(false), 1400);
        }
        schedule();
      }, 16000 + Math.random() * 14000);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [open, hidden]);

  // Eyes follow the pointer: a direct style write on the eye group, one frame at a time, wherever the orb is.
  useEffect(() => {
    if (hidden || prefersReducedMotion() || !hasFinePointer()) return;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const eyes = eyesRef.current;
        if (!eyes) return;
        const rect = eyes.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2), dy = event.clientY - (rect.top + rect.height / 2);
        const distance = Math.hypot(dx, dy) || 1;
        const reach = Math.min(1, distance / 160) * 2.2;
        eyes.style.transform = `translate(${(dx / distance * reach).toFixed(2)}px, ${(dy / distance * reach).toFixed(2)}px)`;
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => { window.removeEventListener('pointermove', onMove); if (frame) cancelAnimationFrame(frame); };
  }, [hidden]);

  if (hidden) return null;
  const status = busy || listenStatus === 'transcribing' ? 'يفكر…' : pet === 'speaking' ? 'يتحدث…' : live ? (listenStatus === 'opening' ? 'يفتح المايك…' : 'أسمعك…') : voiceMode ? 'المايك مكتوم' : 'جاهز للمساعدة';
  const lastReply = [...messages].reverse().find(message => message.role === 'assistant')?.text;
  return <div className={`assistant${open ? ' is-open' : ''}${onForm ? ' on-form' : ''}${voiceMode ? ' is-voice' : ''}${pulling ? ' is-pulling' : ''}`}>
    <section id="site-assistant" className="assistant-panel" role="dialog" aria-label="مساعد وعاء" hidden={!open || voiceMode} onPointerDownCapture={() => { interactedAt.current = Date.now(); }} onKeyDownCapture={() => { interactedAt.current = Date.now(); }}>
      <header className="assistant-header">
        <div><strong>مساعد وعاء</strong><span>{status}</span></div>
        <button type="button" className="icon-button" aria-label="إغلاق المساعد" onClick={() => { restoreFocus.current = true; setOpen(false); }}><Icon icon="solar:close-circle-linear" /></button>
      </header>
      <div className="assistant-log" ref={logRef} aria-live="polite">
        {messages.map(message => <div key={message.id} className={`assistant-msg is-${message.role}`}>
          <p>{message.text}</p>
          {message.suggestions && message.suggestions.length > 0 && <div className="assistant-chips">{message.suggestions.map(suggestion => <button key={suggestion} type="button" onClick={() => void send(suggestion)}>{suggestion}</button>)}</div>}
        </div>)}
        {interim && <div className="assistant-msg is-user is-interim"><p>{interim}</p></div>}
        {busy && <div className="assistant-msg is-assistant is-typing" aria-label="يفكر"><p><span /><span /><span /></p></div>}
      </div>
      <form className="assistant-input" onSubmit={event => { event.preventDefault(); void send(draft); }}>
        {support.listen && <button type="button" className="assistant-mic" aria-label="تحدث" onClick={startListening}><Icon icon="solar:microphone-linear" /></button>}
        <input ref={inputRef} value={draft} onChange={event => setDraft(event.target.value)} placeholder="اكتب أو تحدث…" aria-label="اسأل مساعد وعاء" autoComplete="off" enterKeyHint="send" />
        <button type="submit" className="assistant-send" aria-label="إرسال" disabled={!draft.trim() || busy}><Icon icon="solar:arrow-left-linear" /></button>
      </form>
      {support.speak && <div className="assistant-voice"><label><input type="checkbox" checked={voiceReplies} onChange={event => enableVoiceReplies(event.target.checked)} /> ردود صوتية</label><button type="button" className="assistant-voice-test" onClick={() => { enableVoiceReplies(true); say('هلا والله، أنا مساعد وعاء. قل لي وش تحتاج وأبشر بالمساعدة.'); }}>تجربة الصوت</button></div>}
    </section>
    {voiceMode ? <section className="assistant-live" role="region" aria-label="المحادثة الصوتية">
      <div ref={actorRef} className="orb is-live" data-state={pet} data-mood={mood} data-act={act ?? undefined} data-side={side} aria-hidden="true"><Orb eyesRef={eyesRef} auraRef={auraRef} /></div>
      <div className="assistant-live-text">
        <span className="assistant-live-status" aria-live="polite">{status}</span>
        {(interim || lastReply) && <p className="assistant-live-caption">{interim || lastReply}</p>}
        {onForm && <AssistantGuide pathname={pathname} />}
      </div>
      <div className="assistant-live-controls">
        {/* Only without a level meter: everywhere else a pause ends the sentence by itself. */}
        {live && listenStatus === 'manual' && !busy && pet !== 'speaking' && <button type="button" className="assistant-live-finish" onClick={() => { listenerRef.current?.finish?.(); }}>خلصت كلامي</button>}
        <button type="button" className="assistant-live-mic" aria-pressed={!live} aria-label={live ? 'كتم المايك' : 'تشغيل المايك'} onClick={() => live ? stopListening() : startListening()}><Icon icon={live ? 'solar:microphone-linear' : 'solar:muted-linear'} /></button>
        <button type="button" className="assistant-live-end" aria-label="إنهاء المحادثة الصوتية" onClick={exitVoice}><Icon icon="solar:close-circle-linear" /></button>
      </div>
    </section>
    : <div ref={petRef} className={walking ? 'orb is-walking' : 'orb'} data-state={pet} data-mood={mood} style={{ transform: `translateX(${offset}px)` }} onPointerEnter={() => { hoverRef.current = true; }} onPointerLeave={() => { hoverRef.current = false; }}>
      <button ref={buttonRef} type="button" className="orb-button" aria-label={open ? 'إغلاق مساعد وعاء' : 'مساعد وعاء'} aria-expanded={open} aria-controls="site-assistant" onClick={() => setOpen(current => !current)}><Orb eyesRef={eyesRef} auraRef={auraRef} /></button>
      {!open && <span className="pet-hint" aria-hidden="true">اسألني</span>}
    </div>}
  </div>;
}
