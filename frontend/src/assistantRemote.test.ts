import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const invoke = vi.fn();
beforeEach(() => vi.stubGlobal('fetch', vi.fn(async () => { const { data } = await invoke(); return new Response(JSON.stringify(data), { status: 200 }); })));
import { askAssistant } from './assistantBrain';
import { seed } from './seed';
import { roadTransportPath } from './roadTransport';
afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); });
describe('Arabic assistant remote fallback', () => {
  it('uses context rather than repeating an unhelpful remote answer', async () => {
    invoke.mockResolvedValue({ data: { text: 'لم أفهم، أعد صياغة السؤال.' }, error: null });
    const reply = await askAssistant('الداخل', [{ role: 'user', text: 'عاوز اسجل مندوب' }], seed, '/');
    expect(reply.navigateTo).toBe('/join-us/courier-internal');
    expect(reply.source).toBe('local');
    expect(reply.text).not.toContain('لم أفهم');
  });
  it('does not display an English-only response to an Arabic request', async () => {
    invoke.mockResolvedValue({ data: { text: 'Please repeat your request.' }, error: null });
    expect((await askAssistant('مناذيب الداهل', [], seed, '/')).navigateTo).toBe('/join-us/courier-internal');
  });
  it('never shows or speaks a link: the visitor is taken to the page instead', async () => {
    invoke.mockResolvedValue({ data: { text: 'تقدر تسجل من هنا: https://weaa-sa.com/join-us/courier-internal أو افتح /join-us/courier-internal.', navigateTo: '/join-us/courier-internal' }, error: null });
    const reply = await askAssistant('عاوز اسجل مندوب داخل', [], seed, '/');
    expect(reply.navigateTo).toBe('/join-us/courier-internal');
    expect(reply.text).not.toMatch(/http|\/|www/);
    expect(reply.text).toContain('تقدر تسجل');
  });
  it('opens the page itself when the model only offers to open it', async () => {
    invoke.mockResolvedValue({ data: { text: 'تمام، أبشر. تبي تفتح صفحة النقل البري؟' }, error: null });
    const reply = await askAssistant('ابغى شاحنة تنقل بضاعة', [], seed, '/');
    expect(reply.navigateTo).toBe(roadTransportPath);
    expect(reply.text).not.toContain('؟');
    // Already there: no navigation, and no offer either.
    invoke.mockResolvedValue({ data: { text: 'تبي أفتح لك صفحة النقل البري؟' }, error: null });
    const same = await askAssistant('ابغى شاحنة تنقل بضاعة', [], seed, roadTransportPath);
    expect(same.navigateTo).toBeUndefined();
    expect(same.text).toContain('أنت الحين في');
  });
  it('keeps useful Arabic replies but rejects destinations outside the site index', async () => {
    invoke.mockResolvedValue({ data: { text: 'تمام، أساعدك في اختيار الخدمة.', navigateTo: 'https://example.com' }, error: null });
    const reply = await askAssistant('عاوز خدمة', [], seed, '/');
    expect(reply.source).toBe('remote');
    expect(reply.navigateTo).toBeUndefined();
  });
});
