import React from 'react';

const Card = ({
  children,
  className = '',
  title,
  subtitle,
  action,
  noPadding = false,
  bodyClassName = '',
  ...props
}) => {
  const hasCustomBg = className.includes('bg-');
  const hasCustomBorder = className.includes('border-');

  return (
    <div
      className={`${hasCustomBg ? '' : 'bg-white dark:bg-[#111E3D]'} rounded-2xl ${
        hasCustomBorder ? '' : 'border border-[#D9E4F2] dark:border-blue-400/20'
      } shadow-sm transition-colors duration-300 ${className}`}
      {...props}
    >
      {(title || subtitle || action) && (
        <div className="px-6 py-4 border-b border-[#D9E4F2] dark:border-blue-900/30 flex items-center justify-between gap-4">
          <div>
            {title && <h3 className="text-base font-extrabold text-[#0F172A] dark:text-white">{title}</h3>}
            {subtitle && <p className="text-xs text-[#475569] dark:text-slate-300 mt-0.5 font-medium">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={`${noPadding ? 'h-full flex flex-col flex-1' : 'p-6'} ${bodyClassName}`}>{children}</div>
    </div>
  );
};

export default Card;
