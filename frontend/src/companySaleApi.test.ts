import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ upload: vi.fn(), insert: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ storage: { from: () => ({ upload: mocks.upload }) }, from: () => ({ insert: mocks.insert }) }) }));
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); vi.clearAllMocks(); });
describe('company documents persistence', () => {
  it('stores every document in private storage and reuses uploaded files after an insert failure', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co'); vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test');
    const { submitCompanySale } = await import('./data');
    mocks.upload.mockResolvedValue({ error: null });
    mocks.insert.mockResolvedValueOnce({ error: { message: 'offline' } }).mockResolvedValueOnce({ error: null });
    const files = [{ key: 'cr', label: 'السجل', file: new File(['%PDF-'], 'cr.pdf') }, { key: 'vat', label: 'الضريبة', file: new File(['%PDF-'], 'vat.pdf') }];
    const request = { form_slug: 'company-sale-executive', form_title: 'تنفيذي', name: 'test', phone: '123456789', email: 'test@example.com', fields: {}, status: 'طلب جديد' };
    const uploads = new Map<File, string>();
    await expect(submitCompanySale(request, files, uploads)).rejects.toThrow('تعذر حفظ الطلب');
    await submitCompanySale(request, files, uploads);
    expect(mocks.upload).toHaveBeenCalledTimes(2);
    expect(mocks.insert.mock.calls[1][0].fields).toEqual({ 'company_document:السجل': expect.stringMatching(/^company-sales\/.*\/cr.pdf$/), 'company_document:الضريبة': expect.stringMatching(/^company-sales\/.*\/vat.pdf$/) });
  });
  it('does not save a partial request when an upload fails', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co'); vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test');
    const { submitCompanySale } = await import('./data');
    mocks.upload.mockResolvedValue({ error: { message: 'failed' } });
    await expect(submitCompanySale({ form_slug: 'company-sale-executive', form_title: 'تنفيذي', name: 'test', phone: '123456789', email: '', fields: {}, status: 'طلب جديد' }, [{ key: 'cr', label: 'السجل', file: new File(['%PDF-'], 'cr.pdf') }])).rejects.toThrow('تعذر رفع السجل');
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
