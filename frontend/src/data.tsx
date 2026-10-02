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
  merged.pages = value.pages ? { ...value.pages } : { ...seed.pages };
  merged.defaultServiceForm = value.defaultServiceForm || seed.defaultServiceForm;
  merged.serviceFormOverrides = value.serviceFormOverrides || {};
  merged.homepageSections = Array.isArray(value.homepageSections) ? value.homepageSections : seed.homepageSections;
  merged.joinForms = Array.isArray(value.joinForms) ? [...value.joinForms] : [...seed.joinForms];
  if (!value.accountantFormMigrated && !merged.joinForms.some(form => form.slug === 'join-accountant')) {
    merged.joinForms.unshift(seed.joinForms[0]);
  }
  if (!value.courierFormsMigrated) {
    for (const form of courierForms) if (!merged.joinForms.some(item => item.slug === form.slug)) merged.joinForms.push(form);
  }
  merged.accountantFormMigrated = true;
  merged.courierFormsMigrated = true;
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

export async function createServiceRequest(request: Omit<ServiceRequest, 'id'>) {
  if (!supabase) throw new Error('إرسال الطلبات يحتاج اتصال Supabase.');
  const { error } = await supabase.from('service_requests').insert(request);
  if (error) throw error;
}

export async function createJoinRequest(request: Omit<JoinRequest, 'id'>, file?: File) {
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

export async function loadRequests() {
  if (!supabase) return { services: [] as ServiceRequest[], messages: [] as ServiceRequest[], joins: [] as JoinRequest[] };
  const [services, messages, joins] = await Promise.all([
    supabase.from('service_requests').select('*').neq('service_slug', 'contact-message').order('created_at', { ascending: false }),
    supabase.from('service_requests').select('*').eq('service_slug', 'contact-message').order('created_at', { ascending: false }),
    supabase.from('join_requests').select('*').order('created_at', { ascending: false }),
  ]);
  if (services.error) throw services.error;
  if (messages.error) throw messages.error;
  if (joins.error && joins.error.code !== 'PGRST205' && joins.error.code !== '42P01') throw joins.error;
  return { services: services.data as ServiceRequest[], messages: messages.data as ServiceRequest[], joins: (joins.data || []) as JoinRequest[] };
}

export async function updateRequestStatus(kind: 'service' | 'join', id: string, status: string) {
  if (!supabase) throw new Error('Supabase غير متصل.');
  const table = kind === 'join' ? 'join_requests' : 'service_requests';
  const { error } = await supabase.from(table).update({ status }).eq('id', id);
  if (error) throw error;
}
