import React from 'react';

const Card = ({
  children,
  className = '',
  title,
  subtitle,
  action,
  noPadding = false,
  ...props
}) => {
  const hasCustomBg = className.includes('bg-');
  const hasCustomBorder = className.includes('border-');

  return (
    <div
      className={`${hasCustomBg ? '' : 'bg-white'} rounded-xl ${hasCustomBorder ? '' : 'border border-slate-200/90'} shadow-card transition-all duration-200 ${className}`}
      {...props}
    >
      {(title || subtitle || action) && (
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div>
            {title && <h3 className="text-base font-semibold text-slate-900">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-6'}>{children}</div>
    </div>
  );
};

export default Card;
