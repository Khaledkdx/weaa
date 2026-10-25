import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { courierForms, seed } from './seed';
import type { CmsContent, JoinRequest, ServiceRequest } from './types';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;

export function normalizeCms(raw: unknown): CmsContent {
  if (!raw || typeof raw !== 'object') return structuredClone(seed);
  const value = raw as Partial<CmsContent>;
  const merged = { ...structuredClone(seed), ...value } as CmsContent;
  merged.company = { ...seed.company, ...(value.company || {}) };
  if (merged.company.phone.replace(/\D/g, '') === '966567018977') merged.company.phone = seed.company.phone;
  merged.pages = value.pages ? { ...value.pages } : { ...seed.pages };
  const legacyServiceSlugs: Record<string, string> = {
    'service:التخزين': 'warehousing',
    'service:التوصيل للمستهلك B2C': 'delivery',
    'service:الشحن بين المدن B2B': 'intercity',
    'service:الشحن الدولي': 'international',
    'service:الخدمات الإدارية والاستشارية': 'advisory',
  };
  merged.generalInfo = merged.generalInfo.map(item => ({
    ...item,
    slug: item.slug || legacyServiceSlugs[item.id],
    titleAr: item.titleAr === 'التوصيل للمستهلك B2C' ? 'التوصيل للمستهلك' : item.titleAr === 'الشحن بين المدن B2B' ? 'الشحن بين المدن' : item.titleAr,
  }));
  merged.defaultServiceForm = value.defaultServiceForm || seed.defaultServiceForm;
  merged.serviceFormOverrides = value.serviceFormOverrides || {};
  merged.homepageSections = Array.isArray(value.homepageSections) ? value.homepageSections : seed.homepageSections;
  if (!value.heavyTransportCardRemoved) {
    merged.homepageSections = merged.homepageSections.map(section => section.id !== 'transport' ? section : {
      ...section,
      cards: section.cards.filter(card => card.title.trim() !== 'النقل الثقيل'),
    });
  }
  if (!value.lightServicesUnlisted) {
    const excludedSlugs = new Set(['warehousing', 'intercity', 'international']);
    const legacyIds = new Set(['service:التخزين', 'service:الشحن بين المدن B2B', 'service:الشحن الدولي']);
    merged.generalInfo = merged.generalInfo.map(item => (excludedSlugs.has(item.slug || '') || legacyIds.has(item.id)) && item.serviceCategory === 'light'
      ? { ...item, serviceCategory: 'unlisted' } : item);
  }
  merged.joinForms = Array.isArray(value.joinForms) ? [...value.joinForms] : [...seed.joinForms];
  if (!value.accountantFormMigrated && !merged.joinForms.some(form => form.slug === 'join-accountant')) {
    merged.joinForms.unshift(seed.joinForms[0]);
  }
  if (!value.courierFormsMigrated) {
    for (const form of courierForms) if (!merged.joinForms.some(item => item.slug === form.slug)) merged.joinForms.push(form);
  }
  if (!value.courierCarFieldsMigrated) {
    const newFields = courierForms[0].fields.filter(field => ['owns_car', 'car_model', 'car_year'].includes(field.key));
    merged.joinForms = merged.joinForms.map(form => form.slug !== 'courier-internal' ? form : {
      ...form,
      fields: [...form.fields, ...newFields.filter(field => !form.fields.some(existing => existing.key === field.key))],
    });
  }
  if (!value.courierInternalDetailsMigrated) {
    const countField = courierForms[0].fields.find(field => field.key === 'sponsorship_transfer_count')!;
    merged.joinForms = merged.joinForms.map(form => {
      if (form.slug !== 'courier-internal') return form;
      const renamed = form.fields.map(field => field.key === 'city' && field.label === 'المدينة' ? { ...field, label: 'المدن' } :
        field.key === 'can_relocate' && field.label === 'قابلية الانتقال' ? { ...field, label: 'قابلية الانتقال لمدينة أخرى' } : field);
      if (renamed.some(field => field.key === countField.key)) return { ...form, fields: renamed };
      const expiryIndex = renamed.findIndex(field => field.key === 'identity_expires_on');
      const insertAt = expiryIndex < 0 ? renamed.length : expiryIndex;
      return { ...form, fields: [...renamed.slice(0, insertAt), countField, ...renamed.slice(insertAt)] };
    });
  }
  if (!value.courierExternalProfessionMigrated) {
    const professionField = courierForms[1].fields.find(field => field.key === 'profession')!;
    merged.joinForms = merged.joinForms.map(form => {
      if (form.slug !== 'courier-external' || form.fields.some(field => field.key === professionField.key)) return form;
      const educationIndex = form.fields.findIndex(field => field.key === 'education');
      const insertAt = educationIndex < 0 ? form.fields.length : educationIndex + 1;
      return { ...form, fields: [...form.fields.slice(0, insertAt), professionField, ...form.fields.slice(insertAt)] };
    });
  }
  merged.accountantFormMigrated = true;
  merged.courierFormsMigrated = true;
  merged.courierCarFieldsMigrated = true;
  merged.courierInternalDetailsMigrated = true;
  merged.courierExternalProfessionMigrated = true;
  merged.heavyTransportCardRemoved = true;
  merged.lightServicesUnlisted = true;
  return merged;
}

