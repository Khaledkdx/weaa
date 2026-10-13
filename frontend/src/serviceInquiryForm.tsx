import { useState, type FormEvent } from 'react';
import { Icon } from '@iconify/react';
import { createServiceRequest } from './data';
import { normalizeDigits, saudiMobile } from './forms';
import { inquiryDetails, serviceGroups } from './serviceInquiry';

type Details = { name: string; company: string; phone: string; city: string };
const initial: Details = { name: '', company: '', phone: '', city: '' };
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
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const next = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (step === 0) {
      if (!details.name.trim() || !details.city.trim()) { setError('أدخل الاسم والمدينة.'); return; }
      if (!/^5\d{8}$/.test(saudiMobile(details.phone))) { setError('رقم الجوال السعودي يجب أن يبدأ بـ 5 ويتكوّن من 9 أرقام بعد +966.'); return; }
    }
    if (step === 1 && !selected.length) { setError('اختر خدمة واحدة على الأقل.'); return; }
    setStep(current => Math.min(current + 1, 2));
  };
  const submit = async () => {
    if (pending) return;
    setPending(true); setError('');
    try {
      await createServiceRequest({
        service_slug: 'logistics-inquiry', service_title: 'طلب خدمات لوجستية',
        name: details.name.trim(), phone: `+966${saudiMobile(details.phone)}`, email: '',
        details: inquiryDetails(details.company, details.city, selected), status: 'طلب جديد',
        created_at_label: new Date().toLocaleDateString('ar-SA'),
      });
      setSuccess(true); setDetails(initial); setSelected([]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر إرسال الطلب. حاول مرة أخرى.'); }
    finally { setPending(false); }
  };
  const toggle = (title: string) => setSelected(current => current.includes(title) ? current.filter(item => item !== title) : [...current, title]);

  return <section className="inquiry-shell" aria-label="نموذج طلب الخدمات">
    <div className="inquiry-progress" aria-label="مراحل النموذج">{['البيانات', 'الخدمات', 'المراجعة'].map((label, index) => <div key={label} className={index === step ? 'current' : index < step ? 'complete' : ''}><span>{index < step ? <Icon icon="solar:check-circle-bold" /> : index + 1}</span><strong>{label}</strong></div>)}</div>
    {success ? <div className="inquiry-result" role="status"><Icon icon="solar:check-circle-bold" /><h2>تم إرسال طلبك بنجاح</h2><p>وصل طلبك إلى فريق وعاء، وسنتواصل معك قريبًا.</p><button type="button" className="action action-secondary" onClick={() => { setStep(0); setSuccess(false); }}>إرسال طلب آخر</button></div> :
      <form onSubmit={next} className="inquiry-form" noValidate>
        <div className="inquiry-heading"><span className="eyebrow">المرحلة {step + 1} من 3</span><h2>{['معلوماتك الشخصية', 'اختر الخدمات', 'راجع طلبك'][step]}</h2><p>{['اكتب بيانات التواصل لنتمكن من خدمتك.', 'اختر ما تحتاجه؛ يمكنك اختيار أكثر من خدمة.', 'تأكد من البيانات قبل إرسال الطلب.'][step]}</p></div>
        {step === 0 && <div className="inquiry-fields">
          {([['name', 'الاسم', true], ['company', 'اسم الشركة', false], ['phone', 'رقم الجوال', true], ['city', 'في أي مدينة', true]] as const).map(([key, label, required]) => <label className="form-control" key={key}><span>{label}{required ? ' *' : ' (اختياري)'}</span><div className={key === 'phone' ? 'inquiry-phone' : undefined}>{key === 'phone' && <span dir="ltr">+966</span>}<input required={required} type={key === 'phone' ? 'tel' : 'text'} inputMode={key === 'phone' ? 'numeric' : undefined} autoComplete={key === 'name' ? 'name' : key === 'phone' ? 'tel-national' : key === 'city' ? 'address-level2' : 'organization'} dir={key === 'phone' ? 'ltr' : undefined} placeholder={key === 'phone' ? '5xxxxxxxx' : undefined} value={details[key]} onChange={event => setDetails(current => ({ ...current, [key]: key === 'phone' ? phoneInput(event.target.value) : event.target.value.slice(0, 120) }))} /></div></label>)}
        </div>}
        {step === 1 && <div className="inquiry-groups">{serviceGroups.map(group => <fieldset key={group.title}><legend>{group.title}</legend><div className="inquiry-options">{group.options.map(option => <label key={option.title} className={selected.includes(option.title) ? 'inquiry-option selected' : 'inquiry-option'}><input type="checkbox" checked={selected.includes(option.title)} onChange={() => toggle(option.title)} /><span className="inquiry-check"><Icon icon="solar:check-read-linear" /></span><span><strong>{option.title}</strong>{'description' in option && <small>{option.description}</small>}</span></label>)}</div></fieldset>)}</div>}
        {step === 2 && <div className="inquiry-review"><div><span>الاسم</span><strong>{details.name.trim()}</strong></div>{details.company.trim() && <div><span>اسم الشركة</span><strong>{details.company.trim()}</strong></div>}<div><span>رقم الجوال</span><strong dir="ltr">+966{saudiMobile(details.phone)}</strong></div><div><span>المدينة</span><strong>{details.city.trim()}</strong></div><div className="inquiry-review-services"><span>الخدمات المختارة</span><strong>{selected.join('، ')}</strong></div></div>}
        {error && <p className="error inquiry-error" role="alert">{error}</p>}
        <div className="inquiry-actions">{step > 0 && <button type="button" className="action action-secondary" disabled={pending} onClick={() => { setError(''); setStep(current => current - 1); }}>السابق</button>}{step < 2 ? <button type="submit" className="action action-primary">التالي <Icon icon="solar:arrow-left-linear" /></button> : <button type="button" className="action action-primary" disabled={pending} onClick={() => void submit()}>{pending ? 'جاري الإرسال...' : 'إرسال الطلب'} <Icon icon="solar:arrow-left-linear" /></button>}</div>
      </form>}
  </section>;
}
