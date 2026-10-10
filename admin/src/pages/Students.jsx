import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../services/adminService';
import { subscribeToAdminUpdates } from '../services/supabase';
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
  'AI',
  'AIML',
  'CSBS',
  'CSIT',
  'CSDS',
  'VLSI',
  'CIVIL',
  'Prime',
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
  const [platformMissing, setPlatformMissing] = useState('ALL');
  const [platformLinked, setPlatformLinked] = useState('ALL');
  const [scoreStatus, setScoreStatus] = useState('ALL');
  const [syncStatus, setSyncStatus] = useState('ALL');
  const [department, setDepartment] = useState('ALL');
  const [year, setYear] = useState('ALL');
  const [sortBy, setSortBy] = useState('rank');
  const [sortOrder, setSortOrder] = useState('asc');

  // Modal state for Add/Edit
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    rollNumber: '',
    department: 'Computer Science and Engineering',
    year: 3,
    accountStatus: 'ACTIVE',
    leetcodeUrl: '',
    gfgUrl: '',
    codeforcesUrl: '',
    codechefUrl: '',
    hackerrankUrl: '',
    triggerSync: true,
  });

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
    hackerrankUrl: '',
    triggerSync: true,
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
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
        platformMissing: platformMissing !== 'ALL' ? platformMissing : undefined,
        platformLinked: platformLinked !== 'ALL' ? platformLinked : undefined,
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
          setPagination((prev) => ({
            ...prev,
            page: response.pagination.page ?? response.pagination.currentPage ?? prev.page,
            limit: response.pagination.limit ?? prev.limit,
            totalCount: response.pagination.totalCount ?? response.pagination.totalRecords ?? 0,
            totalPages: response.pagination.totalPages ?? 1,
          }));
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
    platformMissing,
    platformLinked,
    scoreStatus,
    syncStatus,
    department,
    year,
    sortBy,
    sortOrder,
  ]);

  // Fetch students on mount and whenever dependencies change (page, filters, sorting)
  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Supabase Realtime subscription for instant live student data updates
  useEffect(() => {
    const unsubscribe = subscribeToAdminUpdates(() => {
      fetchStudents(true);
    });
    return () => {
      unsubscribe();
    };
  }, [fetchStudents]);

  // Periodic polling fallback
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
          hackerrankUrl: '',
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

  const openEditModal = (student, e) => {
    if (e) e.stopPropagation();
    setEditingStudent(student);
    const p = student.platforms || {};
    setEditFormData({
      name: student.name || '',
      email: student.email || '',
      rollNumber: student.rollNumber || '',
      department: student.department || 'Computer Science and Engineering',
      year: student.year || 3,
      accountStatus: student.accountStatus || 'ACTIVE',
      leetcodeUrl: p.leetcode?.profileUrl || (p.leetcode?.username ? `https://leetcode.com/u/${p.leetcode.username}` : ''),
      gfgUrl: p.gfg?.profileUrl || (p.gfg?.username ? `https://www.geeksforgeeks.org/user/${p.gfg.username}/` : ''),
      codeforcesUrl: p.codeforces?.profileUrl || (p.codeforces?.username ? `https://codeforces.com/profile/${p.codeforces.username}` : ''),
      codechefUrl: p.codechef?.profileUrl || (p.codechef?.username ? `https://www.codechef.com/users/${p.codechef.username}` : ''),
      hackerrankUrl: p.hackerrank?.profileUrl || (p.hackerrank?.username ? `https://www.hackerrank.com/profile/${p.hackerrank.username}` : ''),
      triggerSync: true,
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;
    setEditSubmitting(true);
    try {
      const res = await adminService.updateStudent(editingStudent.id, editFormData);
      if (res.success) {
        notifySuccess(res.message || 'Student profile updated successfully.');
        setIsEditModalOpen(false);
        fetchStudents(true);
      }
    } catch (err) {
      notifyError(err.message || 'Failed to update student profile.');
    } finally {
      setEditSubmitting(false);
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
            View, search, filter, link platforms, and manage student performance across coding platforms.
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

      {/* Quick Filter Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            setProfileStatus('ALL');
            setPlatformMissing('ALL');
            setPlatformLinked('ALL');
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
            profileStatus === 'ALL' && platformMissing === 'ALL' && platformLinked === 'ALL'
              ? 'bg-brand-500/20 border-brand-500 text-brand-300'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          All Students
        </button>

        {/* Platform Missing Dropdown */}
        <div className="relative inline-flex items-center">
          <select
            value={platformMissing}
            onChange={(e) => {
              const val = e.target.value;
              setPlatformMissing(val);
              if (val !== 'ALL') {
                setPlatformLinked('ALL');
                setProfileStatus('ALL');
              }
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className={`text-xs pl-3 pr-7 py-1.5 rounded-lg border font-medium transition-colors appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-500 ${
              platformMissing !== 'ALL'
                ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-semibold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <option value="ALL" className="bg-slate-900 text-slate-300">Platform Missing</option>
            <option value="leetcode" className="bg-slate-900 text-slate-300">LeetCode Missing</option>
            <option value="gfg" className="bg-slate-900 text-slate-300">GeeksforGeeks Missing</option>
            <option value="hackerrank" className="bg-slate-900 text-slate-300">HackerRank Missing</option>
            <option value="codeforces" className="bg-slate-900 text-slate-300">Codeforces Missing</option>
            <option value="codechef" className="bg-slate-900 text-slate-300">CodeChef Missing</option>
          </select>
          <ChevronDown className={`w-3.5 h-3.5 absolute right-2 pointer-events-none ${platformMissing !== 'ALL' ? 'text-amber-300' : 'text-slate-400'}`} />
        </div>

        {/* Platform Linked Dropdown */}
        <div className="relative inline-flex items-center">
          <select
            value={platformLinked}
            onChange={(e) => {
              const val = e.target.value;
              setPlatformLinked(val);
              if (val !== 'ALL') {
                setPlatformMissing('ALL');
                setProfileStatus('ALL');
              }
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className={`text-xs pl-3 pr-7 py-1.5 rounded-lg border font-medium transition-colors appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-500 ${
              platformLinked !== 'ALL'
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <option value="ALL" className="bg-slate-900 text-slate-300">All Platforms Linked</option>
            <option value="ALL_LINKED" className="bg-slate-900 text-slate-300">All Platforms Linked</option>
            <option value="leetcode" className="bg-slate-900 text-slate-300">LeetCode Linked</option>
            <option value="gfg" className="bg-slate-900 text-slate-300">GeeksforGeeks Linked</option>
            <option value="hackerrank" className="bg-slate-900 text-slate-300">HackerRank Linked</option>
            <option value="codeforces" className="bg-slate-900 text-slate-300">Codeforces Linked</option>
            <option value="codechef" className="bg-slate-900 text-slate-300">CodeChef Linked</option>
          </select>
          <ChevronDown className={`w-3.5 h-3.5 absolute right-2 pointer-events-none ${platformLinked !== 'ALL' ? 'text-emerald-300' : 'text-slate-400'}`} />
        </div>

        <button
          onClick={() => {
            setProfileStatus('INCOMPLETE');
            setPlatformMissing('ALL');
            setPlatformLinked('ALL');
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
            profileStatus === 'INCOMPLETE'
              ? 'bg-rose-500/20 border-rose-500 text-rose-300'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Incomplete Profiles
        </button>
        <button
          onClick={() => {
            setProfileStatus('RECENT');
            setPlatformMissing('ALL');
            setPlatformLinked('ALL');
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
            profileStatus === 'RECENT'
              ? 'bg-purple-500/20 border-purple-500 text-purple-300'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Recently Added
        </button>
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

            {/* Profile Status Detailed */}
            <select
              value={profileStatus}
              onChange={(e) => {
                setProfileStatus(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="text-xs bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="ALL">All Profiles</option>
              <option value="COMPLETE">Complete Profiles</option>
              <option value="INCOMPLETE">Incomplete Profiles</option>
              <option value="FETCH_FAILED">Data Fetch Failed</option>
              <option value="RECENT">Recently Added</option>
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
              <option value="createdAt:desc">Newest Registered</option>
              <option value="lastDataUpdatedAt:desc">Recently Synced</option>
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
                  <th className="table-th w-14">Rank</th>
                  <th className="table-th">Student Name & Roll</th>
                  <th className="table-th">Email</th>
                  <th className="table-th">Department / Year</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Overall Score</th>
                  <th className="table-th">Platforms (5 Total)</th>
                  <th className="table-th">Last Sync</th>
                  <th className="table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {students.map((student) => {
                  const platforms = student.platforms || {};
                  const isSyncing = syncingStudentId === student.id;

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-800/30 transition-colors group cursor-pointer"
                      onClick={() => {
                        const targetId = student.id || student.studentId;
                        if (targetId) navigate(`/students/${targetId}`);
                      }}
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
                        <div className="text-xs text-slate-300 truncate max-w-[160px] xl:max-w-none" title={student.department}>
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
                        <span className="font-extrabold text-sm text-brand-300 font-mono">
                          {typeof student.finalScore === 'number' ? student.finalScore.toFixed(2) : '0.00'}
                        </span>
                      </td>

                      {/* Platforms Linked (All 5 platforms) */}
                      <td className="table-td" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          {[
                            { key: 'leetcode', label: 'LC', name: 'LeetCode (40%)' },
                            { key: 'gfg', label: 'GF', name: 'GeeksforGeeks (30%)' },
                            { key: 'hackerrank', label: 'HR', name: 'HackerRank (30%)' },
                            { key: 'codeforces', label: 'CF', name: 'Codeforces (Stats)' },
                            { key: 'codechef', label: 'CC', name: 'CodeChef (Stats)' },
                          ].map(({ key: plat, label, name }) => {
                            const p = platforms[plat];
                            const isLinked = !!p?.username || !!p?.profileUrl;
                            const isSuccess = p?.status === 'SUCCESS';
                            const isFailed = p?.status === 'FAILED';

                            return (
                              <span
                                key={plat}
                                title={`${name}: ${isLinked ? (p.username || 'Linked') : 'Not Added'} (${p?.status || 'NOT_CONNECTED'})`}
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
                                {label}
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
                        <div className="flex items-center justify-end gap-1">
                          {/* Quick Edit / Add HackerRank */}
                          <button
                            onClick={(e) => openEditModal(student, e)}
                            title="Edit Platform URLs / Details"
                            className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

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
                            onClick={() => {
                              const targetId = student.id || student.studentId;
                              if (targetId) navigate(`/students/${targetId}`);
                            }}
                            title="View student profile & audit"
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

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">HackerRank Profile / Handle</label>
                <input
                  type="text"
                  placeholder="https://www.hackerrank.com/profile/username"
                  value={formData.hackerrankUrl}
                  onChange={(e) => setFormData({ ...formData, hackerrankUrl: e.target.value })}
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

      {/* Edit Student Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Student Profile & Platform URLs"
        subtitle={`Update credentials, link HackerRank, or edit coding profiles for ${editingStudent?.name || 'Student'}`}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. John Doe"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
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
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
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
                value={editFormData.rollNumber}
                onChange={(e) => setEditFormData({ ...editFormData, rollNumber: e.target.value })}
                className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Academic Year
              </label>
              <select
                value={editFormData.year}
                onChange={(e) => setEditFormData({ ...editFormData, year: parseInt(e.target.value, 10) })}
                className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value={1}>1st Year</option>
                <option value={2}>2nd Year</option>
                <option value={3}>3rd Year</option>
                <option value={4}>4th Year</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Department
              </label>
              <select
                value={editFormData.department}
                onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {DEPARTMENTS.filter((d) => d !== 'ALL').map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Account Status
              </label>
              <select
                value={editFormData.accountStatus}
                onChange={(e) => setEditFormData({ ...editFormData, accountStatus: e.target.value })}
                className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="DISABLED">DISABLED</option>
              </select>
            </div>
          </div>

          {/* Platform URLs */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-200">Coding Platform Handles / URLs</h4>
              <span className="text-[10px] text-amber-400 font-semibold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                Formula: LeetCode (40%) + GFG (30%) + HackerRank (30%)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* LeetCode */}
              <div>
                <label className="block text-[11px] font-medium text-amber-300 mb-1 flex items-center justify-between">
                  <span>LeetCode URL</span>
                  {editFormData.leetcodeUrl ? <span className="text-emerald-400 text-[10px]">✓ Available</span> : <span className="text-slate-500 text-[10px]">Not Added</span>}
                </label>
                <input
                  type="text"
                  placeholder="https://leetcode.com/u/username"
                  value={editFormData.leetcodeUrl}
                  onChange={(e) => setEditFormData({ ...editFormData, leetcodeUrl: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {/* GFG */}
              <div>
                <label className="block text-[11px] font-medium text-emerald-300 mb-1 flex items-center justify-between">
                  <span>GeeksforGeeks URL</span>
                  {editFormData.gfgUrl ? <span className="text-emerald-400 text-[10px]">✓ Available</span> : <span className="text-slate-500 text-[10px]">Not Added</span>}
                </label>
                <input
                  type="text"
                  placeholder="https://www.geeksforgeeks.org/user/username/"
                  value={editFormData.gfgUrl}
                  onChange={(e) => setEditFormData({ ...editFormData, gfgUrl: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {/* HackerRank - Highlighted */}
              <div className="sm:col-span-2 p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40">
                <label className="block text-[11px] font-bold text-emerald-300 mb-1 flex items-center justify-between">
                  <span>HackerRank Profile URL</span>
                  {editFormData.hackerrankUrl ? (
                    <span className="text-emerald-400 text-[10px] font-bold">✓ Available</span>
                  ) : (
                    <span className="text-amber-400 text-[10px] font-bold">⚠️ Missing / Not Added</span>
                  )}
                </label>
                <input
                  type="text"
                  placeholder="https://www.hackerrank.com/profile/username"
                  value={editFormData.hackerrankUrl}
                  onChange={(e) => setEditFormData({ ...editFormData, hackerrankUrl: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-950 border border-emerald-700/60 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>

              {/* Codeforces */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center justify-between">
                  <span>Codeforces URL</span>
                  {editFormData.codeforcesUrl ? <span className="text-emerald-400 text-[10px]">✓ Available</span> : <span className="text-slate-500 text-[10px]">Not Added</span>}
                </label>
                <input
                  type="text"
                  placeholder="https://codeforces.com/profile/handle"
                  value={editFormData.codeforcesUrl}
                  onChange={(e) => setEditFormData({ ...editFormData, codeforcesUrl: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {/* CodeChef */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center justify-between">
                  <span>CodeChef URL</span>
                  {editFormData.codechefUrl ? <span className="text-emerald-400 text-[10px]">✓ Available</span> : <span className="text-slate-500 text-[10px]">Not Added</span>}
                </label>
                <input
                  type="text"
                  placeholder="https://www.codechef.com/users/handle"
                  value={editFormData.codechefUrl}
                  onChange={(e) => setEditFormData({ ...editFormData, codechefUrl: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="editTriggerSyncCheck"
              checked={editFormData.triggerSync}
              onChange={(e) => setEditFormData({ ...editFormData, triggerSync: e.target.checked })}
              className="rounded bg-slate-950 border-slate-800 text-brand-500 focus:ring-brand-500"
            />
            <label htmlFor="editTriggerSyncCheck" className="text-xs text-slate-300">
              Immediately fetch statistics and recalculate Overall Score (40% LC + 30% GFG + 30% HR) & Rank
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={editSubmitting}
            >
              Save Changes & Sync
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Students;
