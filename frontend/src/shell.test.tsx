// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CmsProvider } from './data';
import { Shell } from './shell';

vi.mock('@iconify/react', () => ({ Icon: () => null }));
vi.mock('./theme', () => ({ useTheme: () => ({ theme: 'light', toggle: () => {} }) }));
vi.mock('lenis', () => ({ default: class { raf() {} on() {} destroy() {} } }));
// The motion code asks the browser about media queries as it loads; the test browser has none, so it answers «no».
vi.hoisted(() => {
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: (query: string) => ({ matches: false, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false }) });
});
afterEach(cleanup);

describe('site footer', () => {
  it('opens the map from the headquarters, and has no floating call button', () => {
    const { container } = render(<MemoryRouter initialEntries={['/']}><CmsProvider><Shell><p>محتوى</p></Shell></CmsProvider></MemoryRouter>);
    const location = container.querySelector('.footer-contact a[target="_blank"]') as HTMLAnchorElement;
    expect(location.textContent).toBe('الرياض، حي الملز، طريق صلاح الدين الأيوبي، 12836');
    expect(location.getAttribute('href')).toContain('ftid=0x3e2f05c347e3a157');
    expect(location.getAttribute('aria-label')).toMatch(/^المقر على الخريطة/);
    expect(container.querySelector('.call-fab')).toBeNull();
  });
});
