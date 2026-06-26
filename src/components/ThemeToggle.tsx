'use client';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const stored = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    setTheme(stored);
  }, []);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', next);
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2 text-xs tracking-widest uppercase transition-colors"
      style={{ color: 'var(--muted-2)' }}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
      {theme === 'dark' ? 'LIGHT MODE' : 'DARK MODE'}
    </button>
  );
}
