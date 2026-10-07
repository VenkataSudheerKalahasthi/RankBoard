import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../services/adminService';
import { useNotifications } from '../context/NotificationContext';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import {
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  RefreshCw,
  FileSpreadsheet,
  Layers,
  Award,
  Zap,
  Shield,
  ArrowUpRight,
  Code,
} from 'lucide-react';
import { subscribeToAdminUpdates } from '../services/supabase';

const BRANCH_OPTIONS = [
  { value: 'ALL', label: 'All Branches' },
  { value: 'Computer Science and Engineering', label: 'Computer Science and Engineering (CSE)' },
  { value: 'IT', label: 'Information Technology (IT)' },
  { value: 'AIML', label: 'Artificial Intelligence & ML (AIML)' },
  { value: 'IoT', label: 'Internet of Things (IoT)' },
  { value: 'AI', label: 'Artificial Intelligence (AI)' },
  { value: 'Artificial Intelligence and Data Science', label: 'Artificial Intelligence and Data Science' },
  { value: 'Electronics & Communication', label: 'Electronics & Communication (ECE)' },
  { value: 'Electrical & Electronics', label: 'Electrical & Electronics (EEE)' },
  { value: 'Mechanical Engineering', label: 'Mechanical Engineering (ME)' },
  { value: 'Civil', label: 'Civil Engineering' },
  { value: 'CSDS', label: 'CSDS' },
  { value: 'CSBS', label: 'CSBS' },
  { value: 'CSIT', label: 'CSIT' },
  { value: 'VLSI', label: 'VLSI' },
  { value: 'PRIME', label: 'PRIME' },
];

const YEAR_OPTIONS = [
  { value: 'ALL', label: 'All Years' },
  { value: '1', label: 'Year 1' },
  { value: '2', label: 'Year 2' },
  { value: '3', label: 'Year 3' },
  { value: '4', label: 'Year 4' },
];

const normalizeBranch = (dept) => {
  if (!dept) return 'Other';
  const d = dept.trim().toLowerCase();

  // 1. CSDS (Computer Science & Data Science)
  if (
    d === 'csds' ||
    d.includes('computer science and data science') ||
    d.includes('computer science & data science') ||
    d.includes('cs & ds') ||
    d.includes('cs and ds') ||
    d.includes('cs & data science') ||
    d.includes('cs and data science')
  ) {
    return 'CSDS';
  }

  // 2. Artificial Intelligence and Data Science
  if (
    d === 'artificial intelligence and data science' ||
    d === 'artificial intelligence & data science' ||
    d === 'ai & ds' ||
    d === 'ai and ds' ||
    d === 'aids' ||
    d.includes('artificial intelligence and data science') ||
    d.includes('artificial intelligence & data science') ||
    d.includes('ai & data science') ||
    d.includes('ai and data science') ||
    d.includes('ai & ds') ||
    d.includes('ai and ds')
  ) {
    return 'Artificial Intelligence and Data Science';
  }

  // 3. AIML (Artificial Intelligence & Machine Learning)
  if (
    d === 'aiml' ||
    d === 'ai & ml' ||
    d === 'ai and ml' ||
    d === 'ai/ml' ||
    d.includes('machine learning') ||
    d.includes('artificial intelligence & ml') ||
    d.includes('artificial intelligence and ml') ||
    d.includes('artificial intelligence & machine learning') ||
    d.includes('artificial intelligence and machine learning')
  ) {
    return 'AIML';
  }

  // 4. IoT (Internet of Things)
  if (d === 'iot' || d.includes('internet of things')) {
    return 'IoT';
  }

  // 5. AI (Artificial Intelligence standalone)
  if (d === 'ai' || d === 'artificial intelligence') {
    return 'AI';
  }

  // 6. CSE (Computer Science and Engineering)
  if (
    d === 'cse' ||
    d.includes('computer science and engineering') ||
    d.includes('computer science & engineering') ||
    d.includes('computer science') ||
    d.includes('comp sci')
  ) {
    return 'Computer Science and Engineering';
  }

  // 7. IT (Information Technology)
  if (d === 'it' || d === 'information technology' || d.includes('infotech')) {
    return 'IT';
  }

  // 8. ECE (Electronics & Communication)
  if (d === 'ece' || d.includes('electronics and communication') || d.includes('electronics & communication')) {
    return 'Electronics & Communication';
  }

  // 9. EEE (Electrical & Electronics)
  if (d === 'eee' || d.includes('electrical and electronics') || d.includes('electrical & electronics')) {
    return 'Electrical & Electronics';
  }

  // 10. ME (Mechanical Engineering)
  if (d === 'me' || d === 'mech' || d.includes('mechanical')) {
    return 'Mechanical Engineering';
  }

  // 11. Civil (Civil Engineering)
  if (d === 'civil' || d.includes('civil engineering')) {
    return 'Civil';
  }

  if (d === 'prime') {
    return 'PRIME';
  }

  return dept.trim();
};

