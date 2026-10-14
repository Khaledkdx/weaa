// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ServiceInquiry } from './serviceInquiryForm';
import { submitServiceInquiry } from './serviceInquiryApi';

vi.mock('./serviceInquiryApi', () => ({ submitServiceInquiry: vi.fn() }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('service inquiry steps', () => {
  it('requires valid contact details and a service before review', () => {
    render(<ServiceInquiry />);
    fireEvent.click(screen.getByRole('button', { name: /التالي/ }));
    expect(screen.getByRole('alert').textContent).toContain('الاسم أو اسم الشركة');

    fireEvent.change(screen.getByRole('textbox', { name: 'الاسم / اسم الشركة *' }), { target: { value: 'عميل اختبار' } });
    fireEvent.change(screen.getByRole('textbox', { name: /رقم الجوال/ }), { target: { value: '+966512345678' } });
    expect((screen.getByRole('textbox', { name: /رقم الجوال/ }) as HTMLInputElement).value).toBe('512345678');
    fireEvent.change(screen.getByRole('textbox', { name: /رقم الجوال/ }), { target: { value: '0512345678' } });
    expect((screen.getByRole('textbox', { name: /رقم الجوال/ }) as HTMLInputElement).value).toBe('512345678');
    fireEvent.click(screen.getByRole('button', { name: /التالي/ }));
    expect(screen.getByRole('heading', { name: 'اختر الخدمات' })).toBeTruthy();
    const category = screen.getByText('مستودعات').closest('details');
    expect(category?.open).toBe(false);
    fireEvent.click(screen.getByText('مستودعات'));
    expect(category?.open).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /التالي/ }));
    expect(screen.getByRole('alert').textContent).toContain('اختر خدمة');
    fireEvent.click(screen.getByRole('checkbox', { name: 'إدارة مستودعات' }));
    fireEvent.click(screen.getByRole('button', { name: /التالي/ }));
    expect(screen.getByRole('heading', { name: 'راجع طلبك' })).toBeTruthy();
    expect(screen.getByText('+966512345678')).toBeTruthy();
  });

  it('submits the reviewed request to the external service only once', async () => {
    vi.mocked(submitServiceInquiry).mockResolvedValue({ success: true });
    render(<ServiceInquiry />);
    fireEvent.change(screen.getByRole('textbox', { name: 'الاسم / اسم الشركة *' }), { target: { value: 'أحمد' } });
    fireEvent.change(screen.getByRole('textbox', { name: /رقم الجوال/ }), { target: { value: '512345678' } });
    fireEvent.click(screen.getByRole('button', { name: /التالي/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'إدارة مستودعات' }));
    fireEvent.click(screen.getByRole('button', { name: /التالي/ }));
    fireEvent.click(screen.getByRole('button', { name: /إرسال الطلب/ }));
    await waitFor(() => expect(submitServiceInquiry).toHaveBeenCalledWith(
      { name: 'أحمد', phone: '512345678' }, ['إدارة مستودعات'], { count: '', city: '', sponsorshipSpecs: '', ajeerSpecs: '' },
    ));
    expect(submitServiceInquiry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status').textContent).toContain('تم إرسال طلبك بنجاح');
  });

  it('requires courier quantity and city only when couriers are selected', () => {
    render(<ServiceInquiry />);
    fireEvent.change(screen.getByRole('textbox', { name: 'الاسم / اسم الشركة *' }), { target: { value: 'شركة اختبار' } });
    fireEvent.change(screen.getByRole('textbox', { name: /رقم الجوال/ }), { target: { value: '512345678' } });
    fireEvent.click(screen.getByRole('button', { name: /التالي/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'مناديب نقل كفالة' }));
    expect(screen.getByRole('spinbutton', { name: /عدد المناديب المطلوب/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /التالي/ }));
    expect(screen.getByRole('alert').textContent).toContain('عدد المناديب');
    fireEvent.change(screen.getByRole('spinbutton', { name: /عدد المناديب المطلوب/ }), { target: { value: '5' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'المدينة *' }), { target: { value: 'الرياض' } });
    fireEvent.click(screen.getByRole('button', { name: /التالي/ }));
    expect(screen.getByRole('heading', { name: 'راجع طلبك' })).toBeTruthy();
    expect(screen.getByText('الرياض')).toBeTruthy();
  });
});
