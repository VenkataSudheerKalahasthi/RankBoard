import React, { useState, useEffect, useCallback } from 'react';
import { adminService } from '../services/adminService';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import {
  ClipboardList,
  Search,
  Filter,
  RefreshCw,
  Shield,
  Clock,
  Terminal,
} from 'lucide-react';

const ACTIONS = [
  'ALL',
  'STUDENT_ADDED',
  'STUDENT_UPDATED',
  'STUDENT_DISABLED',
  'STUDENT_ENABLED',
  'STUDENT_IMPORTED',
  'STATISTICS_REFRESHED',
  'BULK_SYNCHRONIZATION_STARTED',
  'BULK_SYNCHRONIZATION_COMPLETED',
  'SCORE_RECALCULATED',
  'ALL_SCORES_RECALCULATED',
  'MANUAL_SCORE_ADJUSTMENT',
  'LEADERBOARD_RECALCULATED',
  'SETTINGS_CHANGED',
];

export const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const fetchLogs = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setError(null);
    try {
      const response = await adminService.getAuditLogs({
        action: actionFilter !== 'ALL' ? actionFilter : undefined,
        search: search.trim() || undefined,
        limit: 100,
      });

      if (response.success) {
        setLogs(response.logs || []);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      if (!isBackground) {
        setError(err.message || 'Failed to retrieve audit trail.');
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [actionFilter, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-brand-400" />
            <span>Administrative Audit Trail</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable log of all administrative actions, student profile modifications, and score recalculations.
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={() => fetchLogs()} icon={RefreshCw}>
          Refresh Trail
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search audit logs by admin, target..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-xs bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-brand-500"
          >
            {ACTIONS.map((act) => (
              <option key={act} value={act}>
                {act === 'ALL' ? 'All Administrative Actions' : act.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader
          title="Recorded Audit Events"
          subtitle={`Showing ${logs.length} logged events`}
        />
        {loading && logs.length === 0 ? (
          <LoadingState message="Loading immutable audit logs..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => fetchLogs()} />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No audit events found"
            description="Actions performed by administrators will appear here in chronological order."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr>
                  <th className="table-th">Timestamp</th>
                  <th className="table-th">Administrator</th>
                  <th className="table-th">Action Identifier</th>
                  <th className="table-th">Target Entity</th>
                  <th className="table-th">Audit Details</th>
                  <th className="table-th">Origin IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="table-td font-mono text-[11px] text-slate-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="table-td">
                      <div className="font-semibold text-slate-100">{log.adminName || 'Admin'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{log.adminEmail}</div>
                    </td>
                    <td className="table-td">
                      <Badge variant="primary">{log.action?.replace(/_/g, ' ')}</Badge>
                    </td>
                    <td className="table-td font-medium text-slate-200">{log.target}</td>
                    <td className="table-td max-w-sm truncate text-slate-400 text-[11px]">
                      {typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details)}
                    </td>
                    <td className="table-td font-mono text-[10px] text-slate-500">
                      {log.ip || '127.0.0.1'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AuditLogs;