type CmsContextValue = {
  cms: CmsContent; loading: boolean; error: string | null; user: User | null;
  authLoading: boolean; saving: boolean; saveError: string | null;
  refresh: () => Promise<void>; save: (next: CmsContent) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<void>; signOut: () => Promise<void>;
};
const CmsContext = createContext<CmsContextValue | null>(null);

export function CmsProvider({ children }: { children: ReactNode }) {
  const [cms, setCms] = useState<CmsContent>(() => structuredClone(seed));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!supabase) { setLoading(false); setError('المعاينة المحلية: ربط Supabase غير مفعّل.'); return; }
    setLoading(true);
    try {
      const { data, error: requestError } = await supabase.from('cms_content').select('content').eq('id', 'main').maybeSingle();
      if (requestError) throw requestError;
      setCms(normalizeCms(data?.content));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تحديث المحتوى.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void refresh();
    if (!supabase) { setAuthLoading(false); return; }
    void supabase.auth.getUser().then(({ data }) => { setUser(data.user); setAuthLoading(false); });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
    return () => subscription.subscription.unsubscribe();
  }, [refresh]);

  const save = useCallback(async (next: CmsContent) => {
    if (!supabase || !user) { setSaveError('سجّل دخول الأدمن واتصل بـ Supabase قبل الحفظ.'); return false; }
    setSaving(true); setSaveError(null);
    try {
      const content = structuredClone(next);
      delete content.serviceRequests;
      delete content.contactMessages;
      delete content.joinRequests;
      const { error: requestError } = await supabase.from('cms_content').upsert({ id: 'main', content, updated_at: new Date().toISOString() });
      if (requestError) throw requestError;
      setCms(next);
      return true;
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'تعذر الحفظ.');
      return false;
    } finally { setSaving(false); }
  }, [user]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('أضف مفاتيح Supabase العامة إلى إعدادات المعاينة.');
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (authError) throw authError;
    await refresh();
  }, [refresh]);
  const signOut = useCallback(async () => { await supabase?.auth.signOut(); setUser(null); }, []);
  const value = useMemo(() => ({ cms, loading, error, user, authLoading, saving, saveError, refresh, save, signIn, signOut }), [cms, loading, error, user, authLoading, saving, saveError, refresh, save, signIn, signOut]);
  return <CmsContext.Provider value={value}>{children}</CmsContext.Provider>;
}
export function useCms() {
  const value = useContext(CmsContext);
  if (!value) throw new Error('CmsProvider is missing');
  return value;
}

type RequestDocument = { key: string; label: string; file: File };

