export const internalCourierOffers = [
  {
    id: 'jeddah',
    title: '🚘 العرض الأول: العمل في جدة',
    details: `💰 نظام الراتب والحوافز:

• راتب ثابت: 500 ريال سعودي.
• عند تحقيق 450 طلب توصيل:

- حوافز: 3,700 ريال.
- إجمالي الدخل: 4,500 ريال.
  • عند تحقيق 550 طلب توصيل:
- حوافز: 4,200 ريال.
- إجمالي الدخل: 4,700 ريال.

🎯 مميزات العرض:
✅ توفير سيارة من الشركة.
✅ نقل الكفالة على حساب الشركة.
✅ نقل الإقامة مجانًا.`,
  },
  {
    id: 'riyadh',
    title: '🚗 العرض الثاني: العمل في الرياض',
    details: `💰 الراتب والبدلات:

• راتب ثابت: 2,200 ريال سعودي.
• بدل سكن: 200 ريال.
• بدل إنترنت: 100 ريال.
• التارجت الشهري: 490 طلبًا.
• كل طلب إضافي بعد التارجت يُحسب بـ 8 ريالات.

🎯 مميزات العرض:
✅ توفير السيارة.
✅ البنزين على حساب الشركة.
✅ نقل الإقامة والكفالة على حساب الشركة.`,
  },
] as const;

export const internalCourierConditions = `📋 شروط التقديم على العرضين:

1️⃣ إقامة سارية لمدة شهرين على الأقل. وفي حالة وجود تطويف أو مدة أقل، يمكننا المساعدة في بحث الحلول المتاحة.
2️⃣ ألا يتجاوز عدد مرات نقل الكفالة مره واحده ،مع إمكانية بحث الحلول للحالات الأخرى.
3️⃣ أن تكون المهنة المسجلة في الإقامة: سائق أو مندوب.
4️⃣ وجود رخصة قيادة نقل خفيف، وهو شرط أساسي للتقديم.`;

export const waitingOfferId = 'waiting';
export const waitingOfferLabel = 'لم يعجبني أي من العروض، في انتظار عرض آخر';

export function courierOfferDetails(selected: string[]) {
  if (selected.length === 1 && selected[0] === waitingOfferId) return {
    'العروض المختارة': waitingOfferLabel,
    'تفاصيل العروض المختارة': waitingOfferLabel,
    'شروط التقديم على العرضين': internalCourierConditions,
  };
  const offers = internalCourierOffers.filter(offer => selected.includes(offer.id));
  if (!offers.length || selected.some(id => !internalCourierOffers.some(offer => offer.id === id))) throw new Error('اختر عرضًا واحدًا على الأقل.');
  return {
    'العروض المختارة': offers.map(offer => offer.title).join('، '),
    'تفاصيل العروض المختارة': offers.map(offer => `${offer.title}\n\n${offer.details}`).join('\n\n━━━━━━━━━━━━━━━\n\n'),
    'شروط التقديم على العرضين': internalCourierConditions,
  };
}

export function CourierOffers({ selected, onChange }: { selected: string[]; onChange: (next: string[]) => void }) {
  return <section className="courier-offers form-wide" aria-labelledby="courier-offers-title">
    <h2 id="courier-offers-title">🇸🇦 تفاصيل عروض العمل المتاحة في المملكة العربية السعودية</h2>
    <p>متاح حاليًا فرص عمل لمندوبي توصيل الطعام في جدة والرياض، مع توفير السيارة ومميزات أخرى حسب العرض. إليك التفاصيل 👇</p>
    <div className="courier-offer-grid">{internalCourierOffers.map(offer => <label className="courier-offer" key={offer.id}>
      <span className="courier-offer-heading"><input type="checkbox" checked={selected.includes(offer.id)} onChange={() => onChange(selected.includes(offer.id) ? selected.filter(id => id !== offer.id) : [...selected.filter(id => id !== waitingOfferId), offer.id])} /><strong>{offer.title}</strong></span>
      <span className="courier-offer-copy">{offer.details}</span>
    </label>)}</div>
    <label className="courier-offer"><span className="courier-offer-heading"><input type="checkbox" checked={selected.includes(waitingOfferId)} onChange={() => onChange(selected.includes(waitingOfferId) ? [] : [waitingOfferId])} /><strong>{waitingOfferLabel}</strong></span></label>
    <p className="courier-offer-copy">{internalCourierConditions}</p>
    <h3>📩 أي العرضين أنسب لحضرتك؟</h3>
    <p className="courier-offer-copy">{`🔹 جدة: راتب ثابت أقل، مع حوافز مرتبطة بعدد الطلبات.
🔹 الرياض: راتب ثابت وبدلات شهرية، مع احتساب مقابل للطلبات الإضافية بعد تحقيق التارجت.`}</p>
    <p>كل ما عليك هو إبلاغنا بالمدينة والعرض المناسب لك، وسيقوم فريقنا بالتواصل معك لاستكمال إجراءات التقديم والتعاقد.</p>
  </section>;
}
