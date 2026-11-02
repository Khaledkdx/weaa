// Several answers in one breath: «اسمي خالد ورقمي 0512345678 ومن الرياض» fills three fields. Local rules spot phones,
// emails, cities, names, ages, counts and named choices at once; the server's extractor (an AI model) reads the harder
// sentences, and every value it returns still goes through the same local interpretation before it is written.
import { normalizeArabic } from './assistantBrain';
import { courierCities } from './courierInternal';
import { asciiDigits, spokenDigits, spokenEmail, spokenNumber, topic, type FieldInfo } from './assistantFill';

export type Extracted = Record<string, string>;
type Family = 'name' | 'phone' | 'email' | 'city' | 'company' | 'age';

// What a field asks for, from its label: forms word the same question differently.
const families: [RegExp, Family][] = [[/شركه|المنشاه|المؤسسه/, 'company'], [/(^|\s)(ال)?اسم/, 'name'], [/جوال|هاتف|موبايل|تواصل/, 'phone'], [/ايميل|بريد/, 'email'], [/مدينه/, 'city'], [/عمر|(^|\s)(ال)?سن(\s|$)/, 'age']];
export function familyOf(label: string): Family | null {
  const plain = normalizeArabic(topic(label));
  return families.find(([pattern]) => pattern.test(plain))?.[1] ?? null;
}
// Words that announce a piece of information: «ورقمي», «وعمري», «اسمي».
const hints: Record<string, Family> = { اسمي: 'name', اسمه: 'name', اسمها: 'name', رقمي: 'phone', جوالي: 'phone', الجوال: 'phone', جوال: 'phone', تلفوني: 'phone', موبايلي: 'phone', ايميلي: 'email', بريدي: 'email', الايميل: 'email', ايميل: 'email', عمري: 'age', سني: 'age', مدينتي: 'city', شركتي: 'company', الشركه: 'company' };
// A stop between pieces: the next piece's announcement, or a comma.
const stopper = /^و?(?:رقمي|جوالي|الجوال|رقم|تلفوني|موبايلي|ايميلي|بريدي|الايميل|عمري|سني|مدينتي|شركتي|الشركه|عندي|ابغي|ابغى|اسكن|ساكن|من|في|انا|وانا)$/;

// The words as said and as normalized, one for one.
function split(text: string) {
  const raw = text.trim().split(/\s+/).filter(Boolean);
  return { raw, plain: raw.map(token => normalizeArabic(asciiDigits(token)).replace(/\s+/g, '')) };
}
// A phone number: a run of digit tokens with eight digits or more («05 1234 5678» counts), else the digits said word
// by word after «رقمي» or «جوالي».
function phoneIn(plain: string[]): string | null {
  for (let i = 0; i < plain.length; i++) {
    if (!/^\d+$/.test(plain[i])) continue;
    let j = i, digits = '';
    while (j < plain.length && /^\d+$/.test(plain[j]) && j - i < 5) digits += plain[j++];
    if (digits.length >= 8 && digits.length <= 15) return digits;
    i = j;
  }
  const at = plain.findIndex(token => ['رقمي', 'جوالي', 'الجوال', 'جوال', 'رقم', 'تلفوني', 'موبايلي'].includes(token.replace(/^و/, '')));
  if (at < 0) return null;
  const run: string[] = [];
  for (let i = at + 1; i < plain.length && !(run.length && stopper.test(plain[i]) && /^و/.test(plain[i])); i++) run.push(plain[i]);
  const digits = spokenDigits(run.join(' '));
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}
const cityNames = courierCities.map(city => ({ city, plain: normalizeArabic(city) })).filter(({ plain }) => plain.length >= 3).sort((a, b) => b.plain.length - a.plain.length);
// The first (longest) city of the kingdom named in the words, «بالرياض» included.
export function cityIn(text: string): string | null {
  const plain = ` ${normalizeArabic(text)} `;
  return cityNames.find(({ plain: name }) => plain.includes(` ${name} `) || plain.includes(` ب${name} `))?.city ?? null;
}
// The name after «اسمي», as said, up to the next piece or a comma.
function nameIn(raw: string[], plain: string[]): string | null {
  const at = plain.findIndex(token => ['اسمي', 'اسمه', 'اسمها', 'الاسم'].includes(token));
  if (at < 0) return null;
  const words: string[] = [];
  for (let i = at + 1; i < plain.length && words.length < 5; i++) {
    if (stopper.test(plain[i])) break;
    words.push(raw[i].replace(/[،,.]+$/, ''));
    if (/[،,]$/.test(raw[i])) break;
  }
  return words.join(' ') || null;
}
// The number said right after some words («عدد المناديب خمسة», «عمري 25») or right before them («خمسة مناديب»).
function numberNear(plain: string[], words: string[]): number | null {
  for (let i = 0; i < plain.length; i++) {
    if (!words.some(word => plain[i] === word || plain[i] === `ال${word}` || plain[i].includes(word))) continue;
    const after = spokenNumber(plain.slice(i + 1, i + 4).join(' '));
    if (after !== null) return after;
    const before = spokenNumber(plain.slice(Math.max(0, i - 3), i).join(' '));
    if (before !== null) return before;
  }
  return null;
}
const generic = new Set(['نعم', 'لا', 'اخري', 'اخر', 'غير محدد', 'اختر']);
// The options of a choice named in the words, longest first.
function optionsIn(text: string, options: { label: string; value: string }[]) {
  const plain = ` ${normalizeArabic(text)} `;
  return options.filter(option => { const label = normalizeArabic(option.label); return label.length >= 3 && !generic.has(label) && plain.includes(` ${label} `); })
    .sort((a, b) => b.label.length - a.label.length);
}

