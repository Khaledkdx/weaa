import { afterEach, describe, expect, it, vi } from 'vitest';
import { serviceInquiryPayload, submitServiceInquiry } from './serviceInquiryApi';

const details = { name: ' أحمد ', company: ' شركة مثال ', phone: '٠٥١٢٣٤٥٦٧٨', city: ' جدة ' };
const selected = ['باقة كوادر', 'عقد الهرم الماسي'];

afterEach(() => vi.unstubAllGlobals());

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
    expect(sent).toEqual({
      ...serviceInquiryPayload(details, selected, new Date('2026-10-14T12:00:00Z')),
      created_at_label: expect.any(String),
    });
    expect(serviceInquiryPayload(details, selected, new Date('2026-10-14T12:00:00Z'))).toEqual({
      service_slug: 'logistics-inquiry', service_title: 'طلب خدمات لوجستية',
      name: 'أحمد', phone: '+966512345678', email: '',
      details: 'اسم الشركة: شركة مثال\n\nالمدينة: جدة\n\nعقود تشغيلية:\n- باقة كوادر\n\nالاستثمار:\n- عقد الهرم الماسي',
      status: 'طلب جديد', created_at_label: new Date('2026-10-14T12:00:00Z').toLocaleDateString('ar-SA'),
    });
  });

  it('shows the API error rather than reporting a false success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 422, json: async () => ({ success: false, message: 'اختر خدمة صحيحة' }) }));
    await expect(submitServiceInquiry(details, selected)).rejects.toThrow('اختر خدمة صحيحة');
  });

  it('reports connection failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(submitServiceInquiry(details, selected)).rejects.toThrow('تعذر الاتصال بنظام الطلبات');
  });
});
