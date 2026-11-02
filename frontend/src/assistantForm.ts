// Reads the form on the current page and writes into it, with nothing but the DOM: the orb fills forms the way a helper
// at the visitor's side would, through the same fields and buttons, so the forms' own validation and submission run.
import type { FieldInfo, FieldKind } from './assistantFill';

export type Choice = { label: string; value: string; element: HTMLInputElement | HTMLOptionElement };
export type FormField = FieldInfo & { element: HTMLElement; choices?: Choice[] };
export const TARGET = 'data-assistant-target';

const clean = (text: string | null | undefined) => (text || '').replace(/\s+/g, ' ').replace(/\s*\*+\s*/g, ' ').replace(/\s*\(اختياري\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
// A label's words without the control inside it, the required mark, icons and descriptions.
function labelText(node: Element | null | undefined) {
  if (!node) return '';
  const copy = node.cloneNode(true) as Element;
  // Country codes and other left-to-right bits beside the control are not part of the field's name.
  copy.querySelectorAll('input, select, textarea, button, svg, small, [aria-label="مطلوب"], [dir="ltr"], .inquiry-check, .field-hint').forEach(child => child.remove());
  return clean(copy.textContent);
}
function labelOf(control: HTMLElement) {
  const own = control.getAttribute('aria-label');
  if (own) return clean(own);
  const labels = (control as HTMLInputElement).labels;
  const text = labelText(labels?.[0]);
  if (text) return text;
  const described = control.getAttribute('aria-labelledby');
  if (described) return clean(document.getElementById(described)?.textContent);
  return clean(control.getAttribute('placeholder')) || clean(control.closest('.form-control, .attachment-control')?.querySelector('span, strong')?.textContent) || 'هذه الخانة';
}
// Hidden by the page, not merely folded away: a control inside a closed <details> still counts, the fold is opened for it.
const visible = (element: Element) => !element.closest('[hidden]') && getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden';
function groupOf(input: HTMLInputElement, scope: ParentNode) {
  return input.closest<HTMLElement>('fieldset, .inquiry-group, .city-picker-results, [role="group"]') || (scope as HTMLElement);
}
function groupLabel(group: HTMLElement) {
  return labelText(group.querySelector(':scope > legend')) || clean(group.querySelector('summary strong')?.textContent) || clean(group.getAttribute('aria-label'))
    || clean(group.closest('.courier-city-picker')?.querySelector('.city-picker-label')?.textContent) || 'الخيارات';
}
// A box with no value of its own reports "on", which every such box shares; its label tells them apart.
const choiceValue = (input: HTMLInputElement, label: string) => input.value && input.value !== 'on' ? input.value : label;
function kindOf(control: HTMLElement): FieldKind {
  if (control.tagName === 'SELECT') return 'select';
  if (control.tagName === 'TEXTAREA') return 'textarea';
  const input = control as HTMLInputElement;
  if (input.type === 'file') return 'file';
  if (input.type === 'tel' || input.inputMode === 'tel') return 'tel';
  if (input.type === 'email') return 'email';
  if (input.type === 'date') return 'date';
  if (input.type === 'number' || input.inputMode === 'numeric' || input.inputMode === 'decimal') return 'number';
  return 'text';
}

// The fields of the form on the page, in reading order. Radios with one name and checkboxes in one group become one
// field with choices; the city picker and the collapsed service groups count even while their lists are folded away.
export function discoverFields(root: ParentNode = document): FormField[] {
  const scope = root.querySelector('main form') || root.querySelector('form') || root.querySelector('main') || root;
  const controls = Array.from(scope.querySelectorAll<HTMLElement>('input, select, textarea')).filter(control => {
    const input = control as HTMLInputElement;
    if (['hidden', 'submit', 'button', 'reset', 'search', 'password', 'image'].includes(input.type)) return false;
    if (input.disabled || control.closest('fieldset:disabled, [hidden], [aria-hidden="true"], .assistant-sheet')) return false;
    return true;
  });
  const fields: FormField[] = [];
  const grouped = new Set<Element>();
  for (const control of controls) {
    const input = control as HTMLInputElement;
    if (input.type === 'radio') {
      const group = groupOf(input, scope);
      const key = `radio:${input.name}`;
      if (grouped.has(group) && group.getAttribute('data-assistant-group') === key) continue;
      grouped.add(group); group.setAttribute('data-assistant-group', key);
      const members = Array.from(scope.querySelectorAll<HTMLInputElement>('input[type="radio"]')).filter(member => member.name === input.name);
      const choices: Choice[] = members.map(member => { const label = labelText(member.closest('label')) || member.value; return { label, value: choiceValue(member, label), element: member }; });
      fields.push({ kind: 'radio', label: groupLabel(group), required: members.some(member => member.required), element: group, options: choices.map(({ label, value }) => ({ label, value })), choices });
      continue;
    }
    if (input.type === 'checkbox') {
      const group = groupOf(input, scope);
      if (grouped.has(group)) continue;
      grouped.add(group);
      const members = Array.from(group.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')).filter(member => !member.closest('[hidden], [aria-hidden="true"]') && groupOf(member, scope) === group);
      const choices: Choice[] = members.map(member => { const label = labelText(member.closest('label')) || member.value; return { label, value: choiceValue(member, label), element: member }; });
      if (members.length === 1) fields.push({ kind: 'checkbox', label: choices[0].label, required: members[0].required, element: members[0], choices });
      else fields.push({ kind: 'checkboxes', label: groupLabel(group), required: false, element: group, options: choices.map(({ label, value }) => ({ label, value })), choices });
      continue;
    }
    if (!visible(control)) continue;
    const kind = kindOf(control);
    if (kind === 'select') {
      const select = control as HTMLSelectElement;
      const choices: Choice[] = Array.from(select.options).filter(option => option.value !== '').map(option => ({ label: clean(option.textContent) || option.value, value: option.value, element: option }));
      fields.push({ kind, label: labelOf(select), required: select.required, element: select, options: choices.map(({ label, value }) => ({ label, value })), choices });
      continue;
    }
    fields.push({ kind, label: labelOf(control), required: input.required || /\*/.test(input.labels?.[0]?.textContent || ''), element: control });
  }
  return fields;
}

function setNative(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const proto = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  // The native setter, not React's tracked one, so React sees the new value when the input event arrives.
  if (setter) setter.call(element, value); else element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}
// Writes a value the way a visitor would, so the form's own change handlers run. Files cannot be written.
export function writeField(field: FormField, value: string, values?: string[]) {
  switch (field.kind) {
    case 'file': return false;
    case 'select': setNative(field.element as HTMLSelectElement, value); return true;
    case 'radio': { const choice = field.choices?.find(item => item.value === value); if (!choice) return false; const input = choice.element as HTMLInputElement; if (!input.checked) input.click(); return true; }
    case 'checkbox': { const input = field.element as HTMLInputElement; if (input.checked !== (value === 'yes')) input.click(); return true; }
    case 'checkboxes': {
      const wanted = new Set(values || [value]);
      for (const choice of field.choices || []) { const input = choice.element as HTMLInputElement; if (wanted.has(choice.value) && !input.checked) input.click(); }
      return true;
    }
    default: setNative(field.element as HTMLInputElement, value); return true;
  }
}
// What the field holds now, in words.
export function readField(field: FormField): string {
  switch (field.kind) {
    case 'file': { const box = field.element.closest('.attachment-control, .form-control'); return box?.querySelectorAll('.file-row, .inline-remove').length ? 'مرفق' : ''; }
    case 'select': { const select = field.element as HTMLSelectElement; return select.value ? clean(select.selectedOptions[0]?.textContent) : ''; }
    case 'radio': return field.choices?.find(choice => (choice.element as HTMLInputElement).checked)?.label || '';
    case 'checkbox': return (field.element as HTMLInputElement).checked ? 'نعم' : '';
    case 'checkboxes': return (field.choices || []).filter(choice => (choice.element as HTMLInputElement).checked).map(choice => choice.label).join('، ');
    default: return (field.element as HTMLInputElement).value.trim();
  }
}
// Brings the field into view, opens the fold it sits in, and marks it for the pointer.
export function revealField(field: FormField) {
  clearTarget(false);
  const details = field.element.closest('details');
  if (details) details.open = true;
  const anchor = field.kind === 'file' ? field.element.closest<HTMLElement>('.file-picker') || field.element : field.element;
  anchor.setAttribute(TARGET, '');
  anchor.classList.add('assistant-highlight');
  window.scrollTo({ top: Math.max(0, anchor.getBoundingClientRect().top + window.scrollY - 150), behavior: 'instant' });
  window.dispatchEvent(new Event('assistant-target'));
}
export function clearTarget(announce = true) {
  document.querySelectorAll(`[${TARGET}]`).forEach(element => { element.removeAttribute(TARGET); element.classList.remove('assistant-highlight'); });
  if (announce) window.dispatchEvent(new Event('assistant-target'));
}

const buttonText = (button: HTMLButtonElement) => clean(button.textContent);
// The form's way forward: a next-step button, the final send button, and the way back.
export function formButtons(root: ParentNode = document) {
  const scope = root.querySelector('main form') || root.querySelector('form') || root;
  const buttons = Array.from(scope.querySelectorAll<HTMLButtonElement>('button')).filter(button => !button.disabled && visible(button));
  const next = buttons.find(button => /التالي/.test(buttonText(button)));
  const submit = buttons.find(button => /(ارسال|إرسال|تاكيد|تأكيد|ارسل|أرسل)/.test(buttonText(button)) && !/طلب اخر|طلب آخر/.test(buttonText(button)));
  const back = buttons.find(button => /رجوع|السابق/.test(buttonText(button)));
  return { next, submit, back };
}
export function formErrors(root: ParentNode = document) {
  return Array.from(root.querySelectorAll<HTMLElement>('[role="alert"]')).map(alert => clean(alert.textContent)).filter(Boolean);
}
export function formSuccess(root: ParentNode = document) {
  return Array.from(root.querySelectorAll<HTMLElement>('[role="status"]')).map(status => clean(status.textContent)).find(Boolean) || '';
}
// Waits for the form to answer a click: an error, a success message, or new fields.
export async function awaitOutcome(before: string, timeout = 15000): Promise<{ error?: string; success?: string }> {
  const started = Date.now();
  return new Promise(resolve => {
    const check = () => {
      const error = formErrors().find(text => text !== before);
      if (error) return resolve({ error });
      const success = formSuccess();
      if (success) return resolve({ success });
      if (Date.now() - started > timeout) return resolve({});
      window.setTimeout(check, 250);
    };
    window.setTimeout(check, 350);
  });
}

// What the page says, for a visitor who cannot read it: its title and lead, the current step, and the form's fields.
export function describePage(root: ParentNode = document) {
  const main = root.querySelector('main') || root;
  const title = clean(main.querySelector('h1')?.textContent);
  const lead = clean(main.querySelector('header p, .interior-intro p, h1 + p')?.textContent);
  const step = clean(main.querySelector('form h2, .inquiry-heading h2')?.textContent);
  const fields = discoverFields(root);
  const parts = [title ? `هذه صفحة ${title}.` : '', lead, step ? `الخطوة الحالية: ${step}.` : ''];
  if (fields.length) parts.push(`فيها نموذج من ${fields.length} خانات: ${fields.slice(0, 12).map(field => field.label).join('، ')}${fields.length > 12 ? '، وغيرها' : ''}. قل: عبّي لي النموذج، وأعبيه معك.`);
  else {
    const headings = Array.from(main.querySelectorAll('h2')).map(heading => clean(heading.textContent)).filter(Boolean).slice(0, 6);
    if (headings.length) parts.push(`أقسامها: ${headings.join('، ')}.`);
  }
  return parts.filter(Boolean).join(' ') || 'ما لقيت شي أقرأه في هذه الصفحة.';
}
