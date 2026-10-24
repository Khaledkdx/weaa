import { useMemo, useState, type FormEvent } from 'react';
import { Icon } from '@iconify/react';
import { createJoinRequest } from './data';
import { prepareInternalCarSubmission } from './courierCar';
import { courierCities, prepareInternalCourierFields, validIdentityExpiry } from './courierInternal';
import { courierForms } from './seed';
import type { FormDefinition, FormField } from './types';

export { FormControl, validateFiles };

const courierOptions: Record<string, Record<string, string>> = {
  license_type: { private: 'خصوصي', public: 'عمومي', light: 'نقل خفيف', heavy: 'نقل ثقيل', motorcycle: 'دراجة نارية', equipment: 'معدات / أشغال عامة', none: 'لا توجد رخصة', other: 'أخرى' },
  marital_status: { single: 'أعزب', married: 'متزوج', divorced: 'مطلق', widowed: 'أرمل' },
  can_relocate: { '1': 'نعم', '0': 'لا' }, has_license: { '1': 'نعم', '0': 'لا' }, owns_car: { '1': 'نعم', '0': 'لا' },
};
const courierSections = (internal: boolean) => ({
  ...(internal ? { identity_files: 'الهوية / الإقامة', residency_files: 'مستندات الإقامة' } : { passport_files: 'جواز السفر' }),
  license_files: 'الرخصة', photo_files: 'الصورة الشخصية', additional_files: 'مستندات إضافية',
});
export const normalizeDigits = (value: string) => value.replace(/[٠-٩۰-۹]/g, digit => {
  const arabic = '٠١٢٣٤٥٦٧٨٩'; const persian = '۰۱۲۳۴۵۶۷۸۹';
  return String(Math.max(arabic.indexOf(digit), persian.indexOf(digit)));
});
export function saudiMobile(value: string) {
  let digits = normalizeDigits(value).replace(/\D/g, '');
  if (digits.startsWith('966')) digits = digits.slice(3);
  if (digits.startsWith('0') && digits.length === 10) digits = digits.slice(1);
  return digits;
}
function FormControl({ field, value, onChange, file, onFile }: { field: FormField; value: string; onChange: (next: string) => void; file?: File; onFile?: (next?: File) => void }) {
  const type = field.type;
  const options = courierOptions[field.key] || Object.fromEntries(field.options.map(option => [option, option]));
  if (type === 'file') return <div className="form-control">
    <span>{field.label}{field.required && <b aria-label="مطلوب"> *</b>}</span>
    <FilePicker label={field.label} required={field.required && !file} onFiles={selected => onFile?.(selected[0])} />
    {file && <button className="inline-remove" type="button" onClick={() => onFile?.(undefined)}>إزالة {file.name}</button>}
  </div>;
  const autoComplete = ({ name: 'name', full_name: 'name', phone: 'tel', email: 'email', city: 'address-level2', country: 'country-name' } as Record<string, string>)[field.key];
  return <label className={`form-control ${['multiline', 'textarea', 'details'].includes(type) ? 'form-wide' : ''}`}><span>{field.label}{field.required && <b aria-label="مطلوب"> *</b>}</span>
    {type === 'select' ? <select required={field.required} value={value} onChange={event => onChange(event.target.value)}><option value="">{field.key === 'owns_car' ? 'غير محدد' : 'اختر'}</option>{Object.entries(options).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select> :
        ['multiline', 'textarea', 'details'].includes(type) ? <textarea required={field.required} value={value} onChange={event => onChange(event.target.value)} rows={4} /> :
          <input required={field.required} autoComplete={autoComplete} dir={['phone', 'email', 'number', 'date'].includes(type) ? 'ltr' : undefined} type={field.key === 'sponsorship_transfer_count' ? 'text' : type === 'phone' ? 'tel' : type} inputMode={type === 'phone' ? 'tel' : type === 'number' || field.key === 'car_year' ? 'numeric' : undefined} minLength={field.key === 'car_model' ? 2 : undefined} maxLength={field.key === 'car_model' ? 160 : field.key === 'car_year' ? 4 : undefined} pattern={field.key === 'car_year' ? '[0-9٠-٩۰-۹]{4}' : undefined} value={value} onChange={event => onChange(event.target.value)} />}
  </label>;
}
function FilePicker({ label, multiple = false, required = false, onFiles }: { label: string; multiple?: boolean; required?: boolean; onFiles: (files: File[]) => void }) {
  return <div className="file-picker">
    <Icon icon="solar:upload-minimalistic-linear" />
    <span>{multiple ? 'اختيار الملفات' : 'اختيار ملف'}</span>
    <input aria-label={label} type="file" multiple={multiple} required={required} accept=".pdf,.jpg,.jpeg,.png" onChange={event => {
      const selected = Array.from(event.currentTarget.files || []);
      if (selected.length) onFiles(selected);
      event.currentTarget.value = '';
    }} />
  </div>;
}
function CourierCityPicker({ label, selected, onChange }: { label: string; selected: string[]; onChange: (next: string[]) => void }) {
  const [query, setQuery] = useState('');
  const currentLength = selected.join('، ').length;
  const filtered = courierCities.filter(city => city.includes(query.trim()));
  return <div className="courier-city-picker courier-field">
    <span className="city-picker-label">{label} <b aria-label="مطلوب">*</b></span>
    <details className="city-picker-menu"><summary>{selected.length ? `المدن المختارة (${selected.length})` : 'اختر المدن'}</summary>
      <div className="city-picker-content">
        <label className="form-control"><span>ابحث عن مدينة</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
        <div className="city-picker-results" role="group" aria-label="المدن المتاحة">{filtered.map(city => {
          const checked = selected.includes(city);
          const wouldExceed = !checked && (selected.length >= 20 || [...selected, city].join('، ').length > 100);
          return <label className="city-picker-option" key={city}><input type="checkbox" checked={checked} disabled={wouldExceed} onChange={() => onChange(checked ? selected.filter(item => item !== city) : [...selected, city])} /><span>{city}</span></label>;
        })}{!filtered.length && <p className="field-hint">لا توجد مدينة مطابقة.</p>}</div>
      </div>
    </details>
    {!!selected.length && <div className="city-picker-selected">{selected.map(city => <button type="button" key={city} onClick={() => onChange(selected.filter(item => item !== city))} aria-label={`إزالة ${city}`}>{city} ×</button>)}</div>}
    <span className="field-hint">{currentLength} من 100 حرف · حتى 20 مدينة</span>
  </div>;
}
function SubmitState({ pending, error, success, code }: { pending: boolean; error: string; success: string; code?: string }) {
  return <div className="submit-state" aria-live="polite">{pending && <span>جاري الإرسال...</span>}{error && <p className="error" role="alert">{error}</p>}{success && <p className="success" role="status">{success}{code && <><br />كود الطلب: {code}</>}</p>}</div>;
}

export function DynamicForm({ form }: { form: FormDefinition }) {
  const [values, setValues] = useState<Record<string, string>>({}); const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [pending, setPending] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (pending) return; setError(''); setSuccess('');
    const missingFile = form.fields.find(field => field.type === 'file' && field.required && !files[field.key]);
    if (missingFile) { setError(`أرفق ${missingFile.label}.`); return; }
    const file = Object.values(files).find(Boolean);
    if (file && file.size > 5 * 1024 * 1024) { setError('الملف يجب ألا يتجاوز 5 ميجابايت.'); return; }
    setPending(true);
    try { await createJoinRequest({ form_slug: form.slug, form_title: form.title, name: values.name || values.full_name || '', phone: normalizeDigits(values.phone || ''), email: values.email || '', fields: Object.fromEntries(Object.entries(values).filter(([key]) => !['name', 'full_name', 'phone', 'email'].includes(key))), status: 'طلب جديد', created_at_label: new Date().toLocaleDateString('ar-SA') }, file); setSuccess('تم إرسال طلب الانضمام بنجاح.'); setValues({}); setFiles({}); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر إرسال الطلب.'); } finally { setPending(false); }
  };
  return <form className="form-grid" onSubmit={event => void submit(event)}>{form.fields.map(field => <FormControl key={field.key} field={field} value={values[field.key] || ''} onChange={value => setValues(previous => ({ ...previous, [field.key]: value }))} file={files[field.key]} onFile={file => setFiles(previous => ({ ...previous, [field.key]: file }))} />)}<div className="form-footer"><button className="action action-primary" disabled={pending}>{pending ? 'جاري الإرسال...' : 'إرسال الطلب'}</button><SubmitState pending={pending} error={error} success={success} /></div></form>;
}

async function validateFiles(files: File[]) {
  if (files.length > 10) throw new Error('الحد الأقصى 10 ملفات.');
  if (files.reduce((sum, file) => sum + file.size, 0) > 20 * 1024 * 1024) throw new Error('إجمالي المرفقات يجب ألا يتجاوز 20 ميجابايت.');
  for (const file of files) {
    if (file.size > 5 * 1024 * 1024) throw new Error(`الملف ${file.name} يتجاوز 5 ميجابايت.`);
    const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    const pdf = head[0] === 37 && head[1] === 80 && head[2] === 68 && head[3] === 70;
    const jpeg = head[0] === 255 && head[1] === 216 && head[2] === 255;
    const png = head[0] === 137 && head[1] === 80 && head[2] === 78 && head[3] === 71;
    if (!pdf && !jpeg && !png) throw new Error(`نوع الملف ${file.name} غير مدعوم. استخدم PDF أو JPEG أو PNG.`);
  }
}

export function CourierForm({ form }: { form: FormDefinition }) {
  const internal = form.submissionType === 'courier-internal'; const canonical = courierForms[internal ? 0 : 1];
  const fields = useMemo(() => canonical.fields.map(field => ({ ...field, label: form.fields.find(item => item.key === field.key)?.label || field.label })), [form, canonical]);
  const [values, setValues] = useState<Record<string, string>>({}); const [files, setFiles] = useState<Record<string, File[]>>({});
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [pending, setPending] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState(''); const [code, setCode] = useState('');
  const sections = courierSections(internal);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (pending) return; setError(''); setSuccess(''); setCode('');
    let normalized = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, normalizeDigits(value.trim())]));
    let submissionFiles = files;
    if (internal) {
      try {
        normalized = prepareInternalCourierFields(normalized, selectedCities);
        const prepared = prepareInternalCarSubmission(normalized, files);
        normalized = prepared.values;
        submissionFiles = prepared.files;
      } catch (cause) { setError(cause instanceof Error ? cause.message : 'تحقق من بيانات السيارة.'); return; }
      const phone = saudiMobile(normalized.phone || '');
      if (!/^5[0-9]{8}$/.test(phone)) { setError('رقم الجوال السعودي: 9 أرقام تبدأ بـ 5 بعد +966.'); return; }
      normalized.phone = `+966${phone}`;
      if (normalized.identity_number && !/^\d{10}$/.test(normalized.identity_number)) { setError('رقم الهوية يجب أن يكون 10 أرقام.'); return; }
      const date = normalized.identity_expires_on || '';
      if (!validIdentityExpiry(date)) { setError('اختر تاريخ انتهاء هوية ميلاديًا صحيحًا بين 1900 و2200.'); return; }
    } else {
      const digits = (normalized.phone || '').replace(/\D/g, '');
      if (digits.length < 8 || digits.length > 15) { setError('أدخل رقم تواصل صحيحًا من 8 إلى 15 رقمًا.'); return; }
      const age = Number(normalized.age);
      if (!Number.isInteger(age) || age < 1 || age > 120) { setError('أدخل سنًا صحيحًا.'); return; }
    }
    setPending(true);
    try {
      await validateFiles(Object.values(submissionFiles).flat());
      const payload = new FormData();
      for (const [key, value] of Object.entries(normalized)) payload.append(key, value);
      for (const [key, list] of Object.entries(submissionFiles)) for (const file of list) payload.append(key, file, file.name);
      const response = await fetch(`https://app.swarsafqa.com/api/public/courier-applications/${internal ? 'internal' : 'external'}`, { method: 'POST', body: payload, credentials: 'omit' });
      const result = await response.json().catch(() => ({}));
      if (response.status !== 201 || result.success !== true) throw new Error(result.message || `تعذر إرسال الطلب (${response.status}).`);
      setSuccess(result.message || 'تم إرسال الطلب بنجاح.'); setCode(result.application_code || ''); setValues({}); setFiles({}); setSelectedCities([]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر الاتصال بنظام المناديب. قد يحتاج الخادم إلى تفعيل CORS لهذا النطاق.'); }
    finally { setPending(false); }
  };
  const visibleFields = fields.filter(field => !internal || !['car_model', 'car_year'].includes(field.key) || values.owns_car === '1');
  const visibleSections = internal && values.owns_car === '1' ? { ...sections, registration_files: 'استمارة السيارة' } : sections;
  return <form className="form-grid" onSubmit={event => void submit(event)}>{visibleFields.map(field => field.key === 'city' && internal ? <CourierCityPicker key={field.key} label={field.label} selected={selectedCities} onChange={setSelectedCities} /> : <div key={field.key} className="courier-field"><FormControl field={field} value={values[field.key] || ''} onChange={value => {
      if (field.key === 'owns_car') {
        setValues(previous => ({ ...previous, owns_car: value, car_model: '', car_year: '' }));
        setFiles(previous => { const next = { ...previous }; delete next.registration_files; return next; });
      } else setValues(previous => ({ ...previous, [field.key]: field.key === 'phone' && internal ? saudiMobile(value).slice(0, 9) : value }));
    }} />{field.key === 'phone' && internal && <span className="field-hint">رمز المملكة +966 · {saudiMobile(values.phone || '').length} من 9 أرقام</span>}</div>)}
    <div className="attachments"><h2>المرفقات <small>اختيارية، PDF أو JPEG أو PNG</small></h2><div className="attachments-grid">{Object.entries(visibleSections).map(([key, label]) => <div className="attachment-control" key={key}><strong>{label}</strong><FilePicker label={label} multiple onFiles={selected => setFiles(previous => ({ ...previous, [key]: [...(previous[key] || []), ...selected] }))} />{(files[key] || []).map((file, index) => <div className="file-row" key={`${file.name}-${index}`}><span>{file.name}</span><button type="button" aria-label={`إزالة ${file.name}`} onClick={() => setFiles(previous => ({ ...previous, [key]: previous[key].filter((_, i) => i !== index) }))}>إزالة</button></div>)}</div>)}</div><p className="field-hint">حتى 10 ملفات، 5 ميجابايت للملف و20 ميجابايت إجمالًا.</p></div>
    <div className="form-footer"><button className="action action-primary" disabled={pending}>{pending ? 'جاري الإرسال...' : 'إرسال الطلب'}</button><SubmitState pending={pending} error={error} success={success} code={code} /></div>
  </form>;
}
