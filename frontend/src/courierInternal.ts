export const courierCities = [
  'أبها', 'أبو عريش', 'أملج', 'الأحساء', 'الباحة', 'البدائع', 'البكيرية', 'الجبيل', 'الجموم', 'الجنوب',
  'الخبر', 'الخرج', 'الخرمة', 'الدمام', 'الدوادمي', 'الرس', 'الرياض', 'الزلفي', 'الشرقية', 'الشمال',
  'الطائف', 'الظهران', 'العلا', 'الغربية', 'القريات', 'القصيم', 'القطيف', 'القنفذة', 'الليث', 'المبرز',
  'المجمعة', 'المدينة المنورة', 'النماص', 'الهفوف', 'الوجه', 'بدر', 'بريدة', 'بلجرشي', 'بيشة', 'تبوك',
  'تربة', 'تيماء', 'ثول', 'جازان', 'جدة', 'حائل', 'حفر الباطن', 'خليص', 'خميس مشيط', 'رأس تنورة',
  'رابغ', 'رفحاء', 'رنية', 'سكاكا', 'شقراء', 'صامطة', 'صبيا', 'ضباء', 'طريف', 'عرعر', 'عفيف',
  'عنيزة', 'مكة المكرمة', 'نجران', 'وادي الدواسر', 'ينبع',
] as const;

const allowedCities = new Set<string>(courierCities);

export function serializeCourierCities(cities: string[]) {
  const unique = [...new Set(cities)];
  if (!unique.length) throw new Error('اختر مدينة واحدة على الأقل.');
  if (unique.length > 20) throw new Error('يمكن اختيار 20 مدينة كحد أقصى.');
  if (unique.some(city => !allowedCities.has(city))) throw new Error('اختر المدن من القائمة المعتمدة.');
  const city = unique.join('، ');
  if (city.length > 100) throw new Error('مجموع أسماء المدن يجب ألا يتجاوز 100 حرف.');
  return city;
}

export function prepareInternalCourierFields(values: Record<string, string>, cities: string[]) {
  const next: Record<string, string> = { ...values, city: serializeCourierCities(cities) };
  const count = next.sponsorship_transfer_count?.trim() || '';
  if (!count) {
    delete next.sponsorship_transfer_count;
  } else {
    if (!/^\d{1,3}$/.test(count) || Number(count) > 999) {
      throw new Error('عدد مرات نقل الكفالة يجب أن يكون عددًا صحيحًا من 0 إلى 999.');
    }
    next.sponsorship_transfer_count = count;
  }
  return next;
}

export function validIdentityExpiry(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  if (year < 1900 || year > 2200) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}
