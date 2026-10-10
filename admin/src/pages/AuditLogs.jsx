import React, { useState, useEffect, useCallback, useRef } from 'react';
import { adminService } from '../services/adminService';
import { subscribeToAdminUpdates } from '../services/supabase';
import { Card, CardHeader } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import * as XLSX from 'xlsx';
import {
  ClipboardList,
  Search,
  RefreshCw,
  Clock,
  Shield,
  User,
  Activity,
  ArrowRight,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Radio,
  FileText,
  Sliders,
  Sparkles,
} from 'lucide-react';

const ACTIONS = [
  { value: 'ALL', label: 'All Administrative Actions' },
  { value: 'STUDENT_ADDED', label: 'Student Added' },
  { value: 'STUDENT_UPDATED', label: 'Student Updated' },
  { value: 'STUDENT_DISABLED', label: 'Student Disabled' },
  { value: 'STUDENT_ENABLED', label: 'Student Enabled' },
  { value: 'STUDENT_DELETED', label: 'Student Deleted' },
  { value: 'STUDENT_IMPORTED', label: 'Student Imported' },
  { value: 'STATISTICS_REFRESHED', label: 'Statistics Refreshed' },
  { value: 'BULK_SYNCHRONIZATION_STARTED', label: 'Bulk Synchronization Started' },
  { value: 'BULK_SYNCHRONIZATION_COMPLETED', label: 'Bulk Synchronization Completed' },
  { value: 'SCORE_RECALCULATED', label: 'Score Recalculated' },
  { value: 'ALL_SCORES_RECALCULATED', label: 'All Scores Recalculated' },
  { value: 'MANUAL_SCORE_ADJUSTMENT', label: 'Manual Score Adjustment' },
  { value: 'LEADERBOARD_RECALCULATED', label: 'Leaderboard Recalculated' },
  { value: 'SETTINGS_CHANGED', label: 'Settings Changed' },
  { value: 'AUDIT_LOG_EXPORTED', label: 'Audit Log Exported' },
];

