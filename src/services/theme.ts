import { useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'geo_data_explorer_theme';

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'dark';
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'dark';
  }
}

export function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === 'light' || saved === 'dark' || saved === 'system') {
    return saved;
  }
  return 'system';
}

export function applyThemeToDOM(mode: ThemeMode): ResolvedTheme {
  const root = document.documentElement;
  const resolved: ResolvedTheme = mode === 'system' ? getSystemTheme() : mode;

  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  root.setAttribute('data-theme', resolved);
  return resolved;
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    return theme === 'system' ? getSystemTheme() : theme;
  });

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    const resolved = applyThemeToDOM(newTheme);
    setResolvedTheme(resolved);
  }, []);

  // Sync with OS theme changes when in 'system' mode
  useEffect(() => {
    applyThemeToDOM(theme);
    setResolvedTheme(theme === 'system' ? getSystemTheme() : theme);

    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const resolved = applyThemeToDOM('system');
      setResolvedTheme(resolved);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return {
    theme,
    resolvedTheme,
    setTheme,
  };
}
