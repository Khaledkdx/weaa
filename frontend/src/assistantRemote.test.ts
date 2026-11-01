import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const invoke = vi.fn();
beforeEach(() => vi.stubGlobal('fetch', vi.fn(async () => { const { data } = await invoke(); return new Response(JSON.stringify(data), { status: 200 }); })));
import { askAssistant } from './assistantBrain';
import { seed } from './seed';
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
  it('keeps useful Arabic replies but rejects destinations outside the site index', async () => {
    invoke.mockResolvedValue({ data: { text: 'تمام، أساعدك في اختيار الخدمة.', navigateTo: 'https://example.com' }, error: null });
    const reply = await askAssistant('عاوز خدمة', [], seed, '/');
    expect(reply.source).toBe('remote');
    expect(reply.navigateTo).toBeUndefined();
  });
});
