import type { CmsContent, Company } from './types';
import { roadTransportPath } from './roadTransport';

export type SiteEntry = { id: string; title: string; description: string; path: string; kind: 'page' | 'service' | 'form' | 'listing'; keywords: string[] };
export type AssistantTurn = { role: 'user' | 'assistant'; text: string };
export type AssistantReply = { text: string; navigateTo?: string; suggestions?: string[]; source: 'remote' | 'local' };

export const defaultSuggestions = ['اطلب خدمة', 'سجّل كمندوب', 'النقل البري', 'عالم التقبيل', 'تواصل معنا'];

const courierWords = ['مندوب', 'مناديب', 'توصيل', 'دليفري', 'سائق', 'سواق'];
const formWords: Record<string, string[]> = {
  'courier-internal': [...courierWords, 'داخل المملكة', 'داخل', 'محلي', 'المملكة'],
  'courier-external': [...courierWords, 'خارج المملكة', 'خارج', 'دولي', 'عالمي'],
  'join-accountant': ['محاسب', 'محاسبة', 'محاسبين', 'مالية', 'وظيفة'],
};

// Everything the assistant can take a visitor to, built from the CMS so admin edits are reflected without a deploy.
export function buildSiteIndex(cms: CmsContent): SiteEntry[] {
  const entries: SiteEntry[] = [];
  const page = (id: string, title: string, description: string, path: string, keywords: string[]) => entries.push({ id, title, description, path, kind: 'page', keywords });
  const pages = cms.pages;
  page('home', 'الرئيسية', pages.home?.body || 'صفحة البداية.', '/', ['الرئيسية', 'البداية', 'الصفحة الرئيسية', 'home']);
  page('services', pages.services?.title || 'الخدمات', pages.services?.body || '', '/services', ['الخدمات', 'خدمة', 'خدمات', 'services']);
  page('contracts', 'خدمات وعقود', pages.frameworks?.body || 'حلول تشغيلية بعقود واضحة.', '/services/contracts', ['عقود', 'عقد', 'تشغيل', 'تشغيلية', 'نماذج', 'contracts']);
  page('request-services', 'طلب الخدمات اللوجستية', 'نموذج لطلب الخدمات الخفيفة: توصيل، تخزين، شحن وإدارة.', '/join-us/request-services', ['طلب خدمة', 'اطلب', 'خدمات خفيفة', 'خفيفة', 'لوجستية', 'لوجستيات', 'توصيل', 'تخزين', 'شحن', 'مستودع', 'طرود', 'إرسال']);
  page('road-transport', 'النقل البري', 'نموذج لطلب نقل بضائع أو عرض مركباتك كمزود خدمة.', roadTransportPath, ['نقل', 'بري', 'شاحنة', 'شاحنات', 'تريلا', 'تريلات', 'دينا', 'فان', 'مركبة', 'مركبات', 'بضاعة', 'بضائع', 'حمولة', 'نقل بري']);
  page('market', pages['company-market']?.title || 'عالم التقبيل', pages['company-market']?.body || 'فرص بيع وشراء الشركات.', '/company-market', ['تقبيل', 'بيع شركة', 'شراء شركة', 'بيع', 'شراء', 'شركة', 'شركتي', 'استثمار', 'مستثمر', 'فرص', 'فرصة', 'استحواذ', 'أبيع', 'أشتري']);
  page('initiatives', pages.initiatives?.title || 'المبادرات', pages.initiatives?.body || '', '/initiatives', ['مبادرات', 'مبادرة', 'القطاع']);
  page('about', pages.about?.title || 'قالوا عنا', pages.about?.body || '', '/about', ['قالوا عنا', 'آراء', 'تجارب', 'عملاء', 'فيديو', 'تقييم', 'تقييمات']);
  page('join', 'انضم إلينا', 'اختر الفئة المناسبة وسجّل بياناتك.', '/join-us', ['انضم', 'انضمام', 'تسجيل', 'سجل', 'أسجل', 'وظيفة', 'وظائف', 'توظيف', 'عمل', 'أشتغل']);
  page('contact', pages.contact?.title || 'تواصل', pages.contact?.body || 'تواصل معنا عبر الهاتف أو البريد الإلكتروني.', '/contact', ['تواصل', 'اتصال', 'اتصل', 'رقم', 'هاتف', 'جوال', 'إيميل', 'بريد', 'عنوان', 'مقر', 'موقعكم', 'وين', 'فين', 'خريطة', 'واتس', 'contact']);
  for (const item of [...cms.serviceModels, ...cms.generalInfo]) {
    if (!item.slug || item.serviceCategory === 'unlisted') continue;
    const path = item.serviceCategory === 'light' ? '/join-us/request-services' : `/services/${item.slug}`;
    entries.push({ id: `service:${item.id}`, title: item.titleAr, description: item.description, path, kind: 'service', keywords: [item.titleEn].filter(Boolean) });
  }
  for (const form of cms.joinForms) {
    if (!form.enabled || !form.slug) continue;
    entries.push({ id: `form:${form.slug}`, title: form.title, description: form.description || form.audience, path: `/join-us/${form.slug}`, kind: 'form', keywords: [form.audience, ...(formWords[form.slug] || [])].filter(Boolean) });
  }
  for (const listing of cms.companyListings) {
    if (!listing.enabled) continue;
    entries.push({ id: `listing:${listing.slug}`, title: listing.name, description: `${listing.sector} · ${listing.city}`, path: `/company-market/${listing.slug}`, kind: 'listing', keywords: [listing.sector, listing.city] });
  }
  return entries;
}

