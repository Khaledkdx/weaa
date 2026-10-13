type RequestRow = {
  id?: string;
  service_title?: string;
  name?: string;
  phone?: string;
  email?: string;
  details?: string;
  created_at?: string;
};

function text(value: unknown, max = 3000) {
  return String(value ?? '').slice(0, max);
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const secret = Deno.env.get('SERVICE_REQUEST_WEBHOOK_SECRET');
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const recipient = Deno.env.get('NOTIFICATION_EMAIL');
  const sender = Deno.env.get('NOTIFICATION_FROM_EMAIL');
  if (!apiKey || !recipient || !sender) return new Response('Email is not configured', { status: 503 });

  let payload: { type?: string; table?: string; record?: RequestRow };
  try { payload = await request.json(); }
  catch { return new Response('Invalid JSON', { status: 400 }); }
  if (payload.type !== 'INSERT' || payload.table !== 'service_requests' || !payload.record?.id) {
    return new Response('Invalid webhook payload', { status: 400 });
  }
  const row = payload.record;
  const body = [
    'وصل طلب جديد إلى موقع وعاء',
    `رقم الطلب: ${text(row.id, 100)}`,
    `تاريخ الطلب: ${row.created_at ? new Date(row.created_at).toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' }) : 'غير متاح'}`,
    `الخدمة: ${text(row.service_title, 200)}`,
    `الاسم: ${text(row.name, 200)}`,
    `الجوال: ${text(row.phone, 40)}`,
    `البريد: ${text(row.email, 200)}`,
    `التفاصيل:\n${text(row.details)}`,
  ].join('\n\n');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: sender, to: [recipient], subject: `طلب جديد: ${text(row.service_title, 120)}`, text: body }),
  });
  if (!response.ok) {
    console.error('Email provider rejected notification:', response.status);
    return new Response('Email delivery failed', { status: 502 });
  }
  return new Response('ok');
});
