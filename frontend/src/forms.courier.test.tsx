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
  fireEvent.change(screen.getByLabelText(/رقم الهوية \/ الإقامة/), { target: { value: '2000000000' } });
  fireEvent.change(screen.getByLabelText(/عدد مرات نقل الكفالة/), { target: { value: '0' } });
  fireEvent.change(screen.getByLabelText(/هل تملك سيارة/), { target: { value: '0' } });
  fireEvent.change(screen.getByLabelText(/انتهاء الهوية \*/), { target: { value: '2030-12-31' } });
  fireEvent.change(screen.getByLabelText(/المهنة في الإقامة \*/), { target: { value: 'سائق' } });
  fireEvent.change(screen.getByLabelText(/نوع الرخصة \*/), { target: { value: 'light' } });
  fireEvent.change(screen.getByLabelText(/قابلية الانتقال.*\*/), { target: { value: '0' } });
  for (const city of ['القصيم', 'الشرقية']) {
    const input = screen.getByLabelText(city) as HTMLInputElement;
    if (!input.checked) fireEvent.click(input);
  }
  for (const label of ['الهوية / الإقامة', 'مستندات الإقامة', 'الرخصة', 'الصورة الشخصية', 'مستندات إضافية']) {
    const file = new File(['%PDF'], 'document.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'slice', { value: () => ({ arrayBuffer: async () => new Uint8Array([37, 80, 68, 70]).buffer }) });
    fireEvent.change(screen.getByLabelText(label), { target: { files: [file] } });
  }
}

async function chooseOffers(container: HTMLElement) {
  fireEvent.submit(container.querySelector('form')!);
  await screen.findByRole('heading', { name: /تفاصيل عروض العمل/ });
  expect(createJoinRequest).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('checkbox', { name: /العرض الأول: العمل في جدة/ }));
  fireEvent.click(screen.getByRole('checkbox', { name: /العرض الثاني: العمل في الرياض/ }));
}

