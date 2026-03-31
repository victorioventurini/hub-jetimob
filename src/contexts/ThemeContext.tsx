/**
 * ThemeProvider — Context + hook para gerenciamento de tema (light/dark/system)
 * 
 * Aplica a classe `dark` no <html> conforme preferência do usuário.
 * Persiste escolha em localStorage. Respeita prefers-color-scheme quando em 'system'.
 * 
 * @usage
 * // Em App.tsx: envolver com <ThemeProvider>
 * // Em componentes: const { theme, setTheme, resolvedTheme } = useTheme();
 */

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

// ============================================================
// TYPES
// ============================================================

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  /** Preferência salva: 'light' | 'dark' | 'system' */
  theme: Theme;
  /** Tema efetivo aplicado: 'light' | 'dark' */
  resolvedTheme: 'light' | 'dark';
  /** Altera a preferência e persiste em localStorage */
  setTheme: (theme: Theme) => void;
}

// ============================================================
// CONSTANTS
// ============================================================

const STORAGE_KEY = 'hub-theme-preference';
const VALID_THEMES: Theme[] = ['light', 'dark', 'system'];

// ============================================================
// HELPERS
// ============================================================

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && VALID_THEMES.includes(stored as Theme)) {
      return stored as Theme;
    }
  } catch {
    // localStorage unavailable (e.g. iframe sandbox)
  }
  return 'system';
}

function getSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  return theme === 'system' ? getSystemPreference() : theme;
}

function applyThemeToDOM(resolved: 'light' | 'dark') {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(resolved);
}

// ============================================================
// CONTEXT
// ============================================================

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ============================================================
// PROVIDER
// ============================================================

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Forçar tema inicial (útil para testes). Default: lê localStorage/system */
  defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => defaultTheme ?? getStoredTheme());
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => resolveTheme(theme));

  // Apply theme to DOM and update resolved value
  const applyTheme = useCallback((t: Theme) => {
    const r = resolveTheme(t);
    setResolved(r);
    applyThemeToDOM(r);
  }, []);

  // Initial apply
  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  // Listen for system preference changes (only relevant when theme === 'system')
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme, applyTheme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    resolvedTheme: resolved,
    setTheme,
  }), [theme, resolved, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// ============================================================
// HOOK
// ============================================================

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
