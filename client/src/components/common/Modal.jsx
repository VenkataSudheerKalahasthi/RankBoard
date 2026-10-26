import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className={`relative bg-white dark:bg-[#111E3D] rounded-2xl shadow-2xl border border-[#D9E4F2] dark:border-blue-400/30 w-full ${maxWidth} z-10 overflow-hidden transform transition-all flex flex-col max-h-[90vh]`}>
        <div className="px-6 py-4 border-b border-[#D9E4F2] dark:border-blue-900/30 flex items-center justify-between shrink-0">
          <div>
            {title && <h3 className="text-base font-extrabold text-[#0F172A] dark:text-white">{title}</h3>}
            {subtitle && <p className="text-xs text-[#475569] dark:text-slate-300 mt-0.5 font-medium">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
