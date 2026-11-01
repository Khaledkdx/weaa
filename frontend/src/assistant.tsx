import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Icon } from '@iconify/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCms } from './data';
import { askAssistant, defaultSuggestions, type AssistantTurn } from './assistantBrain';
import { hasArabicVoice, listen, speak, speechSupport, stopSpeaking, type Listener } from './assistantSpeech';

type Message = AssistantTurn & { id: number; suggestions?: string[] };
type PetState = 'idle' | 'listening' | 'thinking' | 'speaking';
const welcome: Message = { id: 0, role: 'assistant', text: 'أهلاً! أنا مساعد وعاء. قل لي وش تحتاج وأخذك للمكان الصحيح، كتابةً أو بالصوت.', suggestions: defaultSuggestions };
const prefersReducedMotion = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasFinePointer = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

function Robot({ eyesRef }: { eyesRef: RefObject<SVGGElement | null> }) {
  return <svg className="robot" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <line className="robot-antenna" x1="32" y1="7" x2="32" y2="15" />
    <circle className="robot-antenna-tip" cx="32" cy="5.5" r="3" />
    <rect className="robot-ear" x="7" y="28" width="5" height="11" rx="2.2" />
    <rect className="robot-ear" x="52" y="28" width="5" height="11" rx="2.2" />
    <rect className="robot-head" x="12" y="15" width="40" height="36" rx="13" />
    <rect className="robot-face" x="17" y="21" width="30" height="24" rx="9" />
    <g ref={eyesRef} className="robot-eyes"><circle cx="26" cy="32" r="3.1" /><circle cx="38" cy="32" r="3.1" /></g>
    <rect className="robot-mouth" x="27" y="39" width="10" height="2.4" rx="1.2" />
  </svg>;
}

