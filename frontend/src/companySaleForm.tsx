import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Shell } from './shell';
import { FormControl, normalizeDigits, validateFiles } from './forms';
import { submitCompanySale } from './data';
import type { FormField } from './types';
import { companyContactFields, representativeFields, otherRoleField, operatingGroups, companyDocuments, salePriceFields, saleSuccess, saleIntents, saleIntentField } from './companySale';

export function CompanySalePage({ executive = false }: { executive?: boolean }) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  // Keep successful uploads for retries without uploading sensitive documents again.
  const uploads = useRef(new Map<File, string>());
  const title = executive ? 'شركات للبيع — النموذج التنفيذي' : 'شركات للبيع — النموذج المبدئي';
  useEffect(() => {
    if (!executive) return;
    const meta = document.createElement('meta');
    meta.name = 'robots'; meta.content = 'noindex, nofollow, noarchive';
    document.head.append(meta);
    return () => meta.remove();
  }, [executive]);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [step, success]);
  const firstFields = executive ? companyContactFields : [...companyContactFields, ...representativeFields, ...(values.representative_role === 'أخرى' ? [otherRoleField] : [])];
  const groups = executive ? [{ title: 'مستندات الشركة', fields: companyDocuments }, { title: 'البيانات المالية', fields: salePriceFields }] : operatingGroups;
  const hasIntent = executive || saleIntents.some(intent => intent.value === values.request_intent);
  const allFields = [...(executive ? [] : [saleIntentField]), ...firstFields, ...groups.flatMap(group => group.fields)];
  const changeStep = (next: number) => { setError(''); setStep(next); window.scrollTo({ top: 0, behavior: 'instant' }); };
  const validateStep = async () => {
    if (!hasIntent) throw new Error('اختر نوع الطلب أولًا.');
    const fields = step === 0 ? firstFields : groups.flatMap(group => group.fields);
    for (const field of fields) {
      if (field.required && (field.type === 'file' ? !files[field.key] : !values[field.key]?.trim())) throw new Error(`أكمل حقل: ${field.label}.`);
    }
    if (step === 0) {
      const digits = normalizeDigits(values.phone || '').replace(/\D/g, '');
      if (digits.length < 8 || digits.length > 15) throw new Error('أدخل رقم هاتف صحيحًا من 8 إلى 15 رقمًا مع رمز الدولة.');
    }
    if (executive && step === 1) {
      const selected = Object.values(files).filter((file): file is File => Boolean(file));
      if (selected.reduce((sum, file) => sum + file.size, 0) > 50 * 1024 * 1024) throw new Error('إجمالي المرفقات يجب ألا يتجاوز 50 ميجابايت.');
      for (const file of selected) await validateFiles([file]);
      if (Number(normalizeDigits(values.last_revenue_sar || '')) < 0) throw new Error('الإيراد يجب أن يكون صفرًا أو أكثر.');
    }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (pending || !hasIntent) return; setError(''); setPending(true);
    try {
      if (step < 2) { await validateStep(); changeStep(step + 1); return; }
      const details = Object.fromEntries(allFields.filter(field => field.type !== 'file' && !['name', 'phone', 'email'].includes(field.key)).map(field => [field.label, values[field.key]?.trim() || '']));
      const documents = companyDocuments.flatMap(field => files[field.key] ? [{ key: field.key, label: field.label, file: files[field.key]! }] : []);
      await submitCompanySale({ form_slug: executive ? 'company-sale-executive' : 'company-sale', form_title: title, name: values.name.trim(), phone: normalizeDigits(values.phone.trim()), email: values.email.trim(), fields: details, status: 'طلب جديد' }, documents, uploads.current);
      setSuccess(true); setFiles({}); setValues({}); uploads.current.clear();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر إرسال الطلب. حاول مرة أخرى.'); }
    finally { setPending(false); }
  };
  const control = (field: FormField) => <FormControl key={field.key} field={field} value={values[field.key] || ''} onChange={value => setValues(previous => ({ ...previous, [field.key]: value }))} file={files[field.key]} onFile={file => { setError(''); setFiles(previous => ({ ...previous, [field.key]: file })); }} />;
  return <Shell><main className="site-container page-body narrow-page interior-page interior-form-page company-sale-page">
    <Link className="back-link" to="/company-market">العودة إلى عالم التقبيل</Link>
    <header className="interior-intro"><div className="interior-intro-copy"><span className="eyebrow">بيع الشركة</span><h1>{title}</h1></div></header>
    {success ? <section role="status"><h2 ref={heading} tabIndex={-1}>تم استلام طلبكم</h2><p>{saleSuccess}</p><Link className="action action-primary" to="/company-market">العودة إلى عالم التقبيل</Link></section> : <>
      {!executive && step === 0 && <fieldset className="sale-intent" disabled={pending}>
        <legend>ما هدف طلبك؟</legend>
        <div className="sale-intent-options">{saleIntents.map(intent => <label key={intent.value} className="sale-intent-option">
          <input type="radio" name="request_intent" value={intent.value} checked={values.request_intent === intent.value} onChange={() => { setError(''); setValues(previous => ({ ...previous, request_intent: intent.value })); }} />
          <span>{intent.label}</span>
        </label>)}</div>
      </fieldset>}
      {hasIntent && <>
      <ol className="sale-steps" aria-label="مراحل الطلب">{['تسجيل البيانات', executive ? 'المستندات والأسعار' : 'البيانات التشغيلية', 'مراجعة وإرسال'].map((label, i) => <li key={label} aria-current={step === i ? 'step' : undefined}><span>{i + 1}</span>{label}</li>)}</ol>
      <h2 ref={heading} tabIndex={-1}>{step === 0 ? 'تسجيل البيانات' : step === 1 ? (executive ? 'مستندات الشركة والأسعار' : 'البيانات التشغيلية') : 'مراجعة الطلب'}</h2>
      <form onSubmit={event => void submit(event)} aria-busy={pending}>
        <fieldset disabled={pending} className="sale-fields">
          {step === 0 && <div className="form-grid">{firstFields.map(control)}</div>}
          {step === 1 && <>{executive && <p className="field-hint">يرجى إرفاق نسخ سارية ومحدثة من جميع المستندات المطلوبة. PDF أو JPEG أو PNG، حتى 5 ميجابايت للملف و50 ميجابايت إجمالًا.</p>}{groups.map(group => <section className="sale-field-group" key={group.title}><h3>{group.title}</h3><div className="form-grid">{group.fields.map(control)}</div></section>)}</>}
          {step === 2 && <dl className="sale-review">{allFields.filter(field => field.type === 'file' ? files[field.key] : values[field.key]).map(field => <div key={field.key}><dt>{field.label}</dt><dd>{field.type === 'file' ? files[field.key]?.name : values[field.key]}</dd></div>)}</dl>}
          <div className="sale-actions">{step > 0 && <button type="button" className="action action-secondary" onClick={() => changeStep(step - 1)}>رجوع</button>}<button type="submit" className="action action-primary">{pending ? 'جاري المعالجة...' : step === 2 ? 'إرسال الطلب' : 'التالي'}</button></div>
        </fieldset>
        {error && <p className="error" role="alert">{error}</p>}
      </form>
      </>}
    </>}
  </main></Shell>;
}
