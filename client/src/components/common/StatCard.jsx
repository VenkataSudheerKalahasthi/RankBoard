import React from 'react';
import AnimatedCounter from './AnimatedCounter';

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badgeText,
  badgeVariant = 'brand',
  className = '',
  loading = false,
}) => {
  const badgeStyles = {
    brand: 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-sky-300 border-blue-200 dark:border-blue-400/30',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
    amber: 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
    slate: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700',
  };

  return (
    <div className={`bg-white dark:bg-[#111E3D] rounded-2xl border border-[#D9E4F2] dark:border-blue-400/20 p-5 shadow-sm card-hover-interactive flex flex-col justify-between ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 pr-2">
          <span className="text-xs font-extrabold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
            {title}
          </span>
          {loading ? (
            <div className="h-7 w-24 bg-slate-200/80 dark:bg-slate-700 animate-pulse rounded mt-1.5" />
          ) : (
            <div className="text-2xl font-black text-[#0F172A] dark:text-white mt-1.5 tracking-tight font-mono">
              <AnimatedCounter value={value} />
            </div>
          )}
        </div>
        {Icon && (
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-50 to-sky-50 dark:from-blue-600/25 dark:to-sky-500/15 border border-blue-100 dark:border-blue-400/30 flex items-center justify-center text-blue-600 dark:text-sky-400 shrink-0 shadow-xs">
            <Icon className="w-5 h-5 text-blue-600 dark:text-sky-400" />
          </div>
        )}
      </div>

      {(subtitle || badgeText || loading) && (
        <div className="mt-4 pt-3 border-t border-[#D9E4F2] dark:border-blue-900/30 flex items-center justify-between text-xs">
          {loading ? (
            <div className="h-3.5 w-28 bg-slate-100 dark:bg-slate-700 animate-pulse rounded" />
          ) : (
            subtitle && <span className="text-[#64748B] dark:text-slate-400 font-medium">{subtitle}</span>
          )}
          {badgeText && (
            <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${badgeStyles[badgeVariant] || badgeStyles.brand}`}>
              {badgeText}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatCard;
