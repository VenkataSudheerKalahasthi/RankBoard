import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const ThemeToggle = ({ className = '', isScrolled = false }) => {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        isScrolled
          ? theme === 'dark'
            ? 'bg-slate-800/60 border border-slate-700/70 text-slate-200 hover:text-white hover:bg-slate-800/90 shadow-xs'
            : 'bg-white/90 border border-slate-300 text-black hover:text-black hover:bg-white shadow-xs'
          : theme === 'dark'
            ? 'bg-transparent border border-transparent text-slate-200 hover:text-white hover:bg-white/10 shadow-none'
            : 'bg-transparent border border-transparent text-black hover:text-black hover:bg-black/5 shadow-none'
      } ${className}`}
    >
      {theme === 'dark' ? (
        <Moon className="w-4 h-4 stroke-[2]" />
      ) : (
        <Sun className="w-4 h-4 stroke-[2.5] text-amber-600 dark:text-amber-400" />
      )}
    </button>
  );
};

export default ThemeToggle;
