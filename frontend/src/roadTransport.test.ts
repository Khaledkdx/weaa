import { describe, expect, it } from 'vitest';
import { transportRequest, transportStepError, vehicleFields, vehiclesFor } from './roadTransport';
const contact = { name: 'عميل اختبار', company_name: 'شركة اختبار', phone: '+966 512345678', email: 'test@example.com' };
const provider = { ...contact, trailer_type: 'أخرى', trailer_other: 'ناقلة معدات', trailer_count: '2', trailer_year: '2027', trailer_condition: 'ممتازة', trailer_size: '12 متر', trailer_capacity_tons: '٢٠٫٥', tanker_count: '1', tanker_year: '2000', tanker_condition: 'جيدة', tanker_capacity_liters: '10000', driver: 'نعم', fuel: 'لا', city: 'جدة', work_scope: 'بين المدن', port_permit: 'نعم', notes: 'ملاحظات اختبار', cargo_type: 'قيمة قديمة لا ترسل', van_count: '999' };
describe('road transport requirements', () => {
  it('keeps all active provider details, excludes hidden fields, and preserves multiple contract methods', () => {
    const result = transportRequest('provider', ['trailer', 'tanker'], provider, ['إيجار شهري', 'بالطلب']);
    expect(result).toMatchObject({ form_slug: 'road-transport', phone: '+966 512345678', fields: {
      'اسم الشركة': 'شركة اختبار', 'نوع الخدمة': 'مزود خدمة نقل', 'نوع المركبات': 'تريلات، تانكر (صهريج)',
      'تريلات: نوع التريلا الآخر': 'ناقلة معدات', 'تريلات: الحمولة بالطن': '٢٠٫٥', 'تانكر (صهريج): السعة باللتر': '10000', 'طريقة التعاقد': 'إيجار شهري، بالطلب', 'هل تتحمل مصاريف الوقود؟': 'لا',
    } });
    expect(JSON.stringify(result.fields)).not.toContain('قيمة قديمة لا ترسل');
    expect(result.fields['فان: العدد']).toBeUndefined();
    const standard = transportRequest('provider', ['trailer', 'tanker'], { ...provider, trailer_type: 'سطحة' }, ['عقد سنوي']);
    expect(standard.fields['تريلات: نوع التريلا الآخر']).toBeUndefined();
  });
  it('requires valid counts, years, capacities, and provider contract methods', () => {
    expect(transportStepError(2, 'provider', [], provider, [])).toContain('المركبات');
    expect(transportStepError(2, 'provider', ['trailer', 'tanker'], { ...provider, trailer_count: '1000' }, ['بالطلب'])).toContain('قيمة صحيحة');
    expect(transportStepError(2, 'provider', ['trailer', 'tanker'], { ...provider, trailer_year: '2028' }, ['بالطلب'])).toContain('قيمة صحيحة');
    expect(transportStepError(2, 'provider', ['trailer', 'tanker'], { ...provider, tanker_capacity_liters: '-1' }, ['بالطلب'])).toContain('أكبر من صفر');
    expect(transportStepError(2, 'provider', ['trailer', 'tanker'], provider, [])).toContain('طريقة تعاقد');
  });
  it('uses customer-specific fields without vehicle condition or provider permits', () => {
    const customer = { ...contact, reefer_type: 'مجمد', reefer_count: '1', reefer_year: '2020', reefer_size: '10 متر', reefer_capacity_tons: '8', reefer_cooling_range: '-18', driver: 'لا', fuel: 'نعم', city: 'الرياض', work_scope: 'داخل المدينة', cargo_type: 'مواد غذائية', contract_method: 'عقد سنوي', contract_duration: 'سنة', port_permit: 'نعم', reefer_condition: 'جديدة' };
    const result = transportRequest('customer', ['reefer'], customer, []);
    expect(result.fields).toMatchObject({ 'نوع الخدمة': 'طالب خدمة نقل', 'برادات: نطاق التبريد': '-18', 'نوع الحمولة': 'مواد غذائية', 'مدة العقد المتوقعة': 'سنة', 'هل ترغب أن توفر الشركة الوقود؟': 'نعم' });
    expect(result.fields['هل يتوفر تصريح دخول الميناء؟']).toBeUndefined();
    expect(result.fields['برادات: حالة المركبة']).toBeUndefined();
    expect(vehiclesFor('customer').some(vehicle => vehicle.id === 'tractor')).toBe(false);
    expect(vehicleFields('reefer', 'customer', customer).find(field => field.key === 'reefer_type')?.options).toEqual(['مبرد', 'مجمد']);
  });
  it('validates contact details and requires a custom trailer type when selected', () => {
    expect(transportStepError(0, '', [], { ...contact, email: 'invalid' }, [])).toContain('بريدًا');
    expect(transportStepError(0, '', [], { ...contact, phone: '123' }, [])).toContain('هاتف');
    expect(transportStepError(2, 'provider', ['trailer', 'tanker'], { ...provider, trailer_other: '' }, ['بالطلب'])).toContain('نوع التريلا الآخر');
    expect(() => transportRequest('provider', ['trailer'], { ...provider, name: '' }, ['بالطلب'])).toThrow('اسم العميل');
  });
});
