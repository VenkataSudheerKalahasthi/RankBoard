import React from 'react';

const Input = ({
  label,
  id,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  helperText,
  required = false,
  disabled = false,
  icon: Icon,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id || name} className="block text-xs font-semibold uppercase tracking-wider text-[#0F172A] dark:text-slate-200 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative rounded-lg shadow-subtle">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          id={id || name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          required={required}
          className={`block w-full rounded-lg border bg-white dark:bg-[#0D1830] text-[#0F172A] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm ${
            Icon ? 'pl-9 pr-3 py-2.5' : 'px-3.5 py-2.5'
          } ${
            error
              ? 'border-red-300 dark:border-red-800 focus:border-red-500 focus:ring-red-200'
              : 'border-[#D9E4F2] dark:border-blue-500/30 focus:border-brand-500'
          } ${disabled ? 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed' : ''} ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-[#64748B] dark:text-slate-400">{helperText}</p>
      ) : null}
    </div>
  );
};

export default Input;
