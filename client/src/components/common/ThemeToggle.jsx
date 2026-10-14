import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const ThemeToggle = ({ className = '' }) => {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={`inline-flex items-center p-1 rounded-full bg-slate-200/50 dark:bg-[#0B1528]/80 backdrop-blur-md border border-slate-300/60 dark:border-blue-500/30 shadow-inner transition-colors duration-200 ${className}`}
      role="radiogroup"
      aria-label="Theme selector"
    >
      <button
        type="button"
        role="radio"
        aria-checked={theme === 'light'}
        aria-label="Switch to light theme"
        onClick={() => setTheme('light')}
        className={`flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
          theme === 'light'
            ? 'bg-white text-amber-500 shadow-sm'
            : 'text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
      >
        <Sun className="w-3.5 h-3.5 stroke-[2.2]" />
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={theme === 'dark'}
        aria-label="Switch to dark theme"
        onClick={() => setTheme('dark')}
        className={`flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
          theme === 'dark'
            ? 'bg-[#152347] text-sky-400 shadow-sm border border-blue-400/30'
            : 'text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
      >
        <Moon className="w-3.5 h-3.5 stroke-[2.2]" />
      </button>
    </div>
  );
};

export default ThemeToggle;
