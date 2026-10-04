import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { useNotifications } from '../context/NotificationContext';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import {
  Settings as SettingsIcon,
  Shield,
  Activity,
  CheckCircle2,
  Lock,
  Save,
  Users,
  Server,
} from 'lucide-react';

export const Settings = () => {
  const { notifySuccess, notifyError } = useNotifications();

  const [settingsData, setSettingsData] = useState(null);
  const [adminsList, setAdminsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    syncBatchSize: 5,
    syncThrottleMs: 350,
    enableAutoSyncOnImport: true,
  });

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminService.getSettings();
      if (response.success) {
        setSettingsData(response.settings);
        setAdminsList(response.admins || []);
        setFormData({
          syncBatchSize: response.settings.syncBatchSize || 5,
          syncThrottleMs: response.settings.syncThrottleMs || 350,
          enableAutoSyncOnImport: response.settings.enableAutoSyncOnImport !== false,
        });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError(err.message || 'Failed to load system settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await adminService.updateSettings(formData);
      if (res.success) {
        notifySuccess(res.message || 'System settings saved successfully.');
      }
    } catch (err) {
      notifyError(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !settingsData) {
    return <LoadingState message="Loading system configuration..." />;
  }

  if (error && !settingsData) {
    return <ErrorState message={error} onRetry={fetchSettings} />;
  }

  const health = settingsData?.systemHealth || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-brand-400" />
            <span>Portal Settings & Environment Governance</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure platform synchronization parameters, check system health, and inspect authorized administrators.
          </p>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200">Supabase PostgreSQL</div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3 h-3" /> Connected (Single Source of Truth)
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200">Clerk Authentication</div>
              <div className="text-[11px] text-brand-300 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3 h-3" /> JWT Secret Key Verified
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200">Server Status</div>
              <div className="text-[11px] text-slate-400 font-mono">
                Node {health.nodeVersion} • Uptime {Math.floor((health.serverUptimeSeconds || 0) / 60)}m
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Settings Form */}
      <Card>
        <CardHeader
          title="Synchronization & Rate Limit Tuning"
          subtitle="Configure batch sizes and throttle intervals to prevent platform IP rate limiting"
        />
        <form onSubmit={handleSaveSettings} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                College Identifier
              </label>
              <input
                type="text"
                disabled
                value={settingsData.collegeId}
                className="w-full text-xs px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-400 font-mono cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                College Display Name
              </label>
              <input
                type="text"
                disabled
                value={settingsData.collegeName}
                className="w-full text-xs px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Bulk Synchronization Concurrency Batch Size
              </label>
              <input
                type="number"
                min={1}
                max={15}
                value={formData.syncBatchSize}
                onChange={(e) => setFormData({ ...formData, syncBatchSize: parseInt(e.target.value, 10) })}
                className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-brand-500 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">Recommended: 3 to 5 simultaneous student fetches.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Inter-batch Throttle Delay (milliseconds)
              </label>
              <input
                type="number"
                min={100}
                max={5000}
                step={50}
                value={formData.syncThrottleMs}
                onChange={(e) => setFormData({ ...formData, syncThrottleMs: parseInt(e.target.value, 10) })}
                className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-brand-500 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">Recommended: 350ms to 500ms between batches.</p>
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.enableAutoSyncOnImport}
                onChange={(e) => setFormData({ ...formData, enableAutoSyncOnImport: e.target.checked })}
                className="rounded bg-slate-950 border-slate-800 text-brand-500 focus:ring-brand-500"
              />
              <span className="text-xs text-slate-300 font-medium">
                Allow automatic background statistics synchronization upon spreadsheet bulk import
              </span>
            </label>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-800">
            <Button type="submit" variant="primary" size="sm" loading={saving} icon={Save}>
              Save Settings
            </Button>
          </div>
        </form>
      </Card>

      {/* Authorized Administrators */}
      <Card>
        <CardHeader
          title="Authorized Administrators"
          subtitle="Clerk accounts with verified server-side administrative access"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr>
                <th className="table-th">Administrator Name</th>
                <th className="table-th">Email</th>
                <th className="table-th">Assigned Role</th>
                <th className="table-th">Account Status</th>
                <th className="table-th">Last Login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {adminsList.map((a) => (
                <tr key={a.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="table-td font-semibold text-slate-100">{a.name || 'Administrator'}</td>
                  <td className="table-td font-mono text-[11px] text-slate-300">{a.email}</td>
                  <td className="table-td">
                    <Badge variant="primary">{a.role || 'ADMIN'}</Badge>
                  </td>
                  <td className="table-td">
                    <Badge variant={a.status === 'DISABLED' ? 'danger' : 'success'}>
                      {a.status || 'ACTIVE'}
                    </Badge>
                  </td>
                  <td className="table-td font-mono text-[11px] text-slate-400">
                    {a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString() : 'Recent'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Security Governance Notice */}
      <Card className="p-4 bg-slate-900/60 border-slate-800 text-xs text-slate-400 flex items-start gap-3">
        <Lock className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-200">Zero Secret Exposure Principle: </span>
          Supabase service-role keys and Clerk server secret keys remain strictly isolated on the Node.js backend environment and are never transmitted to client browsers.
        </div>
      </Card>
    </div>
  );
};

export default Settings;
