import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const ThemeToggle = ({ className = '' }) => {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={`inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-[#0D1830] border border-slate-200 dark:border-blue-500/20 transition-colors duration-200 ${className}`}
      role="radiogroup"
      aria-label="Theme selector"
    >
      <button
        type="button"
        role="radio"
        aria-checked={theme === 'light'}
        aria-label="Switch to light theme"
        onClick={() => setTheme('light')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
          theme === 'light'
            ? 'bg-white text-amber-600 shadow-sm border border-slate-200/80 font-extrabold'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-semibold'
        }`}
      >
        <Sun className={`w-3.5 h-3.5 ${theme === 'light' ? 'text-amber-500 fill-amber-400/20' : 'text-slate-400'}`} />
        <span>Light</span>
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={theme === 'dark'}
        aria-label="Switch to dark theme"
        onClick={() => setTheme('dark')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
          theme === 'dark'
            ? 'bg-[#111E3D] text-sky-300 shadow-sm border border-blue-400/30 font-extrabold'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-semibold'
        }`}
      >
        <Moon className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-sky-400 fill-sky-400/20' : 'text-slate-400'}`} />
        <span>Dark</span>
      </button>
    </div>
  );
};

export default ThemeToggle;
