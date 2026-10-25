// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const store = vi.hoisted(() => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test');
  return { joins: [] as Record<string, unknown>[], services: [] as Record<string, unknown>[], files: new Set<string>(), joinError: null as null | { code: string }, count: 0 };
});
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({
  from: (table: string) => {
    const rows = table === 'join_requests' ? store.joins : store.services;
    const filters: ((row: Record<string, unknown>) => boolean)[] = [];
    const query = {
      select: () => query,
      eq: (key: string, value: unknown) => { filters.push(row => row[key] === value); return query; },
      neq: (key: string, value: unknown) => { filters.push(row => row[key] !== value); return query; },
      order: async () => ({ data: rows.filter(row => filters.every(filter => filter(row))), error: table === 'join_requests' ? store.joinError : null }),
      insert: async (row: Record<string, unknown>) => { rows.push({ ...row, id: String(++store.count), created_at: '2026-10-25T12:00:00Z' }); return { error: null }; },
      update: (patch: Record<string, unknown>) => ({ eq: async (key: string, value: unknown) => { rows.filter(row => row[key] === value).forEach(row => Object.assign(row, patch)); return { error: null }; } }),
    };
    return query;
  },
  storage: { from: () => ({
    upload: async (path: string) => { store.files.add(path); return { error: null }; },
    createSignedUrl: async (path: string) => ({ error: store.files.has(path) ? null : new Error('missing'), data: { signedUrl: `https://files.example.com/${encodeURIComponent(path)}` } }),
  }) },
}) }));
vi.mock('./shell', () => ({ Shell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('./data', async importOriginal => {
  const actual = await importOriginal<typeof import('./data')>();
  const { seed } = await import('./seed');
  return { ...actual, useCms: () => ({ cms: seed, user: { email: 'admin@example.com' }, authLoading: false, error: '', signOut: vi.fn(), save: vi.fn(), saving: false, saveError: '' }) };
});
import { Admin } from './admin';
import { createJoinRequest, createServiceRequest, loadRequests, submitCompanySale } from './data';
import { companyDocuments, operatingGroups } from './companySale';
afterEach(() => { cleanup(); store.joins.length = 0; store.services.length = 0; store.files.clear(); store.joinError = null; });
const request = (slug: string, title: string, fields: Record<string, string>) => ({ form_slug: slug, form_title: title, name: `عميل ${title}`, phone: '+966512345678', email: 'test@example.com', fields, status: 'طلب جديد' });

describe('form submissions in the dashboard', () => {
  it('loads every submitted field and document into the correct dashboard section', async () => {
    const operating = Object.fromEntries(operatingGroups.flatMap(group => group.fields).map(field => [field.label, `قيمة ${field.key}`]));
    await submitCompanySale(request('company-sale', 'شركة مبدئية', { ...operating, 'نوع الطلب': 'البحث عن شريك' }), []);
    const documents = companyDocuments.map(field => ({ key: field.key, label: field.label, file: new File(['%PDF-'], `${field.key}.pdf`) }));
    await submitCompanySale(request('company-sale-executive', 'شركة تنفيذية', { 'قيمة آخر إيراد': '150000', 'الثمن المتوقع': '200000' }), documents);
    await createJoinRequest(request('courier-internal', 'مندوب داخلي', { 'المدن': 'جدة، الرياض', 'سنة الصنع': '2024', 'عدد مرات نقل الكفالة': '0' }), [{ key: 'license', label: 'الرخصة', file: new File(['%PDF-'], 'license.pdf') }]);
    await createJoinRequest(request('courier-external', 'مندوب خارجي', { 'المهنة الحالية': 'محاسب', 'البلد': 'مصر', 'هل لديك رخصة؟': 'نعم' }));
    await createJoinRequest(request('join-accountant', 'موظف محاسب', { 'الخبرة': 'خمس سنوات' }), [{ key: 'cv', label: 'السيرة الذاتية', file: new File(['%PDF-'], 'cv.pdf') }, { key: 'certificate', label: 'الشهادة', file: new File(['%PDF-'], 'certificate.pdf') }]);
    await createServiceRequest({ service_slug: 'logistics-inquiry', service_title: 'طلب خدمات لوجستية', name: 'عميل خدمات', phone: '+966512345678', email: '', details: 'جدة\nعقد الهرم الماسي\nعدد المناديب 5', status: 'طلب جديد' });
    const loaded = await loadRequests();
    expect(loaded.joins).toHaveLength(5);
    expect(loaded.services).toHaveLength(1);
    render(<MemoryRouter><Admin /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'طلبات بيع الشركات' }));
    await screen.findByText('شركة مبدئية');
    expect(screen.getByText('البحث عن شريك')).toBeTruthy();
    expect(screen.queryByText('مندوب داخلي')).toBeNull();
    for (const value of Object.values(operating)) expect(screen.getByText(value)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'عرض المستند' })).toHaveLength(documents.length);
    fireEvent.click(screen.getAllByRole('button', { name: 'عرض المستند' })[0]);
    expect((await screen.findByRole('link', { name: 'فتح المستند' })).getAttribute('href')).toMatch(/^https:\/\/files\.example\.com\//);
    const executive = screen.getByText('شركة تنفيذية').closest('article')!;
    fireEvent.change(within(executive).getByLabelText('تغيير الحالة'), { target: { value: 'مؤكد' } });
    await screen.findByText('مؤكد', { selector: '.status-badge' });
    expect((await loadRequests()).joins.find(row => row.form_slug === 'company-sale-executive')?.status).toBe('مؤكد');
    fireEvent.click(screen.getByRole('button', { name: 'طلبات المناديب' }));
    await screen.findByText('مندوب داخلي');
    expect(screen.getByText('مندوب خارجي')).toBeTruthy();
    expect(screen.getByText('جدة، الرياض')).toBeTruthy();
    expect(screen.getByText('محاسب')).toBeTruthy();
    expect(screen.queryByText('شركة تنفيذية')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'طلبات الانضمام' }));
    await screen.findByText('موظف محاسب');
    expect(screen.getAllByRole('button', { name: 'عرض المستند' })).toHaveLength(2);
    expect(screen.queryByText('مندوب داخلي')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'طلبات العملاء' }));
    await screen.findByText('عميل خدمات');
    expect(screen.getByText(/عقد الهرم الماسي/)).toBeTruthy();
  });

  it('shows a missing-table error instead of an empty request list and keeps service requests usable', async () => {
    store.joinError = { code: 'PGRST205' };
    await createServiceRequest({ service_slug: 'logistics-inquiry', service_title: 'خدمات', name: 'عميل محفوظ', phone: '123', email: '', details: 'تفاصيل', status: 'طلب جديد' });
    render(<MemoryRouter><Admin /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'طلبات بيع الشركات' }));
    expect((await screen.findByRole('alert')).textContent).toContain('غير مفعّل');
    expect(screen.queryByText(/لا توجد طلبات/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'طلبات العملاء' }));
    await screen.findByText('عميل محفوظ');
  });
});
