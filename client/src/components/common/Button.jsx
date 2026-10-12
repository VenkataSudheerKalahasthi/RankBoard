import React from 'react';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  icon: Icon,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-bold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed select-none';

  const variants = {
    primary: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md shadow-blue-500/20 focus:ring-blue-500 border border-transparent',
    secondary: 'bg-white dark:bg-[#111E3D] hover:bg-slate-50 dark:hover:bg-[#162653] text-[#0F172A] dark:text-white border border-[#D9E4F2] dark:border-blue-400/30 shadow-xs focus:ring-blue-500',
    navy: 'bg-[#0D1830] hover:bg-[#111E3D] text-white shadow-md focus:ring-slate-700 border border-blue-500/30',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-md focus:ring-red-500 border border-transparent',
    ghost: 'bg-transparent hover:bg-blue-50 dark:hover:bg-slate-800 text-[#0F172A] dark:text-slate-200 hover:text-blue-700 dark:hover:text-white focus:ring-blue-400 border border-transparent',
    outline: 'bg-transparent hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-sky-400 border border-blue-300 dark:border-blue-500/40 focus:ring-blue-500',
  };

  const sizes = {
    sm: 'px-3.5 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin -ml-0.5 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0" />
      ) : null}
      {children}
    </button>
  );
};

export default Button;
