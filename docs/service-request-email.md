# تنبيه البريد لطلبات الخدمات

النموذج العام في `/request-services` يحفظ الطلب في جدول `service_requests` الموجود. عمود `created_at` يضبط تاريخ ووقت الطلب تلقائيًا من قاعدة البيانات، ويظهر في الأدمن وملف CSV.

لتفعيل البريد، يلزم حساب Resend ودومين إرسال موثّق. لا تضع مفتاح Resend أو سر الـWebhook في GitHub أو كود الويب.

1. في Supabase > Edge Functions > Secrets أضف `RESEND_API_KEY` و`NOTIFICATION_EMAIL` (مثلاً `info@weaa-sa.com`) و`NOTIFICATION_FROM_EMAIL` (عنوان على دومين موثّق) و`SERVICE_REQUEST_WEBHOOK_SECRET` (قيمة عشوائية طويلة).
2. انشر الدالة `notify-service-request` مع تعطيل JWT verification لها. الدالة تتحقق بنفسها من سر الـWebhook في ترويسة `Authorization`.
3. في Supabase > Database > Webhooks أنشئ Webhook على `public.service_requests` لحدث `INSERT` فقط. الوجهة: `https://<PROJECT_REF>.supabase.co/functions/v1/notify-service-request`. أضف الترويسة `Authorization: Bearer <SERVICE_REQUEST_WEBHOOK_SECRET>`.
4. أرسل طلبًا تجريبيًا من الموقع، ثم تحقق من ظهور الطلب في `/admin` ومن وصول البريد. راجع Logs للـWebhook وEdge Function إن لم يصل. لا تختبر ببيانات متقدم حقيقي دون إذنه.

الإرسال من قاعدة البيانات يعني أن التنبيه يشمل نماذج الخدمات القديمة والجديدة، ولا يتوقف على بقاء صفحة الزائر مفتوحة. إذا تعطل البريد، يبقى الطلب محفوظًا في قاعدة البيانات؛ راقب سجل أخطاء الدالة لإعادة المحاولة يدويًا عند الحاجة.
