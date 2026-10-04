import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../services/adminService';
import { useNotifications } from '../context/NotificationContext';
import { useDebounce } from '../hooks/useDebounce';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge, StatusBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Pagination } from '../components/common/Pagination';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import {
  Users,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Eye,
  Edit2,
  CheckCircle,
  XCircle,
  TrendingUp,
  Award,
  ChevronDown,
} from 'lucide-react';

const DEPARTMENTS = [
  'ALL',
  'Computer Science and Engineering',
  'Information Technology',
  'Artificial Intelligence & DS',
  'Electronics & Communication',
  'Electrical & Electronics',
  'Mechanical Engineering',
];

export const Students = () => {
  const navigate = useNavigate();
  const { notifySuccess, notifyError } = useNotifications();

  // Student list state
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalCount: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters state
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [status, setStatus] = useState('ALL');
  const [profileStatus, setProfileStatus] = useState('ALL');
  const [scoreStatus, setScoreStatus] = useState('ALL');
  const [syncStatus, setSyncStatus] = useState('ALL');
  const [department, setDepartment] = useState('ALL');
  const [year, setYear] = useState('ALL');
  const [sortBy, setSortBy] = useState('rank');
  const [sortOrder, setSortOrder] = useState('asc');

  // Modal state for Add/Edit
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    rollNumber: '',
    department: 'Computer Science and Engineering',
    year: 3,
    leetcodeUrl: '',
    gfgUrl: '',
    codeforcesUrl: '',
    codechefUrl: '',
    triggerSync: true,
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [syncingStudentId, setSyncingStudentId] = useState(null);

  const fetchStudents = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setError(null);
    try {
      const response = await adminService.getStudents({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch.trim() || undefined,
        status: status !== 'ALL' ? status : undefined,
        profileStatus: profileStatus !== 'ALL' ? profileStatus : undefined,
        scoreStatus: scoreStatus !== 'ALL' ? scoreStatus : undefined,
        syncStatus: syncStatus !== 'ALL' ? syncStatus : undefined,
        department: department !== 'ALL' ? department : undefined,
        year: year !== 'ALL' ? year : undefined,
        sortBy,
        sortOrder,
      });

      if (response.success) {
        setStudents(response.students || []);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to load students:', err);
      if (!isBackground) {
        setError(err.message || 'Failed to retrieve students list.');
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    debouncedSearch,
    status,
    profileStatus,
    scoreStatus,
    syncStatus,
    department,
    year,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Periodic polling for real-time consistency
  useEffect(() => {
    const timer = setInterval(() => {
      fetchStudents(true);
    }, 60000);
    return () => clearInterval(timer);
  }, [fetchStudents]);

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      const res = await adminService.createStudent(formData);
      if (res.success) {
        notifySuccess(res.message || 'Student created successfully.');
        setIsAddModalOpen(false);
        setFormData({
          name: '',
          email: '',
          rollNumber: '',
          department: 'Computer Science and Engineering',
          year: 3,
          leetcodeUrl: '',
          gfgUrl: '',
          codeforcesUrl: '',
          codechefUrl: '',
          triggerSync: true,
        });
        fetchStudents();
      }
    } catch (err) {
      notifyError(err.message || 'Failed to create student.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async (student) => {
    const nextStatus = student.accountStatus === 'DISABLED' ? 'ACTIVE' : 'DISABLED';
    try {
      const res = await adminService.toggleStudentStatus(student.id, nextStatus);
      if (res.success) {
        notifySuccess(`Student status changed to ${nextStatus}.`);
        fetchStudents(true);
      }
    } catch (err) {
      notifyError(err.message || 'Failed to update student status.');
    }
  };

  const handleSyncStudent = async (studentId) => {
    setSyncingStudentId(studentId);
    try {
      const res = await adminService.syncStudent(studentId);
      if (res.success) {
        notifySuccess(`Statistics refreshed! Score: ${res.student?.finalScore || 0}`);
        fetchStudents(true);
      }
    } catch (err) {
      notifyError(err.message || 'Failed to synchronize student stats.');
    } finally {
      setSyncingStudentId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <span>Student Management</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {pagination.totalCount} Registered
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            View, search, filter, link platforms, and manage student performance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchStudents()}
            icon={RefreshCw}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            icon={Plus}
          >
            Add Student
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, email, roll number..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Quick Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Status */}
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="text-xs bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="DISABLED">Disabled Only</option>
            </select>

            {/* Department */}
            <select
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="text-xs bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500 max-w-[150px] truncate"
            >
              <option value="ALL">All Departments</option>
              {DEPARTMENTS.filter((d) => d !== 'ALL').map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            {/* Year */}
            <select
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="text-xs bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="ALL">All Years</option>
              <option value="1">Year 1</option>
              <option value="2">Year 2</option>
              <option value="3">Year 3</option>
              <option value="4">Year 4</option>
            </select>

            {/* Profile Completion */}
            <select
              value={profileStatus}
              onChange={(e) => {
                setProfileStatus(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="text-xs bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="ALL">All Profiles</option>
              <option value="COMPLETE">Complete (4/4 Linked)</option>
              <option value="INCOMPLETE">Incomplete</option>
            </select>

            {/* Sort */}
            <select
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split(':');
                setSortBy(sb);
                setSortOrder(so);
              }}
              className="text-xs bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="rank:asc">Rank (Ascending)</option>
              <option value="finalScore:desc">Score (Highest First)</option>
              <option value="name:asc">Name (A-Z)</option>
              <option value="rollNumber:asc">Roll Number (Asc)</option>
              <option value="updatedAt:desc">Recently Updated</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Student Table */}
      <Card>
        {loading && students.length === 0 ? (
          <LoadingState message="Fetching student records..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => fetchStudents()} />
        ) : students.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No students match criteria"
            description="Try adjusting your search terms or filter configurations."
            actionLabel="Add New Student"
            onAction={() => setIsAddModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="table-th w-16">Rank</th>
                  <th className="table-th">Student Name & Roll</th>
                  <th className="table-th">Email</th>
                  <th className="table-th">Department / Year</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Overall Score</th>
                  <th className="table-th">Platforms Linked</th>
                  <th className="table-th">Last Sync</th>
                  <th className="table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {students.map((student) => {
                  const platforms = student.platforms || {};
                  const connectedCount = ['leetcode', 'gfg', 'codeforces', 'codechef'].filter(
                    (k) => platforms[k]?.username
                  ).length;
                  const isSyncing = syncingStudentId === student.id;

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-800/30 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/students/${student.id}`)}
                    >
                      {/* Rank */}
                      <td className="table-td font-black text-slate-100">
                        {student.rank ? (
                          <div className="flex items-center gap-1">
                            {student.rank <= 3 && <Award className="w-3.5 h-3.5 text-amber-400" />}
                            <span>#{student.rank}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 font-normal">—</span>
                        )}
                      </td>

                      {/* Name & Roll */}
                      <td className="table-td">
                        <div className="font-bold text-slate-100 group-hover:text-brand-400 transition-colors">
                          {student.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {student.rollNumber || 'No Roll #'}
                        </div>
                      </td>

                      {/* Email */}
                      <td className="table-td text-slate-300 font-mono text-[11px]">
                        {student.email || '—'}
                      </td>

                      {/* Department / Year */}
                      <td className="table-td">
                        <div className="text-xs text-slate-300 truncate max-w-[160px]" title={student.department}>
                          {student.department || 'General'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          Year {student.year || '—'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="table-td">
                        <StatusBadge status={student.accountStatus || 'ACTIVE'} />
                      </td>

                      {/* Overall Score */}
                      <td className="table-td">
                        <span className="font-extrabold text-sm text-brand-300">
                          {typeof student.finalScore === 'number' ? student.finalScore.toFixed(2) : '0.00'}
                        </span>
                      </td>

                      {/* Platforms Linked */}
                      <td className="table-td">
                        <div className="flex items-center gap-1.5">
                          {['leetcode', 'gfg', 'codeforces', 'codechef'].map((plat) => {
                            const p = platforms[plat];
                            const isLinked = !!p?.username;
                            const isSuccess = p?.status === 'SUCCESS';
                            const isFailed = p?.status === 'FAILED';

                            return (
                              <span
                                key={plat}
                                title={`${plat.toUpperCase()}: ${isLinked ? p.username : 'Not Linked'} (${p?.status || 'NOT_CONNECTED'})`}
                                className={`w-5 h-5 rounded text-[9px] font-extrabold flex items-center justify-center border ${
                                  !isLinked
                                    ? 'bg-slate-900 border-slate-800 text-slate-600'
                                    : isSuccess
                                    ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                                    : isFailed
                                    ? 'bg-rose-950/80 border-rose-700 text-rose-300'
                                    : 'bg-amber-950/80 border-amber-700 text-amber-300'
                                }`}
                              >
                                {plat === 'leetcode' ? 'LC' : plat === 'gfg' ? 'GF' : plat === 'codeforces' ? 'CF' : 'CC'}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      {/* Last Sync */}
                      <td className="table-td text-[11px] text-slate-400 font-mono">
                        {student.lastDataUpdatedAt
                          ? new Date(student.lastDataUpdatedAt).toLocaleDateString()
                          : 'Never'}
                      </td>

                      {/* Actions */}
                      <td className="table-td text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Sync */}
                          <button
                            onClick={() => handleSyncStudent(student.id)}
                            disabled={isSyncing}
                            title="Refresh statistics"
                            className="p-1.5 text-slate-400 hover:text-brand-300 hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-brand-400' : ''}`} />
                          </button>

                          {/* Toggle Status */}
                          <button
                            onClick={() => handleToggleStatus(student)}
                            title={student.accountStatus === 'DISABLED' ? 'Enable Student' : 'Disable Student'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              student.accountStatus === 'DISABLED'
                                ? 'text-emerald-400 hover:bg-emerald-950/40'
                                : 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/40'
                            }`}
                          >
                            {student.accountStatus === 'DISABLED' ? (
                              <CheckCircle className="w-3.5 h-3.5" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* View Details */}
                          <button
                            onClick={() => navigate(`/students/${student.id}`)}
                            title="View student profile"
                            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalCount}
          pageSize={pagination.limit}
          onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
        />
      </Card>

      {/* Add Student Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Single Student Record"
        subtitle="Manually register a student and link their coding profiles."
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateStudent} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Email Address <span className="text-rose-400">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="e.g. john@college.edu"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Roll Number
              </label>
              <input
                type="text"
                placeholder="e.g. 21CS045"
                value={formData.rollNumber}
                onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Academic Year
              </label>
              <select
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value, 10) })}
                className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value={1}>1st Year</option>
                <option value={2}>2nd Year</option>
                <option value={3}>3rd Year</option>
                <option value={4}>4th Year</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Department
            </label>
            <select
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {DEPARTMENTS.filter((d) => d !== 'ALL').map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Platform URLs */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-200">Coding Platform Handles / URLs</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">LeetCode Profile / Username</label>
                <input
                  type="text"
                  placeholder="https://leetcode.com/u/username"
                  value={formData.leetcodeUrl}
                  onChange={(e) => setFormData({ ...formData, leetcodeUrl: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">GeeksforGeeks Profile / Username</label>
                <input
                  type="text"
                  placeholder="https://www.geeksforgeeks.org/user/username/"
                  value={formData.gfgUrl}
                  onChange={(e) => setFormData({ ...formData, gfgUrl: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Codeforces Profile / Handle</label>
                <input
                  type="text"
                  placeholder="https://codeforces.com/profile/handle"
                  value={formData.codeforcesUrl}
                  onChange={(e) => setFormData({ ...formData, codeforcesUrl: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">CodeChef Profile / Handle</label>
                <input
                  type="text"
                  placeholder="https://www.codechef.com/users/handle"
                  value={formData.codechefUrl}
                  onChange={(e) => setFormData({ ...formData, codechefUrl: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="triggerSyncCheck"
              checked={formData.triggerSync}
              onChange={(e) => setFormData({ ...formData, triggerSync: e.target.checked })}
              className="rounded bg-slate-950 border-slate-800 text-brand-500 focus:ring-brand-500"
            />
            <label htmlFor="triggerSyncCheck" className="text-xs text-slate-300">
              Immediately fetch statistics and calculate overall score upon creation
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={formSubmitting}
            >
              Create Student
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Students;