export const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  // Search debounce ref
  const searchTimeoutRef = useRef(null);

  const fetchLogs = useCallback(
    async (pageToFetch = currentPage, isBackground = false) => {
      if (!isBackground) {
        if (logs.length === 0) setLoading(true);
        else setRefreshing(true);
      }
      setError(null);

      try {
        const response = await adminService.getAuditLogs({
          page: pageToFetch,
          limit,
          action: actionFilter !== 'ALL' ? actionFilter : undefined,
          search: search.trim() || undefined,
        });

        if (response.success) {
          setLogs(response.logs || []);
          setTotalCount(response.totalCount || (response.logs || []).length);
          setTotalPages(response.totalPages || 1);
          setCurrentPage(response.currentPage || pageToFetch);
        }
      } catch (err) {
        console.error('Failed to load audit logs:', err);
        if (!isBackground) {
          setError(err.message || 'Failed to retrieve immutable audit trail.');
        }
      } finally {
        if (!isBackground) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [currentPage, limit, actionFilter, search, logs.length]
  );

  // Initial and reactive fetch on filter change
  useEffect(() => {
    fetchLogs(1);
  }, [actionFilter]);

  // Handle live search with 350ms debounce
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      fetchLogs(1);
    }, 350);
  };

  // Realtime subscription to audit_logs table
  useEffect(() => {
    const unsubscribe = subscribeToAdminUpdates((table, payload) => {
      if (table === 'audit_logs' && payload.eventType === 'INSERT') {
        const newRow = payload.new;
        if (!newRow) return;

        const formattedRow = {
          id: String(newRow.id),
          adminId: newRow.admin_id,
          adminEmail: newRow.admin_email,
          adminName: newRow.admin_name,
          action: newRow.action,
          target: newRow.target,
          targetId: newRow.target_id,
          details: newRow.details || {},
          ip: newRow.ip,
          userAgent: newRow.user_agent,
          timestamp: newRow.timestamp,
          status: newRow.details?.status || 'SUCCESS',
          reason: newRow.details?.reason || null,
          before: newRow.details?.before || newRow.details?.before_data || null,
          after: newRow.details?.after || newRow.details?.after_data || null,
        };

        // Check if matching action filter
        if (actionFilter === 'ALL' || actionFilter === formattedRow.action) {
          setLogs((prev) => {
            if (prev.some((item) => item.id === formattedRow.id)) return prev;
            return [formattedRow, ...prev];
          });
          setTotalCount((prev) => prev + 1);
        }
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [actionFilter]);

  // Export audit trail to XLSX / CSV
  const handleExport = async () => {
    try {
      setExporting(true);
      // Fetch entire filtered list for export
      const response = await adminService.getAuditLogs({
        page: 1,
        limit: 500,
        action: actionFilter !== 'ALL' ? actionFilter : undefined,
        search: search.trim() || undefined,
        isExport: true,
        format: 'XLSX',
      });

      const exportRows = (response.logs || []).map((l) => ({
        'Log ID': l.id,
        'Timestamp (UTC)': l.timestamp,
        'Local Date & Time': new Date(l.timestamp).toLocaleString(),
        'Admin Name': l.adminName || 'System',
        'Admin Email': l.adminEmail || 'system@rankboard.edu',
        'Action': l.action,
        'Target Entity': l.target,
        'Target ID': l.targetId || 'N/A',
        'Status': l.status || 'SUCCESS',
        'Reason / Justification': l.reason || l.details?.reason || 'N/A',
        'IP Address': l.ip || '127.0.0.1',
        'Audit Details': typeof l.details === 'object' ? JSON.stringify(l.details) : String(l.details || ''),
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Logs');
      XLSX.writeFile(workbook, `RankBoard_Audit_Logs_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error('Failed to export audit logs:', err);
      alert(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const getActionBadgeVariant = (action) => {
    switch (action) {
      case 'STUDENT_ADDED':
      case 'STUDENT_ENABLED':
        return 'success';
      case 'STUDENT_UPDATED':
      case 'SETTINGS_CHANGED':
        return 'primary';
      case 'STUDENT_DISABLED':
      case 'STUDENT_DELETED':
        return 'danger';
      case 'STATISTICS_REFRESHED':
      case 'BULK_SYNCHRONIZATION_STARTED':
      case 'BULK_SYNCHRONIZATION_COMPLETED':
        return 'info';
      case 'SCORE_RECALCULATED':
      case 'ALL_SCORES_RECALCULATED':
      case 'MANUAL_SCORE_ADJUSTMENT':
      case 'LEADERBOARD_RECALCULATED':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const getStatusBadge = (status) => {
    const s = String(status || 'SUCCESS').toUpperCase();
    if (s === 'SUCCESS' || s === 'COMPLETED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" /> SUCCESS
        </span>
      );
    }
    if (s.includes('ERROR') || s === 'WARNING' || s === 'COMPLETED_WITH_ERRORS') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <AlertTriangle className="w-3 h-3" /> WARNING
        </span>
      );
    }
    if (s === 'RUNNING') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
          <Radio className="w-3 h-3" /> RUNNING
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
        <XCircle className="w-3 h-3" /> FAILED
      </span>
    );
  };

  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, totalCount);

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
            Immutable log of all administrative actions, student profile modifications, scoring recalculations, and platform operations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExport}
            loading={exporting}
            icon={Download}
          >
            Export Logs
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => fetchLogs(currentPage)}
            loading={refreshing}
            icon={RefreshCw}
          >
            Refresh Trail
          </Button>
        </div>
      </div>

      {/* Filters & Realtime Bar */}
      <Card className="p-4 flex flex-col md:flex-row gap-3 items-center justify-between bg-slate-900/90 border-slate-800">
        <div className="relative w-full md:w-96">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search audit logs by admin, target, roll number..."
            value={search}
            onChange={handleSearchChange}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="text-xs bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
            >
              {ACTIONS.map((act) => (
                <option key={act.value} value={act.value}>
                  {act.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-semibold text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>Realtime Sync Active</span>
          </div>
        </div>
      </Card>

      {/* Audit Logs Table */}
      <Card className="overflow-hidden">
        <CardHeader
          title="Recorded Audit Events"
          subtitle={
            totalCount > 0
              ? `Showing ${startItem}–${endItem} of ${totalCount} logged events`
              : 'Showing 0 logged events'
          }
        />

        {loading && logs.length === 0 ? (
          <LoadingState message="Connecting to Supabase immutable audit logs..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => fetchLogs(currentPage)} />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No audit events found"
            description={
              search || actionFilter !== 'ALL'
                ? 'No audit records match the selected search or action filters.'
                : 'Administrative actions performed in the portal will appear here in chronological order.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60">
                  <th className="table-th">Timestamp</th>
                  <th className="table-th">Administrator</th>
                  <th className="table-th">Action Identifier</th>
                  <th className="table-th">Target Entity</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Summary & Changes</th>
                  <th className="table-th text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.map((log) => {
                  const details = log.details || {};
                  const reason = log.reason || details.reason;
                  const hasDiff = !!(details.diff || (details.before && details.after));

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                    >
                      <td className="table-td whitespace-nowrap font-mono text-[11px] text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                      </td>

                      <td className="table-td">
                        <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                          <Shield className="w-3 h-3 text-brand-400 shrink-0" />
                          <span>{log.adminName || 'Admin'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {log.adminEmail}
                        </div>
                      </td>

                      <td className="table-td whitespace-nowrap">
                        <Badge variant={getActionBadgeVariant(log.action)}>
                          {log.action?.replace(/_/g, ' ')}
                        </Badge>
                      </td>

                      <td className="table-td">
                        <div className="font-medium text-slate-200">{log.target || 'SYSTEM'}</div>
                        {log.targetId && (
                          <div className="text-[10px] text-slate-500 font-mono">ID: {log.targetId}</div>
                        )}
                      </td>

                      <td className="table-td whitespace-nowrap">
                        {getStatusBadge(log.status || details.status)}
                      </td>

                      <td className="table-td max-w-md xl:max-w-xl 2xl:max-w-none">
                        {reason ? (
                          <div className="text-[11px] text-amber-300 font-medium truncate">
                            <span className="text-slate-400">Reason:</span> "{reason}"
                          </div>
                        ) : hasDiff ? (
                          <div className="text-[11px] text-slate-300 flex items-center gap-1">
                            <span className="text-brand-400 font-semibold">
                              {Object.keys(details.diff || {}).length || 'Profile'} changes recorded
                            </span>
                            {details.newScore !== undefined && (
                              <span className="text-emerald-400 ml-1 font-mono">
                                (Score: {details.previousScore ?? '—'} → {details.newScore})
                              </span>
                            )}
                          </div>
                        ) : details.totalRows ? (
                          <div className="text-[11px] text-slate-300">
                            Imported: {details.createdCount || 0} new, {details.updatedCount || 0} updated, {details.failedCount || 0} failed
                          </div>
                        ) : details.totalStudents ? (
                          <div className="text-[11px] text-slate-300">
                            Bulk Sync: {details.successful || 0} successful, {details.failed || 0} failed
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 truncate">
                            {typeof details === 'object'
                              ? Object.entries(details)
                                  .filter(([k]) => !['before', 'after', 'diff', 'errors'].includes(k))
                                  .slice(0, 2)
                                  .map(([k, v]) => `${k}: ${typeof v === 'object' ? '...' : v}`)
                                  .join(' | ') || 'Action recorded successfully'
                              : String(details)}
                          </div>
                        )}
                      </td>

                      <td className="table-td text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-[10px] font-medium"
                        >
                          <Eye className="w-3 h-3 text-brand-400" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Server-Side Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-slate-800 bg-slate-950/60 text-xs text-slate-400 gap-3">
            <div>
              Showing <span className="font-semibold text-slate-200">{startItem}</span> to{' '}
              <span className="font-semibold text-slate-200">{endItem}</span> of{' '}
              <span className="font-semibold text-slate-200">{totalCount}</span> events
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchLogs(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>

              <span className="px-2 font-medium text-slate-300 text-xs">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => fetchLogs(currentPage + 1)}
                disabled={currentPage >= totalPages || loading}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Audit Event Details Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => {
            setSelectedLog(null);
            setShowRawJson(false);
          }}
          title="Administrative Audit Record"
          subtitle={`Event ID: #${selectedLog.id} • ${new Date(selectedLog.timestamp).toLocaleString()}`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-5 text-xs text-slate-300">
            {/* Action & Status Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-2">
                <Badge variant={getActionBadgeVariant(selectedLog.action)}>
                  {selectedLog.action?.replace(/_/g, ' ')}
                </Badge>
                <span className="text-slate-500 font-mono text-[11px]">#{selectedLog.id}</span>
              </div>
              <div>{getStatusBadge(selectedLog.status || selectedLog.details?.status)}</div>
            </div>

            {/* Core Entity Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Administrator */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-brand-400" />
                  <span>Authenticated Administrator</span>
                </div>
                <div className="text-sm font-bold text-slate-100">{selectedLog.adminName || 'Admin'}</div>
                <div className="text-[11px] text-slate-400 font-mono">{selectedLog.adminEmail}</div>
                {selectedLog.adminId && (
                  <div className="text-[10px] text-slate-500 font-mono">Clerk ID: {selectedLog.adminId}</div>
                )}
              </div>

              {/* Target */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-purple-400" />
                  <span>Target Entity</span>
                </div>
                <div className="text-sm font-bold text-slate-100">{selectedLog.target || 'SYSTEM'}</div>
                {selectedLog.targetId && (
                  <div className="text-[11px] text-slate-400 font-mono">Target ID: {selectedLog.targetId}</div>
                )}
                <div className="text-[10px] text-slate-500 font-mono">
                  Timestamp: {new Date(selectedLog.timestamp).toISOString()}
                </div>
              </div>
            </div>

            {/* Justification Reason Banner if provided */}
            {(selectedLog.reason || selectedLog.details?.reason) && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
                <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Mandatory Justification Reason</span>
                </div>
                <p className="mt-1 text-xs font-semibold text-amber-100">
                  "{selectedLog.reason || selectedLog.details?.reason}"
                </p>
              </div>
            )}

            {/* Before vs After Diff View */}
            {(selectedLog.details?.diff ||
              (selectedLog.details?.before && selectedLog.details?.after) ||
              selectedLog.before) && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-brand-400" />
                  <span>State Modification Details (Before vs. After)</span>
                </div>

                <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/80">
                        <th className="px-3.5 py-2 font-bold text-slate-400 text-[11px]">Field / Attribute</th>
                        <th className="px-3.5 py-2 font-bold text-rose-400 text-[11px]">Previous Value</th>
                        <th className="px-3.5 py-2 font-bold text-emerald-400 text-[11px]">New Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {selectedLog.details?.diff ? (
                        Object.entries(selectedLog.details.diff).map(([key, value]) => (
                          <tr key={key} className="hover:bg-slate-900/40">
                            <td className="px-3.5 py-2 font-mono font-medium text-slate-300 capitalize">
                              {key.replace(/_/g, ' ')}
                            </td>
                            <td className="px-3.5 py-2 text-rose-300 font-mono text-[11px] bg-rose-500/5">
                              {String(value.before ?? 'null')}
                            </td>
                            <td className="px-3.5 py-2 text-emerald-300 font-mono text-[11px] bg-emerald-500/5 font-semibold">
                              {String(value.after ?? 'null')}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="px-3.5 py-2 font-mono text-slate-300">Account Status</td>
                          <td className="px-3.5 py-2 text-rose-300 font-mono">
                            {String(selectedLog.details?.previousStatus || selectedLog.before?.accountStatus || 'N/A')}
                          </td>
                          <td className="px-3.5 py-2 text-emerald-300 font-mono font-semibold">
                            {String(selectedLog.details?.newStatus || selectedLog.after?.accountStatus || 'N/A')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Score Recalculation / Adjustment Info */}
            {(selectedLog.details?.previousScore !== undefined || selectedLog.details?.newScore !== undefined) && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Score Transition</div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    {selectedLog.details?.formula || 'RankBoard Unified Scoring Engine'}
                  </div>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="px-2 py-1 rounded bg-slate-900 text-slate-300">
                    {selectedLog.details.previousScore ?? '0.00'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-brand-400" />
                  <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                    {selectedLog.details.newScore ?? '0.00'}
                  </span>
                </div>
              </div>
            )}

            {/* Technical Metadata Footer */}
            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 border-t border-slate-800 pt-3">
              <div>
                IP Origin: <span className="font-mono text-slate-400">{selectedLog.ip || '127.0.0.1'}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowRawJson(!showRawJson)}
                className="text-brand-400 hover:text-brand-300 font-medium underline transition-colors"
              >
                {showRawJson ? 'Hide Raw Audit JSON' : 'Inspect Raw Audit Payload'}
              </button>
            </div>

            {/* Raw JSON View */}
            {showRawJson && (
              <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300 overflow-x-auto max-h-48">
                {JSON.stringify(selectedLog, null, 2)}
              </pre>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AuditLogs;
