// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { describePage, discoverFields, formButtons, formErrors, readField, revealField, writeField } from './assistantForm';

// The shapes the site's forms use: a label wrapping a span and a control, option labels, a legend over a group, a
// collapsed group, a file picker with its own aria-label, and the form's buttons.
function mount(html: string) {
  document.body.innerHTML = `<main><h1>نموذج المناديب</h1><p>سجّل بياناتك.</p><form>${html}<div class="form-footer"><button class="action action-primary">التالي</button></div></form></main>`;
  return document.querySelector('form')!;
}
afterEach(() => { document.body.innerHTML = ''; });

describe('reading a form', () => {
  it('lists the fields in order with their labels, kinds and choices', () => {
    mount(`
      <label class="form-control"><span>الاسم الكامل<b aria-label="مطلوب"> *</b></span><input required value="" /></label>
      <label class="form-control"><span>رقم الجوال *</span><input type="tel" /></label>
      <label class="form-control"><span>نوع الرخصة</span><select><option value="">اختر</option><option value="private">خصوصي</option><option value="public">عمومي</option></select></label>
      <fieldset><legend>نوع الخدمة</legend><label><input type="radio" name="role" value="customer" /><span>عميل</span></label><label><input type="radio" name="role" value="provider" /><span>مزود</span></label></fieldset>
      <details class="inquiry-group"><summary><strong>مناديب</strong></summary><label class="inquiry-option"><input type="checkbox" /><span class="inquiry-check"><svg></svg></span><span><strong>مناديب نقل كفالة</strong><small>شرح</small></span></label><label class="inquiry-option"><input type="checkbox" /><span><strong>مناديب عقد أجير</strong></span></label></details>
      <label class="form-control"><span>أوافق على الشروط</span><input type="checkbox" /></label>
      <div class="form-control"><span>الهوية *</span><div class="file-picker"><input aria-label="الهوية" type="file" /></div></div>
      <input type="hidden" value="x" /><input type="search" />`);
    const fields = discoverFields();
    expect(fields.map(field => [field.kind, field.label])).toEqual([
      ['text', 'الاسم الكامل'], ['tel', 'رقم الجوال'], ['select', 'نوع الرخصة'], ['radio', 'نوع الخدمة'], ['checkboxes', 'مناديب'], ['checkbox', 'أوافق على الشروط'], ['file', 'الهوية'],
    ]);
    expect(fields[0].required).toBe(true);
    expect(fields[2].options?.map(option => option.label)).toEqual(['خصوصي', 'عمومي']);
    expect(fields[3].options?.map(option => option.value)).toEqual(['customer', 'provider']);
    expect(fields[4].options?.map(option => option.label)).toEqual(['مناديب نقل كفالة', 'مناديب عقد أجير']);
    // Boxes without values of their own are told apart by their labels, so choosing one never checks the other.
    expect(fields[4].options?.map(option => option.value)).toEqual(['مناديب نقل كفالة', 'مناديب عقد أجير']);
    expect(writeField(fields[4], 'مناديب نقل كفالة', ['مناديب نقل كفالة'])).toBe(true);
    expect(readField(fields[4])).toBe('مناديب نقل كفالة');
  });

  it('writes values the way a visitor would, so change handlers run, and reads them back', () => {
    const form = mount(`
      <label class="form-control"><span>الاسم</span><input /></label>
      <label class="form-control"><span>نوع الرخصة</span><select><option value="">اختر</option><option value="private">خصوصي</option></select></label>
      <fieldset><legend>نوع الخدمة</legend><label><input type="radio" name="role" value="customer" /><span>عميل</span></label><label><input type="radio" name="role" value="provider" /><span>مزود</span></label></fieldset>
      <fieldset><legend>المدن</legend><label><input type="checkbox" value="riyadh" /><span>الرياض</span></label><label><input type="checkbox" value="jeddah" /><span>جدة</span></label></fieldset>`);
    const heard: string[] = [];
    form.addEventListener('input', event => heard.push(`input:${(event.target as HTMLInputElement).value}`));
    form.addEventListener('change', event => heard.push(`change:${(event.target as HTMLInputElement).value}`));
    const [name, license, role, cities] = discoverFields();
    expect(writeField(name, 'خالد')).toBe(true);
    expect(readField(name)).toBe('خالد');
    expect(writeField(license, 'private')).toBe(true);
    expect(readField(license)).toBe('خصوصي');
    expect(writeField(role, 'provider')).toBe(true);
    expect(readField(role)).toBe('مزود');
    expect(writeField(cities, 'الرياض، جدة', ['riyadh', 'jeddah'])).toBe(true);
    expect(readField(cities)).toBe('الرياض، جدة');
    expect(heard).toContain('input:خالد');
    expect(heard).toContain('change:private');
    expect(heard).toContain('change:provider');
  });

  it('points at the field being asked about, finds the buttons and reads the page', () => {
    mount(`<label class="form-control"><span>الاسم</span><input /></label><p class="error" role="alert">أدخل الاسم.</p>`);
    const [name] = discoverFields();
    const pointed = vi.fn();
    window.addEventListener('assistant-target', pointed);
    revealField(name);
    expect(name.element.hasAttribute('data-assistant-target')).toBe(true);
    expect(pointed).toHaveBeenCalled();
    expect(formButtons().next?.textContent).toContain('التالي');
    expect(formButtons().submit).toBeUndefined();
    expect(formErrors()).toEqual(['أدخل الاسم.']);
    expect(describePage()).toContain('هذه صفحة نموذج المناديب.');
    expect(describePage()).toContain('خانات: الاسم');
  });
});
