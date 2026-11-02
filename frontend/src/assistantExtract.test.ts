import { afterEach, describe, expect, it, vi } from 'vitest';
import { carriesMore, cityIn, extractLocally, extractValues, familyOf } from './assistantExtract';
import type { FieldInfo } from './assistantFill';

const name: FieldInfo = { kind: 'text', label: 'الاسم الكامل', required: true };
const phone: FieldInfo = { kind: 'tel', label: 'رقم الجوال', required: true };
const city: FieldInfo = { kind: 'text', label: 'في أي مدينة', required: true };
const company: FieldInfo = { kind: 'text', label: 'اسم الشركة', required: false };
const age: FieldInfo = { kind: 'number', label: 'العمر', required: true };
const count: FieldInfo = { kind: 'number', label: 'عدد المناديب المطلوب', required: true };
const license: FieldInfo = { kind: 'select', label: 'نوع الرخصة', required: true, options: [{ label: 'خصوصي', value: 'private' }, { label: 'عمومي', value: 'public' }, { label: 'لا توجد رخصة', value: 'none' }] };
const marital: FieldInfo = { kind: 'select', label: 'الحالة الاجتماعية', required: true, options: [{ label: 'أعزب', value: 'single' }, { label: 'متزوج', value: 'married' }] };
afterEach(() => vi.unstubAllGlobals());

describe('several answers in one breath', () => {
  it('knows what a field asks for from its label', () => {
    expect(familyOf('الاسم الكامل')).toBe('name');
    expect(familyOf('اسم الشركة')).toBe('company');
    expect(familyOf('في أي مدينة')).toBe('city');
    expect(familyOf('رقم الجوال')).toBe('phone');
    expect(familyOf('رقم الهوية')).toBeNull();
  });
  it('reads a name, a phone, a city, an age and named choices off one sentence', () => {
    expect(extractLocally('اسمي خالد محمد ورقمي 0512345678 ومن الرياض وعمري 25', [name, phone, city, age])).toEqual({ 'الاسم الكامل': 'خالد محمد', 'رقم الجوال': '0512345678', 'في أي مدينة': 'الرياض', 'العمر': '25' });
    expect(extractLocally('جوالي صفر خمسة واحد اثنين ثلاثة أربعة خمسة ستة سبعة ثمانية وساكن بجدة', [phone, city])).toEqual({ 'رقم الجوال': '0512345678', 'في أي مدينة': 'جدة' });
    expect(extractLocally('رخصتي خصوصي وأنا متزوج وأبغى خمسة مناديب', [license, marital, count])).toEqual({ 'نوع الرخصة': 'خصوصي', 'الحالة الاجتماعية': 'متزوج', 'عدد المناديب المطلوب': '5' });
    expect(extractLocally('خالد', [phone, city])).toEqual({});
    expect(cityIn('انا من الدمام')).toBe('الدمام');
  });
  it('tells a plain answer from a sentence that carries more', () => {
    expect(carriesMore('خالد محمد', name, [phone, city])).toBe(false);
    expect(carriesMore('خالد محمد ورقمي 0512345678', name, [phone, city])).toBe(true);
    expect(carriesMore('0512345678', phone, [name, city])).toBe(false);
    expect(carriesMore('الرياض', city, [name, company])).toBe(false);
  });
  it('asks the server for the harder sentences and keeps local digits over the model', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ values: { 'الاسم الكامل': 'خالد محمد العلي', 'رقم الجوال': '0599999999', 'غريب': 'x' } }), { status: 200 })));
    expect(await extractValues('انا خالد محمد العلي ورقمي 0512345678', [name, phone])).toEqual({ 'الاسم الكامل': 'خالد محمد العلي', 'رقم الجوال': '0512345678' });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(await extractValues('اسمي خالد ورقمي 0512345678', [name, phone])).toEqual({ 'الاسم الكامل': 'خالد', 'رقم الجوال': '0512345678' });
  });
});