// The site assistant: a robot that lives on the public pages and takes visitors to the service or page they ask
// for, by text or live voice. Rendered once at the router root so the conversation survives navigation.
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
  const [voiceReplies, setVoiceReplies] = useState(false);
  const [pet, setPet] = useState<PetState>('idle');
  const [offset, setOffset] = useState(0);
  const [walking, setWalking] = useState(false);
  const support = useMemo(speechSupport, []);
  const listenerRef = useRef<Listener | null>(null);
  const liveRef = useRef(false);
  const speakingRef = useRef(false);
  const busyRef = useRef(false);
  const hoverRef = useRef(false);
  const voiceRef = useRef(false);
  const messagesRef = useRef(messages);
  const sendRef = useRef<(text: string, viaVoice?: boolean) => void>(() => {});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const eyesRef = useRef<SVGGElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);
  // Focus goes back to the pet after the panel closes and the pet is displayed again (phones hide it while the panel is open).
  const restoreFocus = useRef(false);
  const silentEnds = useRef(0);
  const heardSomething = useRef(false);
  const interactedAt = useRef(0);
  const hidden = pathname.startsWith('/admin');
  // On a form page the pet sits above the full-width submit button that phones render at the bottom.
  const onForm = pathname.startsWith('/join-us/');
  messagesRef.current = messages;
  voiceRef.current = voiceReplies;

  const push = useCallback((message: Omit<Message, 'id'>) => setMessages(current => [...current, { ...message, id: nextId.current++ }]), []);

  const stopListening = useCallback(() => {
    liveRef.current = false;
    setLive(false);
    listenerRef.current?.stop();
    listenerRef.current = null;
    setInterim('');
    setPet(current => current === 'listening' ? 'idle' : current);
  }, []);

  // Recognition ends on its own after silence or errors; while live mode is on and the robot is not talking, it starts
  // again. Anything that is not plain silence stops live mode with a message: the robot never sits "listening" in vain.
  const beginListening = useCallback(function begin(): Listener | null {
    heardSomething.current = false;
    return listen({
      onInterim: text => { heardSomething.current = true; silentEnds.current = 0; setInterim(text); },
      onFinal: text => { heardSomething.current = true; silentEnds.current = 0; setInterim(''); sendRef.current(text, true); },
      onEnd: () => {
        listenerRef.current = null;
        if (!liveRef.current || speakingRef.current) return;
        if (!heardSomething.current && ++silentEnds.current >= 3) {
          stopListening();
          push({ role: 'assistant', text: 'ما سمعت صوتاً. اضغط المايك وتكلم مباشرة بعد الضغط، أو اكتب سؤالك.' });
          return;
        }
        window.setTimeout(() => { if (liveRef.current && !speakingRef.current && !listenerRef.current) listenerRef.current = begin(); }, 250);
      },
      onError: code => {
        if (code === 'no-speech' || code === 'aborted') return;
        stopListening();
        const text = code === 'network' ? 'ما قدرت أوصل لخدمة التعرّف على الصوت. تأكد من اتصال الإنترنت وجرّب مرة ثانية، أو اكتب سؤالك.'
          : code === 'not-allowed' || code === 'service-not-allowed' || code === 'audio-capture' ? 'ما قدرت أوصل للمايكروفون. اسمح للمتصفح باستخدامه ثم اضغط المايك مرة ثانية.'
          : 'تعذّر الاستماع الآن. اكتب سؤالك وأنا أجاوبك.';
        push({ role: 'assistant', text });
      },
    });
  }, [push, stopListening]);

  const startListening = useCallback(() => {
    liveRef.current = true;
    silentEnds.current = 0;
    setLive(true);
    setPet('listening');
    listenerRef.current = beginListening();
    if (!listenerRef.current) { liveRef.current = false; setLive(false); setPet('idle'); push({ role: 'assistant', text: 'المتصفح هذا ما يدعم التعرّف على الصوت. اكتب سؤالك وأنا أجاوبك.' }); }
  }, [beginListening, push]);

  // Spoken replies need an Arabic voice on the device; without one the visitor is told once and the text stays here.
  const enableVoiceReplies = useCallback((enabled: boolean) => {
    setVoiceReplies(enabled);
    if (!enabled) { stopSpeaking(); return; }
    void hasArabicVoice().then(found => { if (!found) push({ role: 'assistant', text: 'ما لقيت صوتاً عربياً مثبتاً على هذا الجهاز، فقد يكون النطق غير واضح. الردود تبقى مكتوبة هنا.' }); });
  }, [push]);

  // The listener pauses while the robot talks so it never transcribes its own voice.
  const say = useCallback((text: string) => {
    speakingRef.current = true;
    setPet('speaking');
    listenerRef.current?.stop();
    listenerRef.current = null;
    const resume = () => {
      speakingRef.current = false;
      if (liveRef.current) { setPet('listening'); if (!listenerRef.current) listenerRef.current = beginListening(); }
      else setPet('idle');
    };
    void speak(text, resume).then(started => { if (!started) resume(); });
  }, [beginListening]);

  const send = useCallback(async (text: string, viaVoice = false) => {
    const query = text.trim();
    if (!query || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setDraft('');
    setInterim('');
    setPet('thinking');
    const history = messagesRef.current.map(({ role, text: content }) => ({ role, text: content }));
    push({ role: 'user', text: query });
    const reply = await askAssistant(query, history, cms, pathname);
    push({ role: 'assistant', text: reply.text, suggestions: reply.suggestions });
    busyRef.current = false;
    setBusy(false);
    if (reply.navigateTo && reply.navigateTo !== pathname) {
      navigate(reply.navigateTo);
      // On a phone the panel is a full sheet; once the reply has had time to be read it steps aside to show the destination.
      // A voice exchange, or any tap or keystroke in the panel meanwhile, keeps it open.
      if (typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 700px)').matches && !viaVoice && !voiceRef.current && !liveRef.current) {
        const navigatedAt = Date.now();
        window.setTimeout(() => { if (!liveRef.current && !speakingRef.current && interactedAt.current < navigatedAt) setOpen(false); }, 4000);
      }
    }
    if (viaVoice || voiceRef.current) say(reply.text);
    else setPet(liveRef.current ? 'listening' : 'idle');
  }, [cms, navigate, pathname, push, say]);
  sendRef.current = send;

  useEffect(() => {
    if (open) { setOffset(0); inputRef.current?.focus(); return; }
    stopListening();
    stopSpeaking();
    speakingRef.current = false;
    setPet('idle');
    if (restoreFocus.current) { restoreFocus.current = false; buttonRef.current?.focus(); }
  }, [open, stopListening]);
  useEffect(() => { if (hidden) { setOpen(false); stopListening(); stopSpeaking(); } }, [hidden, stopListening]);
  useEffect(() => () => { listenerRef.current?.stop(); stopSpeaking(); }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { restoreFocus.current = true; setOpen(false); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  useEffect(() => { logRef.current?.scrollTo?.({ top: logRef.current.scrollHeight }); }, [messages, interim, busy]);

  // The pet wanders along the bottom edge now and then while the panel is closed, never while the visitor is on it.
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

  // Eyes follow the pointer: a direct style write on the eye group, one frame at a time.
  useEffect(() => {
    if (hidden || prefersReducedMotion() || !hasFinePointer()) return;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const button = buttonRef.current, eyes = eyesRef.current;
        if (!button || !eyes) return;
        const rect = button.getBoundingClientRect();
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
  const status = busy ? 'يفكر…' : pet === 'speaking' ? 'يتحدث…' : live ? 'يستمع…' : 'جاهز للمساعدة';
  return <div className={`assistant${open ? ' is-open' : ''}${onForm ? ' on-form' : ''}`}>
    <section id="site-assistant" className="assistant-panel" role="dialog" aria-label="مساعد وعاء" hidden={!open} onPointerDownCapture={() => { interactedAt.current = Date.now(); }} onKeyDownCapture={() => { interactedAt.current = Date.now(); }}>
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
        {support.listen && <button type="button" className={live ? 'assistant-mic is-live' : 'assistant-mic'} aria-pressed={live} aria-label={live ? 'إيقاف الاستماع' : 'تحدث'} onClick={() => live ? stopListening() : startListening()}><Icon icon="solar:microphone-linear" /></button>}
        <input ref={inputRef} value={draft} onChange={event => setDraft(event.target.value)} placeholder={live ? 'أسمعك…' : 'اكتب أو تحدث…'} aria-label="اسأل مساعد وعاء" autoComplete="off" enterKeyHint="send" />
        <button type="submit" className="assistant-send" aria-label="إرسال" disabled={!draft.trim() || busy}><Icon icon="solar:arrow-left-linear" /></button>
      </form>
      {support.speak && <label className="assistant-voice"><input type="checkbox" checked={voiceReplies} onChange={event => enableVoiceReplies(event.target.checked)} /> ردود صوتية</label>}
    </section>
    <div className={walking ? 'pet is-walking' : 'pet'} data-state={pet} style={{ transform: `translateX(${offset}px)` }} onPointerEnter={() => { hoverRef.current = true; }} onPointerLeave={() => { hoverRef.current = false; }}>
      <button ref={buttonRef} type="button" className="pet-button" aria-label={open ? 'إغلاق مساعد وعاء' : 'مساعد وعاء'} aria-expanded={open} aria-controls="site-assistant" onClick={() => setOpen(current => !current)}><Robot eyesRef={eyesRef} /></button>
      {!open && <span className="pet-hint" aria-hidden="true">اسألني</span>}
    </div>
  </div>;
}
