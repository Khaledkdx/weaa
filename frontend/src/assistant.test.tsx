// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { CmsProvider } from './data';
import { SiteAssistant } from './assistant';
import { roadTransportPath } from './roadTransport';

vi.mock('@iconify/react', () => ({ Icon: () => null }));
// Node 25+ puts its own, unconfigured localStorage getter on globalThis and hides jsdom's: a fresh in-memory store per test.
beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, String(value)); }, removeItem: (key: string) => { store.delete(key); } });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function Location() { return <output data-testid="location">{useLocation().pathname}</output>; }
function renderAt(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><CmsProvider><SiteAssistant /><Location /></CmsProvider></MemoryRouter>);
}
// A recognizer that starts without complaint, so the mic press reaches voice mode, and can hear a sentence on demand.
class Recognition {
  static last: Recognition | null = null;
  lang = ''; continuous = false; interimResults = false;
  onresult: ((event: { resultIndex: number; results: ({ isFinal: boolean } & { transcript: string }[])[] }) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  constructor() { Recognition.last = this; }
  start() {} stop() {}
  // What the browser does when the visitor finishes a sentence: a final result, then the session ends.
  hear(transcript: string) { this.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript }], { isFinal: true })] }); this.onend?.(); }
}

describe('site assistant', () => {
  it('enables spoken replies and offers an explicit user-gesture sound test', async () => {
    const say = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('Audio', class { onended = null; onerror = null; play = say; pause = vi.fn(); load = vi.fn(); removeAttribute = vi.fn(); });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('wave', { headers: { 'Content-Type': 'audio/wav' } })));
    URL.createObjectURL = vi.fn(() => 'blob:test'); URL.revokeObjectURL = vi.fn();
    renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: 'مساعد وعاء' }));
    expect(screen.getByRole('checkbox', { name: 'ردود صوتية' })).toHaveProperty('checked', true);
    fireEvent.click(screen.getByRole('button', { name: 'تجربة الصوت' }));
    await waitFor(() => expect(say).toHaveBeenCalledOnce());
    expect(fetch).toHaveBeenCalledWith('/api/assistant/speech', expect.objectContaining({ body: expect.stringContaining('هلا والله') }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'ردود صوتية' }));
    expect(localStorage.getItem('weaa-assistant-voice')).toBe('off');
  });
  it('opens from the robot and takes the visitor where they ask', async () => {
    renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: 'مساعد وعاء' }));
    const dialog = screen.getByRole('dialog', { name: 'مساعد وعاء' });
    expect(dialog.hidden).toBe(false);
    // The header carries a small orb for phones, where the open panel hides the big one.
    expect(dialog.querySelector('.orb.is-mini')).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: 'اسأل مساعد وعاء' }), { target: { value: 'ابغى شاحنة تنقل بضاعة' } });
    fireEvent.click(screen.getByRole('button', { name: 'إرسال' }));
    await screen.findByText(/نموذج لطلب نقل بضائع/);
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe(roadTransportPath));
  });

  it('turns the mic press into a live voice conversation with mute and end controls', async () => {
    vi.stubGlobal('SpeechRecognition', Recognition);
    renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: 'مساعد وعاء' }));
    fireEvent.click(screen.getByRole('button', { name: 'تحدث' }));
    const voice = screen.getByRole('region', { name: 'المحادثة الصوتية' });
    expect(voice.querySelector('.orb.is-live')).toBeTruthy();
    expect(voice.querySelector('.orb')?.getAttribute('data-mood')).toBe('happy');
    expect(voice.textContent).toContain('أسمعك…');
    // The orb says so on its own body too: a mic badge beside it, with its rings rippling.
    expect(voice.querySelector('.orb-badge.is-listening')).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: 'مساعد وعاء' })).toBeNull();
    // Mute keeps the conversation on screen; the robot just stops listening until the mic is pressed again.
    fireEvent.click(screen.getByRole('button', { name: 'كتم المايك' }));
    expect(screen.getByRole('button', { name: 'تشغيل المايك' }).getAttribute('aria-pressed')).toBe('true');
    expect(voice.textContent).toContain('المايك مكتوم');
    fireEvent.click(screen.getByRole('button', { name: 'تشغيل المايك' }));
    expect(screen.getByRole('button', { name: 'كتم المايك' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'إنهاء المحادثة الصوتية' }));
    expect(screen.queryByRole('region', { name: 'المحادثة الصوتية' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'مساعد وعاء' })).toBeTruthy();
  });

  it('folds the page corner, carries the sheet away and comes back before a voice-mode navigation', async () => {
    vi.stubGlobal('SpeechRecognition', Recognition);
    localStorage.setItem('weaa-assistant-voice', 'off');
    const animations: { target: Element; keyframes: Keyframe[] }[] = [];
    const stage = Element.prototype as unknown as { animate?: unknown };
    stage.animate = function (this: Element, keyframes: Keyframe[]) { animations.push({ target: this, keyframes }); return { finished: Promise.resolve(), cancel: vi.fn() }; };
    try {
      render(<MemoryRouter initialEntries={['/']}><CmsProvider><div id="main-content"><p>الصفحة الحالية</p></div><SiteAssistant /><Location /></CmsProvider></MemoryRouter>);
      fireEvent.click(screen.getByRole('button', { name: 'مساعد وعاء' }));
      fireEvent.click(screen.getByRole('button', { name: 'تحدث' }));
      const actor = document.querySelector('.orb.is-live')!;
      act(() => Recognition.last!.hear('ابغى شاحنة تنقل بضاعة'));
      // The thought bubble is up while the answer is on its way.
      expect(actor.querySelector('.orb-badge.is-thinking')?.textContent).toContain('يفكر');
      await waitFor(() => expect(screen.getByTestId('location').textContent).toBe(roadTransportPath));
      // Out to the corner, the lift, the drag, and the way home. The corner is cut away as the paper's back folds over
      // it, the sheet turns a little about the held tip as it goes, and then it is gone.
      await waitFor(() => expect(animations.filter(a => a.target === actor)).toHaveLength(4));
      const cut = animations.find(a => (a.target as HTMLElement).classList.contains('assistant-sheet-clip'))!;
      expect(JSON.stringify(cut.keyframes)).toMatch(/polygon/);
      const flap = animations.find(a => (a.target as HTMLElement).classList.contains('assistant-sheet-flap'))!;
      expect(JSON.stringify(flap.keyframes)).toMatch(/scale\(1\)/);
      const sheet = animations.find(a => (a.target as HTMLElement).classList.contains('assistant-sheet'))!;
      expect(JSON.stringify(sheet.keyframes)).toMatch(/rotate\(-?6deg\)/);
      await waitFor(() => expect(actor.getAttribute('data-act')).toBeNull());
      expect(actor.getAttribute('data-mood')).toBe('happy');
      expect(document.querySelector('.assistant-sheet')).toBeNull();
      expect(document.getElementById('main-content')?.textContent).toContain('الصفحة الحالية');
    } finally { delete stage.animate; }
  });

  it('sends a suggestion chip as a question', async () => {
    renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: 'مساعد وعاء' }));
    fireEvent.click(screen.getByRole('button', { name: 'تواصل معنا' }));
    await screen.findByText(/تقدر تتصل على/);
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/contact'));
  });

  it('understands a short follow-up after asking which courier form is wanted', async () => {
    renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: 'مساعد وعاء' }));
    const ask = (text: string) => {
      fireEvent.change(screen.getByRole('textbox', { name: 'اسأل مساعد وعاء' }), { target: { value: text } });
      fireEvent.click(screen.getByRole('button', { name: 'إرسال' }));
    };
    ask('عاوز اسجل مندوب');
    await screen.findByText('تحب تسجّل كمندوب داخل المملكة ولا خارج المملكة؟');
    expect(screen.getByTestId('location').textContent).toBe('/');
    ask('الداخل');
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/join-us/courier-internal'));
  });

  it('says so when the microphone is blocked instead of listening in silence', async () => {
    class BlockedRecognition {
      lang = ''; continuous = false; interimResults = false;
      onresult: unknown = null; onend: (() => void) | null = null; onerror: ((event: { error: string }) => void) | null = null;
      start() { setTimeout(() => { this.onerror?.({ error: 'not-allowed' }); this.onend?.(); }, 0); }
      stop() {}
    }
    vi.stubGlobal('SpeechRecognition', BlockedRecognition);
    renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: 'مساعد وعاء' }));
    fireEvent.click(screen.getByRole('button', { name: 'تحدث' }));
    await waitFor(() => expect(screen.getByRole('region', { name: 'المحادثة الصوتية' }).textContent).toMatch(/ما قدرت أوصل للمايكروفون/));
    expect(screen.getByRole('button', { name: 'تشغيل المايك' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('fills a form straight through, reads it back once, changes a named field, sends on a yes and remembers the visitor on a yes', async () => {
    localStorage.setItem('weaa-assistant-voice', 'off');
    // The shapes the site's forms use, with the form's own submit handler and success message.
    function FakeForm() {
      const [sent, setSent] = useState(false);
      return <main><h1>نموذج تجريبي</h1><form onSubmit={event => { event.preventDefault(); setSent(true); }}>
        <label className="form-control"><span>الاسم *</span><input required /></label>
        <label className="form-control"><span>رقم الجوال *</span><input type="tel" required /></label>
        <label className="form-control"><span>المدينة</span><select defaultValue=""><option value="">اختر</option><option value="riyadh">الرياض</option><option value="jeddah">جدة</option></select></label>
        <div className="form-footer"><button type="submit">إرسال الطلب</button>{sent && <p role="status">تم الإرسال بنجاح</p>}</div>
      </form></main>;
    }
    render(<MemoryRouter initialEntries={['/join-us/test']}><CmsProvider><div id="main-content"><FakeForm /></div><SiteAssistant /><Location /></CmsProvider></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'مساعد وعاء' }));
    const ask = (text: string) => {
      fireEvent.change(screen.getByRole('textbox', { name: 'اسأل مساعد وعاء' }), { target: { value: text } });
      fireEvent.click(screen.getByRole('button', { name: 'إرسال' }));
    };
    const name = screen.getByLabelText(/^الاسم/) as HTMLInputElement, phone = screen.getByLabelText(/رقم الجوال/) as HTMLInputElement, city = screen.getByLabelText('المدينة') as HTMLSelectElement;
    ask('عبي لي النموذج');
    await screen.findByText(/بنعبي نموذج تجريبي سوا.*وش اسمك؟/);
    ask('اسمي خالد محمد');
    // Written and straight on to the next field: nothing read back, no «صح؟».
    await screen.findByText('تم. قل لي رقم الجوال رقم رقم.');
    expect(name.value).toBe('خالد محمد');
    // The pen shows on the orb the moment it writes.
    expect(document.querySelector('.orb .orb-badge.is-writing')?.textContent).toContain('يكتب');
    ask('صفر خمسة واحد اثنين ثلاثة أربعة خمسة ستة سبعة ثمانية');
    await screen.findByText(/^تم. المدينة: اختر من: الرياض، جدة/);
    expect(phone.value).toBe('0512345678');
    ask('جدة');
    // The one read-back, with the send folded into its yes; nothing has been sent yet.
    await screen.findByText('تم، خلصنا. راجع معي: الاسم: خالد محمد، رقم الجوال: 0512345678، المدينة: جدة. كله مظبوط؟ قل نعم وأرسل الطلب، أو قل لي أي خانة أعدّلها.');
    expect(city.value).toBe('jeddah');
    expect(document.querySelector('main [role="status"]')).toBeNull();
    // A field named after the read-back is changed, its new value in the same breath, and the form is read back again.
    ask('رقم الجوال صفر خمسة واحد واحد واحد واحد واحد واحد واحد واحد');
    await screen.findByText(/^تم. راجع معي: الاسم: خالد محمد، رقم الجوال: 0511111111، المدينة: جدة. كله مظبوط؟/);
    expect(phone.value).toBe('0511111111');
    ask('نعم');
    await screen.findByText(/أحفظ بياناتك على هذا الجهاز للمرة الجاية؟/, {}, { timeout: 3000 });
    expect(document.querySelector('main [role="status"]')?.textContent).toBe('تم الإرسال بنجاح');
    ask('نعم');
    await screen.findByText(/حفظت بياناتك على هذا الجهاز/);
    expect(JSON.parse(localStorage.getItem('weaa-assistant-profile')!)).toMatchObject({ name: 'خالد', values: { 'الاسم': 'خالد محمد', 'رقم الجوال': '0511111111' } });
  });

  it('steps back to change a field from an earlier step after the read-back, then comes forward again', async () => {
    localStorage.setItem('weaa-assistant-voice', 'off');
    // A two-step form the way the site builds them: the first step's fields leave the page on the next step.
    function FakeSteps() {
      const [step, setStep] = useState(0); const [name, setName] = useState(''); const [city, setCity] = useState(''); const [sent, setSent] = useState(false);
      return <main><h1>نموذج خطوتين</h1><form onSubmit={event => { event.preventDefault(); setSent(true); }}>
        {step === 0 && <label className="form-control"><span>الاسم *</span><input required value={name} onChange={event => setName(event.target.value)} /></label>}
        {step === 1 && <label className="form-control"><span>المدينة</span><select value={city} onChange={event => setCity(event.target.value)}><option value="">اختر</option><option value="riyadh">الرياض</option><option value="jeddah">جدة</option></select></label>}
        <div className="form-footer">{step === 1 && <button type="button" onClick={() => setStep(0)}>رجوع</button>}{step === 0 ? <button type="button" onClick={() => setStep(1)}>التالي</button> : <button type="submit">إرسال الطلب</button>}{sent && <p role="status">تم الإرسال</p>}</div>
      </form></main>;
    }
    render(<MemoryRouter initialEntries={['/join-us/test']}><CmsProvider><div id="main-content"><FakeSteps /></div><SiteAssistant /><Location /></CmsProvider></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'مساعد وعاء' }));
    const ask = (text: string) => {
      fireEvent.change(screen.getByRole('textbox', { name: 'اسأل مساعد وعاء' }), { target: { value: text } });
      fireEvent.click(screen.getByRole('button', { name: 'إرسال' }));
    };
    ask('عبي لي النموذج');
    await screen.findByText(/وش اسمك؟/);
    ask('اسمي خالد');
    // The step's last field written: the next button is pressed without asking, and the new step's field comes up.
    await screen.findByText('تم. خلصنا خانات هذي الخطوة، ننتقل للي بعدها.');
    await screen.findByText('المدينة: اختر من: الرياض، جدة.', {}, { timeout: 4000 });
    ask('جدة');
    await screen.findByText(/^تم، خلصنا. راجع معي: الاسم: خالد، المدينة: جدة. كله مظبوط؟/);
    // The name lives on the first step: back to it, changed, forward again, and read back once more.
    ask('الاسم خالد العلي');
    await screen.findByText(/^تم. راجع معي: الاسم: خالد العلي، المدينة: جدة. كله مظبوط؟/, {}, { timeout: 5000 });
    expect(document.querySelector('main [role="status"]')).toBeNull();
    ask('وقف');
    await screen.findByText(/وقفت التعبئة/);
    expect(document.querySelector('main [role="status"]')).toBeNull();
  });

  it('greets a remembered visitor by name and forgets them on request', async () => {
    localStorage.setItem('weaa-assistant-voice', 'off');
    localStorage.setItem('weaa-assistant-profile', JSON.stringify({ name: 'خالد', values: { 'الاسم': 'خالد محمد' }, savedAt: 1 }));
    renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: 'مساعد وعاء' }));
    expect(screen.getByText(/هلا والله يا خالد/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'انسَ بياناتي' }));
    await screen.findByText('مسحت بياناتك من هذا الجهاز.');
    expect(localStorage.getItem('weaa-assistant-profile')).toBeNull();
  });

  it('stays off the admin pages but follows the visitor into a form', () => {
    renderAt('/admin');
    expect(screen.queryByRole('button', { name: 'مساعد وعاء' })).toBeNull();
    cleanup();
    renderAt('/join-us/request-services');
    expect(screen.getByRole('button', { name: 'مساعد وعاء' })).toBeTruthy();
  });
});
