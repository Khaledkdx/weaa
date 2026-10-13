// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ServiceInquiry } from './serviceInquiryForm';

afterEach(cleanup);

describe('service inquiry steps', () => {
  it('requires valid contact details and a service before review', () => {
    render(<ServiceInquiry />);
    fireEvent.click(screen.getByRole('button', { name: /التالي/ }));
    expect(screen.getByRole('alert').textContent).toContain('الاسم والمدينة');

    fireEvent.change(screen.getByRole('textbox', { name: 'الاسم *' }), { target: { value: 'عميل اختبار' } });
    fireEvent.change(screen.getByRole('textbox', { name: /رقم الجوال/ }), { target: { value: '+966512345678' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'في أي مدينة *' }), { target: { value: 'جدة' } });
    expect((screen.getByRole('textbox', { name: /رقم الجوال/ }) as HTMLInputElement).value).toBe('512345678');
    fireEvent.change(screen.getByRole('textbox', { name: /رقم الجوال/ }), { target: { value: '0512345678' } });
    expect((screen.getByRole('textbox', { name: /رقم الجوال/ }) as HTMLInputElement).value).toBe('512345678');
    fireEvent.click(screen.getByRole('button', { name: /التالي/ }));
    expect(screen.getByRole('heading', { name: 'اختر الخدمات' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /التالي/ }));
    expect(screen.getByRole('alert').textContent).toContain('اختر خدمة');
    fireEvent.click(screen.getByRole('checkbox', { name: 'باقة كوادر' }));
    fireEvent.click(screen.getByRole('button', { name: /التالي/ }));
    expect(screen.getByRole('heading', { name: 'راجع طلبك' })).toBeTruthy();
    expect(screen.getByText('+966512345678')).toBeTruthy();
  });
});
