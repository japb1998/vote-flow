import { useEffect, useState } from 'react';
import styles from './ThemeToggle.module.css';

/**
 * Dark/light theme toggle.
 * Reads OS preference on first load, then defers to localStorage.
 * Sets data-theme attribute on <html> for CSS variable switching.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('vf-theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vf-theme', theme);
  }, [theme]);

  return (
    <button
      className={styles.toggle}
      onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? '\u2600' : '\u263E'}
    </button>
  );
}
