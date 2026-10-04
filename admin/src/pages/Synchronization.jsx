import React, { useState, useEffect, useCallback } from 'react';
import { adminService } from '../services/adminService';
import { useNotifications } from '../context/NotificationContext';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge, StatusBadge } from '../components/common/Badge';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
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
} from 'lucide-react';

export const Synchronization = () => {
  const { notifySuccess, notifyError } = useNotifications();

  const [syncJob, setSyncJob] = useState(null);
  const [syncLogs, setSyncLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [retryingId, setRetryingId] = useState(null);

  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchSyncData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const [statusRes, logsRes] = await Promise.all([
        adminService.getSyncStatus(),
        adminService.getSyncLogs(),
      ]);

      if (statusRes.success) setSyncJob(statusRes.job);
      if (logsRes.success) setSyncLogs(logsRes.logs || []);
    } catch (err) {
      console.error('Failed to fetch sync telemetry:', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSyncData();
  }, [fetchSyncData]);

  // Polling interval (every 3 seconds if job running, else 60s)
  useEffect(() => {
    const isRunning = syncJob?.status === 'RUNNING';
    const timer = setInterval(() => {
      fetchSyncData(true);
    }, isRunning ? 3000 : 60000);
    return () => clearInterval(timer);
  }, [syncJob?.status, fetchSyncData]);

  const handleTriggerBulkSync = async () => {
    setTriggering(true);
    try {
      const res = await adminService.syncAllStudents();
      if (res.success) {
        notifySuccess(res.message || 'Bulk synchronization queued.');
        fetchSyncData(true);
      }
    } catch (err) {
      notifyError(err.message || 'Failed to trigger bulk synchronization.');
    } finally {
      setTriggering(false);
    }
  };

  const handleRetryStudent = async (studentId) => {
    setRetryingId(studentId);
    try {
      const res = await adminService.syncStudent(studentId);
      if (res.success) {
        notifySuccess(`Synchronized ${res.student?.name}! Score: ${res.student?.finalScore}`);
        fetchSyncData(true);
      }
    } catch (err) {
      notifyError(err.message || 'Failed to sync student.');
    } finally {
      setRetryingId(null);
    }
  };

  const filteredLogs = syncLogs.filter((log) => {
    if (platformFilter !== 'ALL' && log.platform !== platformFilter) return false;
    if (statusFilter !== 'ALL' && log.status !== statusFilter) return false;
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
            onClick={() => fetchSyncData()}
            icon={RefreshCw}
          >
            Refresh Logs
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleTriggerBulkSync}
            loading={triggering || syncJob?.status === 'RUNNING'}
            icon={Play}
          >
            {syncJob?.status === 'RUNNING' ? 'Sync Running...' : 'Sync All Active Students'}
          </Button>
        </div>
      </div>

      {/* Live Synchronization Progress Widget */}
      {syncJob && (
        <Card className={`p-5 border ${syncJob.status === 'RUNNING' ? 'border-brand-800 bg-brand-950/20' : 'border-slate-800'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                syncJob.status === 'RUNNING' ? 'bg-brand-500/20 text-brand-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                <RefreshCw className={`w-5 h-5 ${syncJob.status === 'RUNNING' ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-100">
                    {syncJob.status === 'RUNNING' ? 'Bulk Synchronization in Progress' : 'Last Synchronization Completed'}
                  </h3>
                  <Badge variant={syncJob.status === 'RUNNING' ? 'primary' : 'success'}>
                    {syncJob.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Started {new Date(syncJob.startedAt).toLocaleTimeString()} • Processed {syncJob.completed} of {syncJob.total} students ({syncJob.failed} errors)
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-black text-slate-200">
                {syncJob.total > 0 ? Math.round(((syncJob.completed + syncJob.failed) / syncJob.total) * 100) : 100}%
              </div>
              <div className="w-32 sm:w-48 h-2 bg-slate-800 rounded-full overflow-hidden mt-1.5">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${syncJob.total > 0 ? ((syncJob.completed + syncJob.failed) / syncJob.total) * 100 : 100}%`,
                  }}
                />
              </div>
            </div>
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
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
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
            <option value="FAILED">Failed Only</option>
            <option value="PENDING">Pending Only</option>
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
            title="No synchronization logs found"
            description="Trigger a synchronization or link student profiles to see live data fetching."
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
                {filteredLogs.map((log, idx) => {
                  const isRetrying = retryingId === log.studentId;
                  return (
                    <tr key={`${log.studentId}_${log.platform}_${idx}`} className="hover:bg-slate-800/30 transition-colors">
                      <td className="table-td font-semibold text-slate-100">{log.studentName}</td>
                      <td className="table-td font-mono text-[11px] text-slate-400">{log.rollNumber}</td>
                      <td className="table-td">
                        <span className="font-bold capitalize text-slate-200">{log.platform}</span>
                      </td>
                      <td className="table-td font-mono text-[11px] text-slate-300">
                        {log.username ? `@${log.username}` : '—'}
                      </td>
                      <td className="table-td">
                        <StatusBadge status={log.status} />
                      </td>
                      <td className="table-td font-mono text-[11px] text-slate-400">
                        {log.lastFetchedAt ? new Date(log.lastFetchedAt).toLocaleString() : 'Never'}
                      </td>
                      <td className="table-td max-w-xs truncate">
                        {log.errorMessage ? (
                          <span className="text-rose-400 text-[11px]">{log.errorMessage}</span>
                        ) : log.status === 'SUCCESS' ? (
                          <span className="text-emerald-400 text-[11px]">Synchronized</span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="table-td text-right">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleRetryStudent(log.studentId)}
                          loading={isRetrying}
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
