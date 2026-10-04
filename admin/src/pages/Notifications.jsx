import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { useNotifications } from '../context/NotificationContext';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  Trash2,
  RefreshCw,
} from 'lucide-react';

export const Notifications = () => {
  const { fetchUnreadCount, notifySuccess, notifyError } = useNotifications();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotifs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminService.getNotifications();
      if (response.success) {
        setNotifications(response.notifications || []);
        fetchUnreadCount();
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError(err.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await adminService.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      fetchUnreadCount();
    } catch (e) {}
  };

  const handleClearAll = async () => {
    try {
      const res = await adminService.clearNotifications();
      if (res.success) {
        notifySuccess('All notifications cleared.');
        setNotifications([]);
        fetchUnreadCount();
      }
    } catch (err) {
      notifyError('Failed to clear notifications.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <Bell className="w-5 h-5 text-brand-400" />
            <span>Admin Notification Center</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time synchronization alerts, import completion summaries, and anomaly alerts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" onClick={fetchNotifs} icon={RefreshCw}>
            Refresh
          </Button>

          {notifications.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              icon={Trash2}
              className="text-rose-400 hover:text-rose-300"
            >
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <Card>
        {loading && notifications.length === 0 ? (
          <LoadingState message="Fetching admin notifications..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchNotifs} />
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Zero unread notifications"
            description="All platform events and synchronization alerts have been resolved."
          />
        ) : (
          <div className="divide-y divide-slate-800/60">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 flex items-start justify-between gap-4 transition-colors ${
                  !n.read ? 'bg-slate-900/90' : 'hover:bg-slate-800/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      n.severity === 'ERROR'
                        ? 'bg-rose-500/10 text-rose-400'
                        : n.severity === 'WARNING'
                        ? 'bg-amber-500/10 text-amber-400'
                        : n.severity === 'SUCCESS'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-brand-500/10 text-brand-400'
                    }`}
                  >
                    {n.severity === 'ERROR' || n.severity === 'WARNING' ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <Info className="w-4 h-4" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-100">{n.title}</span>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-brand-500"></span>}
                      <Badge variant={n.severity === 'ERROR' ? 'danger' : n.severity === 'WARNING' ? 'warning' : 'primary'}>
                        {n.type?.replace(/_/g, ' ')}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-300 mt-1">{n.message}</p>

                    <div className="text-[11px] text-slate-500 font-mono mt-1.5">
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                {!n.read && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => handleMarkRead(n.id)}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    Mark as Read
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Notifications;
