import React from 'react';
import clsx from 'clsx';

export const Card = ({ children, className, ...props }) => {
  return (
    <div
      className={clsx(
        'bg-slate-900/90 border border-slate-800 rounded-xl shadow-card backdrop-blur-sm overflow-hidden',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ title, subtitle, action, className }) => {
  return (
    <div className={clsx('px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3', className)}>
      <div className="min-w-0">
        {title && <h3 className="text-sm font-bold text-slate-100 truncate">{title}</h3>}
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
};

export const CardContent = ({ children, className }) => {
  return <div className={clsx('p-3.5 sm:p-5', className)}>{children}</div>;
};

export const CardFooter = ({ children, className }) => {
  return (
    <div className={clsx('px-4 sm:px-5 py-3 border-t border-slate-800/80 bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2', className)}>
      {children}
    </div>
  );
};
