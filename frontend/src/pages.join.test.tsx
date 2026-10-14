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
    expect(screen.queryByRole('textbox', { name: 'الاسم / اسم الشركة *' })).toBeNull();
  });

  it('opens the form at /join-us/request-services', () => {
    renderRoute('/join-us/request-services');
    expect(screen.getByRole('heading', { name: 'نموذج الخدمات اللوجستية' })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'الاسم / اسم الشركة *' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /العودة إلى الفئات/ }).getAttribute('href')).toBe('/join-us');
  });

  it('keeps the old request-services link working', () => {
    renderRoute('/request-services');
    expect(screen.getByRole('heading', { name: 'نموذج الخدمات اللوجستية' })).toBeTruthy();
  });
});
