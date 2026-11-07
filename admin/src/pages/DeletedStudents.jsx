import React, { useState, useEffect, useCallback } from 'react';
import { adminService } from '../services/adminService';
import { useNotifications } from '../context/NotificationContext';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Pagination } from '../components/common/Pagination';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import {
  UserX,
  Search,
  ArrowUpDown,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Clock,
  Shield,
  FileText,
  Mail,
  Hash,
} from 'lucide-react';

export const DeletedStudents = () => {
  const { notifySuccess, notifyError } = useNotifications();

  const [deletedStudents, setDeletedStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 1,
  });

  // Purge audit confirmation modal state
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [recordToPurge, setRecordToPurge] = useState(null);
  const [purgeSubmitting, setPurgeSubmitting] = useState(false);

  const fetchDeletedStudents = useCallback(
    async (isBackground = false) => {
      if (!isBackground) setLoading(true);
      setError(null);
      try {
        const response = await adminService.getDeletedStudents({
          search: search.trim(),
          sort: sortOrder,
          page: pagination.page,
          limit: pagination.limit,
        });

        if (response && response.success) {
          setDeletedStudents(response.deletedStudents || []);
          setPagination((prev) => ({
            ...prev,
            totalCount: response.totalCount || 0,
            totalPages: response.totalPages || 1,
          }));
        } else {
          throw new Error(response?.message || 'Failed to retrieve deleted students list.');
        }
      } catch (err) {
        console.error('[DeletedStudents Fetch Error]:', err);
        setError(err.response?.data?.message || err.message || 'Error loading deleted students records.');
      } finally {
        setLoading(false);
      }
    },
    [search, sortOrder, pagination.page, pagination.limit]
  );

  useEffect(() => {
    fetchDeletedStudents();
  }, [fetchDeletedStudents]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchDeletedStudents();
  };

  const handleToggleSort = () => {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const openPurgeModal = (record) => {
    setRecordToPurge(record);
    setIsPurgeModalOpen(true);
  };

  const handleConfirmPurge = async () => {
    if (!recordToPurge) return;
    setPurgeSubmitting(true);
    try {
      const recordId = recordToPurge.id || recordToPurge.studentId;
      const res = await adminService.purgeDeletedStudent(recordId, {
        reason: 'Retention policy manual purge',
      });
      if (res.success) {
        notifySuccess(res.message || 'Audit record purged successfully.');
        setIsPurgeModalOpen(false);
        setRecordToPurge(null);
        fetchDeletedStudents(true);
      }
    } catch (err) {
      notifyError(err.response?.data?.message || err.message || 'Failed to purge audit record.');
    } finally {
      setPurgeSubmitting(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <UserX className="w-5 h-5 text-rose-400" />
            <span>Deleted Students Audit Log</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {pagination.totalCount} Record{pagination.totalCount === 1 ? '' : 's'}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Separated compliance audit trail of deleted student accounts. Operational data has been permanently removed; only minimal deletion metadata is retained.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchDeletedStudents()}
            icon={RefreshCw}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Retention Policy Notice */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
        <Shield className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <span className="font-semibold text-slate-200">Data Retention & Privacy Policy:</span>
          <p className="text-slate-400 leading-relaxed">
            Upon deletion, student passwords, Clerk sessions, platform credentials, and performance analytics are permanently expunged. Only student name, registered email, deletion timestamp, and deleting admin identity are preserved for audit accountability.
          </p>
        </div>
      </div>

      {/* Search & Sort Controls */}
      <Card>
        <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by student name, email, or roll..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </form>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleToggleSort}
              icon={ArrowUpDown}
            >
              Sort: {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Deleted Students Table */}
      <Card>
        {loading ? (
          <div className="p-12">
            <LoadingState message="Loading deleted student audit records..." />
          </div>
        ) : error ? (
          <div className="p-8">
            <ErrorState message={error} onRetry={() => fetchDeletedStudents()} />
          </div>
        ) : deletedStudents.length === 0 ? (
          <EmptyState
            icon={UserX}
            title={search ? 'No matching deleted student records' : 'No deleted students recorded'}
            description={
              search
                ? `No records found matching "${search}". Try searching for another name or email.`
                : 'When students are permanently removed by administrators, their deletion audit history will appear here.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="table-th">Student Name</th>
                  <th className="table-th">Registered Email</th>
                  <th className="table-th">Roll Number</th>
                  <th className="table-th">Deletion Date & Time</th>
                  <th className="table-th">Deleted By (Admin)</th>
                  <th className="table-th">Status</th>
                  <th className="table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {deletedStudents.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/20 transition-colors">
                    {/* Student Name */}
                    <td className="table-td font-semibold text-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-rose-950/50 border border-rose-500/20 text-rose-300 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {item.studentName?.charAt(0) || 'S'}
                        </div>
                        <span className="truncate max-w-[180px]">{item.studentName}</span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="table-td font-mono text-xs text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate max-w-[220px]">{item.studentEmail}</span>
                      </div>
                    </td>

                    {/* Roll Number */}
                    <td className="table-td text-xs text-slate-400">
                      {item.rollNumber ? (
                        <span className="font-mono text-slate-300">{item.rollNumber}</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Deletion Date */}
                    <td className="table-td text-xs text-slate-300 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{formatDate(item.deletedAt)}</span>
                      </div>
                    </td>

                    {/* Deleted By */}
                    <td className="table-td text-xs text-slate-300">
                      <div className="space-y-0.5">
                        <div className="font-medium text-slate-200">
                          {item.deletedByAdminName || 'Administrator'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono truncate max-w-[180px]">
                          {item.deletedByAdminEmail}
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="table-td">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/60 text-rose-300 border border-rose-800/40">
                        {item.deletionStatus || 'COMPLETED'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="table-td text-right">
                      <button
                        onClick={() => openPurgeModal(item)}
                        title="Purge audit record (Retention Policy)"
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && deletedStudents.length > 0 && (
          <div className="p-4 border-t border-slate-800">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
            />
          </div>
        )}
      </Card>

      {/* Purge Audit Record Modal */}
      <Modal
        isOpen={isPurgeModalOpen}
        onClose={() => {
          if (!purgeSubmitting) {
            setIsPurgeModalOpen(false);
            setRecordToPurge(null);
          }
        }}
        title="Purge Deletion Audit Record"
        subtitle="Permanent purge of audit metadata according to data retention policy."
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
            <p className="text-slate-300">
              Are you sure you want to permanently purge the deletion audit entry for:
            </p>
            <div className="font-bold text-slate-100">{recordToPurge?.studentName}</div>
            <div className="font-mono text-slate-400">{recordToPurge?.studentEmail}</div>
            <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-800">
              This will remove this specific entry from the audit log. The operational account was already deleted.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={purgeSubmitting}
              onClick={() => {
                setIsPurgeModalOpen(false);
                setRecordToPurge(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              loading={purgeSubmitting}
              onClick={handleConfirmPurge}
              icon={Trash2}
            >
              Purge Audit Record
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DeletedStudents;

