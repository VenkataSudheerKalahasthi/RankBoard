import React from 'react';

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badgeText,
  badgeVariant = 'brand',
  className = '',
}) => {
  const badgeStyles = {
    brand: 'bg-brand-50 text-brand-700 border-brand-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div className={`bg-white rounded-xl border border-slate-200/90 p-5 shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {title}
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            {value}
          </div>
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700">
            <Icon className="w-5 h-5 text-brand-600" />
          </div>
        )}
      </div>

      {(subtitle || badgeText) && (
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          {subtitle && <span className="text-slate-500">{subtitle}</span>}
          {badgeText && (
            <span className={`px-2 py-0.5 rounded-full border text-[11px] font-medium ${badgeStyles[badgeVariant] || badgeStyles.brand}`}>
              {badgeText}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatCard;
