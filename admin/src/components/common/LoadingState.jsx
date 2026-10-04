import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingState = ({ message = 'Loading data...', className = '' }) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center space-y-3 ${className}`}>
      <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      <p className="text-xs font-medium text-slate-400">{message}</p>
    </div>
  );
};
