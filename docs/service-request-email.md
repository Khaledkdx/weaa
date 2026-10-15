# تنبيه البريد لطلبات الخدمات

نماذج الخدمات التي تكتب إلى Supabase تحفظ الطلب في جدول `service_requests`، ويضبط عمود `created_at` التاريخ والوقت تلقائيًا. أما نموذج `/join-us/request-services` فيمر عبر خادم GoDaddy (`/api/service-inquiry`) إلى نظام الطلبات الخارجي `app.swarsafqa.com`، ولذلك إعدادات Webhook أدناه لا تنطبق عليه.

## إشعار نموذج طلب الخدمات اللوجستية

في إعدادات بيئة تطبيق GoDaddy Node.js أضف `RESEND_API_KEY` و`NOTIFICATION_EMAIL` (البريد المستلم، مثل `info@weaa-sa.com`) و`NOTIFICATION_FROM_EMAIL` (مرسل من نطاق موثّق في Resend)، ثم أعد تشغيل التطبيق. لا تُضف المفاتيح إلى GitHub أو ملفات `VITE_`. بعد قبول API الطلب، يرسل الخادم البريد. فشل إرسال البريد يُسجّل على الخادم ولا يلغي طلب العميل. اختبر بطلب مصرح به وتحقق من البريد وسجلات التطبيق قبل اعتبار الإشعارات مفعّلة.

يحمل الطلب `created_at_label` بتوقيت الرياض، ويُكتب التاريخ أيضًا في `details`. إذا كان المقصود عمودًا منفصلًا في شيت النظام الخارجي، يجب على مسؤول ذلك النظام ربط الحقل أو إضافة عمود أثناء التصدير.

## إشعارات نماذج Supabase الأخرى

لتفعيل البريد، يلزم حساب Resend ودومين إرسال موثّق. لا تضع مفتاح Resend أو سر الـWebhook في GitHub أو كود الويب.

1. في Supabase > Edge Functions > Secrets أضف `RESEND_API_KEY` و`NOTIFICATION_EMAIL` (مثلاً `info@weaa-sa.com`) و`NOTIFICATION_FROM_EMAIL` (عنوان على دومين موثّق) و`SERVICE_REQUEST_WEBHOOK_SECRET` (قيمة عشوائية طويلة).
2. انشر الدالة `notify-service-request` مع تعطيل JWT verification لها. الدالة تتحقق بنفسها من سر الـWebhook في ترويسة `Authorization`.
3. في Supabase > Database > Webhooks أنشئ Webhook على `public.service_requests` لحدث `INSERT` فقط. الوجهة: `https://<PROJECT_REF>.supabase.co/functions/v1/notify-service-request`. أضف الترويسة `Authorization: Bearer <SERVICE_REQUEST_WEBHOOK_SECRET>`.
4. أرسل طلبًا تجريبيًا من الموقع، ثم تحقق من ظهور الطلب في `/admin` ومن وصول البريد. راجع Logs للـWebhook وEdge Function إن لم يصل. لا تختبر ببيانات متقدم حقيقي دون إذنه.

الإرسال من قاعدة البيانات يعني أن التنبيه يشمل نماذج الخدمات القديمة والجديدة، ولا يتوقف على بقاء صفحة الزائر مفتوحة. إذا تعطل البريد، يبقى الطلب محفوظًا في قاعدة البيانات؛ راقب سجل أخطاء الدالة لإعادة المحاولة يدويًا عند الحاجة.
