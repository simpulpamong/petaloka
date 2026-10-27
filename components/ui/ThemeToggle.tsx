'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

const THEME_KEY = 'petaloka-theme';

function applyTheme(isDark: boolean) {
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    let initial = false;
    try {
      const saved = localStorage.getItem(THEME_KEY);
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
      initial = saved ? saved === 'dark' : prefersDark;
    } catch {
      initial = false;
    }
    setIsDark(initial);
    applyTheme(initial);
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    try {
      localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
    } catch {
      // Tema tetap berlaku untuk sesi aktif jika penyimpanan browser diblokir.
    }
    applyTheme(next);
  };

  const label = isDark ? 'Gunakan tema terang' : 'Gunakan tema gelap';
  const Icon = isDark ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      aria-pressed={isDark}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 ${compact ? 'h-10 w-10' : 'h-9 px-3 text-xs font-medium'}`}
    >
      <Icon size={16} aria-hidden="true" />
      {!compact ? <span>{isDark ? 'Mode terang' : 'Mode gelap'}</span> : null}
    </button>
  );
}
