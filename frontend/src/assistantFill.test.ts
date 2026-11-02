import { describe, expect, it } from 'vitest';
import { cleanText, commandOf, interpret, parseDate, pickOption, pickOptions, question, spokenDate, spokenDigits, spokenEmail, spokenNumber } from './assistantFill';

const license = { kind: 'select' as const, label: 'نوع الرخصة', required: true, options: [{ label: 'خصوصي', value: 'private' }, { label: 'عمومي', value: 'public' }, { label: 'نقل خفيف', value: 'light' }, { label: 'نقل ثقيل', value: 'heavy' }, { label: 'لا توجد رخصة', value: 'none' }] };
const yesNo = { kind: 'select' as const, label: 'هل تملك سيارة', required: true, options: [{ label: 'نعم', value: '1' }, { label: 'لا', value: '0' }] };
const cities = { kind: 'checkboxes' as const, label: 'المدن', required: false, options: ['الرياض', 'جدة', 'الدمام', 'مكة المكرمة'].map(city => ({ label: city, value: city })) };

describe('numbers said in Arabic', () => {
  it('reads digits one by one, in pairs, and as numerals', () => {
    expect(spokenDigits('صفر خمسة واحد اثنين ثلاثة أربعة خمسة ستة سبعة ثمانية')).toBe('0512345678');
    expect(spokenDigits('صفر خمسة واحد خمسة وعشرين ثلاثين أربعين')).toBe('051253040');
    expect(spokenDigits('خمسة عشر')).toBe('15');
    expect(spokenDigits('رقمي ٠٥٥١٢٣٤٥٦٧')).toBe('0551234567');
    expect(spokenDigits('0 5 0 1 1 1 2 2 3 3')).toBe('0501112233');
  });
  it('understands whole numbers', () => {
    expect(spokenNumber('خمسة')).toBe(5);
    expect(spokenNumber('خمسة وعشرين')).toBe(25);
    expect(spokenNumber('مية وخمسة')).toBe(105);
    expect(spokenNumber('ألفين وعشرين')).toBe(2020);
    expect(spokenNumber('ثلاث آلاف وخمسمية')).toBe(3500);
    expect(spokenNumber('12 مندوب')).toBe(12);
    expect(spokenNumber('ما أدري')).toBeNull();
  });
  it('reads a date however it is said: numerals, month names in any dialect, ordinals, two-digit years', () => {
    expect(spokenDate('عشرين خمسة ألفين وثلاثين')).toBe('2030-05-20');
    expect(spokenDate('20/5/2030')).toBe('2030-05-20');
    expect(spokenDate('19/5/1999')).toBe('1999-05-19');
    expect(spokenDate('١٩/٥/١٩٩٩')).toBe('1999-05-19');
    expect(spokenDate('2031-01-07')).toBe('2031-01-07');
    expect(spokenDate('19 فبراير 1999')).toBe('1999-02-19');
    expect(spokenDate('التاسع عشر من فبراير 1999')).toBe('1999-02-19');
    expect(spokenDate('الخامس والعشرين من شباط 2030')).toBe('2030-02-25');
    expect(spokenDate('19 5 99')).toBe('1999-05-19');
    expect(spokenDate('1 يناير 30')).toBe('2030-01-01');
    expect(spokenDate('خمسة عشر مايو ألفين وتسعة وعشرين')).toBe('2029-05-15');
    expect(spokenDate('20 من الشهر الخامس 2030')).toBe('2030-05-20');
    expect(parseDate('19 فبراير 1999')?.spoken).toBe('19 فبراير 1999');
    expect(spokenDate('بكرة')).toBeNull();
    expect(spokenDate('19 فبراير')).toBeNull();
  });
  it('converts a Hijri date (the tabular calendar, within a day of the official one) and says it both ways', () => {
    expect(spokenDate('1 محرم 1447')).toBe('2025-06-27');
    expect(spokenDate('15/9/1450')).toBe('2029-01-30');
    expect(spokenDate('15 رمضان 50')).toBe('2029-01-30');
    expect(parseDate('خمسة عشر رمضان ألف وأربعمية وخمسين')?.spoken).toBe('15 رمضان 1450 هجري، يعني 30 يناير 2029 ميلادي تقريباً');
  });
  it('spells an email address from the way people say it', () => {
    expect(spokenEmail('khalid at gmail dot com')).toBe('khalid@gmail.com');
    expect(spokenEmail('khalid آت جيميل نقطة كوم')).toBe('khalid@gmail.com');
    expect(spokenEmail('ما عندي ايميل')).toBeNull();
  });
});

