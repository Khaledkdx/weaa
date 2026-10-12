import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CourierForm } from './forms';
import { courierForms } from './seed';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function fillBaseForm() {
  fireEvent.change(screen.getByLabelText(/الاسم \*/), { target: { value: 'أحمد محمد' } });
  fireEvent.change(screen.getByLabelText(/رقم التواصل \*/), { target: { value: '0500000198' } });
  fireEvent.change(screen.getByLabelText(/الجنسية \*/), { target: { value: 'مصر' } });
  fireEvent.change(screen.getByLabelText(/انتهاء الهوية \*/), { target: { value: '2030-12-31' } });
  fireEvent.change(screen.getByLabelText(/المهنة في الإقامة \*/), { target: { value: 'سائق' } });
  fireEvent.change(screen.getByLabelText(/نوع الرخصة \*/), { target: { value: 'light' } });
  fireEvent.change(screen.getByLabelText(/قابلية الانتقال.*\*/), { target: { value: '0' } });
  fireEvent.click(screen.getByLabelText('القصيم'));
  fireEvent.click(screen.getByLabelText('الشرقية'));
}

describe('internal courier request payload', () => {
  it('sends multiple cities in one field and omits empty optional fields', async () => {
    const fetchMock = vi.fn(async () => ({ status: 201, json: async () => ({ success: true, application_code: 'MND-TEST' }) }));
    vi.stubGlobal('fetch', fetchMock);
    const { container } = render(<CourierForm form={courierForms[0]} />);
    fillBaseForm();
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/internal$/);
    expect(init.credentials).toBe('omit');
    expect(init.headers).toBeUndefined();
    const body = init.body as FormData;
    expect(body.getAll('city')).toEqual(['القصيم، الشرقية']);
    expect(body.get('phone')).toBe('+966500000198');
    expect(body.has('sponsorship_transfer_count')).toBe(false);
    expect(body.has('owns_car')).toBe(false);
    expect(body.has('car_model')).toBe(false);
    expect(body.has('registration_files')).toBe(false);
  });

  it('preserves zero and strips car details after switching from yes to no', async () => {
    const fetchMock = vi.fn(async () => ({ status: 201, json: async () => ({ success: true }) }));
    vi.stubGlobal('fetch', fetchMock);
    const { container } = render(<CourierForm form={courierForms[0]} />);
    fillBaseForm();
    fireEvent.change(screen.getByLabelText('عدد مرات نقل الكفالة'), { target: { value: '٠' } });
    fireEvent.change(screen.getByLabelText('هل تملك سيارة؟'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/نوع وموديل السيارة \*/), { target: { value: 'تويوتا كورولا' } });
    fireEvent.change(screen.getByLabelText(/سنة الصنع \*/), { target: { value: '٢٠٢٠' } });
    fireEvent.change(screen.getByLabelText('هل تملك سيارة؟'), { target: { value: '0' } });
    expect(screen.queryByLabelText(/نوع وموديل السيارة \*/)).toBeNull();
    expect(screen.queryByLabelText('استمارة السيارة')).toBeNull();
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const body = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as FormData;
    expect(body.get('sponsorship_transfer_count')).toBe('0');
    expect(body.get('owns_car')).toBe('0');
    expect(body.has('car_model')).toBe(false);
    expect(body.has('car_year')).toBe(false);
    expect(body.has('registration_files')).toBe(false);
  });
});
