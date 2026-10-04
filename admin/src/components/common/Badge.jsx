import React from 'react';
import clsx from 'clsx';

export const Badge = ({ children, variant = 'default', size = 'sm', className }) => {
  const variantStyles = {
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    primary: 'bg-brand-950/80 text-brand-300 border-brand-800/80',
    success: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80',
    warning: 'bg-amber-950/80 text-amber-300 border-amber-800/80',
    danger: 'bg-rose-950/80 text-rose-300 border-rose-800/80',
    info: 'bg-sky-950/80 text-sky-300 border-sky-800/80',
    purple: 'bg-purple-950/80 text-purple-300 border-purple-800/80',
  };

  const sizeStyles = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-semibold',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 font-medium rounded-md border',
        variantStyles[variant] || variantStyles.default,
        sizeStyles[size] || sizeStyles.sm,
        className
      )}
    >
      {children}
    </span>
  );
};

export const StatusBadge = ({ status }) => {
  if (status === 'ACTIVE') {
    return <Badge variant="success">Active</Badge>;
  }
  if (status === 'DISABLED') {
    return <Badge variant="danger">Disabled</Badge>;
  }
  if (status === 'SUCCESS') {
    return <Badge variant="success">Success</Badge>;
  }
  if (status === 'FAILED') {
    return <Badge variant="danger">Failed</Badge>;
  }
  if (status === 'PENDING') {
    return <Badge variant="warning">Pending</Badge>;
  }
  if (status === 'NOT_CONNECTED') {
    return <Badge variant="default">Not Linked</Badge>;
  }
  return <Badge variant="default">{status || '—'}</Badge>;
};
