// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CmsProvider } from './data';
import { App } from './pages';

vi.mock('./shell', () => ({
  Shell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Action: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  SectionHeading: ({ title }: { title: string }) => <h2>{title}</h2>,
}));
afterEach(cleanup);

function renderRoute(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><CmsProvider><App /></CmsProvider></MemoryRouter>);
}

describe('join us service inquiry', () => {
  it('shows a card that opens the inquiry on its own page', () => {
    renderRoute('/join-us');
    const card = screen.getByRole('link', { name: /طلب الخدمات اللوجستية/ });
    expect(card.getAttribute('href')).toBe('/join-us/request-services');
    expect(screen.queryByRole('textbox', { name: 'الاسم *' })).toBeNull();
  });

  it('opens the form at /join-us/request-services', () => {
    renderRoute('/join-us/request-services');
    expect(screen.getByRole('heading', { name: 'نموذج الخدمات اللوجستية' })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'الاسم *' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /العودة إلى الفئات/ }).getAttribute('href')).toBe('/join-us');
  });

  it('keeps the old request-services link working', () => {
    renderRoute('/request-services');
    expect(screen.getByRole('heading', { name: 'نموذج الخدمات اللوجستية' })).toBeTruthy();
  });
});

describe('public form locations', () => {
  it('opens the road transport form from contracts and Join Us', () => {
    renderRoute('/services/contracts');
    expect(screen.getByRole('link', { name: 'نموذج النقل البري' }).getAttribute('href')).toBe('/join-us/road-transport');
    cleanup(); renderRoute('/join-us');
    expect(screen.getByRole('link', { name: /النقل البري/ }).getAttribute('href')).toBe('/join-us/road-transport');
    cleanup(); renderRoute('/join-us/road-transport');
    expect(screen.getByRole('heading', { name: 'نموذج عملاء النقل البري' })).toBeTruthy();
  });
  it('links selling a company to the preliminary form but never lists the executive form', () => {
    const market = renderRoute('/company-market');
    expect(screen.getByRole('link', { name: 'أريد بيع شركة' }).getAttribute('href')).toBe('/join-us/company-sale');
    expect(market.container.querySelector('a[href="/join-us/company-sale-executive"]')).toBeNull();
    cleanup();
    const home = renderRoute('/');
    expect(screen.getByRole('link', { name: /أريد بيع شركة/ }).getAttribute('href')).toBe('/join-us/company-sale');
    expect(home.container.querySelector('a[href="/join-us/company-sale-executive"]')).toBeNull();
    cleanup();
    const join = renderRoute('/join-us');
    expect(join.container.querySelector('a[href="/join-us/company-sale-executive"]')).toBeNull();
  });

  it('links road transport from the homepage and services without restoring old vehicle cards', () => {
    renderRoute('/');
    expect(screen.getByRole('link', { name: 'النقل البري' }).getAttribute('href')).toBe('/join-us/road-transport');
    expect(screen.queryByText('الدينات')).toBeNull();
    expect(screen.getByRole('link', { name: 'خدمات وعقود' }).getAttribute('href')).toBe('/services/contracts');
    cleanup();
    const { container } = renderRoute('/services');
    expect(screen.getByRole('link', { name: /النقل البري/ }).getAttribute('href')).toBe('/join-us/road-transport');
    expect(container.querySelector('form')).toBeNull();
  });

  it('shows contact details without a submission form', () => {
    const { container } = renderRoute('/contact');
    expect(container.querySelector('form')).toBeNull();
    expect(screen.getByRole('link', { name: /11 511 0441/ }).getAttribute('href')).toBe('tel:+966115110441');
  });

  it('opens the Join Us form from a service without embedding a form', () => {
    const { container } = renderRoute('/services/warehousing');
    expect(container.querySelector('form')).toBeNull();
    expect(screen.getByRole('link', { name: 'اطلب الخدمة' }).getAttribute('href')).toBe('/join-us/request-services');
  });

  it('keeps courier submissions on their Join Us route', () => {
    const { container } = renderRoute('/join-us/courier-external');
    expect(container.querySelector('form')).not.toBeNull();
  });
});