// ---------- Local matcher: Arabic normalisation, light stemming, scored lookup ----------

export function normalizeArabic(input: string) {
  return input.toLowerCase()
    .replace(/[ً-ْٰـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ').trim();
}
// Words that carry intent but no destination ("I want", "take me to", question words).
const fillers = new Set(['ابي', 'ابغي', 'ابغى', 'اريد', 'بدي', 'عايز', 'عاوز', 'محتاج', 'ممكن', 'لو', 'سمحت', 'من', 'فضلك', 'في', 'علي', 'على', 'عن', 'الي', 'الى', 'ودني', 'وديني', 'خذني', 'روح', 'روحني', 'اروح', 'اوصل', 'ادخل', 'انتقل', 'اطلع', 'اذهب', 'انا', 'انت', 'هل', 'وش', 'ايش', 'ما', 'هو', 'هي', 'كيف', 'شلون', 'كم', 'متى', 'اليوم', 'اقدر', 'تقدر', 'يا', 'و', 'او', 'ثم', 'هذا', 'هذه', 'مع', 'معكم', 'لي', 'لك', 'عندكم', 'عندك', 'عندي', 'ليش', 'ابحث', 'دور', 'صفحه', 'قسم', 'افتح', 'اعرض', 'ورني', 'اشوف']);
// A filler keeps its meaning behind a conjunction or preposition ("وابغى", "لصفحة").
const isFiller = (token: string) => fillers.has(token) || (token.length > 2 && /^[وفبل]/.test(token) && fillers.has(token.slice(1)));
function stem(token: string) {
  let s = token;
  if (s.length > 4 && /^(وال|بال|فال|كال)/.test(s)) s = s.slice(3);
  else if (s.length > 3 && /^(ال|لل)/.test(s)) s = s.slice(2);
  if (s.length > 4) s = s.replace(/(ات|ين|ون|يه|ها|هم|كم|نا)$/, '');
  if (s.length > 3) s = s.replace(/[هي]$/, '');
  return s;
}
const bare = (token: string) => token.replace(/^(وال|بال|فال|كال|ال|لل)(?=.{3})/, '');
// Correct a small domain vocabulary, not arbitrary customer names or company data.
const heardWords: Record<string, string> = {
  مناديبب: 'مناديب', مناذيب: 'مناديب', منديب: 'مندوب', مندوبين: 'مناديب',
  داهل: 'داخل', الداهل: 'الداخل', الدخل: 'الداخل', خارح: 'خارج', الخارح: 'الخارج',
  محاصب: 'محاسب', لوجيستيه: 'لوجستيه', لوجيستيات: 'لوجستيات',
};
function understoodQuery(raw: string) {
  return normalizeArabic(raw).split(' ').map(token => heardWords[token] || token).join(' ');
}
function oneMistake(a: string, b: string) {
  if (a.length < 5 || b.length < 5) return false;
  if (a.length === b.length) {
    const different = [...a].flatMap((letter, i) => letter === b[i] ? [] : [i]);
    return different.length === 1 || (different.length === 2 && different[1] === different[0] + 1 && a[different[0]] === b[different[1]] && a[different[1]] === b[different[0]]);
  }
  if (Math.min(a.length, b.length) < 6 || Math.abs(a.length - b.length) !== 1) return false;
  const [long, short] = a.length > b.length ? [a, b] : [b, a];
  let i = 0; while (i < short.length && long[i] === short[i]) i++;
  return long.slice(i + 1) === short.slice(i);
}
function similarity(a: string, b: string) {
  if (a === b || bare(a) === bare(b)) return 1;
  const sa = stem(a), sb = stem(b);
  if (sa === sb) return .9;
  if (a.length >= 4 && b.length >= 4 && (a.includes(b) || b.includes(a) || sa.includes(sb) || sb.includes(sa))) return .7;
  if (oneMistake(bare(a), bare(b))) return .8;
  return 0;
}
const tokensOf = (text: string) => normalizeArabic(text).split(' ').filter(Boolean);
export const queryTokens = (text: string) => tokensOf(text).filter(token => !isFiller(token));
const best = (token: string, field: string[]) => field.reduce((top, word) => Math.max(top, similarity(token, word)), 0);

type Indexed = { entry: SiteEntry; title: string[]; keywords: string[]; description: string[]; phrases: string[] };
function prepare(entry: SiteEntry): Indexed {
  const phrases = [normalizeArabic(entry.title), ...entry.keywords.map(normalizeArabic)].filter(phrase => phrase.includes(' '));
  return { entry, title: tokensOf(entry.title), keywords: entry.keywords.flatMap(tokensOf), description: tokensOf(entry.description), phrases };
}
function score(item: Indexed, tokens: string[], query: string) {
  let total = 0, matched = 0, strong = false, exact = false;
  for (const token of tokens) {
    const named = Math.max(best(token, item.title), best(token, item.keywords));
    const value = Math.max(named * 3, best(token, item.keywords) * 2, best(token, item.description));
    if (value > 0) { total += value; matched += 1; }
    // A substring or stem hit alone ("الذهب" against "الذهبي") is a hint; one exact word, or two related words, is a destination.
    if (named >= .9) strong = true;
    if (named >= 1) exact = true;
  }
  for (const phrase of item.phrases) if (phrase.length >= 4 && query.includes(phrase)) { total += 2; strong = true; exact = true; }
  // Coverage counts: an entry that explains more of the question beats one that matches a single word harder.
  return { value: total + matched, strong: strong && (exact || matched >= 2) };
}
const clip = (text: string, max = 140) => {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('،'), cut.lastIndexOf(' ')))}…`;
};
function describe(entry: SiteEntry) {
  const description = clip(entry.description);
  if (entry.kind === 'service') return entry.path === '/join-us/request-services' ? `${entry.title}: ${description} تقدر تطلبها من هذا النموذج.` : `${entry.title}: ${description}`;
  if (entry.kind === 'form') return `هذا نموذج ${entry.title}. ${description}`;
  if (entry.kind === 'listing') return `فرصة ${entry.title} (${description}). تفاصيلها هنا.`;
  return `أبشر، أفتح لك ${entry.title}.${description ? ` ${description}` : ''}`;
}

export function localAnswer(rawQuery: string, index: SiteEntry[], company: Company, context: { history?: AssistantTurn[]; pathname?: string } = {}): AssistantReply {
  const query = understoodQuery(rawQuery);
  const local = (text: string, navigateTo?: string, suggestions?: string[]): AssistantReply => ({ text, navigateTo, suggestions, source: 'local' });
  if (!query) return local('قل لي وش تحتاج، وأدلّك عليه.', undefined, defaultSuggestions);
  if (/^(لا تفتح|متفتحش|ما تفتح|مش عايز|مش عاوز|ما ابغي|ما ابغى)/.test(query)) return local('تم، ما راح أفتح أي صفحة. وش تبي أساعدك فيه بدلها؟', undefined, defaultSuggestions);
  const previous = [...(context.history || [])].reverse().find(turn => turn.role === 'user');
  const mentionsCourier = (text: string) => queryTokens(understoodQuery(text)).some(token => ['مندوب', 'مناديب', 'سائق', 'سواق'].some(word => similarity(token, word) >= .9));
  const courierQuery = mentionsCourier(query);
  const regionOnly = /^(?:لا |اقصد |قصدي |انا |من |جوه |بره |ال)?(?:داخل|خارج|الداخل|الخارج)(?: المملكه| السعوديه)?$/.test(query);
  if (courierQuery || (regionOnly && previous && mentionsCourier(previous.text))) {
    const inside = /(?:^|\s)(?:ال)?داخل(?:\s|$)|جوه/.test(query);
    const outside = /(?:^|\s)(?:ال)?خارج(?:\s|$)|بره/.test(query);
    if (inside !== outside) {
      const destination = index.find(entry => entry.id === `form:courier-${inside ? 'internal' : 'external'}`);
      if (destination) return local(`أبشر، أفتح لك نموذج ${destination.title} عشان تسجّل بياناتك.`, destination.path);
    }
    return local('تحب تسجّل كمندوب داخل المملكة ولا خارج المملكة؟', undefined, index.filter(entry => ['form:courier-internal', 'form:courier-external'].includes(entry.id)).map(entry => entry.title));
  }
  if (regionOnly) return local('تقصد نموذج مناديب داخل المملكة ولا خارج المملكة؟', undefined, index.filter(entry => ['form:courier-internal', 'form:courier-external'].includes(entry.id)).map(entry => entry.title));
  if (/^(افتحه|افتحها|افتح ده|افتح دا|وديني هناك|نفسه|نفسها|ايوه افتحه|اه افتحه)$/.test(query)) {
    const lastIntent = previous ? localAnswer(previous.text, index, company) : null;
    const destination = lastIntent?.navigateTo || (context.pathname && index.some(entry => entry.path === context.pathname) ? context.pathname : undefined);
    if (destination) return local('أبشر، أفتح لك الصفحة المطلوبة.', destination);
    if (lastIntent?.suggestions?.length) return local(lastIntent.text, undefined, lastIntent.suggestions);
    return local('تقصد أفتح لك أي نموذج؟ طلب خدمة ولا تسجيل مندوب؟', undefined, ['اطلب خدمة', 'سجّل كمندوب']);
  }
  // `\b` only knows ASCII word characters, so Arabic greetings are bounded by whitespace or the end of the text instead.
  const greeting = query.match(/^(هلا|مرحبا|اهلا|اهلين|السلام عليكم|سلام|صباح الخير|مساء الخير|هاي|hi|hello|hey)(?=\s|$)/);
  if (greeting && (!queryTokens(query.slice(greeting[0].length)).length)) return local('أهلاً وسهلاً! تبي خدمة، تسجّل كمندوب، ولا تتواصل مع الفريق؟', undefined, defaultSuggestions);
  if (/(شكرا|مشكور|يعطيك العافيه|تسلم|thanks|thank you)/.test(query)) return local('العفو! لو احتجت شي ثاني أنا هنا.');
  if (/(وش تقدر|ايش تقدر|ماذا تستطيع|كيف تساعد|مساعده|وش تسوي|بتعمل ايه|تساعدني ازاي|help)/.test(query)) return local('أقدر أساعدك تلقى الخدمة أو نموذج التسجيل المناسب في وعاء. تبي تطلب خدمة، تسجّل كمندوب، تطلب نقل، ولا تبيع وتشتري شركة؟', undefined, defaultSuggestions);
  const tokens = queryTokens(query);
  if (tokens.some(token => /^(رقم|هاتف|جوال|اتصل|اتصال|اتواصل|تواصل|ايميل|بريد|عنوان|مقر|واتس|خريطه|contact)$/.test(token))) {
    return local(`تقدر تتصل على ${company.phone} أو تراسل ${company.email}. مقرنا: ${company.headquarters}.`, '/contact', ['اطلب خدمة', 'الرئيسية']);
  }
  if (tokens.length === 0) return local('تبي تطلب خدمة ولا تسجّل للعمل مع وعاء؟', undefined, ['اطلب خدمة', 'سجّل كمندوب']);
  // Specific destinations (a form, a service) outrank hub pages at equal score: "محاسب" means the accountant form, not the join hub.
  const specific = (entry: SiteEntry) => entry.kind === 'page' ? 0 : 1;
  const ranked = index.map(prepare).map(item => ({ item, ...score(item, tokens, query) }))
    .sort((a, b) => b.value - a.value || specific(b.item.entry) - specific(a.item.entry));
  const top = ranked[0], second = ranked.find(candidate => candidate.item.entry.path !== top.item.entry.path);
  if (!top || top.value < 3 || !top.strong) {
    if (top?.value >= 3 && tokens.some(token => top.item.title.some(word => oneMistake(bare(token), bare(word)))) && (!second || top.value > second.value + 1)) return local(`ممكن تقصد ${top.item.entry.title}؟`, undefined, [top.item.entry.title, 'تواصل معنا']);
    return local(`أساعدك في خدمات وعاء أو التسجيل للعمل؟ ولو سؤالك خارج تفاصيل الموقع، تقدر تتواصل مع الفريق على ${company.phone}.`, undefined, defaultSuggestions);
  }
  if (second && second.strong && second.value >= top.value - 1 && specific(second.item.entry) >= specific(top.item.entry)) {
    return local(`تقصد ${top.item.entry.title} أو ${second.item.entry.title}؟`, undefined, [top.item.entry.title, second.item.entry.title]);
  }
  return local(describe(top.item.entry), top.item.entry.path);
}

// ---------- Remote brain (Supabase edge function calling Claude), with the local matcher as the fallback ----------

let remoteUnavailable = false;
const compact = (entries: SiteEntry[]) => entries.map(({ id, title, description, path, kind }) => ({ id, title, description: clip(description, 220), path, kind }));

export async function askAssistant(query: string, history: AssistantTurn[], cms: CmsContent, pathname: string): Promise<AssistantReply> {
  const index = buildSiteIndex(cms);
  const trimmed = query.trim().slice(0, 500);
  if (!remoteUnavailable) {
    try {
      const { phone, email, headquarters } = cms.company;
      // A slow or unreachable function must never leave the panel "thinking": after 8s the local matcher answers instead.
      const body = { query: trimmed, history: history.slice(-8), index: compact(index), pathname, company: { phone, email, headquarters } };
      const response = await fetch('/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
      const data = response.ok ? await response.json() : null;
      const error = response.ok ? null : { context: { status: response.status } };
      if (!error && data && typeof data.text === 'string') {
        const unhelpful = /لم افهم|مش فاهم|مفهمتش|ما فهمت|اعد صياغه|اعد كتابه/.test(normalizeArabic(data.text));
        const wrongLanguage = /[\u0600-\u06ff]/.test(trimmed) && !/[\u0600-\u06ff]/.test(data.text);
        if (!data.text.trim() || unhelpful || wrongLanguage) return localAnswer(trimmed, index, cms.company, { history: history.slice(-8), pathname });
        const navigateTo = typeof data.navigateTo === 'string' && index.some(entry => entry.path === data.navigateTo) ? data.navigateTo : undefined;
        return { text: data.text, navigateTo, suggestions: Array.isArray(data.suggestions) ? data.suggestions.filter((item: unknown) => typeof item === 'string').slice(0, 5) : undefined, source: 'remote' };
      }
      // 503 means the function has no API key; stop asking for the rest of the session instead of paying a round trip per message.
      const status = (error as { context?: { status?: number } } | null)?.context?.status;
      if (status === 503 || status === 404) remoteUnavailable = true;
    } catch {
      // Network failure: the local matcher answers this one, the next message tries again.
    }
  }
  return localAnswer(trimmed, index, cms.company, { history: history.slice(-8), pathname });
}
