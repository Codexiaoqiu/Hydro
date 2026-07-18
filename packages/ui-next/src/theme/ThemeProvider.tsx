import { type PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { type Theme, ThemeContext, type ThemeContextValue } from './useTheme';

const STORAGE_KEY = 'hydro.theme';

function applyTheme(next: Theme) {
  document.documentElement.setAttribute('data-theme', next);
  window.dispatchEvent(new CustomEvent('hydro:theme-change'));
}

function resolveInitial(): Theme {
  if (typeof window === 'undefined') return 'dark';
  let saved: string | null = null;
  try { saved = window.localStorage.getItem(STORAGE_KEY); } catch {}
  if (saved === 'dark' || saved === 'light') return saved;
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
  return 'dark';
}

export function ThemeProvider({ children }: PropsWithChildren) {
  // Read what the inline script set on <html>; never override on first render.
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof document === 'undefined') return 'dark';
    const attr = document.documentElement.getAttribute('data-theme');
    return attr === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    // Watch for external mutations (e.g. another component changing it).
    const obs = new MutationObserver(() => {
      const attr = document.documentElement.getAttribute('data-theme');
      const next: Theme = attr === 'light' ? 'light' : 'dark';
      setThemeState((prev) => (prev === next ? prev : next));
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window.matchMedia === 'undefined') return;
    const mql = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => {
      let saved: string | null = null;
      try { saved = localStorage.getItem(STORAGE_KEY); } catch {}
      if (saved === 'dark' || saved === 'light') return; // user has explicit choice
      const next: Theme = mql.matches ? 'light' : 'dark';
      applyTheme(next);
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    setTheme: (next) => {
      try { localStorage.setItem(STORAGE_KEY, next); } catch {}
      applyTheme(next);
    },
    toggle: () => {
      const next: Theme = theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(STORAGE_KEY, next); } catch {}
      applyTheme(next);
    },
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
