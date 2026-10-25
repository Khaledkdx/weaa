import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CourierForm } from './forms';
import { courierForms } from './seed';
import { createJoinRequest } from './data';
vi.mock('./data', () => ({ createJoinRequest: vi.fn().mockResolvedValue(undefined) }));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

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
    await waitFor(() => expect(createJoinRequest).toHaveBeenCalled());
    expect(vi.mocked(createJoinRequest).mock.calls[0][0]).toMatchObject({ form_slug: 'courier-internal', fields: { 'المدن': 'القصيم، الشرقية', 'الربط الخارجي': 'تم الإرسال' } });
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

describe('external courier request payload', () => {
  it('requires the current profession and sends it as profession', async () => {
    const fetchMock = vi.fn(async () => ({ status: 201, json: async () => ({ success: true }) }));
    vi.stubGlobal('fetch', fetchMock);
    const { container } = render(<CourierForm form={courierForms[1]} />);
    expect(screen.getByLabelText(/المهنة الحالية/)).toHaveProperty('required', true);
    fireEvent.change(screen.getByLabelText(/الاسم \*/), { target: { value: 'أحمد محمد' } });
    fireEvent.change(screen.getByLabelText(/رقم الجوال مع رمز البلد \*/), { target: { value: '+201001234567' } });
    fireEvent.change(screen.getByLabelText(/الحالة الاجتماعية \*/), { target: { value: 'single' } });
    fireEvent.change(screen.getByLabelText(/التعليم \*/), { target: { value: 'ثانوي' } });
    fireEvent.change(screen.getByLabelText(/المهنة الحالية \*/), { target: { value: 'سائق توصيل' } });
    fireEvent.change(screen.getByLabelText(/هل لديك رخصة؟ \*/), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/^البلد \*/), { target: { value: 'مصر' } });
    fireEvent.change(screen.getByLabelText(/السن بالسنوات \*/), { target: { value: '30' } });
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/external$/);
    expect((init.body as FormData).get('profession')).toBe('سائق توصيل');
    await waitFor(() => expect(createJoinRequest).toHaveBeenCalled());
    expect(vi.mocked(createJoinRequest).mock.calls[0][0]).toMatchObject({ form_slug: 'courier-external', fields: { 'المهنة الحالية': 'سائق توصيل' } });
  });

  it('saves locally when the external system is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const { container } = render(<CourierForm form={courierForms[0]} />);
    fillBaseForm();
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => expect(createJoinRequest).toHaveBeenCalled());
    expect(vi.mocked(createJoinRequest).mock.calls[0][0].fields).toMatchObject({ 'الربط الخارجي': 'يحتاج متابعة', 'سبب تعذر الربط الخارجي': 'offline' });
    await screen.findByRole('status');
  });

  it('retains the external receipt when the dashboard save fails and is retried', async () => {
    vi.mocked(createJoinRequest).mockRejectedValueOnce(new Error('تعذر الحفظ'));
    const fetchMock = vi.fn().mockResolvedValue({ status: 201, json: async () => ({ success: true, application_code: 'TEST' }) });
    vi.stubGlobal('fetch', fetchMock);
    const { container } = render(<CourierForm form={courierForms[0]} />);
    fillBaseForm();
    fireEvent.submit(container.querySelector('form')!);
    await screen.findByRole('alert');
    fireEvent.submit(container.querySelector('form')!);
    await screen.findByRole('status');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(createJoinRequest).toHaveBeenCalledTimes(2);
  });
});
