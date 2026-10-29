import { describe, it, expect, beforeEach } from 'vitest';
import { getInitialTheme, applyThemeToDOM, getSystemTheme } from './theme';

describe('Theme Service Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('defaults to system theme when no preference stored in localStorage', () => {
    expect(getInitialTheme()).toBe('system');
  });

  it('reads stored theme mode from localStorage', () => {
    localStorage.setItem('geo_data_explorer_theme', 'light');
    expect(getInitialTheme()).toBe('light');

    localStorage.setItem('geo_data_explorer_theme', 'dark');
    expect(getInitialTheme()).toBe('dark');
  });

  it('applies dark theme to documentElement', () => {
    const resolved = applyThemeToDOM('dark');
    expect(resolved).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('applies light theme to documentElement', () => {
    document.documentElement.classList.add('dark');
    const resolved = applyThemeToDOM('light');
    expect(resolved).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('detects system theme using matchMedia', () => {
    const resolved = getSystemTheme();
    expect(resolved === 'light' || resolved === 'dark').toBe(true);
  });
});
