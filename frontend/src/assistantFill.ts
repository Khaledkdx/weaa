// Turns what a visitor says into a value for a form field, and the words the orb uses to ask for a field and read a
// value back. Pure functions, no DOM, so every rule can be tested on its own.
import { normalizeArabic } from './assistantBrain';

export type FieldKind = 'text' | 'textarea' | 'tel' | 'email' | 'number' | 'date' | 'select' | 'radio' | 'checkbox' | 'checkboxes' | 'file';
export type FieldInfo = { kind: FieldKind; label: string; required: boolean; options?: { label: string; value: string }[] };
export type Command = 'stop' | 'skip' | 'back' | 'repeat' | 'read' | 'done' | 'yes' | 'no';
// A value to write (with the words to read back, and the option values for a multiple choice), a question to ask
// instead, or a command the visitor gave.
export type Interpretation = { value: string; spoken: string; values?: string[] } | { ask: string } | { command: Command };

// Arabic-Indic and Persian digits become the digits the inputs take.
const asciiDigits = (text: string) => text.replace(/[٠-٩۰-۹]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit) >= 0 ? '٠١٢٣٤٥٦٧٨٩'.indexOf(digit) : '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
const tokens = (text: string) => normalizeArabic(asciiDigits(text)).split(' ').filter(Boolean);

export function commandOf(text: string): Command | null {
  const words = normalizeArabic(text);
  if (/^(وقف|توقف|كفايه|خلاص|الغي|الغ|بس كده|بس كدا|بس خلاص|اوقف|ما ابي اكمل|مش عايز اكمل)/.test(words)) return 'stop';
  if (/^(تخطي|تخطى|اتخطى|تجاوز|عدي|بعدين|ما عندي|ماعندي|مافي|ما في|لا يوجد|مش عارف|ما ادري|ما اعرف|اتركها|اتركه|سيبها|سيبه|فاضي|فاضيه)/.test(words)) return 'skip';
  if (/^(ارجع|رجوع|السابق|اللي قبله|الي قبله|اللي قبلها|قبله|قبلها)/.test(words)) return 'back';
  if (/^(اعد|عيد|كرر|مره ثانيه|مره تانيه|ما سمعت|ما سمعتك|وش قلت|ايش قلت|قلت ايه|عيد السؤال)/.test(words)) return 'repeat';
  if (/^(اقرا|اقرأ|اقرالي|وش في الصفحه|ايش في الصفحه|وش مكتوب|ايش مكتوب)/.test(words)) return 'read';
  if (/^(تم|خلصت|رفعت|جاهز|انتهيت|خلاص رفعت|رفعته|رفعتها)(\s|$|[.!،])/.test(words)) return 'done';
  if (/^(نعم|ايوه|ايوا|ايه|اي|اه|اها|صح|صحيح|تمام|اوكي|اوك|موافق|اكيد|ماشي|طبعا|يس|yes|ok|okay)(\s|$|[.!،؟])/.test(words)) return 'yes';
  if (/^(لا|مش صح|مو صح|غلط|خطا|no|nope)(\s|$|[.!،؟])/.test(words)) return 'no';
  return null;
}