const matchesBranch = (studentDept, selectedBranch) => {
  if (!selectedBranch || selectedBranch === 'ALL') return true;
  if (!studentDept) return false;

  const normStudent = normalizeBranch(studentDept).toLowerCase();
  const normSelected = normalizeBranch(selectedBranch).toLowerCase();

  if (normStudent === normSelected) return true;

  const rawStudent = studentDept.trim().toLowerCase();
  const rawSelected = selectedBranch.trim().toLowerCase();
  return rawStudent === rawSelected || rawStudent.includes(rawSelected) || rawSelected.includes(rawStudent);
};

const matchesYear = (studentYear, selectedYear) => {
  if (!selectedYear || selectedYear === 'ALL') return true;
  if (studentYear === undefined || studentYear === null) return false;
  return String(studentYear).trim() === String(selectedYear).trim();
};

export const Dashboard = () => {
  const navigate = useNavigate();
  const { notifySuccess, notifyError } = useNotifications();

  const [stats, setStats] = useState(null);
  const [recentAudits, setRecentAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Department distribution filter states
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('ALL');

  const fetchDashboardData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setError(null);
    try {
      const response = await adminService.getDashboardStats();
      if (response.success) {
        setStats(response.stats);
        setRecentAudits(response.stats?.recentActivity || response.recentAudits || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      if (!isBackground) {
        setError(err.message || 'Failed to load dashboard metrics.');
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    // Subscribe to Supabase Realtime table changes
    const unsubscribe = subscribeToAdminUpdates(() => {
      fetchDashboardData(true);
    });

    // Auto-refresh interval (every 60 seconds)
    const timer = setInterval(() => {
      fetchDashboardData(true);
    }, 60000);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [fetchDashboardData]);

  const handleSyncAll = async () => {
    setActionLoading(true);
    try {
      const res = await adminService.syncAllStudents();
      if (res.success) {
        notifySuccess(res.message || 'Bulk synchronization started.');
        fetchDashboardData(true);
      }
    } catch (err) {
      notifyError(err.message || 'Failed to trigger bulk synchronization.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecalculateRanks = async () => {
    setActionLoading(true);
    try {
      const res = await adminService.recalculateLeaderboard();
      if (res.success) {
        notifySuccess(res.message || 'College leaderboard recalculated successfully.');
        fetchDashboardData(true);
      }
    } catch (err) {
      notifyError(err.message || 'Failed to recalculate leaderboard rankings.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !stats) {
    return <LoadingState message="Aggregating live student statistics..." />;
  }

  if (error && !stats) {
    return <ErrorState message={error} onRetry={() => fetchDashboardData()} />;
  }

  const activeJob = stats?.activeSyncJob;

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-card">
        <div>
          <h1 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <span>DSA Rankboard Operations</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time management for college competitive programming ecosystems.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRecalculateRanks}
            disabled={actionLoading}
            icon={TrendingUp}
          >
            Recalculate Ranks
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/import')}
            icon={FileSpreadsheet}
          >
            Import Students
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSyncAll}
            loading={actionLoading || activeJob?.status === 'RUNNING'}
            icon={RefreshCw}
          >
            {activeJob?.status === 'RUNNING' ? 'Sync in Progress...' : 'Sync All Students'}
          </Button>
        </div>
      </div>

      {/* Sync Job Live Alert */}
      {activeJob && activeJob.status === 'RUNNING' && (
        <div className="p-4 bg-brand-950/60 border border-brand-800/80 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-4 h-4 text-brand-400 animate-spin" />
            <div>
              <div className="text-xs font-bold text-brand-200">
                Bulk Synchronization Running
              </div>
              <div className="text-[11px] text-brand-400">
                Processed {activeJob.completed} of {activeJob.total} students ({activeJob.failed} failed)
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="xs"
            onClick={() => navigate('/synchronization')}
            className="border-brand-700 text-brand-300"
          >
            View Queue
          </Button>
        </div>
      )}

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <Card className="p-5 border-slate-800/80 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Registered Cohort</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-100">{stats?.students?.total ?? stats?.totalStudents ?? 0}</div>
            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
              <span className="text-emerald-400 font-semibold">{stats?.students?.active ?? stats?.activeStudents ?? 0} Active</span>
              <span>•</span>
              <span className="text-purple-400 font-medium">{stats?.students?.recentlyAdded ?? 0} New this week</span>
            </div>
          </div>
        </Card>

        {/* HackerRank Adoption Status */}
        <Card className="p-5 border-slate-800/80 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">HackerRank Adoption (30%)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-400">
              {stats?.platformConnectedCounts?.hackerrank ?? stats?.platforms?.connectedCounts?.hackerrank ?? 0}
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
              <span className="text-emerald-400">Linked</span>
              <span>•</span>
              <span className="text-amber-400 font-semibold">
                {Math.max(0, (stats?.students?.total ?? stats?.totalStudents ?? 0) - (stats?.platformConnectedCounts?.hackerrank ?? 0))} Missing
              </span>
            </div>
          </div>
        </Card>

        {/* Scored Students */}
        <Card className="p-5 border-slate-800/80 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Ranked Students</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-100">{stats?.students?.withScores ?? stats?.studentsWithScores ?? 0}</div>
            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
              <span className="text-slate-300">Highest: {stats?.scores?.highestScore ?? stats?.highestScore ?? 0}</span>
              <span>•</span>
              <span className="text-slate-400">Avg: {stats?.scores?.averageScore ?? stats?.averageScore ?? 0}</span>
            </div>
          </div>
        </Card>

        {/* Sync Success Rate */}
        <Card className="p-5 border-slate-800/80 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Platform Sync Health</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <RefreshCw className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-100">{stats?.syncHealth?.successfulSyncs ?? stats?.successfulSynchronizations ?? 0}</div>
            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
              <span className="text-emerald-400 font-semibold">{stats?.syncHealth?.successfulSyncs ?? 0} OK</span>
              <span>•</span>
              <span className="text-rose-400 font-semibold">{stats?.syncHealth?.failedSyncs ?? 0} Err</span>
              <span>•</span>
              <span className="text-amber-400">{stats?.syncHealth?.pendingSyncs ?? 0} Pend</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Platform Coverage Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-200">Coding Platform Ecosystem</h2>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => navigate('/platforms')}
            className="text-brand-400 hover:text-brand-300"
          >
            Manage Platforms →
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* LeetCode */}
          <Card className="p-4 border-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-amber-500/10 text-amber-400 font-black text-xs flex items-center justify-center">
                  LC
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">LeetCode</div>
                  <div className="text-[10px] text-amber-400 font-semibold">Weight: 40%</div>
                </div>
              </div>
              <Badge variant="warning">
                {stats?.platformConnectedCounts?.leetcode ?? stats?.platforms?.connectedCounts?.leetcode ?? 0} linked
              </Badge>
            </div>
          </Card>

          {/* GFG */}
          <Card className="p-4 border-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-emerald-500/10 text-emerald-400 font-black text-xs flex items-center justify-center">
                  GFG
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">GeeksforGeeks</div>
                  <div className="text-[10px] text-emerald-400 font-semibold">Weight: 30%</div>
                </div>
              </div>
              <Badge variant="success">
                {stats?.platformConnectedCounts?.gfg ?? stats?.platforms?.connectedCounts?.gfg ?? 0} linked
              </Badge>
            </div>
          </Card>

          {/* HackerRank */}
          <Card className="p-4 border-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-emerald-500/10 text-emerald-400 font-black text-xs flex items-center justify-center">
                  HR
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">HackerRank</div>
                  <div className="text-[10px] text-emerald-400 font-semibold">Weight: 30%</div>
                </div>
              </div>
              <Badge variant="success">
                {stats?.platformConnectedCounts?.hackerrank ?? stats?.platforms?.connectedCounts?.hackerrank ?? 0} linked
              </Badge>
            </div>
          </Card>

          {/* Codeforces */}
          <Card className="p-4 border-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-sky-500/10 text-sky-400 font-black text-xs flex items-center justify-center">
                  CF
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">Codeforces</div>
                  <div className="text-[10px] text-slate-400">Statistics only</div>
                </div>
              </div>
              <Badge variant="secondary">
                {stats?.platformConnectedCounts?.codeforces ?? stats?.platforms?.connectedCounts?.codeforces ?? 0} linked
              </Badge>
            </div>
          </Card>

          {/* CodeChef */}
          <Card className="p-4 border-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-rose-500/10 text-rose-400 font-black text-xs flex items-center justify-center">
                  CC
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">CodeChef</div>
                  <div className="text-[10px] text-slate-400">Statistics only</div>
                </div>
              </div>
              <Badge variant="secondary">
                {stats?.platformConnectedCounts?.codechef ?? stats?.platforms?.connectedCounts?.codechef ?? 0} linked
              </Badge>
            </div>
          </Card>
        </div>
      </div>

      {/* Two Column Section: Department Breakdown + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Distribution */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Department Distribution"
            subtitle="Ranked student distribution across branches & academic years"
            action={
              <div className="flex flex-wrap items-center gap-2">
                {/* Branch Dropdown */}
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="text-xs bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                >
                  {BRANCH_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-300">
                      {opt.label}
                    </option>
                  ))}
                </select>

                {/* Year Dropdown */}
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="text-xs bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                >
                  {YEAR_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-300">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            }
          />
          <CardContent className="p-0">
            {(() => {
              const allStudentsList = stats?.allStudents || [];
              const filtered = allStudentsList.filter((student) => {
                if (!matchesBranch(student.department, selectedBranch)) return false;
                if (!matchesYear(student.year, selectedYear)) return false;
                return true;
              });

              return (
                <div>
                  <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span>
                      Showing <strong className="text-slate-200">{filtered.length}</strong>{' '}
                      {selectedBranch !== 'ALL' ? selectedBranch : 'all branch'} student{filtered.length === 1 ? '' : 's'}
                      {selectedYear !== 'ALL' ? ` (Year ${selectedYear})` : ''}
                    </span>
                    <span className="text-[11px] text-slate-500">Ordered by Overall Rank</span>
                  </div>

                  {filtered.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      No students found matching the selected branch and year filters.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800/60 max-h-[420px] overflow-y-auto">
                      {filtered.map((student, idx) => {
                        const branchPos = idx + 1;
                        const isTop3 = branchPos <= 3;
                        return (
                          <div
                            key={student.id}
                            onClick={() => {
                              const targetId = student.id || student.studentId;
                              if (targetId) navigate(`/students/${targetId}`);
                            }}
                            className="p-3.5 px-4 flex items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Position within selection */}
                              <div
                                className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center flex-shrink-0 border ${
                                  isTop3
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                    : 'bg-slate-900 border-slate-800 text-slate-400'
                                }`}
                              >
                                {branchPos}
                              </div>

                              {/* Student Info */}
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-200 group-hover:text-brand-300 transition-colors truncate">
                                  {student.name}
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono">{student.rollNumber || 'No Roll #'}</span>
                                  <span>•</span>
                                  <span className="text-slate-300 font-medium truncate max-w-[150px]">
                                    {normalizeBranch(student.department)}
                                  </span>
                                  <span>•</span>
                                  <span>Year {student.year || 4}</span>
                                </div>
                              </div>
                            </div>

                            {/* Rank and Score */}
                            <div className="text-right flex-shrink-0 flex items-center gap-3">
                              <div className="hidden sm:block text-right">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                                  Global
                                </div>
                                <div className="text-xs font-mono font-bold text-slate-300">
                                  #{student.rank ?? '—'}
                                </div>
                              </div>
                              <div className="text-right min-w-[65px]">
                                <div className="text-xs font-black font-mono text-brand-300">
                                  {typeof student.finalScore === 'number'
                                    ? student.finalScore.toFixed(2)
                                    : '0.00'}
                                </div>
                                <div className="text-[10px] text-slate-500">pts</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Recent Audit Trail */}
        <Card className="lg:col-span-1">
          <CardHeader
            title="Recent Administrative Actions"
            subtitle="Live audit trail of platform modifications"
            action={
              <Button
                variant="ghost"
                size="xs"
                onClick={() => navigate('/audit-logs')}
                className="text-brand-400 hover:text-brand-300"
              >
                View All →
              </Button>
            }
          />
          <CardContent className="p-0">
            {recentAudits.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No recent administrative actions recorded.</p>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {recentAudits.map((item) => (
                  <div key={item.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-3.5 h-3.5 text-brand-400" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-200">
                          {item.action?.replace(/_/g, ' ')}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Target: <span className="text-slate-300 font-medium">{item.target}</span> • By {item.adminName || item.adminEmail}
                        </div>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono flex-shrink-0">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
