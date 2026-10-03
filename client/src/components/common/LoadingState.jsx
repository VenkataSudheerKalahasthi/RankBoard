import React from 'react';

const LoadingState = ({ message = 'Loading leaderboard & student data...', className = '' }) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
      <div className="relative w-10 h-10">
        <div className="w-10 h-10 rounded-full border-2 border-slate-200"></div>
        <div className="w-10 h-10 rounded-full border-2 border-brand-600 border-t-transparent animate-spin absolute inset-0"></div>
      </div>
      <p className="mt-3.5 text-xs font-medium text-slate-600">{message}</p>
    </div>
  );
};

export default LoadingState;
