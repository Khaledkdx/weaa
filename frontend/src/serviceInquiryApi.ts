import { saudiMobile } from './forms';
import { inquiryDetails, type CourierRequirements } from './serviceInquiry';
import { createServiceRequest } from './data';
import { externalReceipt, type DeliveryCache } from './requestDelivery';

export type ServiceInquiryDetails = { name: string; company: string; phone: string; city: string };

const endpoint = 'https://app.swarsafqa.com/api/public/customer-service-requests';

export function serviceInquiryPayload(details: ServiceInquiryDetails, selected: string[], courier?: CourierRequirements, createdAt = new Date()) {
  const dateLabel = createdAt.toLocaleString('en-GB', { timeZone: 'Asia/Riyadh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  return {
    service_slug: 'logistics-inquiry',
    service_title: 'طلب خدمات لوجستية',
    name: details.name.trim(),
    phone: `+966${saudiMobile(details.phone)}`,
    email: '',
    details: inquiryDetails(selected, { company: details.company, city: details.city, dateLabel, courier }),
    status: 'طلب جديد',
    created_at_label: dateLabel,
  };
}

export async function submitServiceInquiry(details: ServiceInquiryDetails, selected: string[], courier?: CourierRequirements, cache: DeliveryCache = { current: null }) {
  const payload = serviceInquiryPayload(details, selected, courier);
  const receipt = await externalReceipt(JSON.stringify({ details, selected, courier }), async () => {
  let response: Response;
  try {
    response = await fetch(import.meta.env.PROD ? '/api/service-inquiry' : endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'omit',
    });
  } catch {
    throw new Error('تعذر الاتصال بنظام الطلبات. تحقق من اتصالك وحاول مرة أخرى.');
  }

  const result = await response.json().catch(() => null) as { success?: boolean; message?: string } | null;
  if (!response.ok || result?.success === false) {
    throw new Error(result?.message || `تعذر إرسال الطلب (${response.status}). حاول مرة أخرى.`);
  }
  return result || {};
  }, cache);
  const syncDetails = receipt.error ? `الربط الخارجي: يحتاج متابعة\nسبب التعذر: ${receipt.error}` : 'الربط الخارجي: تم الإرسال';
  await createServiceRequest({ ...payload, details: `${payload.details}\n\n${syncDetails}\n${receipt.result ? JSON.stringify(receipt.result) : ''}`.trim() });
  cache.current = null;
  return { success: true };
}
