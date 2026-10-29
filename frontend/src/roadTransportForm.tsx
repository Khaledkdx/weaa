import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Shell } from './shell';
import { FormControl } from './forms';
import { createJoinRequest } from './data';
import { contractMethods, transportContactFields, transportFields, transportRequest, transportRoles, transportServiceFields, transportStepError, vehicleFields, vehiclesFor, type TransportRole } from './roadTransport';
import type { FormField } from './types';

const stages = ['تسجيل البيانات', 'نوع الخدمة', 'تفاصيل الخدمة', 'مراجعة الطلب'];
export function RoadTransportPage() {
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<TransportRole | ''>('');
  const [selected, setSelected] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [methods, setMethods] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [step, success]);
  const move = (next: number) => { setStep(next); setError(''); window.scrollTo({ top: 0, behavior: 'instant' }); };
  const control = (field: FormField) => <FormControl key={field.key} field={field} value={values[field.key] || ''} onChange={value => setValues(previous => ({ ...previous, [field.key]: value }))} />;
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (pending) return; setError('');
    const invalid = transportStepError(step, role, selected, values, methods);
    if (invalid) { setError(invalid); return; }
    if (step < 3) { move(step + 1); return; }
    setPending(true);
    try {
      await createJoinRequest(transportRequest(role as TransportRole, selected, values, methods));
      setSuccess(true); setValues({}); setSelected([]); setMethods([]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر إرسال الطلب. بياناتك محفوظة في الصفحة؛ أعد المحاولة.'); }
    finally { setPending(false); }
  };
  return <Shell><main className="site-container page-body narrow-page interior-page interior-form-page road-transport-page">
    <Link className="back-link" to="/join-us">العودة إلى الفئات</Link>
    <header className="interior-intro"><div className="interior-intro-copy"><span className="eyebrow">النقل البري</span><h1>نموذج عملاء النقل البري</h1><p>سجّل بياناتك واحتياجك، وسيتواصل معك فريق وعاء.</p></div></header>
    {success ? <section role="status"><h2 ref={heading} tabIndex={-1}>تم إرسال الطلب بنجاح</h2><p>شكرًا لتعبئة البيانات. تم استلام طلبك بنجاح، وسوف تتم مراجعته والتواصل معك عبر بيانات الاتصال والبريد الإلكتروني المسجل.</p><Link className="action action-primary" to="/join-us">العودة إلى انضم إلينا</Link></section> : <>
      <ol className="sale-steps transport-steps" aria-label="مراحل الطلب">{stages.map((stage, index) => <li key={stage} aria-current={step === index ? 'step' : undefined}><span>{index + 1}</span>{stage}</li>)}</ol>
      <h2 ref={heading} tabIndex={-1}>{stages[step]}</h2>
      <form onSubmit={event => void submit(event)} aria-busy={pending}><fieldset disabled={pending} className="sale-fields">
        {step === 0 && <div className="form-grid">{transportContactFields.map(control)}</div>}
        {step === 1 && <fieldset className="sale-intent"><legend>حدد نوع الخدمة</legend><div className="sale-intent-options">{(Object.entries(transportRoles) as [TransportRole, string][]).map(([value, label]) => <label className="sale-intent-option" key={value}><input type="radio" name="transport-role" value={value} checked={role === value} onChange={() => {
          if (role !== value) { setRole(value); setSelected([]); setMethods([]); setValues(previous => Object.fromEntries(transportContactFields.map(field => [field.key, previous[field.key] || '']))); }
        }} /><span>{label}</span></label>)}</div></fieldset>}
        {step === 2 && role && <>
          <fieldset className="transport-vehicle-picker"><legend>نوع المركبات</legend><div className="transport-choice-grid">{vehiclesFor(role).map(vehicle => <label className="transport-choice" key={vehicle.id}><input type="checkbox" checked={selected.includes(vehicle.id)} onChange={() => setSelected(previous => previous.includes(vehicle.id) ? previous.filter(id => id !== vehicle.id) : [...previous, vehicle.id])} /><span>{vehicle.title}</span></label>)}</div></fieldset>
          {vehiclesFor(role).filter(vehicle => selected.includes(vehicle.id)).map(vehicle => <section className="sale-field-group" key={vehicle.id}><h3>{vehicle.title}</h3><div className="form-grid">{vehicleFields(vehicle.id, role, values).map(field => control({ ...field, label: `${vehicle.title}: ${field.label}` }))}</div></section>)}
          <section className="sale-field-group"><h3>تفاصيل التشغيل والتعاقد</h3><div className="form-grid">{transportServiceFields(role).map(control)}</div></section>
          {role === 'provider' && <fieldset className="transport-vehicle-picker"><legend>طريقة التعاقد</legend><div className="transport-choice-grid">{contractMethods.map(method => <label className="transport-choice" key={method}><input type="checkbox" checked={methods.includes(method)} onChange={() => setMethods(previous => previous.includes(method) ? previous.filter(item => item !== method) : [...previous, method])} /><span>{method}</span></label>)}</div></fieldset>}
        </>}
        {step === 3 && role && <dl className="sale-review"><div><dt>نوع الخدمة</dt><dd>{transportRoles[role]}</dd></div>{transportFields(role, selected, values).filter(field => values[field.key]?.trim()).map(field => <div key={field.key}><dt>{field.label}</dt><dd>{values[field.key]}</dd></div>)}{role === 'provider' && <div><dt>طريقة التعاقد</dt><dd>{contractMethods.filter(method => methods.includes(method)).join('، ')}</dd></div>}</dl>}
        <div className="sale-actions">{step > 0 && <button className="action action-secondary" type="button" onClick={() => move(step - 1)}>رجوع</button>}<button className="action action-primary" type="submit">{pending ? 'جاري الإرسال...' : step === 3 ? 'تأكيد وإرسال الطلب' : 'التالي'}</button></div>
      </fieldset>{error && <p className="error" role="alert">{error}</p>}</form>
    </>}
  </main></Shell>;
}