// What the local rules can read off the sentence for these fields, by label.
export function extractLocally(said: string, fields: FieldInfo[]): Extracted {
  const out: Extracted = {};
  const { raw, plain } = split(said);
  const text = plain.join(' ');
  const of = (family: Family) => fields.find(field => familyOf(field.label) === family);
  const phoneField = fields.find(field => field.kind === 'tel') || of('phone');
  const phone = phoneField ? phoneIn(plain) : null;
  if (phoneField && phone) out[phoneField.label] = phone;
  const emailField = fields.find(field => field.kind === 'email') || of('email');
  const spelled = said.match(/[\w.+-]+\s*(?:@|\bat\b|آت|ات)\s*[\w-]+\s*(?:\.|\bdot\b|دوت|نقطه|نقطة)\s*[a-z]{2,}/i);
  const email = emailField && spelled ? spokenEmail(spelled[0]) : null;
  if (emailField && email) out[emailField.label] = email;
  const cityField = fields.find(field => field.kind === 'text' && familyOf(field.label) === 'city');
  const city = cityField ? cityIn(text) : null;
  if (cityField && city) out[cityField.label] = city;
  const nameField = fields.find(field => field.kind === 'text' && familyOf(field.label) === 'name');
  const name = nameField ? nameIn(raw, plain) : null;
  if (nameField && name) out[nameField.label] = name;
  for (const field of fields) {
    if (field.kind === 'number' && !out[field.label]) {
      const age = familyOf(field.label) === 'age';
      const words = age ? ['عمري', 'سني', 'عمره', 'عمرها', 'عمر'] : normalizeArabic(topic(field.label)).split(' ').filter(word => word.length >= 3 && !['عدد', 'المطلوب', 'كم'].includes(word)).map(word => word.replace(/^ال/, ''));
      const number = words.length ? numberNear(plain, words) : null;
      if (number !== null && number > 0 && (!age || number <= 120)) out[field.label] = String(number);
    }
    if ((field.kind === 'select' || field.kind === 'radio' || field.kind === 'checkboxes') && field.options && !out[field.label]) {
      const named = optionsIn(said, field.options);
      if (named.length) out[field.label] = field.kind === 'checkboxes' ? named.map(option => option.label).join('، ') : named[0].label;
    }
  }
  return out;
}

// Whether the sentence seems to hold more than the one answer asked for, so the server's extractor is worth a call.
export function carriesMore(said: string, current: FieldInfo, others: FieldInfo[]): boolean {
  const { plain } = split(said);
  if (plain.length > 7) return true;
  const mine = familyOf(current.label);
  const theirs = new Set(others.map(other => familyOf(other.label)).filter(Boolean));
  if (mine !== 'phone' && current.kind !== 'tel' && theirs.has('phone') && phoneIn(plain)) return true;
  if (mine !== 'email' && current.kind !== 'email' && theirs.has('email') && /@|\bat\b/i.test(said)) return true;
  if (mine !== 'city' && theirs.has('city') && cityIn(plain.join(' '))) return true;
  return plain.some(token => { const family = hints[token.replace(/^و/, '')]; return !!family && family !== mine && theirs.has(family); });
}

let extractorUnavailable = false;
// The server's extractor on top of the local rules. Digits found locally are exact and stay; the model's reading wins
// elsewhere. Without a server (or when it fails), the local rules alone answer.
export async function extractValues(said: string, fields: FieldInfo[], local: Extracted = extractLocally(said, fields)): Promise<Extracted> {
  if (extractorUnavailable || !fields.length) return local;
  try {
    const body = { said: said.slice(0, 600), fields: fields.slice(0, 40).map(field => ({ label: field.label, kind: field.kind, options: field.options?.slice(0, 40).map(option => option.label) })) };
    const response = await fetch('/api/assistant/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000) });
    if (response.status === 503 || response.status === 404) { extractorUnavailable = true; return local; }
    if (!response.ok) return local;
    const data = await response.json() as { values?: unknown };
    const values = data && typeof data === 'object' && data.values && typeof data.values === 'object' ? data.values as Record<string, unknown> : {};
    const merged: Extracted = { ...local };
    for (const [label, value] of Object.entries(values)) {
      const field = fields.find(candidate => candidate.label === label);
      if (!field || typeof value !== 'string' || !value.trim()) continue;
      if (field.kind === 'tel' && local[label]) continue;
      merged[label] = value.trim().slice(0, 300);
    }
    return merged;
  } catch { return local; }
}
