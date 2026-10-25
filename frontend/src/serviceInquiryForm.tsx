import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Icon } from '@iconify/react';
import { normalizeDigits, saudiMobile } from './forms';
import { serviceGroups, type CourierRequirements } from './serviceInquiry';
import { submitServiceInquiry } from './serviceInquiryApi';
import type { DeliveryReceipt } from './requestDelivery';

type Details = { name: string; company: string; phone: string; city: string };
const initial: Details = { name: '', company: '', phone: '', city: '' };
const initialCourier: CourierRequirements = { count: '', city: '', sponsorshipSpecs: '', ajeerSpecs: '' };
const courierOptions = ['مناديب نقل كفالة', 'مناديب عقد أجير'];
function phoneInput(value: string) {
  let digits = normalizeDigits(value).replace(/\D/g, '');
  if (digits.startsWith('966')) digits = digits.slice(3);
  if (digits.startsWith('05')) digits = digits.slice(1);
  return digits.slice(0, 9);
}

export function ServiceInquiry() {
  const [step, setStep] = useState(0);
  const [details, setDetails] = useState<Details>(initial);
  const [selected, setSelected] = useState<string[]>([]);
  const [courier, setCourier] = useState<CourierRequirements>(initialCourier);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const headingRef = useRef<HTMLDivElement>(null);
  const previousStep = useRef(0);
  const delivery = useRef<DeliveryReceipt | null>(null);
  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    const heading = headingRef.current;
    if (heading) {
      heading.focus({ preventScroll: true });
      window.scrollTo({ top: heading.getBoundingClientRect().top + window.scrollY - 96, behavior: 'instant' });
    }
  }, [step]);

  const next = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (step === 0) {
      if (!details.name.trim()) { setError('أدخل الاسم.'); return; }
      if (!/^5\d{8}$/.test(saudiMobile(details.phone))) { setError('رقم الجوال السعودي يجب أن يبدأ بـ 5 ويتكوّن من 9 أرقام بعد +966.'); return; }
      if (!details.city.trim()) { setError('أدخل المدينة.'); return; }
    }
    if (step === 1 && !selected.length) { setError('اختر خدمة واحدة على الأقل.'); return; }
    if (step === 1 && selected.some(value => courierOptions.includes(value)) && (!/^[1-9]\d*$/.test(courier.count) || !courier.city.trim())) { setError('أدخل عدد المناديب المطلوب والمدينة.'); return; }
    setStep(current => Math.min(current + 1, 2));
  };
  const submit = async () => {
    if (pending) return;
    setPending(true); setError('');
    try {
      await submitServiceInquiry(details, selected, courier, delivery);
      setSuccess(true); setDetails(initial); setSelected([]); setCourier(initialCourier);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر إرسال الطلب. حاول مرة أخرى.'); }
    finally { setPending(false); }
  };
  const toggle = (title: string) => setSelected(current => current.includes(title) ? current.filter(item => item !== title) : [...current, title]);

  return <section className={`inquiry-shell${step === 1 ? ' inquiry-shell-wide' : ''}`} aria-label="نموذج طلب الخدمات">
    <ol className="inquiry-progress" aria-label="مراحل النموذج">{['البيانات', 'الخدمات', 'المراجعة'].map((label, index) => <li key={label} className={index === step ? 'current' : index < step ? 'complete' : ''} aria-current={index === step ? 'step' : undefined}><span>{index < step ? <Icon icon="solar:check-read-linear" /> : index + 1}</span><strong>{label}</strong></li>)}</ol>
    {success ? <div className="inquiry-result" role="status"><Icon icon="solar:check-circle-bold" /><h2>تم إرسال طلبك بنجاح</h2><p>وصل طلبك إلى فريق وعاء، وسنتواصل معك قريبًا.</p><button type="button" className="action action-secondary" onClick={() => { setStep(0); setSuccess(false); }}>إرسال طلب آخر</button></div> :
      <form onSubmit={next} className="inquiry-form" noValidate aria-busy={pending}>
        <div className="inquiry-heading" ref={headingRef} tabIndex={-1}><h2>{['معلوماتك الشخصية', 'اختر الخدمات', 'راجع طلبك'][step]}</h2><p>{['الرجاء تعبئة بياناتك للتواصل معك.', 'يمكنك اختيار أكثر من خدمة. اضغط على الفئة لعرض الخيارات.', 'تأكد من بياناتك والخدمات المختارة قبل إرسال الطلب.'][step]}</p></div>
        {step === 0 && <div className="inquiry-fields">
          <label className="form-control"><span>الاسم *</span><input required autoComplete="name" placeholder="أدخل اسمك الكامل" value={details.name} onChange={event => setDetails(current => ({ ...current, name: event.target.value.slice(0, 120) }))} /></label>
          <label className="form-control"><span>اسم الشركة (اختياري)</span><input autoComplete="organization" placeholder="اسم الشركة" value={details.company} onChange={event => setDetails(current => ({ ...current, company: event.target.value.slice(0, 120) }))} /></label>
          <label className="form-control"><span>رقم الجوال *</span><div className="inquiry-phone"><span className="inquiry-country" dir="ltr">+966 السعودية</span><input required type="tel" inputMode="numeric" autoComplete="tel-national" dir="ltr" placeholder="5xxxxxxxx" value={details.phone} onChange={event => setDetails(current => ({ ...current, phone: phoneInput(event.target.value) }))} /></div></label>
          <label className="form-control"><span>في أي مدينة *</span><input required autoComplete="address-level2" placeholder="مثال: الرياض" value={details.city} onChange={event => setDetails(current => ({ ...current, city: event.target.value.slice(0, 100) }))} /></label>
        </div>}
        {step === 1 && <div className="inquiry-groups">{serviceGroups.map(group => {
          const options = group.sections.flatMap(section => section.options);
          const hasCourier = group.title === 'مناديب' && selected.some(value => courierOptions.includes(value));
          return <details key={group.title} className="inquiry-group"><summary><span className="inquiry-group-icon"><Icon icon={group.icon} /></span><span className="inquiry-group-copy"><strong>{group.title}</strong><small>{group.description}</small></span><span className="inquiry-group-count">{options.filter(option => selected.includes(option.title)).length || ''}</span><Icon className="inquiry-chevron" icon="solar:alt-arrow-down-linear" /></summary><div className="inquiry-group-body">{group.sections.map((section, index) => <div key={section.title || index}>{section.title && <h3 className="inquiry-section-title">{section.title}</h3>}<div className="inquiry-options">{section.options.map(option => <label key={option.title} className={selected.includes(option.title) ? 'inquiry-option selected' : 'inquiry-option'}><input type="checkbox" checked={selected.includes(option.title)} onChange={() => toggle(option.title)} /><span className="inquiry-check"><Icon icon="solar:check-read-linear" /></span><span><strong>{option.title}</strong>{option.description && <small>{option.description}</small>}</span></label>)}</div></div>)}
            {hasCourier && <div className="inquiry-courier-fields"><div className="inquiry-courier-row"><label className="form-control">عدد المناديب المطلوب *<input type="number" min="1" inputMode="numeric" value={courier.count} onChange={event => setCourier(current => ({ ...current, count: event.target.value }))} placeholder="مثال: 5" /></label><label className="form-control">المدينة *<input value={courier.city} onChange={event => setCourier(current => ({ ...current, city: event.target.value.slice(0, 100) }))} placeholder="مثال: الرياض" /></label></div>{selected.includes('مناديب نقل كفالة') && <label className="form-control">مواصفات أخرى - مناديب نقل كفالة<input value={courier.sponsorshipSpecs} onChange={event => setCourier(current => ({ ...current, sponsorshipSpecs: event.target.value.slice(0, 500) }))} placeholder="اكتب المواصفات المطلوبة" /></label>}{selected.includes('مناديب عقد أجير') && <label className="form-control">مواصفات أخرى - مناديب عقد أجير<input value={courier.ajeerSpecs} onChange={event => setCourier(current => ({ ...current, ajeerSpecs: event.target.value.slice(0, 500) }))} placeholder="اكتب المواصفات المطلوبة" /></label>}</div>}
          </div></details>;
        })}</div>}
        {step === 2 && <div className="inquiry-review"><div><span>الاسم</span><strong>{details.name.trim()}</strong></div>{details.company.trim() && <div><span>اسم الشركة</span><strong>{details.company.trim()}</strong></div>}<div><span>رقم الجوال</span><strong dir="ltr">+966{saudiMobile(details.phone)}</strong></div><div><span>المدينة</span><strong>{details.city.trim()}</strong></div><div className="inquiry-review-services"><span>الخدمات المختارة</span><strong>{selected.join('، ')}</strong></div>{selected.some(value => courierOptions.includes(value)) && <><div><span>عدد المناديب</span><strong>{courier.count}</strong></div><div><span>مدينة عمل المناديب</span><strong>{courier.city}</strong></div></>}</div>}
        {error && <p className="error inquiry-error" role="alert">{error}</p>}
        <div className="inquiry-actions">{step > 0 && <button type="button" className="action action-secondary" disabled={pending} onClick={() => { setError(''); setStep(current => current - 1); }}><Icon icon="solar:arrow-right-linear" /> رجوع</button>}{step < 2 ? <button type="submit" className="action action-primary">التالي <Icon icon="solar:arrow-left-linear" /></button> : <button type="button" className="action action-primary" disabled={pending} onClick={() => void submit()}>{pending ? 'جاري الإرسال...' : 'إرسال الطلب'} <Icon icon="solar:arrow-left-linear" /></button>}</div>
      </form>}
  </section>;
}
