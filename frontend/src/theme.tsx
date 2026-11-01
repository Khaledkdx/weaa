import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

type Theme = 'dark' | 'light';
const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(null);
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try { return localStorage.getItem('weaa-theme') === 'light' ? 'light' : 'dark'; }
    catch { return 'dark'; }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0d0d0f' : '#f5f5f7');
    try { localStorage.setItem('weaa-theme', theme); } catch { /* The theme still works when browser storage is unavailable. */ }
  }, [theme]);
  const fallbackTimer = useRef<number>(undefined);
  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    // The attribute flips synchronously so a View Transition snapshot sees the new theme; the effect above re-applies the same value.
    const apply = () => { document.documentElement.dataset.theme = next; setTheme(next); };
    // Crossfading two page snapshots runs on the compositor; nothing on the page repaints per frame.
    if (typeof document.startViewTransition === 'function') { document.startViewTransition(apply); return; }
    // Without it, glass.css eases only the page's own background and text while this class is present.
    const root = document.documentElement;
    window.clearTimeout(fallbackTimer.current);
    root.classList.add('theme-transition');
    fallbackTimer.current = window.setTimeout(() => root.classList.remove('theme-transition'), 450);
    apply();
  };
  const value = useMemo(() => ({ theme, toggle }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export function useTheme() { const value = useContext(ThemeContext); if (!value) throw new Error('ThemeProvider missing'); return value; }
