/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        theme: {
          bg: 'var(--bg-primary)',
          bgSec: 'var(--bg-secondary)',
          surface: 'var(--surface)',
          surfaceSec: 'var(--surface-secondary)',
          border: 'var(--border)',
        },
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        navy: {
          800: '#0f172a',
          900: '#0d1830',
          950: '#081225',
          card: '#111e3d',
          cardSec: '#162653',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.06)',
        'glow-blue': '0 0 25px -5px rgba(37, 99, 235, 0.3)',
        'glow-cyan': '0 0 25px -5px rgba(56, 189, 248, 0.3)',
      },
    },
  },
  plugins: [],
}

