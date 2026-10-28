import React, { useState, useEffect, useRef } from 'react';
import { adminService } from '../services/adminService';
import { useNotifications } from '../context/NotificationContext';
import { subscribeToSettingsUpdates } from '../services/supabase';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { Modal } from '../components/common/Modal';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  Settings as SettingsIcon,
  Shield,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lock,
  Save,
  Users,
  Server,
  RefreshCw,
  Clock,
  Database,
  Check,
  UserPlus,
  Trash2,
  Power,
  Mail,
  UserCheck,
} from 'lucide-react';

export const Settings = () => {
  const { notifySuccess, notifyError } = useNotifications();
  const { admin: currentAdmin } = useAdminAuth();

  const [settingsData, setSettingsData] = useState(null);
  const [adminsList, setAdminsList] = useState([]);
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshingHealth, setRefreshingHealth] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Admin Management Modal State
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [newAdminForm, setNewAdminForm] = useState({
    name: '',
    email: '',
    role: 'ADMIN',
  });

  const [formData, setFormData] = useState({
    collegeIdentifier: 'COLLEGE_MAIN',
    collegeDisplayName: 'Engineering College',
    syncConcurrency: 5,
    syncThrottleMs: 350,
    autoSyncAfterImport: false,
  });

  const [savedData, setSavedData] = useState(null);
  const isDirtyRef = useRef(false);

  // Check if current form data differs from saved database state
  const isDirty = savedData ? (
    formData.collegeIdentifier !== savedData.collegeIdentifier ||
    formData.collegeDisplayName !== savedData.collegeDisplayName ||
    formData.syncConcurrency !== savedData.syncConcurrency ||
    formData.syncThrottleMs !== savedData.syncThrottleMs ||
    formData.autoSyncAfterImport !== savedData.autoSyncAfterImport
  ) : false;

  isDirtyRef.current = isDirty;

  const fetchSettings = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setLoading(true);
    setError(null);
    try {
      const response = await adminService.getSettings();
      if (response.success && response.settings) {
        const s = response.settings;
        setSettingsData(s);
        setAdminsList(response.admins || []);
        if (s.systemHealth) {
          setHealthData(s.systemHealth);
        }

        const loadedForm = {
          collegeIdentifier: s.collegeIdentifier || s.collegeId || 'COLLEGE_MAIN',
          collegeDisplayName: s.collegeDisplayName || s.collegeName || 'Engineering College',
          syncConcurrency: s.syncConcurrency ?? s.syncBatchSize ?? 5,
          syncThrottleMs: s.syncThrottleMs !== undefined ? s.syncThrottleMs : 350,
          autoSyncAfterImport: s.autoSyncAfterImport !== undefined ? s.autoSyncAfterImport : (s.enableAutoSyncOnImport ?? false),
        };

        setSavedData(loadedForm);

        // Only overwrite form data if user does not currently have unsaved edits in-flight
        if (!isDirtyRef.current || showLoadingSpinner) {
          setFormData(loadedForm);
        }
      }
    } catch (err) {
      console.error('Failed to load system settings:', err);
      setError(err.message || 'Failed to load system settings.');
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

  const refreshHealth = async () => {
    setRefreshingHealth(true);
    try {
      const res = await adminService.getSystemHealth();
      if (res.success) {
        setHealthData(res);
      }
    } catch (err) {
      console.warn('Health check refresh notice:', err.message);
    } finally {
      setRefreshingHealth(false);
    }
  };

  useEffect(() => {
    fetchSettings(true);

    // Subscribe to realtime changes on system_settings across admin sessions
    const unsubscribe = subscribeToSettingsUpdates(() => {
      // Background reload when another admin updates settings
      fetchSettings(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();

    // Frontend validation
    if (!formData.collegeIdentifier || !formData.collegeIdentifier.trim()) {
      notifyError('College Identifier is required.');
      return;
    }

    if (!formData.collegeDisplayName || !formData.collegeDisplayName.trim()) {
      notifyError('College Display Name is required.');
      return;
    }

    const concurrency = parseInt(formData.syncConcurrency, 10);
    if (isNaN(concurrency) || concurrency < 1 || concurrency > 20) {
      notifyError('Bulk Synchronization Concurrency must be an integer between 1 and 20.');
      return;
    }

    const throttle = parseInt(formData.syncThrottleMs, 10);
    if (isNaN(throttle) || throttle < 0 || throttle > 10000) {
      notifyError('Inter-batch Throttle Delay must be an integer between 0 and 10000 ms.');
      return;
    }

    setSaving(true);
    setSaveSuccess(false);

    try {
      const payload = {
        collegeIdentifier: formData.collegeIdentifier.trim(),
        collegeDisplayName: formData.collegeDisplayName.trim(),
        syncConcurrency: concurrency,
        syncThrottleMs: throttle,
        autoSyncAfterImport: Boolean(formData.autoSyncAfterImport),
      };

      const res = await adminService.updateSettings(payload);
      if (res.success && res.settings) {
        const updated = res.settings;
        const newFormState = {
          collegeIdentifier: updated.collegeIdentifier || updated.collegeId || payload.collegeIdentifier,
          collegeDisplayName: updated.collegeDisplayName || updated.collegeName || payload.collegeDisplayName,
          syncConcurrency: updated.syncConcurrency ?? updated.syncBatchSize ?? payload.syncConcurrency,
          syncThrottleMs: updated.syncThrottleMs !== undefined ? updated.syncThrottleMs : payload.syncThrottleMs,
          autoSyncAfterImport: updated.autoSyncAfterImport !== undefined ? updated.autoSyncAfterImport : payload.autoSyncAfterImport,
        };

        setSavedData(newFormState);
        setFormData(newFormState);
        setSettingsData((prev) => ({ ...prev, ...updated }));
        setSaveSuccess(true);
        notifySuccess(res.message || 'Settings saved successfully.');

        // Clear success checkmark after 3.5 seconds
        setTimeout(() => {
          setSaveSuccess(false);
        }, 3500);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save system settings.';
      notifyError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    if (savedData) {
      setFormData(savedData);
    }
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    if (!newAdminForm.email || !newAdminForm.email.includes('@')) {
      notifyError('Please enter a valid email address.');
      return;
    }

    setAdminSubmitting(true);
    try {
      const res = await adminService.createAdmin(newAdminForm);
      if (res.success) {
        notifySuccess(res.message || 'Administrator added successfully!');
        setIsAddAdminModalOpen(false);
        setNewAdminForm({ name: '', email: '', role: 'ADMIN' });
        const refreshed = await adminService.getSettings();
        if (refreshed.admins) {
          setAdminsList(refreshed.admins);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to add administrator.';
      notifyError(msg);
    } finally {
      setAdminSubmitting(false);
    }
  };

  const handleToggleAdminStatus = async (targetAdmin) => {
    const nextStatus = targetAdmin.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED';
    setActionLoadingId(targetAdmin.id);
    try {
      const res = await adminService.toggleAdminStatus(targetAdmin.id, nextStatus);
      if (res.success) {
        notifySuccess(`Status updated to ${nextStatus}.`);
        setAdminsList((prev) =>
          prev.map((a) => (a.id === targetAdmin.id ? { ...a, status: nextStatus } : a))
        );
      }
    } catch (err) {
      notifyError(err.response?.data?.message || err.message || 'Failed to update administrator status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteAdmin = async (targetAdmin) => {
    if (!window.confirm(`Are you sure you want to revoke administrative access for ${targetAdmin.name || targetAdmin.email}?`)) {
      return;
    }
    setActionLoadingId(targetAdmin.id);
    try {
      const res = await adminService.deleteAdmin(targetAdmin.id);
      if (res.success) {
        notifySuccess('Administrator access removed successfully.');
        setAdminsList((prev) => prev.filter((a) => a.id !== targetAdmin.id));
      }
    } catch (err) {
      notifyError(err.response?.data?.message || err.message || 'Failed to remove administrator.');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading && !settingsData) {
    return <LoadingState message="Loading system configuration and live telemetry..." />;
  }

  if (error && !settingsData) {
    return <ErrorState message={error} onRetry={() => fetchSettings(true)} />;
  }

  const dbHealth = healthData?.database || settingsData?.systemHealth?.database || {};
  const authHealth = healthData?.authentication || settingsData?.systemHealth?.authentication || {};
  const serverHealth = healthData?.server || settingsData?.systemHealth?.server || {};
  const checkedAtTimestamp = healthData?.checkedAt || settingsData?.systemHealth?.checkedAt;

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

        <div className="flex items-center gap-3">
          {isDirty && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-lg text-[11px] text-amber-300 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Unsaved changes</span>
              <button
                type="button"
                onClick={handleDiscardChanges}
                className="underline hover:text-amber-100 ml-1 text-[10px]"
              >
                Reset
              </button>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={refreshHealth}
            loading={refreshingHealth}
            icon={RefreshCw}
            className="text-xs text-slate-300 hover:text-slate-100"
          >
            Check Health
          </Button>
        </div>
      </div>

      {/* Real Live System Health Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. Supabase PostgreSQL Card */}
        <Card className="p-4 border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              dbHealth.status === 'CONNECTED'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              <Database className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Supabase PostgreSQL</span>
                <span className="text-[10px] font-mono text-slate-500">
                  {dbHealth.latencyMs !== null && dbHealth.latencyMs !== undefined ? `${dbHealth.latencyMs}ms` : '—'}
                </span>
              </div>
              <div className={`text-[11px] flex items-center gap-1 font-medium mt-0.5 ${
                dbHealth.status === 'CONNECTED' ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {dbHealth.status === 'CONNECTED' ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span className="truncate">Connected (Single Source of Truth)</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3 shrink-0" />
                    <span className="truncate">Database Disconnected</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* 2. Clerk Authentication Card */}
        <Card className="p-4 border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              authHealth.status === 'HEALTHY'
                ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              <Shield className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Clerk Authentication</span>
                <span className="text-[10px] font-mono text-brand-400/80">RBAC</span>
              </div>
              <div className={`text-[11px] flex items-center gap-1 font-medium mt-0.5 ${
                authHealth.status === 'HEALTHY' ? 'text-brand-300' : 'text-amber-400'
              }`}>
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span className="truncate">{authHealth.message || 'JWT Secret Key Verified'}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* 3. Server Status Card */}
        <Card className="p-4 border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
              <Server className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Server Status</span>
                <span className="text-[10px] font-mono text-purple-400/80">
                  {serverHealth.memoryHeapUsedMb ? `${serverHealth.memoryHeapUsedMb}MB` : 'Active'}
                </span>
              </div>
              <div className="text-[11px] text-slate-300 font-mono mt-0.5 truncate">
                Node {serverHealth.nodeVersion || process.version || 'v20+'} • Uptime {serverHealth.uptimeFormatted || `${Math.floor((serverHealth.uptimeSeconds || 0) / 60)}m`}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Settings Form */}
      <Card>
        <CardHeader
          title="Synchronization & Rate Limit Tuning"
          subtitle="Configure batch sizes, throttle intervals, college metadata, and automatic import synchronization"
        />
        <form onSubmit={handleSaveSettings} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. College Identifier */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                College Identifier
              </label>
              <input
                type="text"
                required
                maxLength={50}
                value={formData.collegeIdentifier}
                onChange={(e) => setFormData({ ...formData, collegeIdentifier: e.target.value })}
                className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-brand-500 font-mono"
                placeholder="e.g. COLLEGE_MAIN"
              />
              <p className="text-[11px] text-slate-500 mt-1">Authoritative database partition key for student rankings.</p>
            </div>

            {/* 2. College Display Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                College Display Name
              </label>
              <input
                type="text"
                required
                maxLength={100}
                value={formData.collegeDisplayName}
                onChange={(e) => setFormData({ ...formData, collegeDisplayName: e.target.value })}
                className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-brand-500"
                placeholder="e.g. Engineering College"
              />
              <p className="text-[11px] text-slate-500 mt-1">Institutional title displayed in reports and dashboards.</p>
            </div>

            {/* 3. Bulk Synchronization Concurrency Batch Size */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Bulk Synchronization Concurrency Batch Size
              </label>
              <input
                type="number"
                min={1}
                max={20}
                required
                value={formData.syncConcurrency}
                onChange={(e) => setFormData({ ...formData, syncConcurrency: parseInt(e.target.value, 10) || 1 })}
                className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-brand-500 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">Recommended: 3 to 5 simultaneous student fetches (Range: 1–20).</p>
            </div>

            {/* 4. Inter-batch Throttle Delay */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Inter-batch Throttle Delay (milliseconds)
              </label>
              <input
                type="number"
                min={0}
                max={10000}
                step={50}
                required
                value={formData.syncThrottleMs}
                onChange={(e) => setFormData({ ...formData, syncThrottleMs: parseInt(e.target.value, 10) || 0 })}
                className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-brand-500 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">Recommended: 350ms to 500ms between batches (Range: 0–10000ms).</p>
            </div>
          </div>

          {/* 5. Auto-sync Checkbox */}
          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.autoSyncAfterImport}
                onChange={(e) => setFormData({ ...formData, autoSyncAfterImport: e.target.checked })}
                className="rounded bg-slate-950 border-slate-800 text-brand-500 focus:ring-brand-500"
              />
              <span className="text-xs text-slate-300 font-medium">
                Allow automatic background statistics synchronization upon spreadsheet bulk import
              </span>
            </label>
            <p className="text-[11px] text-slate-500 mt-1 ml-5">
              When enabled, only successfully inserted and updated student rows will be dispatched to the background synchronization queue.
            </p>
          </div>

          {/* Save Button Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-800">
            <div className="text-[11px] text-slate-500">
              {settingsData?.updatedAt && (
                <span>Last saved: {new Date(settingsData.updatedAt).toLocaleString()}</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {saveSuccess && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                  <Check className="w-3.5 h-3.5" />
                  <span>Settings saved successfully</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={saving}
                icon={Save}
                disabled={saving || !isDirty}
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Authorized Administrators */}
      <Card>
        <CardHeader
          title="Authorized Administrators"
          subtitle="Clerk accounts with verified server-side administrative access"
          action={
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={UserPlus}
              onClick={() => setIsAddAdminModalOpen(true)}
            >
              Add Administrator
            </Button>
          }
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
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {adminsList.map((a) => {
                const isSelf = a.id === currentAdmin?.userId || a.user_id === currentAdmin?.userId;
                const isBusy = actionLoadingId === a.id;

                return (
                  <tr key={a.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="table-td font-semibold text-slate-100 flex items-center gap-1.5">
                      <span>{a.name || 'Administrator'}</span>
                      {isSelf && (
                        <span className="text-[10px] bg-brand-500/20 text-brand-300 px-1.5 py-0.5 rounded-full font-normal">
                          You
                        </span>
                      )}
                    </td>
                    <td className="table-td font-mono text-[11px] text-slate-300">{a.email}</td>
                    <td className="table-td">
                      <Badge variant={a.role === 'SUPER_ADMIN' ? 'accent' : 'primary'}>
                        {a.role || 'ADMIN'}
                      </Badge>
                    </td>
                    <td className="table-td">
                      <Badge variant={a.status === 'DISABLED' ? 'danger' : 'success'}>
                        {a.status || 'ACTIVE'}
                      </Badge>
                    </td>
                    <td className="table-td font-mono text-[11px] text-slate-400">
                      {a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString() : 'Never logged in'}
                    </td>
                    <td className="table-td text-right">
                      {!isSelf ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            title={a.status === 'DISABLED' ? 'Enable Administrator' : 'Disable Administrator'}
                            disabled={isBusy}
                            onClick={() => handleToggleAdminStatus(a)}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              a.status === 'DISABLED'
                                ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                                : 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Revoke Admin Access"
                            disabled={isBusy}
                            onClick={() => handleDeleteAdmin(a)}
                            className="p-1.5 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Protected</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Administrator Modal */}
      <Modal
        isOpen={isAddAdminModalOpen}
        onClose={() => !adminSubmitting && setIsAddAdminModalOpen(false)}
        title="Add Authorized Administrator"
        subtitle="Authorize faculty or staff to access the RankBoard administrative console"
      >
        <form onSubmit={handleAddAdmin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Administrator Full Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Dr. Rajesh Sharma"
              value={newAdminForm.name}
              onChange={(e) => setNewAdminForm({ ...newAdminForm, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="e.g. rajesh.sharma@college.edu"
              value={newAdminForm.email}
              onChange={(e) => setNewAdminForm({ ...newAdminForm, email: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-brand-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              The administrator will use this email address to authenticate at the Admin Portal.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Administrative Privilege Level
            </label>
            <select
              value={newAdminForm.role}
              onChange={(e) => setNewAdminForm({ ...newAdminForm, role: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
            >
              <option value="ADMIN">ADMIN — Can manage students, platform handles, and sync data</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN — Full system access including college settings & admins</option>
            </select>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={adminSubmitting}
              onClick={() => setIsAddAdminModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={adminSubmitting}
              icon={UserCheck}
            >
              {adminSubmitting ? 'Granting Access...' : 'Grant Admin Access'}
            </Button>
          </div>
        </form>
      </Modal>

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