describe('choices and plain words', () => {
  it('matches what was said to an option, by words, by order, or by yes and no', () => {
    expect(pickOption(license.options, 'نقل خفيف')?.value).toBe('light');
    expect(pickOption(license.options, 'رخصتي عمومي')?.value).toBe('public');
    expect(pickOption(license.options, 'الثالث')?.value).toBe('light');
    expect(pickOption(license.options, 'ما عندي رخصة')?.value).toBe('none');
    expect(pickOption(yesNo.options, 'ايوه عندي')?.value).toBe('1');
    expect(pickOption(license.options, 'طائرة')).toBeNull();
  });
  it('picks several options from one sentence', () => {
    expect(pickOptions(cities.options, 'الرياض وجدة').map(city => city.value)).toEqual(['الرياض', 'جدة']);
    expect(pickOptions(cities.options, 'مكة').map(city => city.value)).toEqual(['مكة المكرمة']);
  });
  it('drops the words around a name or a city', () => {
    expect(cleanText('اسمي خالد محمد العلي', 'الاسم')).toBe('خالد محمد العلي');
    expect(cleanText('الاسم خالد', 'الاسم')).toBe('خالد');
    expect(cleanText('انا من الرياض', 'المدينة')).toBe('الرياض');
    expect(cleanText('شركة النور للتجارة.', 'اسم الشركة')).toBe('شركة النور للتجارة');
  });
  it('knows the words that drive the filling', () => {
    expect(commandOf('وقف خلاص')).toBe('stop');
    expect(commandOf('تخطي')).toBe('skip');
    expect(commandOf('ارجع للي قبله')).toBe('back');
    expect(commandOf('عيد السؤال')).toBe('repeat');
    expect(commandOf('اقرأ لي الصفحة')).toBe('read');
    expect(commandOf('تم رفعت الملف')).toBe('done');
    expect(commandOf('ايوه صح')).toBe('yes');
    expect(commandOf('لا غلط')).toBe('no');
    expect(commandOf('خالد')).toBeNull();
  });
});

describe('interpreting an answer for a field', () => {
  it('writes a phone number only when it has enough digits', () => {
    const phone = { kind: 'tel' as const, label: 'رقم الجوال', required: true };
    expect(interpret(phone, 'صفر خمسة واحد اثنين ثلاثة أربعة خمسة ستة سبعة ثمانية')).toMatchObject({ value: '0512345678' });
    expect(interpret(phone, 'خمسة')).toHaveProperty('ask');
  });
  it('writes numbers, dates, options and plain text, and asks again when it cannot', () => {
    expect(interpret({ kind: 'number', label: 'عدد المناديب المطلوب', required: true }, 'خمسة مناديب')).toMatchObject({ value: '5' });
    expect(interpret({ kind: 'date', label: 'تاريخ انتهاء الهوية', required: true }, 'عشرين خمسة ألفين وثلاثين')).toMatchObject({ value: '2030-05-20' });
    expect(interpret(license, 'نقل ثقيل')).toMatchObject({ value: 'heavy', spoken: 'نقل ثقيل' });
    expect(interpret(license, 'دراجة')).toHaveProperty('ask');
    expect(interpret(cities, 'الرياض وجدة')).toMatchObject({ values: ['الرياض', 'جدة'] });
    expect(interpret({ kind: 'checkbox', label: 'أوافق على الشروط', required: true }, 'موافق')).toMatchObject({ value: 'yes' });
    expect(interpret({ kind: 'text', label: 'الاسم الكامل', required: true }, 'اسمي خالد محمد')).toMatchObject({ value: 'خالد محمد' });
    expect(interpret({ kind: 'text', label: 'الاسم', required: true }, 'تخطي')).toEqual({ command: 'skip' });
    expect(interpret({ kind: 'text', label: 'الاسم', required: true }, 'خالد محمد ورقمي 0512345678')).toMatchObject({ value: 'خالد محمد' });
    expect(interpret({ kind: 'date', label: 'تاريخ انتهاء الهوية', required: true }, '19 فبراير 1999')).toMatchObject({ value: '1999-02-19', spoken: '19 فبراير 1999' });
    expect(interpret({ kind: 'file', label: 'الهوية', required: true }, 'تم')).toEqual({ command: 'done' });
  });
  it('asks for each kind of field in its own words', () => {
    expect(question({ kind: 'text', label: 'الاسم الكامل', required: true })).toBe('قل لي اسمك الكامل.');
    expect(question({ kind: 'tel', label: 'رقم الجوال', required: true })).toContain('رقم رقم');
    expect(question(license)).toContain('خصوصي، عمومي');
    expect(question({ kind: 'select', label: 'هل تملك سيارة؟', required: true, options: [{ label: 'نعم', value: '1' }, { label: 'لا', value: '0' }] })).toBe('هل تملك سيارة؟ قل نعم أو لا.');
    expect(question({ kind: 'file', label: 'الهوية', required: true })).toContain('مطلوب منك مرفق الهوية');
    expect(question({ kind: 'file', label: 'مستندات إضافية', required: false })).toContain('قل: تخطي');
  });
});
