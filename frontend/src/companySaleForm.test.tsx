// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CompanySalePage } from './companySaleForm';
import { companyDocuments, operatingGroups } from './companySale';
const submitSale = vi.hoisted(() => vi.fn());
vi.mock('./data', () => ({ submitCompanySale: submitSale }));
vi.mock('./shell', () => ({ Shell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
beforeEach(() => { submitSale.mockReset().mockResolvedValue(undefined); vi.spyOn(window, 'scrollTo').mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label, { exact: false }), { target: { value } });
async function contact(executive = false) {
  fill('اسم الشركة', 'شركة اختبار'); fill('رقم الهاتف', '+966512345678'); fill('اسم ممثل الشركة', 'ممثل الاختبار'); fill('البريد الإلكتروني', 'test@example.com');
  if (!executive) { fill('بصفته', 'مالك'); fill('مدينة المقر', 'جدة'); }
  fireEvent.click(screen.getByRole('button', { name: 'التالي' }));
  await screen.findByRole('heading', { name: executive ? 'مستندات الشركة والأسعار' : 'البيانات التشغيلية' });
}
describe('company sale forms', () => {
  it('waits for an intent before showing the preliminary form and preserves details when switching', () => {
    const { container } = render(<MemoryRouter><CompanySalePage /></MemoryRouter>);
    expect(container.querySelector('form')).toBeNull();
    expect(screen.queryByLabelText('اسم الشركة', { exact: false })).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: 'هل تبحث عن شريك؟' }));
    fill('اسم الشركة', 'شركة محفوظة');
    fireEvent.click(screen.getByRole('radio', { name: 'هل ترغب في بيع الشركة بالكامل؟' }));
    expect((screen.getByLabelText('اسم الشركة', { exact: false }) as HTMLInputElement).value).toBe('شركة محفوظة');
  });

  it('shows the conditional representative role and removes it when not needed', () => {
    render(<MemoryRouter><CompanySalePage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('radio', { name: 'هل ترغب في بيع الشركة بالكامل؟' }));
    fill('بصفته', 'أخرى'); expect(screen.getByLabelText('الصفة الأخرى', { exact: false })).toBeTruthy();
    fill('بصفته', 'مالك'); expect(screen.queryByLabelText('الصفة الأخرى', { exact: false })).toBeNull();
  });
  it.each([
    ['هل تبحث عن شريك؟', 'البحث عن شريك'],
    ['هل ترغب في بيع الشركة بالكامل؟', 'بيع الشركة بالكامل'],
  ])('saves %s with the preliminary request through review and retry', async (choice, intent) => {
    submitSale.mockRejectedValueOnce(new Error('تعذر الاتصال'));
    render(<MemoryRouter><CompanySalePage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('radio', { name: choice }));
    await contact();
    for (const field of operatingGroups.flatMap(group => group.fields).filter(field => field.required)) fill(field.label, field.type === 'select' ? 'نعم' : 'بيانات الاختبار');
    fireEvent.click(screen.getByRole('button', { name: 'التالي' }));
    await screen.findByRole('heading', { name: 'مراجعة الطلب' });
    expect(screen.getByText(intent)).toBeTruthy();
    expect(submitSale).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'إرسال الطلب' }));
    await screen.findByRole('alert');
    expect(screen.getByText('شركة اختبار')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'إرسال الطلب' }));
    await screen.findByRole('heading', { name: 'تم استلام طلبكم' });
    expect(submitSale.mock.calls[1][0]).toMatchObject({ form_slug: 'company-sale', name: 'ممثل الاختبار', fields: { 'اسم الشركة': 'شركة اختبار', 'نوع الطلب': intent } });
    expect(submitSale.mock.calls[1][1]).toEqual([]);
  });
  it('requires the six executive documents and excludes the page from indexing', async () => {
    const { container, unmount } = render(<MemoryRouter><CompanySalePage executive /></MemoryRouter>);
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex');
    await contact(true);
    expect(companyDocuments.filter(field => field.required)).toHaveLength(6);
    expect(container.querySelectorAll('input[type="file"][required]')).toHaveLength(6);
    fireEvent.submit(container.querySelector('form')!);
    await screen.findByText(/أكمل حقل: السجل التجاري/);
    expect(submitSale).not.toHaveBeenCalled();
    unmount(); expect(document.querySelector('meta[name="robots"]')).toBeNull();
  });
  it('blocks invalid documents and retains the selected files', async () => {
    const { container } = render(<MemoryRouter><CompanySalePage executive /></MemoryRouter>);
    await contact(true);
    const file = new File(['invalid'], 'document.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'slice', { value: () => ({ arrayBuffer: async () => new Uint8Array([0, 0, 0, 0]).buffer }) });
    for (const field of companyDocuments.filter(field => field.required)) fireEvent.change(screen.getByLabelText(field.label), { target: { files: [file] } });
    fill('قيمة آخر إيراد', '0'); fill('الثمن المتوقع', '100000');
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('غير مدعوم'));
    expect(screen.getAllByRole('button', { name: 'إزالة document.pdf' })).toHaveLength(6);
    expect(submitSale).not.toHaveBeenCalled();
  });
});
