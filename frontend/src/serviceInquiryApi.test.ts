import { afterEach, describe, expect, it, vi } from 'vitest';
import { serviceInquiryPayload, submitServiceInquiry } from './serviceInquiryApi';
import { createServiceRequest } from './data';
import type { DeliveryCache } from './requestDelivery';
vi.mock('./data', () => ({ createServiceRequest: vi.fn().mockResolvedValue(undefined) }));

const details = { name: ' أحمد ', company: ' شركة مثال ', phone: '٠٥١٢٣٤٥٦٧٨', city: ' جدة ' };
const selected = ['ترخيص النقل الخفيف للبضائع على الطرق البرية', 'عقد الهرم الماسي'];

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('service inquiry API', () => {
  it('normalizes the phone and sends the selected services to the public endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ success: true }) });
    vi.stubGlobal('fetch', fetchMock);

    await submitServiceInquiry(details, selected);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith('https://app.swarsafqa.com/api/public/customer-service-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.any(String),
      credentials: 'omit',
    });
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.name).toBe('أحمد');
    expect(sent.phone).toBe('+966512345678');
    expect(sent.details).toContain(`تاريخ الطلب: ${sent.created_at_label}`);
    expect(sent.details).toContain('اسم الشركة: شركة مثال\n\nالمدينة: جدة');
    expect(createServiceRequest).toHaveBeenCalledWith(expect.objectContaining({ service_slug: 'logistics-inquiry', details: expect.stringContaining('الربط الخارجي: تم الإرسال') }));
    expect(serviceInquiryPayload(details, selected, undefined, new Date('2026-10-14T12:00:00Z'))).toEqual({
      service_slug: 'logistics-inquiry', service_title: 'طلب خدمات لوجستية',
      name: 'أحمد', phone: '+966512345678', email: '',
      details: 'اسم الشركة: شركة مثال\n\nالمدينة: جدة\n\nتاريخ الطلب: 14/10/2026, 15:00\n\nالتراخيص:\nالنقل الخفيف\n- ترخيص النقل الخفيف للبضائع على الطرق البرية\n\nالاستثمار:\n- عقد الهرم الماسي',
      status: 'طلب جديد', created_at_label: '14/10/2026, 15:00',
    });
  });

  it('records an external rejection in the dashboard without losing the local request', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 422, json: async () => ({ success: false, message: 'اختر خدمة صحيحة' }) }));
    await submitServiceInquiry(details, selected);
    expect(createServiceRequest).toHaveBeenCalledWith(expect.objectContaining({ details: expect.stringContaining('سبب التعذر: اختر خدمة صحيحة') }));
  });

  it('saves locally even if the external connection fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await submitServiceInquiry(details, selected);
    expect(createServiceRequest).toHaveBeenCalledWith(expect.objectContaining({ details: expect.stringContaining('الربط الخارجي: يحتاج متابعة') }));
  });

  it('fails if the dashboard cannot save and does not duplicate an accepted upstream request on retry', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ success: true }) });
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(createServiceRequest).mockRejectedValueOnce(new Error('تعذر حفظ الطلب'));
    const cache: DeliveryCache = { current: null };
    await expect(submitServiceInquiry(details, selected, undefined, cache)).rejects.toThrow('تعذر حفظ الطلب');
    await submitServiceInquiry(details, selected, undefined, cache);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(createServiceRequest).toHaveBeenCalledTimes(2);
  });
});
