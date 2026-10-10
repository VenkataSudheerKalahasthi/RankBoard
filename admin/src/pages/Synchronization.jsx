import React, { useState, useEffect, useCallback } from 'react';
import { adminService } from '../services/adminService';
import { subscribeToAdminUpdates } from '../services/supabase';
import { useNotifications } from '../context/NotificationContext';
import { Card, CardHeader } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge, StatusBadge } from '../components/common/Badge';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import {
  RefreshCw,
  Play,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Search,
  Filter,
  Zap,
  ExternalLink,
  Users,
  ShieldAlert,
} from 'lucide-react';

const formatTimestamp = (dateStr) => {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Never';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const Synchronization = () => {
  const { notifySuccess, notifyError } = useNotifications();

  const [syncJob, setSyncJob] = useState(null);
  const [syncLogs, setSyncLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [retryingId, setRetryingId] = useState(null);

  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchSyncData = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      if (syncLogs.length > 0) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
    }
    try {
      const [statusRes, logsRes] = await Promise.all([
        adminService.getSyncStatus(),
        adminService.getSyncLogs(),
      ]);

      if (statusRes && statusRes.success) {
        setSyncJob(statusRes.job);
      }
      if (logsRes && logsRes.success) {
        setSyncLogs(logsRes.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch sync telemetry:', err);
      if (!isBackground) {
        notifyError(err.message || 'Failed to retrieve sync telemetry.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [syncLogs.length, notifyError]);

  useEffect(() => {
    fetchSyncData();
  }, []);

  // Supabase Realtime updates subscription
  useEffect(() => {
    const unsubscribe = subscribeToAdminUpdates(() => {
      fetchSyncData(true);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [fetchSyncData]);

  // Polling interval (every 2.5s if job running, else 30s)
  useEffect(() => {
    const isRunning = syncJob?.status === 'RUNNING';
    const timer = setInterval(() => {
      fetchSyncData(true);
    }, isRunning ? 2500 : 30000);
    return () => clearInterval(timer);
  }, [syncJob?.status, fetchSyncData]);

  const handleTriggerBulkSync = async () => {
    setTriggering(true);
    try {
      const res = await adminService.syncAllStudents();
      if (res.success) {
        notifySuccess(res.message || 'Bulk synchronization started in background.');
        if (res.job) setSyncJob(res.job);
        fetchSyncData(true);
      }
    } catch (err) {
      notifyError(err.response?.data?.message || err.message || 'Failed to trigger bulk synchronization.');
    } finally {
      setTriggering(false);
    }
  };

  const handleRetryStudent = async (studentId, studentName) => {
    setRetryingId(studentId);
    try {
      const res = await adminService.syncStudent(studentId);
      if (res.success) {
        notifySuccess(`Synchronized ${res.student?.name || studentName || 'student'}! Score: ${res.student?.finalScore}`);
        fetchSyncData(true);
      }
    } catch (err) {
      notifyError(err.response?.data?.message || err.message || 'Failed to sync student.');
    } finally {
      setRetryingId(null);
    }
  };

  // Safe percentage calculation
  const totalStudents = syncJob?.total ?? syncJob?.totalStudents ?? 0;
  const processedStudents = syncJob?.processed ?? syncJob?.processedStudents ?? syncJob?.completed ?? 0;
  const failedStudents = syncJob?.failed ?? syncJob?.failedStudents ?? 0;
  const progressPercent = totalStudents > 0
    ? Math.min(100, Math.max(0, Math.round((processedStudents / totalStudents) * 100)))
    : syncJob?.status === 'COMPLETED' ? 100 : 0;

  const isJobRunning = syncJob?.status === 'RUNNING';

  const filteredLogs = syncLogs.filter((log) => {
    if (platformFilter !== 'ALL' && log.platform !== platformFilter) return false;
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'FAILED') {
        if (log.status !== 'FAILED' && log.status !== 'RATE_LIMITED') return false;
      } else if (log.status !== statusFilter) {
        return false;
      }
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      const matchName = (log.studentName || '').toLowerCase().includes(q);
      const matchRoll = (log.rollNumber || '').toLowerCase().includes(q);
      const matchUser = (log.username || '').toLowerCase().includes(q);
      if (!matchName && !matchRoll && !matchUser) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-brand-400" />
            <span>Synchronization Operations Center</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Orchestrate controlled batch fetching from coding platforms with rate limit governance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchSyncData(false)}
            loading={refreshing}
            icon={RefreshCw}
          >
            {refreshing ? 'Refreshing...' : 'Refresh Logs'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleTriggerBulkSync}
            loading={triggering || isJobRunning}
            disabled={triggering || isJobRunning}
            icon={Play}
          >
            {isJobRunning ? 'Sync Running...' : 'Sync All Active Students'}
          </Button>
        </div>
      </div>

      {/* Live Synchronization Progress Widget */}
      {syncJob && syncJob.status !== 'IDLE' ? (
        <Card className={`p-5 border ${isJobRunning ? 'border-brand-800 bg-brand-950/20' : 'border-slate-800'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isJobRunning
                    ? 'bg-brand-500/20 text-brand-400'
                    : syncJob.status === 'COMPLETED_WITH_ERRORS'
                    ? 'bg-amber-500/20 text-amber-400'
                    : syncJob.status === 'FAILED'
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                <RefreshCw className={`w-5 h-5 ${isJobRunning ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-100">
                    {isJobRunning
                      ? 'Bulk Synchronization in Progress'
                      : syncJob.status === 'COMPLETED_WITH_ERRORS'
                      ? 'Synchronization Completed with Warnings'
                      : syncJob.status === 'FAILED'
                      ? 'Synchronization Failed'
                      : 'Last Synchronization Completed'}
                  </h3>
                  <Badge
                    variant={
                      isJobRunning
                        ? 'primary'
                        : syncJob.status === 'COMPLETED'
                        ? 'success'
                        : syncJob.status === 'COMPLETED_WITH_ERRORS'
                        ? 'warning'
                        : 'danger'
                    }
                  >
                    {syncJob.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  {syncJob.startedAt ? `Started ${new Date(syncJob.startedAt).toLocaleTimeString()} • ` : ''}
                  Processed {processedStudents} of {totalStudents} students ({failedStudents} error{failedStudents === 1 ? '' : 's'})
                  {syncJob.currentStudent ? ` • Currently syncing: ${syncJob.currentStudent}` : ''}
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-black text-slate-200">
                {progressPercent}%
              </div>
              <div className="w-32 sm:w-48 h-2 bg-slate-800 rounded-full overflow-hidden mt-1.5">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    failedStudents > 0 ? 'bg-amber-500' : 'bg-brand-500'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-4 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <span>No bulk synchronization is currently running. Ready to synchronize {totalStudents} linked students.</span>
          </div>
        </Card>
      )}

      {/* Filter and Search Bar */}
      <Card className="p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search sync logs by student, roll, handle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="text-xs bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="ALL">All Platforms</option>
            <option value="leetcode">LeetCode</option>
            <option value="gfg">GeeksforGeeks</option>
            <option value="hackerrank">HackerRank</option>
            <option value="codeforces">Codeforces</option>
            <option value="codechef">CodeChef</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESS">Success Only</option>
            <option value="FAILED">Failed / Rate Limited</option>
            <option value="PENDING">Pending Only</option>
            <option value="NOT_CONNECTED">Not Linked</option>
          </select>
        </div>
      </Card>

      {/* Synchronization Logs Table */}
      <Card>
        <CardHeader
          title="Platform Synchronization Telemetry"
          subtitle={`Displaying ${filteredLogs.length} platform telemetry records`}
        />
        {loading && syncLogs.length === 0 ? (
          <LoadingState message="Fetching synchronization logs..." />
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            icon={RefreshCw}
            title={syncLogs.length === 0 ? 'No synchronization logs found' : 'No records match the selected filters'}
            description={
              syncLogs.length === 0
                ? 'Trigger a synchronization or link student profiles to see live data fetching.'
                : 'Try adjusting your search term, platform filter, or status filter.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr>
                  <th className="table-th">Student Name</th>
                  <th className="table-th">Roll Number</th>
                  <th className="table-th">Platform</th>
                  <th className="table-th">Username / Handle</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Last Sync Timestamp</th>
                  <th className="table-th">Error / Status Notes</th>
                  <th className="table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLogs.map((log) => {
                  const isRetrying = retryingId === log.studentId;
                  const platformColor =
                    log.platform === 'leetcode'
                      ? 'text-amber-400'
                      : log.platform === 'gfg'
                      ? 'text-emerald-400'
                      : log.platform === 'hackerrank'
                      ? 'text-emerald-400'
                      : log.platform === 'codeforces'
                      ? 'text-sky-400'
                      : 'text-rose-400';

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="table-td font-semibold text-slate-100">
                        <div>{log.studentName}</div>
                        <div className="text-[10px] text-slate-500 font-normal">{log.department} • Y{log.year}</div>
                      </td>
                      <td className="table-td font-mono text-[11px] text-slate-400">{log.rollNumber}</td>
                      <td className="table-td">
                        <span className={`font-bold capitalize ${platformColor}`}>{log.platform}</span>
                      </td>
                      <td className="table-td font-mono text-[11px] text-slate-300">
                        {log.profileUrl ? (
                          <a
                            href={log.profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 hover:text-brand-400 hover:underline"
                          >
                            <span>@{log.username}</span>
                            <ExternalLink className="w-3 h-3 text-slate-500" />
                          </a>
                        ) : log.username && log.username !== '—' ? (
                          <span>@{log.username}</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="table-td">
                        <StatusBadge status={log.status} />
                      </td>
                      <td className="table-td font-mono text-[11px] text-slate-400">
                        {formatTimestamp(log.lastFetchedAt)}
                      </td>
                      <td className="table-td max-w-xs xl:max-w-md 2xl:max-w-none truncate">
                        {log.errorMessage ? (
                          <span className="text-rose-400 text-[11px]" title={log.errorMessage}>
                            {log.errorMessage}
                          </span>
                        ) : log.status === 'SUCCESS' ? (
                          <span className="text-emerald-400 text-[11px]">
                            Synchronized {log.totalSolved !== undefined ? `(${log.totalSolved} solved)` : ''}
                          </span>
                        ) : log.status === 'NOT_CONNECTED' ? (
                          <span className="text-slate-500 text-[11px]">No profile URL linked</span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="table-td text-right">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleRetryStudent(log.studentId, log.studentName)}
                          loading={isRetrying}
                          disabled={isRetrying || isJobRunning}
                          icon={RefreshCw}
                          className="text-brand-400 hover:text-brand-300"
                        >
                          Retry
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Synchronization;
