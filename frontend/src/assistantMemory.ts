// What the orb remembers about a visitor, on their own device and only with their say-so: the values they gave a form,
// keyed by the field's label, so the next form can be offered them back. Nothing sensitive, no documents, no server.
import { normalizeArabic } from './assistantBrain';

const KEY = 'weaa-assistant-profile';
export type Profile = { name?: string; values: Record<string, string>; savedAt: number };
const sensitive = /هويه|اقامه|جواز|ايبان|iban|حساب|كلمه المرور|رخصه|انتهاء|تاريخ|راتب|ميلاد/;
const families = [/^(?!.*شركه).*اسم/, /جوال|هاتف|موبايل|تواصل/, /ايميل|بريد/, /^(?!.*شركه).*مدينه/, /شركه/];

export function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Profile;
    return parsed && typeof parsed === 'object' && parsed.values && typeof parsed.values === 'object' ? parsed : null;
  } catch { return null; }
}

export function rememberValues(entries: Record<string, string>): Profile | null {
  const profile = loadProfile() ?? { values: {}, savedAt: 0 };
  for (const [label, value] of Object.entries(entries)) {
    const key = normalizeArabic(label);
    if (!value.trim() || !key || sensitive.test(key)) continue;
    profile.values[label] = value.trim().slice(0, 160);
  }
  const nameLabel = Object.keys(profile.values).find(label => families[0].test(normalizeArabic(label)));
  if (nameLabel) profile.name = profile.values[nameLabel].split(' ')[0];
  profile.savedAt = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(profile)); } catch { return null; }
  return profile;
}

export function forgetProfile() {
  try { localStorage.removeItem(KEY); } catch { /* nothing to forget */ }
}

// A saved value for a field: by the same label, or by the kind of thing the label asks for (a name, a phone, a city),
// since forms word the same question differently.
export function recall(profile: Profile | null, label: string): string | undefined {
  if (!profile) return undefined;
  const key = normalizeArabic(label);
  const entries = Object.entries(profile.values);
  const exact = entries.find(([saved]) => normalizeArabic(saved) === key);
  if (exact) return exact[1];
  const family = families.find(pattern => pattern.test(key));
  if (!family) return undefined;
  return entries.find(([saved]) => family.test(normalizeArabic(saved)))?.[1];
}
