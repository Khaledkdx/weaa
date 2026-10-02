import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type Theme = 'dark' | 'light';
const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(null);
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => localStorage.getItem('weaa-theme') === 'light' ? 'light' : 'dark');
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('weaa-theme', theme); }, [theme]);
  const value = useMemo(() => ({ theme, toggle: () => setTheme(previous => previous === 'dark' ? 'light' : 'dark') }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export function useTheme() { const value = useContext(ThemeContext); if (!value) throw new Error('ThemeProvider missing'); return value; }
