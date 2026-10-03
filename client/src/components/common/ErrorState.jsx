import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from './Button';

const ErrorState = ({
  title = 'Something went wrong',
  message = 'We encountered an error loading the requested resource. Please try again.',
  onRetry,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center bg-red-50/60 rounded-xl border border-red-200 ${className}`}>
      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-2.5">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-semibold text-red-950">{title}</h4>
      <p className="mt-1 text-xs text-red-700 max-w-sm">{message}</p>
      {onRetry && (
        <div className="mt-3.5">
          <Button variant="danger" size="sm" onClick={onRetry}>
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
};

export default ErrorState;
