import { saudiMobile } from './forms';
import { inquiryDetails, type CourierRequirements } from './serviceInquiry';

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

export async function submitServiceInquiry(details: ServiceInquiryDetails, selected: string[], courier?: CourierRequirements) {
  let response: Response;
  try {
    response = await fetch(import.meta.env.PROD ? '/api/service-inquiry' : endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(serviceInquiryPayload(details, selected, courier)),
      credentials: 'omit',
    });
  } catch {
    throw new Error('تعذر الاتصال بنظام الطلبات. تحقق من اتصالك وحاول مرة أخرى.');
  }

  const result = await response.json().catch(() => null) as { success?: boolean; message?: string } | null;
  if (!response.ok || result?.success === false) {
    throw new Error(result?.message || `تعذر إرسال الطلب (${response.status}). حاول مرة أخرى.`);
  }
  return result;
}