// ---------- Numbers said in Arabic ----------
const units: Record<string, number> = { صفر: 0, زيرو: 0, واحد: 1, واحده: 1, وحده: 1, اثنين: 2, اتنين: 2, اثنان: 2, ثنين: 2, ثلاثه: 3, تلاته: 3, ثلاث: 3, تلات: 3, اربعه: 4, اربع: 4, خمسه: 5, خمس: 5, سته: 6, ست: 6, سبعه: 7, سبع: 7, ثمانيه: 8, تمانيه: 8, ثمان: 8, تمان: 8, تسعه: 9, تسع: 9 };
const teens: Record<string, number> = { عشره: 10, عشر: 10, حداشر: 11, حداش: 11, احدعشر: 11, اطناشر: 12, اتناشر: 12, اثناشر: 12, اثنعش: 12, اطنعش: 12, تلتاشر: 13, ثلاثتعش: 13, ثلثطعش: 13, اربعتاشر: 14, اربعطعش: 14, خمستاشر: 15, خمسطعش: 15, ستاشر: 16, سطعش: 16, سبعتاشر: 17, سبعطعش: 17, تمنتاشر: 18, ثمنطعش: 18, تسعتاشر: 19, تسعطعش: 19 };
const tens: Record<string, number> = { عشرين: 20, ثلاثين: 30, تلاتين: 30, اربعين: 40, خمسين: 50, ستين: 60, سبعين: 70, ثمانين: 80, تمانين: 80, تسعين: 90 };
const hundreds: Record<string, number> = { ميه: 100, مائه: 100, مئه: 100, ميتين: 200, مئتين: 200, مائتين: 200, ثلاثميه: 300, تلتميه: 300, ثلاثمائه: 300, ثلاثمئه: 300, اربعميه: 400, اربعمائه: 400, اربعمئه: 400, خمسميه: 500, خمسمائه: 500, خمسمئه: 500, ستميه: 600, ستمائه: 600, ستمئه: 600, سبعميه: 700, سبعمائه: 700, سبعمئه: 700, تمنميه: 800, ثمانمائه: 800, ثمانمئه: 800, تسعميه: 900, تسعمائه: 900, تسعمئه: 900 };
const thousands: Record<string, number> = { الف: 1000, الاف: 1000, آلاف: 1000 };
const bare = (token: string) => token.replace(/^و(?=.{3})/, '');
type NumberWord = { kind: 'unit' | 'teen' | 'ten' | 'hundred' | 'thousand' | 'twoThousand' | 'digits'; value: number; text: string; joined: boolean };
function lookup(word: string, joined: boolean): NumberWord | null {
  if (word === 'الفين') return { kind: 'twoThousand', value: 2000, text: word, joined };
  if (word in units) return { kind: 'unit', value: units[word], text: word, joined };
  if (word in teens) return { kind: 'teen', value: teens[word], text: word, joined };
  if (word in tens) return { kind: 'ten', value: tens[word], text: word, joined };
  if (word in hundreds) return { kind: 'hundred', value: hundreds[word], text: word, joined };
  if (word in thousands) return { kind: 'thousand', value: 1000, text: word, joined };
  return null;
}
// "واحد" is a word of its own before it is "و" + "احد": the whole token is tried first, then the token without its "و".
function numberWord(token: string): NumberWord | null {
  if (/^\d+$/.test(token)) return { kind: 'digits', value: Number(token), text: token, joined: false };
  return lookup(token, false) || (token !== bare(token) ? lookup(bare(token), true) : null);
}
// "خمسة عشر": a unit followed by a bare ten is a classical teen.
const teenOf = (word: NumberWord | null, next: NumberWord | null) => word?.kind === 'unit' && next?.kind === 'teen' && next.value === 10 && !next.joined ? 10 + word.value : null;
// "خمسه وعشرين" is one number; "عشرين خمسه" is two. A unit that follows a number without "و" starts a new group, as does
// "الفين", which never takes a multiplier.
function numberGroups(text: string): number[] {
  const groups: number[] = [];
  let total = 0, current = 0, open = false, last: NumberWord | null = null;
  const close = () => { if (open) groups.push(total + current); total = 0; current = 0; open = false; last = null; };
  const list = tokens(text);
  for (let i = 0; i < list.length; i++) {
    let word = numberWord(list[i]);
    if (!word) { close(); continue; }
    const teen = teenOf(word, i + 1 < list.length ? numberWord(list[i + 1]) : null);
    if (teen !== null) { word = { kind: 'teen', value: teen, text: `${list[i]} ${list[i + 1]}`, joined: word.joined }; i++; }
    const startsNew = open && !word.joined && (word.kind === 'twoThousand' || word.kind === 'digits' || (last?.kind !== 'hundred' && last?.kind !== 'thousand' && last?.kind !== 'twoThousand' && (word.kind === 'unit' || word.kind === 'teen' || word.kind === 'ten')));
    if (startsNew) close();
    open = true;
    if (word.kind === 'digits') current += word.value;
    else if (word.kind === 'unit' || word.kind === 'teen' || word.kind === 'ten') current += word.value;
    else if (word.kind === 'hundred') current = (current || 0) + word.value;
    else if (word.kind === 'thousand') { total += (current || 1) * 1000; current = 0; }
    else if (word.kind === 'twoThousand') { total += 2000; current = 0; }
    last = word;
  }
  close();
  return groups;
}
export function spokenNumber(text: string): number | null {
  const groups = numberGroups(text);
  return groups.length ? groups[0] : null;
}
// Digits read one by one ("صفر خمسه واحد…"), in pairs ("خمسه وعشرين"), or already as numerals.
export function spokenDigits(text: string): string {
  let out = '';
  const list = tokens(text);
  for (let i = 0; i < list.length; i++) {
    const word = numberWord(list[i]);
    if (!word) continue;
    if (word.kind === 'digits') { out += word.text; continue; }
    if (word.kind === 'unit') {
      const next = i + 1 < list.length ? numberWord(list[i + 1]) : null;
      const teen = teenOf(word, next);
      if (teen !== null) { out += String(teen); i++; }
      else if (next && next.kind === 'ten' && next.joined) { out += String(word.value + next.value); i++; }
      else out += String(word.value);
      continue;
    }
    if (word.kind === 'teen' || word.kind === 'ten' || word.kind === 'hundred') out += String(word.value);
  }
  return out;
}
const months: Record<string, number> = { يناير: 1, فبراير: 2, مارس: 3, ابريل: 4, افريل: 4, مايو: 5, يونيو: 6, يوليو: 7, اغسطس: 8, سبتمبر: 9, اكتوبر: 10, نوفمبر: 11, ديسمبر: 12 };
export function spokenDate(text: string): string | null {
  const plain = normalizeArabic(text);
  const numeric = plain.match(/(\d{1,4})\s*[/\-. ]\s*(\d{1,2})\s*[/\-. ]\s*(\d{1,4})/);
  let day: number | undefined, month: number | undefined, year: number | undefined;
  if (numeric) {
    const [a, b, c] = [Number(numeric[1]), Number(numeric[2]), Number(numeric[3])];
    if (numeric[1].length === 4) { year = a; month = b; day = c; } else { day = a; month = b; year = c; }
  } else {
    const named = Object.keys(months).find(name => plain.includes(name));
    const rest = named ? plain.replace(named, ' ') : plain;
    const numbers = numberGroups(rest);
    year = numbers.find(n => n >= 1900 && n <= 2200);
    const small = numbers.filter(n => n !== year);
    if (named) { month = months[named]; day = small.find(n => n >= 1 && n <= 31); }
    else { day = small[0]; month = small[1]; }
  }
  if (!day || !month || !year || day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2200) return null;
  if (year < 100) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
const spelledParts: [RegExp, string][] = [[/\s*(?:@|\bat\b|آت|ات|اد)\s*/g, '@'], [/\s*(?:\.|\bdot\b|دوت|نقطه|نقطة)\s*/g, '.'], [/جي ?ميل|جيميل/g, 'gmail'], [/هوت ?ميل/g, 'hotmail'], [/ياهو/g, 'yahoo'], [/اوت ?لوك|آوت ?لوك/g, 'outlook'], [/كوم/g, 'com'], [/\s+/g, '']];
export function spokenEmail(text: string): string | null {
  let value = text.trim().toLowerCase();
  for (const [pattern, replacement] of spelledParts) value = value.replace(pattern, replacement);
  return /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(value) ? value : null;
}

// ---------- Choices ----------
const ordinals: Record<string, number> = { الاول: 0, الاولى: 0, اول: 0, الثاني: 1, الثانيه: 1, التاني: 1, الثالث: 2, الثالثه: 2, التالت: 2, الرابع: 3, الرابعه: 3, الخامس: 4, الخامسه: 4, السادس: 5, السادسه: 5, السابع: 6, السابعه: 6, الثامن: 7, الثامنه: 7, التاسع: 8, التاسعه: 8, العاشر: 9, العاشره: 9 };
function optionScore(option: string, said: string) {
  const o = normalizeArabic(option), s = normalizeArabic(said);
  if (!o || !s) return 0;
  if (o === s) return 10;
  if (s.includes(o) || o.includes(s)) return 6;
  const ot = o.split(' ').filter(t => t.length >= 2), st = s.split(' ').filter(t => t.length >= 2);
  const hits = ot.filter(t => st.some(w => w === t || (t.length >= 4 && (w.includes(t) || t.includes(w))))).length;
  return hits ? Math.round(4 * hits / ot.length) : 0;
}
// "ما عندي رخصة" means the option that says there is none, when the choices offer one.
const saysNone = (said: string) => /^(ما عندي|ماعندي|معنديش|ما عنديش|لا يوجد|ما يوجد|ما في|مافي|ليس لدي|مالي|بدون|لا املك|ما املك)/.test(normalizeArabic(said));
const noneOption = <T extends { label: string }>(options: T[]) => options.find(option => /^(لا توجد|لا يوجد|ما في|مافي|بدون|لا|غير محدد|لا شي)/.test(normalizeArabic(option.label)));
export function pickOption<T extends { label: string }>(options: T[], said: string): T | null {
  const words = normalizeArabic(said);
  if (saysNone(said)) { const none = noneOption(options); if (none) return none; }
  const ordinal = Object.keys(ordinals).find(key => new RegExp(`(^|\\s)${key}(\\s|$)`).test(words));
  if (ordinal && options[ordinals[ordinal]]) return options[ordinals[ordinal]];
  const yesNo = commandOf(said);
  if (yesNo === 'yes' || yesNo === 'no') {
    const match = options.find(option => normalizeArabic(option.label) === (yesNo === 'yes' ? 'نعم' : 'لا'));
    if (match) return match;
  }
  const scored = options.map(option => ({ option, score: optionScore(option.label, said) })).sort((a, b) => b.score - a.score);
  return scored[0]?.score >= 3 ? scored[0].option : null;
}
export function pickOptions<T extends { label: string }>(options: T[], said: string): T[] {
  const words = normalizeArabic(said);
  const found = options.filter(option => {
    const parts = normalizeArabic(option.label).split(' ').filter(t => t.length >= 3);
    if (!parts.length) return false;
    const hits = parts.filter(part => words.includes(part)).length;
    return hits / parts.length >= .6;
  });
  if (found.length) return found;
  const single = pickOption(options, said);
  return single ? [single] : [];
}

// ---------- Plain text ----------
const openers = /^(?:اسمي|انا اسمي|الاسم|اسم الشركه|اسمها|اسمه|انا|احنا|هو|هي|اكتب|اكتبي|اكتبه|اكتبها|سجل|سجلي|حط|حطي|ضع|ضعي|المدينه|مدينتي|في|من|رقمي|الرقم|هوا|هيا)\s+/;
export function cleanText(text: string, label = ''): string {
  let value = text.replace(/\s+/g, ' ').trim().replace(/[.؟!،,]+$/, '').trim();
  const plainLabel = normalizeArabic(label);
  for (let round = 0; round < 3; round++) {
    const words = value.split(' ');
    for (let count = Math.min(4, words.length - 1); count >= 1; count--) {
      if (plainLabel && normalizeArabic(words.slice(0, count).join(' ')) === plainLabel) { value = words.slice(count).join(' '); break; }
    }
    const next = value.replace(openers, '');
    if (next === value) break;
    value = next;
  }
  return value.trim();
}

// ---------- Words for the orb ----------
const list = (options: { label: string }[]) => {
  const labels = options.map(option => option.label);
  return labels.length > 10 ? `${labels.slice(0, 10).join('، ')}، وغيرها` : labels.join('، ');
};
// Some forms word a label as a question ("في أي مدينة"); it is asked as it is, and named by its subject elsewhere.
export const isQuestion = (label: string) => /^(في اي|في أي|كم|هل|وش|ايش|أي|اي|متى|ما هو|ما هي)\s/.test(normalizeArabic(label)) || label.includes('؟');
export const topic = (label: string) => isQuestion(label) ? label.replace(/^(في أي|في اي|كم|هل|وش|ايش|أي|اي|متى|ما هو|ما هي)\s+/, '').replace(/؟/g, '').trim() || label : label;
export function question(field: FieldInfo): string {
  const { label } = field;
  const plain = normalizeArabic(label);
  if (isQuestion(label) && !['select', 'radio', 'checkboxes', 'file'].includes(field.kind)) return `${label.replace(/؟/g, '')}؟`;
  switch (field.kind) {
    case 'tel': return `قل لي ${label} رقم رقم.`;
    case 'number': return /عدد|كم|سن|عمر|سنه|سعه|حموله/.test(plain) ? `كم ${label}؟` : `قل لي ${label} بالأرقام.`;
    case 'date': return `${label}: قل اليوم والشهر والسنة.`;
    case 'email': return `${label}: قله حرف حرف، أو اكتبه بنفسك في الخانة وقل تم.`;
    case 'select': case 'radio': return `${label}: اختر من: ${list(field.options || [])}.`;
    case 'checkboxes': return `${label}: تقدر تختار أكثر من واحد من: ${list(field.options || [])}.`;
    case 'checkbox': return `${label}؟ قل نعم أو لا.`;
    case 'file': return `${label}: هذي تحتاج ملف أو صورة. اضغط زر اختيار الملف المحدد قدامك وارفعه، ولما تخلص قل تم، أو قل تخطي.`;
    case 'textarea': return `قل لي ${label}، بكلمات بسيطة.`;
    default:
      if (/الاسم الكامل|الاسم الرباعي/.test(plain)) return 'قل لي اسمك الكامل.';
      if (/^الاسم$|^اسمك/.test(plain)) return 'وش اسمك؟';
      if (/مدينه/.test(plain) && !/شركه/.test(plain)) return plain === 'المدينه' ? 'في أي مدينة؟' : `${label}: في أي مدينة؟`;
      return `قل لي ${label}.`;
  }
}
export function confirmation(field: FieldInfo, spoken: string): string {
  const chose = field.kind === 'select' || field.kind === 'radio' || field.kind === 'checkboxes' || field.kind === 'checkbox';
  return chose ? `اخترت ${topic(field.label)}: ${spoken}. صح؟` : `كتبت ${topic(field.label)}: ${spoken}. صح؟`;
}

export function interpret(field: FieldInfo, said: string): Interpretation {
  const command = commandOf(said);
  const options = field.options || [];
  // A choice that offers "none" takes "ما عندي" as that choice, not as a skip.
  const none = (field.kind === 'select' || field.kind === 'radio') && saysNone(said) ? noneOption(options) : undefined;
  if (none) return { value: none.value, spoken: none.label };
  if (command && command !== 'yes' && command !== 'no' && command !== 'done') return { command };
  switch (field.kind) {
    case 'tel': {
      const digits = spokenDigits(said);
      if (digits.length < 8) return { ask: `ما قدرت أكوّن ${field.label} من كلامك. قله رقم رقم، مثل: صفر خمسة واحد اثنين.` };
      return { value: digits, spoken: digits.split('').join(' ') };
    }
    case 'number': {
      const digits = /^\d+$/.test(normalizeArabic(said).trim()) ? Number(normalizeArabic(said).trim()) : spokenNumber(said);
      if (digits === null || Number.isNaN(digits)) return { ask: `قل لي ${field.label} بالأرقام، مثل: خمسة.` };
      return { value: String(digits), spoken: String(digits) };
    }
    case 'date': {
      const date = spokenDate(said);
      if (!date) return { ask: `ما فهمت التاريخ. قل اليوم ثم الشهر ثم السنة، مثل: عشرين، خمسة، ألفين وثلاثين.` };
      const [year, month, day] = date.split('-');
      return { value: date, spoken: `${Number(day)} / ${Number(month)} / ${year}` };
    }
    case 'email': {
      const email = spokenEmail(said);
      if (!email) return { ask: 'الإيميل أسهل تكتبه بنفسك في الخانة ثم تقول تم، أو قله حرف حرف.' };
      return { value: email, spoken: email.split('').join(' ') };
    }
    case 'select': case 'radio': {
      const option = pickOption(options, said);
      if (!option) return { ask: `ما لقيت هذا الخيار. اختر من: ${list(options)}.` };
      return { value: option.value, spoken: option.label };
    }
    case 'checkboxes': {
      const chosen = pickOptions(options, said);
      if (!chosen.length) return { ask: `ما لقيت هذا الخيار. اختر من: ${list(options)}.` };
      return { value: chosen.map(option => option.label).join('، '), spoken: chosen.map(option => option.label).join('، '), values: chosen.map(option => option.value) };
    }
    case 'checkbox': {
      if (command === 'yes') return { value: 'yes', spoken: 'نعم' };
      if (command === 'no') return { value: 'no', spoken: 'لا' };
      return { ask: `${field.label}؟ قل نعم أو لا.` };
    }
    case 'file':
      return command === 'done' ? { command: 'done' } : { ask: 'لما ترفع الملف قل تم، أو قل تخطي.' };
    default: {
      const value = cleanText(said, field.label);
      if (!value) return { ask: `ما سمعت ${field.label}. قلها مرة ثانية.` };
      return { value, spoken: value };
    }
  }
}