export async function createServiceRequest(request: Omit<ServiceRequest, 'id'>) {
  if (!supabase) throw new Error('حفظ الطلب في أدمن وعاء يحتاج اتصال Supabase.');
  const { error } = await supabase.from('service_requests').insert(request);
  if (error) throw new Error('تعذر حفظ الطلب في أدمن وعاء. أعد المحاولة.');
}

export async function createJoinRequest(request: Omit<JoinRequest, 'id'>, file?: File | RequestDocument[], uploads = new Map<File, string>()) {
  if (Array.isArray(file)) return saveRequestDocuments(request, file, uploads, 'join-forms', 'request_document:');
  if (!supabase) throw new Error('إرسال الطلبات يحتاج اتصال Supabase.');
  let attachment_path: string | undefined;
  if (file) {
    const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_');
    attachment_path = `${Date.now()}_${safeName}`;
    const { error } = await supabase.storage.from('join-attachments').upload(attachment_path, file, { upsert: false });
    if (error) throw error;
  }
  const { error } = await supabase.from('join_requests').insert({ ...request, attachment_path });
  if (error) throw error;
}

export async function submitCompanySale(request: Omit<JoinRequest, 'id'>, documents: { key: string; label: string; file: File }[], uploads = new Map<File, string>()) {
  return saveRequestDocuments(request, documents, uploads, 'company-sales', 'company_document:');
}

async function saveRequestDocuments(request: Omit<JoinRequest, 'id'>, documents: RequestDocument[], uploads: Map<File, string>, folder: string, prefix: string) {
  if (!supabase) throw new Error('إرسال الطلبات يحتاج اتصال Supabase.');
  const fields = { ...request.fields };
  for (const document of documents) {
    let path = uploads.get(document.file);
    if (!path) {
      const extension = document.file.name.split('.').pop()?.toLowerCase() || 'pdf';
      path = `${folder}/${crypto.randomUUID()}/${document.key.replace(/[^A-Za-z0-9_-]/g, '_')}.${extension}`;
      const { error } = await supabase.storage.from('join-attachments').upload(path, document.file, { upsert: false });
      if (error) throw new Error(`تعذر رفع ${document.label}. أعد المحاولة.`);
      uploads.set(document.file, path);
    }
    fields[`${prefix}${document.label}`] = path;
  }
  const { error } = await supabase.from('join_requests').insert({ ...request, fields });
  if (error) throw new Error('تعذر حفظ الطلب. بياناتك محفوظة في الصفحة؛ أعد المحاولة.');
}

export async function loadRequests() {
  if (!supabase) return { services: [] as ServiceRequest[], messages: [] as ServiceRequest[], joins: [] as JoinRequest[] };
  const [services, messages, joins] = await Promise.all([
    supabase.from('service_requests').select('*').neq('service_slug', 'contact-message').order('created_at', { ascending: false }),
    supabase.from('service_requests').select('*').eq('service_slug', 'contact-message').order('created_at', { ascending: false }),
    supabase.from('join_requests').select('*').order('created_at', { ascending: false }),
  ]);
  if (services.error) throw services.error;
  if (messages.error) throw messages.error;
  const joinError = joins.error ? ['PGRST205', '42P01'].includes(joins.error.code)
    ? 'جدول طلبات الانضمام وبيع الشركات غير مفعّل في Supabase. يلزم تطبيق ملف إعداد نماذج الانضمام قبل استقبال هذه الطلبات.'
    : 'تعذر تحميل طلبات الانضمام وبيع الشركات. تحقق من الاتصال وصلاحيات الحساب.' : '';
  return { services: services.data as ServiceRequest[], messages: messages.data as ServiceRequest[], joins: (joins.data || []) as JoinRequest[], joinError };
}

export async function updateRequestStatus(kind: 'service' | 'join', id: string, status: string) {
  if (!supabase) throw new Error('Supabase غير متصل.');
  const table = kind === 'join' ? 'join_requests' : 'service_requests';
  const { error } = await supabase.from(table).update({ status }).eq('id', id);
  if (error) throw error;
}
