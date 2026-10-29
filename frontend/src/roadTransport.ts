import type { FormField, JoinRequest } from './types';

export const roadTransportPath = '/join-us/road-transport';
export type TransportRole = 'provider' | 'customer';
export const transportRoles = { provider: 'مزود خدمة نقل', customer: 'طالب خدمة نقل' };
const field = (key: string, label: string, type: FormField['type'] = 'text', options: string[] = [], required = true): FormField => ({ key, label, type, options, required });
export const transportContactFields = [field('name', 'اسم العميل'), field('company_name', 'اسم الشركة'), field('phone', 'رقم الهاتف', 'phone'), field('email', 'البريد الإلكتروني', 'email')];
export const transportVehicles = [
  { id: 'van', title: 'فان' }, { id: 'hiace', title: 'هايس' }, { id: 'dyna', title: 'دينات' },
  { id: 'reefer', title: 'برادات' }, { id: 'trailer', title: 'تريلات' }, { id: 'tipper', title: 'قلابات' },
  { id: 'tanker', title: 'تانكر (صهريج)' }, { id: 'tractor', title: 'رأس تريلا' }, { id: 'other', title: 'أخرى' },
];
export const contractMethods = ['إيجار شهري', 'عقد سنوي', 'بالطلب'];
const years = Array.from({ length: 28 }, (_, i) => String(2027 - i));
const counts = Array.from({ length: 999 }, (_, i) => String(i + 1));
export function vehiclesFor(role: TransportRole) { return transportVehicles.filter(vehicle => role === 'provider' || vehicle.id !== 'tractor'); }
export function vehicleFields(id: string, role: TransportRole, values: Record<string, string>): FormField[] {
  if (id === 'other') return [field('other_description', 'نوع المركبات الأخرى ومواصفاتها', 'textarea')];
  const result: FormField[] = [];
  if (['van', 'hiace', 'dyna', 'reefer'].includes(id)) result.push(field(`${id}_type`, 'نوع المركبة', 'select', id === 'reefer' ? ['مبرد', 'مجمد'] : ['جاف', 'مبرد', 'مجمد']));
  if (id === 'trailer') {
    result.push(field('trailer_type', 'نوع التريلا', 'select', ['سطحة', 'ستارة', 'صندوق مغلق', 'حاويات (كونتينرز)', 'لوبيد', 'أخرى']));
    if (values.trailer_type === 'أخرى') result.push(field('trailer_other', 'نوع التريلا الآخر'));
  }
  result.push(field(`${id}_count`, 'العدد', 'select', counts), field(`${id}_year`, 'الموديل', 'select', years));
  if (role === 'provider') result.push(field(`${id}_condition`, 'حالة المركبة', 'select', ['جديدة', 'ممتازة', 'جيدة', 'متوسطة']));
  if (['dyna', 'reefer', 'trailer'].includes(id)) result.push(field(`${id}_size`, 'المقاس'), field(`${id}_capacity_tons`, 'الحمولة بالطن'));
  if (id === 'reefer') result.push(field('reefer_cooling_range', 'نطاق التبريد'));
  if (id === 'tipper') result.push(field('tipper_capacity_tons', 'الحمولة بالطن'));
  if (id === 'tanker') result.push(field('tanker_capacity_liters', 'السعة باللتر'));
  return result;
}
export function transportServiceFields(role: TransportRole): FormField[] {
  const fields = [
    field('driver', role === 'provider' ? 'هل يتوفر السائق مع المركبات؟' : 'هل ترغب بتوفر سائق مع المركبة؟', 'select', ['نعم', 'لا']),
    field('fuel', role === 'provider' ? 'هل تتحمل مصاريف الوقود؟' : 'هل ترغب أن توفر الشركة الوقود؟', 'select', ['نعم', 'لا']),
    field('city', 'المدينة'), field('work_scope', 'نطاق العمل', 'select', ['داخل المدينة', 'بين المدن', 'عمل دولي']),
  ];
  if (role === 'provider') fields.push(field('port_permit', 'هل يتوفر تصريح دخول الميناء؟', 'select', ['نعم', 'لا']));
  else fields.push(field('cargo_type', 'نوع الحمولة'), field('contract_method', 'طريقة التعاقد', 'select', contractMethods), field('contract_duration', 'مدة العقد المتوقعة'));
  fields.push(field('notes', 'ملاحظات أخرى', 'textarea', [], false));
  return fields;
}
export function transportFields(role: TransportRole, selected: string[], values: Record<string, string>): FormField[] {
  return [...transportContactFields, ...vehiclesFor(role).filter(vehicle => selected.includes(vehicle.id)).flatMap(vehicle => vehicleFields(vehicle.id, role, values).map(item => ({ ...item, label: `${vehicle.title}: ${item.label}` }))), ...transportServiceFields(role)];
}
const digits = (value: string) => value.replace(/[٠-٩۰-۹]/g, char => String(Math.max('٠١٢٣٤٥٦٧٨٩'.indexOf(char), '۰۱۲۳۴۵۶۷۸۹'.indexOf(char))));
export function transportStepError(step: number, role: TransportRole | '', selected: string[], values: Record<string, string>, methods: string[]) {
  if (step === 1) return role ? '' : 'اختر نوع الخدمة.';
  if (!role && step > 1) return 'اختر نوع الخدمة.';
  const fields = step === 0 ? transportContactFields : role ? transportFields(role, selected, values).filter(item => !transportContactFields.some(contact => contact.key === item.key)) : [];
  if (step >= 2 && (!selected.length || selected.some(id => !vehiclesFor(role as TransportRole).some(vehicle => vehicle.id === id)))) return 'اختر نوعًا واحدًا على الأقل من المركبات.';
  for (const item of fields) {
    const value = values[item.key]?.trim() || '';
    if (item.required && !value) return `أكمل حقل: ${item.label}.`;
    if (value && item.type === 'select' && !item.options.includes(value)) return `اختر قيمة صحيحة: ${item.label}.`;
    if (item.key.includes('_capacity_') && (!Number.isFinite(Number(digits(value).replace(/[٫,]/g, '.'))) || Number(digits(value).replace(/[٫,]/g, '.')) <= 0)) return `أدخل قيمة أكبر من صفر: ${item.label}.`;
  }
  if (step === 0) {
    if (!/^\+?[\d\s()-]+$/.test(digits(values.phone || '')) || !/^\d{8,15}$/.test(digits(values.phone || '').replace(/\D/g, ''))) return 'أدخل رقم هاتف صحيحًا من 8 إلى 15 رقمًا.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email || '')) return 'أدخل بريدًا إلكترونيًا صحيحًا.';
  }
  if (step >= 2 && role === 'provider' && (!methods.length || methods.some(method => !contractMethods.includes(method)))) return 'اختر طريقة تعاقد واحدة على الأقل.';
  return '';
}
export function transportRequest(role: TransportRole, selected: string[], values: Record<string, string>, methods: string[]): Omit<JoinRequest, 'id'> {
  const invalid = [transportStepError(0, role, selected, values, methods), transportStepError(2, role, selected, values, methods)].find(Boolean);
  if (invalid) throw new Error(invalid);
  const fields = Object.fromEntries(transportFields(role, selected, values).filter(item => !['name', 'phone', 'email'].includes(item.key) && values[item.key]?.trim()).map(item => [item.label, values[item.key].trim()]));
  fields['نوع الخدمة'] = transportRoles[role];
  fields['نوع المركبات'] = vehiclesFor(role).filter(vehicle => selected.includes(vehicle.id)).map(vehicle => vehicle.title).join('، ');
  if (role === 'provider') fields['طريقة التعاقد'] = contractMethods.filter(method => methods.includes(method)).join('، ');
  return { form_slug: 'road-transport', form_title: `النقل البري: ${transportRoles[role]}`, name: values.name.trim(), phone: digits(values.phone.trim()), email: values.email.trim(), fields, status: 'طلب جديد' };
}
