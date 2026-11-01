// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

  it('stays off the admin pages but follows the visitor into a form', () => {
    renderAt('/admin');
    expect(screen.queryByRole('button', { name: 'مساعد وعاء' })).toBeNull();
    cleanup();
    renderAt('/join-us/request-services');
    expect(screen.getByRole('button', { name: 'مساعد وعاء' })).toBeTruthy();
  });
});