describe('internal courier request payload', () => {
  it('requires all visible fields and saves both selected offers after registration details', async () => {
    const fetchMock = vi.fn(async () => ({ status: 201, json: async () => ({ success: true, application_code: 'MND-TEST' }) }));
    vi.stubGlobal('fetch', fetchMock);
    const { container } = render(<CourierForm form={courierForms[0]} />);
    fillBaseForm();
    await chooseOffers(container);
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/internal$/);
    expect(init.credentials).toBe('omit');
    expect(init.headers).toBeUndefined();
    const body = init.body as FormData;
    expect(body.getAll('city')).toEqual(['القصيم، الشرقية']);
    expect(body.get('phone')).toBe('+966500000198');
    expect(body.get('sponsorship_transfer_count')).toBe('0');
    expect(body.get('owns_car')).toBe('0');
    expect(body.has('selected_offers')).toBe(false);
    expect(body.has('car_model')).toBe(false);
    expect(body.has('registration_files')).toBe(false);
    await waitFor(() => expect(createJoinRequest).toHaveBeenCalled());
    expect(vi.mocked(createJoinRequest).mock.calls[0][0]).toMatchObject({ form_slug: 'courier-internal', fields: { 'المدن': 'القصيم، الشرقية', 'الربط الخارجي': 'تم الإرسال' } });
    expect(vi.mocked(createJoinRequest).mock.calls[0][0].fields['العروض المختارة']).toContain('جدة');
    expect(vi.mocked(createJoinRequest).mock.calls[0][0].fields['العروض المختارة']).toContain('الرياض');
    expect(vi.mocked(createJoinRequest).mock.calls[0][0].fields['تفاصيل العروض المختارة']).toContain('4,500');
  });

  it('preserves zero and strips car details after switching from yes to no', async () => {
    const fetchMock = vi.fn(async () => ({ status: 201, json: async () => ({ success: true }) }));
    vi.stubGlobal('fetch', fetchMock);
    const { container } = render(<CourierForm form={courierForms[0]} />);
    fillBaseForm();
    fireEvent.change(screen.getByLabelText(/عدد مرات نقل الكفالة/), { target: { value: '٠' } });
    fireEvent.change(screen.getByLabelText(/هل تملك سيارة/), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/نوع وموديل السيارة \*/), { target: { value: 'تويوتا كورولا' } });
    fireEvent.change(screen.getByLabelText(/سنة الصنع \*/), { target: { value: '٢٠٢٠' } });
    fireEvent.change(screen.getByLabelText(/هل تملك سيارة/), { target: { value: '0' } });
    expect(screen.queryByLabelText(/نوع وموديل السيارة \*/)).toBeNull();
    expect(screen.queryByLabelText('استمارة السيارة')).toBeNull();
    await chooseOffers(container);
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const body = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as FormData;
    expect(body.get('sponsorship_transfer_count')).toBe('0');
    expect(body.get('owns_car')).toBe('0');
    expect(body.has('car_model')).toBe(false);
    expect(body.has('car_year')).toBe(false);
    expect(body.has('registration_files')).toBe(false);
  });

  it('blocks empty fields, missing attachments and submitting without an offer', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    const { container } = render(<CourierForm form={courierForms[0]} />);
    expect(screen.getByLabelText(/رقم الهوية \/ الإقامة/)).toHaveProperty('required', true);
    expect(screen.getByLabelText(/عدد مرات نقل الكفالة/)).toHaveProperty('required', true);
    fireEvent.submit(container.querySelector('form')!);
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'أدخل الاسم.');
    fillBaseForm();
    fireEvent.click(screen.getAllByRole('button', { name: 'إزالة document.pdf' })[0]);
    fireEvent.submit(container.querySelector('form')!);
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'أرفق الهوية / الإقامة.');
    fillBaseForm();
    await chooseOffers(container);
    fireEvent.click(screen.getByRole('checkbox', { name: /العرض الأول: العمل في جدة/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /العرض الثاني: العمل في الرياض/ }));
    fireEvent.submit(container.querySelector('form')!);
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'اختر عرضًا واحدًا على الأقل.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('allows waiting instead of either offer, preserves the choice on failure, and thanks the applicant', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 201, json: async () => ({ success: true }) }));
    const { container } = render(<CourierForm form={courierForms[0]} />);
    fillBaseForm();
    await chooseOffers(container);
    const waiting = screen.getByRole('checkbox', { name: 'لم يعجبني أي من العروض، في انتظار عرض آخر' });
    fireEvent.click(waiting);
    expect(screen.getByRole('checkbox', { name: /العرض الأول: العمل في جدة/ })).toHaveProperty('checked', false);
    expect(screen.getByRole('checkbox', { name: /العرض الثاني: العمل في الرياض/ })).toHaveProperty('checked', false);
    fireEvent.click(screen.getByRole('checkbox', { name: /العرض الأول: العمل في جدة/ }));
    expect(waiting).toHaveProperty('checked', false);
    fireEvent.click(waiting);
    vi.mocked(createJoinRequest).mockRejectedValueOnce(new Error('تعذر الحفظ'));
    fireEvent.submit(container.querySelector('form')!);
    await screen.findByRole('alert');
    expect(waiting).toHaveProperty('checked', true);
    fireEvent.submit(container.querySelector('form')!);
    expect(await screen.findByRole('status')).toHaveProperty('textContent', 'شكرًا لتسجيلك. تم إرسال طلبك بنجاح، وسيتم التواصل معك من فريق عمل وعاء.');
    expect(vi.mocked(createJoinRequest).mock.calls[1][0].fields['العروض المختارة']).toBe('لم يعجبني أي من العروض، في انتظار عرض آخر');
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
    await chooseOffers(container);
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
    await chooseOffers(container);
    fireEvent.submit(container.querySelector('form')!);
    await screen.findByRole('alert');
    fireEvent.submit(container.querySelector('form')!);
    await screen.findByRole('status');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(createJoinRequest).toHaveBeenCalledTimes(2);
  });
});
