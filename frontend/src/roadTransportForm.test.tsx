// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RoadTransportPage } from './roadTransportForm';
import { createJoinRequest } from './data';
vi.mock('./data', () => ({ createJoinRequest: vi.fn().mockResolvedValue(undefined) }));
vi.mock('./shell', () => ({ Shell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
beforeEach(() => { vi.spyOn(window, 'scrollTo').mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.restoreAllMocks(); });
function fill(label: string, value: string) { fireEvent.change(screen.getByLabelText(label, { exact: false }), { target: { value } }); }
function next() { fireEvent.click(screen.getByRole('button', { name: 'التالي' })); }
function start() {
  render(<MemoryRouter><RoadTransportPage /></MemoryRouter>);
  fill('اسم العميل', 'أحمد'); fill('اسم الشركة', 'شركة اختبار'); fill('رقم الهاتف', '+966512345678'); fill('البريد الإلكتروني', 'test@example.com'); next();
}
describe('road transport form', () => {
  it('requires a role and supports provider review, editing, failure, and retry', async () => {
    start(); next(); expect(screen.getByRole('alert').textContent).toContain('نوع الخدمة');
    fireEvent.click(screen.getByRole('radio', { name: 'مزود خدمة نقل' })); next();
    fireEvent.click(screen.getByRole('checkbox', { name: 'فان' }));
    fill('فان: نوع المركبة', 'جاف'); fill('فان: العدد', '2'); fill('فان: الموديل', '2027'); fill('فان: حالة المركبة', 'ممتازة');
    fill('هل يتوفر السائق', 'نعم'); fill('هل تتحمل', 'لا'); fill('المدينة', 'جدة'); fill('نطاق العمل', 'بين المدن'); fill('تصريح دخول', 'نعم');
    fireEvent.click(screen.getByRole('checkbox', { name: 'إيجار شهري' })); fireEvent.click(screen.getByRole('checkbox', { name: 'بالطلب' })); next();
    expect(screen.getByRole('heading', { name: 'مراجعة الطلب' })).toBeTruthy();
    expect(createJoinRequest).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'رجوع' }));
    expect((screen.getByLabelText('فان: العدد', { exact: false }) as HTMLSelectElement).value).toBe('2'); next();
    vi.mocked(createJoinRequest).mockRejectedValueOnce(new Error('تعذر الحفظ'));
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد وإرسال الطلب' })); await screen.findByRole('alert');
    expect(screen.getByText('شركة اختبار')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد وإرسال الطلب' })); await screen.findByRole('status');
    expect(createJoinRequest).toHaveBeenCalledWith(expect.objectContaining({ form_slug: 'road-transport', name: 'أحمد', fields: expect.objectContaining({ 'فان: العدد': '2', 'نوع الخدمة': 'مزود خدمة نقل', 'طريقة التعاقد': 'إيجار شهري، بالطلب' }) }));
  });
  it('switches roles without sending the previous fleet or provider-only details', async () => {
    start(); fireEvent.click(screen.getByRole('radio', { name: 'مزود خدمة نقل' })); next();
    fireEvent.click(screen.getByRole('checkbox', { name: 'رأس تريلا' })); fill('رأس تريلا: العدد', '3');
    fireEvent.click(screen.getByRole('button', { name: 'رجوع' }));
    fireEvent.click(screen.getByRole('radio', { name: 'طالب خدمة نقل' })); next();
    expect(screen.queryByRole('checkbox', { name: 'رأس تريلا' })).toBeNull();
    fireEvent.click(screen.getByRole('checkbox', { name: 'أخرى' })); fill('نوع المركبات الأخرى', 'مركبات بمواصفات خاصة');
    fill('هل ترغب بتوفر سائق', 'لا'); fill('هل ترغب أن توفر', 'نعم'); fill('المدينة', 'الرياض'); fill('نطاق العمل', 'عمل دولي'); fill('نوع الحمولة', 'معدات'); fill('طريقة التعاقد', 'بالطلب'); fill('مدة العقد', 'ثلاثة أشهر'); next();
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد وإرسال الطلب' })); await screen.findByRole('status');
    const fields = vi.mocked(createJoinRequest).mock.calls[0][0].fields;
    expect(fields).toMatchObject({ 'نوع الخدمة': 'طالب خدمة نقل', 'نوع الحمولة': 'معدات', 'مدة العقد المتوقعة': 'ثلاثة أشهر' });
    expect(fields['رأس تريلا: العدد']).toBeUndefined();
    expect(fields['هل يتوفر تصريح دخول الميناء؟']).toBeUndefined();
  });
});
