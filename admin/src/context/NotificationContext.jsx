import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { adminService } from '../services/adminService';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await adminService.getNotifications();
      if (res.success) {
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (e) {}
  }, []);

  const notifySuccess = useCallback((msg) => addToast(msg, 'success'), [addToast]);
  const notifyError = useCallback((msg) => addToast(msg, 'error', 6000), [addToast]);
  const notifyInfo = useCallback((msg) => addToast(msg, 'info'), [addToast]);
  const notifyWarning = useCallback((msg) => addToast(msg, 'warning', 5000), [addToast]);

  return (
    <NotificationContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        notifySuccess,
        notifyError,
        notifyInfo,
        notifyWarning,
        unreadCount,
        setUnreadCount,
        fetchUnreadCount,
      }}
    >
      {children}
      {/* Toast Render Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-3 rounded-lg shadow-xl text-xs font-medium border transition-all transform translate-y-0 ${
              t.type === 'success'
                ? 'bg-emerald-950 border-emerald-700/80 text-emerald-200'
                : t.type === 'error'
                ? 'bg-rose-950 border-rose-700/80 text-rose-200'
                : t.type === 'warning'
                ? 'bg-amber-950 border-amber-700/80 text-amber-200'
                : 'bg-slate-900 border-slate-700 text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span>{t.message}</span>
              <button
                onClick={() => removeToast(t.id)}
                className="opacity-70 hover:opacity-100 font-bold ml-2 text-sm"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
