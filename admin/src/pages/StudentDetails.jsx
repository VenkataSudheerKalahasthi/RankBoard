import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminService } from '../services/adminService';
import { subscribeToAdminUpdates } from '../services/supabase';
import { useNotifications } from '../context/NotificationContext';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge, StatusBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import {
  ArrowLeft,
  RefreshCw,
  Edit2,
  CheckCircle,
  XCircle,
  Trophy,
  Award,
  ExternalLink,
  Shield,
  Calendar,
  Layers,
  Calculator,
  AlertTriangle,
  Clock,
} from 'lucide-react';

export const StudentDetails = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { notifySuccess, notifyError } = useNotifications();

  const [student, setStudent] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [scoreAdjustments, setScoreAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Score Adjustment Modal State
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [adjustmentValue, setAdjustmentValue] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustmentSubmitting, setAdjustmentSubmitting] = useState(false);

  const fetchStudentData = useCallback(async (isBackground = false) => {
    if (!studentId || studentId === 'undefined') {
      if (!isBackground) {
        setError('Student ID is missing.');
        setLoading(false);
      }
      return;
    }
    if (!isBackground) setLoading(true);
    setError(null);
    try {
      const response = await adminService.getStudentById(studentId);
      if (response.success && response.student) {
        setStudent(response.student);
        setAuditLogs(response.auditHistory || response.auditLogs || []);
        setScoreAdjustments(response.scoreAdjustments || []);
      } else {
        setError(response.message || 'Student not found.');
      }
    } catch (err) {
      console.error('Failed to load student details:', err);
      if (!isBackground) {
        setError(err.message || 'Failed to retrieve student details.');
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  // Subscribe to Supabase Realtime for automatic student updates
  useEffect(() => {
    if (!studentId || studentId === 'undefined') return;
    const unsubscribe = subscribeToAdminUpdates((table, payload) => {
      const changedId = payload?.new?.id || payload?.new?.student_id;
      if (!changedId || changedId === studentId) {
        fetchStudentData(true);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [studentId, fetchStudentData]);

  const handleRefreshSync = async () => {
    setSyncing(true);
    try {
      const res = await adminService.syncStudent(studentId);
      if (res.success) {
        notifySuccess('Coding platform statistics synchronized successfully.');
        fetchStudentData(true);
      }
    } catch (err) {
      notifyError(err.message || 'Failed to refresh student statistics.');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleStatus = async () => {
    const nextStatus = student.accountStatus === 'DISABLED' ? 'ACTIVE' : 'DISABLED';
    try {
      const res = await adminService.toggleStudentStatus(studentId, nextStatus);
      if (res.success) {
        notifySuccess(`Student status set to ${nextStatus}.`);
        fetchStudentData(true);
      }
    } catch (err) {
      notifyError(err.message || 'Failed to change student status.');
    }
  };

  const openEditModal = () => {
    setEditFormData({
      name: student.name || '',
      email: student.email || '',
      rollNumber: student.rollNumber || '',
      department: student.department || '',
      year: student.year || 3,
      accountStatus: student.accountStatus || 'ACTIVE',
      leetcodeUrl: student.platforms?.leetcode?.profileUrl || student.platforms?.leetcode?.username || '',
      gfgUrl: student.platforms?.gfg?.profileUrl || student.platforms?.gfg?.username || '',
      codeforcesUrl: student.platforms?.codeforces?.profileUrl || student.platforms?.codeforces?.username || '',
      codechefUrl: student.platforms?.codechef?.profileUrl || student.platforms?.codechef?.username || '',
      hackerrankUrl: student.platforms?.hackerrank?.profileUrl || student.platforms?.hackerrank?.username || '',
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditSubmitting(true);
    try {
      const res = await adminService.updateStudent(studentId, editFormData);
      if (res.success) {
        notifySuccess('Student profile updated successfully.');
        setIsEditModalOpen(false);
        fetchStudentData(true);
      }
    } catch (err) {
      notifyError(err.message || 'Failed to update student profile.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleScoreAdjustment = async (e) => {
    e.preventDefault();
    if (!adjustmentReason.trim()) {
      notifyError('Audit reason is required for manual score adjustment.');
      return;
    }
    setAdjustmentSubmitting(true);
    try {
      const res = await adminService.adjustStudentScore(studentId, {
        adjustment: parseFloat(adjustmentValue),
        reason: adjustmentReason.trim(),
      });
      if (res.success) {
        notifySuccess(res.message || 'Score adjusted successfully.');
        setIsScoreModalOpen(false);
        setAdjustmentValue('');
        setAdjustmentReason('');
        fetchStudentData(true);
      }
    } catch (err) {
      notifyError(err.message || 'Failed to adjust score.');
    } finally {
      setAdjustmentSubmitting(false);
    }
  };

  if (loading && !student) {
    return <LoadingState message="Loading student profile..." />;
  }

  if (error && !student) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/students')}
          icon={ArrowLeft}
          className="text-slate-400 hover:text-slate-100"
        >
          Back to Students
        </Button>
        <ErrorState
          title={error === 'Student ID is missing.' ? 'Student ID Missing' : 'Student Not Found'}
          message={error}
          onRetry={studentId && studentId !== 'undefined' ? () => fetchStudentData() : undefined}
        />
      </div>
    );
  }

  const platforms = student?.platforms || {};
  const stats = student?.platformStats || {};
  const scores = student?.scores || {};

  // Compute total problems solved across platforms
  const totalProblemsSolved =
    (stats.leetcode?.totalSolved || 0) +
    (stats.gfg?.totalSolved || 0) +
    (stats.hackerrank?.totalSolved || 0) +
    (stats.codeforces?.totalSolved || 0) +
    (stats.codechef?.totalSolved || 0);

  // Compute platform linked count
  const linkedPlatformsCount = ['leetcode', 'gfg', 'hackerrank', 'codeforces', 'codechef'].filter(
    (p) => platforms[p]?.username || platforms[p]?.profileUrl
  ).length;

  const getProfileUrl = (platformKey, platformData) => {
    if (platformData?.profileUrl && platformData.profileUrl.startsWith('http')) {
      return platformData.profileUrl;
    }
    if (!platformData?.username) return null;
    switch (platformKey) {
      case 'leetcode':
        return `https://leetcode.com/u/${encodeURIComponent(platformData.username)}/`;
      case 'gfg':
        return `https://www.geeksforgeeks.org/user/${encodeURIComponent(platformData.username)}/`;
      case 'hackerrank':
        return `https://www.hackerrank.com/profile/${encodeURIComponent(platformData.username)}`;
      case 'codeforces':
        return `https://codeforces.com/profile/${encodeURIComponent(platformData.username)}`;
      case 'codechef':
        return `https://www.codechef.com/users/${encodeURIComponent(platformData.username)}`;
      default:
        return null;
    }
  };

  const lcUrl = getProfileUrl('leetcode', platforms.leetcode);
  const gfgUrl = getProfileUrl('gfg', platforms.gfg);
  const hrUrl = getProfileUrl('hackerrank', platforms.hackerrank);
  const cfUrl = getProfileUrl('codeforces', platforms.codeforces);
  const ccUrl = getProfileUrl('codechef', platforms.codechef);

  return (
    <div className="space-y-6">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/students')}
            icon={ArrowLeft}
            className="text-slate-400 hover:text-slate-100"
          >
            Back to Students
          </Button>
          <div>
            <h1 className="text-xl font-black text-slate-100 flex items-center gap-2">
              <span>{student.name}</span>
              <StatusBadge status={student.accountStatus || 'ACTIVE'} />
            </h1>
            <div className="text-xs text-slate-400 font-mono mt-0.5">
              Roll #{student.rollNumber || '—'} • {student.email}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleStatus}
            className={student.accountStatus === 'DISABLED' ? 'text-emerald-400' : 'text-rose-400'}
          >
            {student.accountStatus === 'DISABLED' ? 'Enable Student' : 'Disable Student'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={openEditModal}
            icon={Edit2}
          >
            Edit Profile
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsScoreModalOpen(true)}
            icon={Calculator}
          >
            Adjust Score
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleRefreshSync}
            loading={syncing}
            icon={RefreshCw}
          >
            Refresh Statistics
          </Button>
        </div>
      </div>

      {/* Top Cards: Score & Rank & Performance Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Score Card */}
        <Card className="p-5 border-slate-800/80 bg-gradient-to-b from-slate-900 to-slate-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Overall Score</span>
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-brand-300">
              {typeof student.finalScore === 'number' ? student.finalScore.toFixed(2) : '0.00'}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              LeetCode 40% + GFG 30% + HackerRank 30%
            </p>
          </div>
        </Card>

        {/* Global Rank Card */}
        <Card className="p-5 border-slate-800/80 bg-gradient-to-b from-slate-900 to-slate-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Global Rank</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-amber-300">
              {student.rank ? `#${student.rank}` : 'Unranked'}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Official RankBoard ranking position
            </p>
          </div>
        </Card>

        {/* Total Solved Problems Card */}
        <Card className="p-5 border-slate-800/80 bg-gradient-to-b from-slate-900 to-slate-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Solved</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-emerald-400">
              {totalProblemsSolved}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Problems solved across all 5 platforms
            </p>
          </div>
        </Card>

        {/* Academic Details & Platform Coverage Card */}
        <Card className="p-5 border-slate-800/80 bg-gradient-to-b from-slate-900 to-slate-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Department & Year</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 space-y-1 text-xs">
            <div className="text-slate-200 font-semibold truncate">{student.department || 'General'}</div>
            <div className="text-slate-400">Year {student.year || '—'} • {linkedPlatformsCount} of 5 Platforms Linked</div>
            <div className="text-[11px] text-slate-500 font-mono">
              Last synced: {student.lastDataUpdatedAt ? new Date(student.lastDataUpdatedAt).toLocaleString() : 'Never'}
            </div>
          </div>
        </Card>
      </div>

      {/* Achievement Showcase Card */}
      <Card className="p-4 border-slate-800/80 bg-[#0d1322]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {student.profilePhoto ? (
              <img
                src={student.profilePhoto}
                alt={student.name}
                className="w-10 h-10 rounded-xl object-cover border border-slate-700 bg-slate-800"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                {(student.name || 'ST').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Student Achievement Showcase</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  student.showcaseSettings?.isPublic !== false
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                    : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                }`}>
                  {student.showcaseSettings?.isPublic !== false ? 'PUBLIC SHOWCASE' : 'PRIVATE SHOWCASE'}
                </span>
                {student.profilePhoto && (
                  <span className="bg-brand-950 text-brand-300 px-2 py-0.5 rounded text-[10px] font-bold border border-brand-800/60">
                    CLOUDINARY PHOTO
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                Showcase Path: <span className="text-slate-300">/showcase/{student.id}</span>
              </div>
            </div>
          </div>

          <a
            href={`http://localhost:5173/showcase/${encodeURIComponent(student.id)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-brand-300 flex items-center gap-1.5 transition"
          >
            Open Public Showcase <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </Card>

      {/* Coding Platforms Grid (All 5 Platforms with live stats) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-200">Coding Platforms & Live Statistics</h2>
          <span className="text-xs text-slate-400 font-mono">
            {linkedPlatformsCount} of 5 Connected
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* LeetCode */}
          <Card className="p-5 border-slate-800/80">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 font-black text-xs flex items-center justify-center">
                  LC
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-200">LeetCode</span>
                    <span className="text-[10px] font-semibold text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded">40%</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {platforms.leetcode?.username ? `@${platforms.leetcode.username}` : 'Not Linked'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={platforms.leetcode?.status || (platforms.leetcode?.username ? 'PENDING' : 'NOT_CONNECTED')} />
                {lcUrl ? (
                  <a
                    href={lcUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 transition"
                    title="View LeetCode Profile"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span className="text-[10px] text-slate-500 font-mono">Not Linked</span>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-medium">Easy</div>
                <div className="text-sm font-bold text-emerald-400">{stats.leetcode?.easySolved ?? '—'}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-medium">Medium</div>
                <div className="text-sm font-bold text-amber-400">{stats.leetcode?.mediumSolved ?? '—'}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-medium">Hard</div>
                <div className="text-sm font-bold text-rose-400">{stats.leetcode?.hardSolved ?? '—'}</div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/60 pt-3">
              <span>Total Solved: <strong className="text-slate-200">{stats.leetcode?.totalSolved ?? 0}</strong></span>
              <span>Platform Score: <strong className="text-brand-300">{typeof scores.leetcodeScore === 'number' ? scores.leetcodeScore.toFixed(1) : (scores.leetcodeScore ?? 0)}</strong></span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Last Sync: {platforms.leetcode?.lastFetchedAt ? new Date(platforms.leetcode.lastFetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
              {lcUrl && (
                <a href={lcUrl} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline flex items-center gap-1">
                  View Profile <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            {platforms.leetcode?.errorMessage && (
              <div className="mt-2 text-[10px] text-rose-400 bg-rose-950/40 p-2 rounded border border-rose-900">
                {platforms.leetcode.errorMessage}
              </div>
            )}
          </Card>

          {/* GeeksforGeeks */}
          <Card className="p-5 border-slate-800/80">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 font-black text-xs flex items-center justify-center">
                  GFG
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-200">GeeksforGeeks</span>
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded">30%</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {platforms.gfg?.username ? `@${platforms.gfg.username}` : 'Not Linked'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={platforms.gfg?.status || (platforms.gfg?.username ? 'PENDING' : 'NOT_CONNECTED')} />
                {gfgUrl ? (
                  <a
                    href={gfgUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 transition"
                    title="View GFG Profile"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span className="text-[10px] text-slate-500 font-mono">Not Linked</span>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-medium">Coding Score</div>
                <div className="text-sm font-bold text-emerald-400">{stats.gfg?.rating ?? stats.gfg?.codingScore ?? '—'}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-medium">Total Solved (Stats)</div>
                <div className="text-sm font-bold text-slate-200">{stats.gfg?.totalSolved ?? '—'}</div>
              </div>
            </div>

            {/* 5-Level Category Breakdown */}
            <div className="mt-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 font-medium mb-1.5 flex items-center justify-between">
                <span>Difficulty Breakdown</span>
                <span className="text-[9px] text-slate-500">Scoring: Easy (30%) • Med (40%) • Hard (30%)</span>
              </div>
              <div className="grid grid-cols-5 gap-1 text-center">
                <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                  <div className="text-[9px] text-slate-400">School</div>
                  <div className="text-xs font-bold text-slate-300 font-mono">{stats.gfg?.schoolSolved ?? 0}</div>
                </div>
                <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                  <div className="text-[9px] text-slate-400">Basic</div>
                  <div className="text-xs font-bold text-slate-300 font-mono">{stats.gfg?.basicSolved ?? 0}</div>
                </div>
                <div className="bg-slate-900/80 p-1.5 rounded border border-emerald-900/40">
                  <div className="text-[9px] text-emerald-400 font-semibold">Easy</div>
                  <div className="text-xs font-bold text-emerald-300 font-mono">{stats.gfg?.easySolved ?? 0}</div>
                </div>
                <div className="bg-slate-900/80 p-1.5 rounded border border-amber-900/40">
                  <div className="text-[9px] text-amber-400 font-semibold">Medium</div>
                  <div className="text-xs font-bold text-amber-300 font-mono">{stats.gfg?.mediumSolved ?? 0}</div>
                </div>
                <div className="bg-slate-900/80 p-1.5 rounded border border-rose-900/40">
                  <div className="text-[9px] text-rose-400 font-semibold">Hard</div>
                  <div className="text-xs font-bold text-rose-300 font-mono">{stats.gfg?.hardSolved ?? 0}</div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/60 pt-3">
              <span>Institution Rank: <strong className="text-slate-200">{stats.gfg?.institutionRank ?? '—'}</strong></span>
              <span>Platform Score: <strong className="text-brand-300">{typeof scores.gfgScore === 'number' ? scores.gfgScore.toFixed(1) : (scores.gfgScore ?? 0)}</strong></span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Last Sync: {platforms.gfg?.lastFetchedAt ? new Date(platforms.gfg.lastFetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
              {gfgUrl && (
                <a href={gfgUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline flex items-center gap-1">
                  View Profile <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            {platforms.gfg?.errorMessage && (
              <div className="mt-2 text-[10px] text-rose-400 bg-rose-950/40 p-2 rounded border border-rose-900">
                {platforms.gfg.errorMessage}
              </div>
            )}
          </Card>

          {/* HackerRank */}
          <Card className="p-5 border-slate-800/80">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 font-black text-xs flex items-center justify-center">
                  HR
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-200">HackerRank</span>
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded">30%</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {platforms.hackerrank?.username ? `@${platforms.hackerrank.username}` : 'Not Linked'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={platforms.hackerrank?.status || (platforms.hackerrank?.username ? 'PENDING' : 'NOT_CONNECTED')} />
                {hrUrl ? (
                  <a
                    href={hrUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 transition"
                    title="View HackerRank Profile"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span className="text-[10px] text-slate-500 font-mono">Not Linked</span>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-medium">Badges / Stars</div>
                <div className="text-sm font-bold text-emerald-400">{stats.hackerrank?.stars ? `${stats.hackerrank.stars} ★` : (stats.hackerrank?.badgesCount ? `${stats.hackerrank.badgesCount} Badges` : '—')}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-medium">Certificates</div>
                <div className="text-sm font-bold text-slate-200">{stats.hackerrank?.certificatesCount ?? '—'}</div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/60 pt-3">
              <span>Solved: <strong className="text-slate-200">{stats.hackerrank?.totalSolved ?? 0}</strong></span>
              <span>Platform Score: <strong className="text-brand-300">{typeof scores.hackerrankScore === 'number' ? scores.hackerrankScore.toFixed(1) : (scores.hackerrankScore ?? 0)}</strong></span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Last Sync: {platforms.hackerrank?.lastFetchedAt ? new Date(platforms.hackerrank.lastFetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
              {hrUrl && (
                <a href={hrUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline flex items-center gap-1">
                  View Profile <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            {platforms.hackerrank?.errorMessage && (
              <div className="mt-2 text-[10px] text-rose-400 bg-rose-950/40 p-2 rounded border border-rose-900">
                {platforms.hackerrank.errorMessage}
              </div>
            )}
          </Card>

          {/* Codeforces */}
          <Card className="p-5 border-slate-800/80">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 font-black text-xs flex items-center justify-center">
                  CF
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-200">Codeforces</span>
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">Stats Only</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {platforms.codeforces?.username ? `@${platforms.codeforces.username}` : 'Not Linked'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={platforms.codeforces?.status || (platforms.codeforces?.username ? 'PENDING' : 'NOT_CONNECTED')} />
                {cfUrl ? (
                  <a
                    href={cfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-sky-400 transition"
                    title="View Codeforces Profile"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span className="text-[10px] text-slate-500 font-mono">Not Linked</span>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-medium">Contest Rating</div>
                <div className="text-sm font-bold text-sky-400">{stats.codeforces?.rating ?? '—'}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-medium">Rank Tier</div>
                <div className="text-sm font-bold text-slate-200 capitalize">{stats.codeforces?.rankTier ?? '—'}</div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/60 pt-3">
              <span>Solved: <strong className="text-slate-200">{stats.codeforces?.totalSolved ?? 0}</strong></span>
              <span className="text-slate-500">0% Weight (Statistics Only)</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Last Sync: {platforms.codeforces?.lastFetchedAt ? new Date(platforms.codeforces.lastFetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
              {cfUrl && (
                <a href={cfUrl} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline flex items-center gap-1">
                  View Profile <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            {platforms.codeforces?.errorMessage && (
              <div className="mt-2 text-[10px] text-rose-400 bg-rose-950/40 p-2 rounded border border-rose-900">
                {platforms.codeforces.errorMessage}
              </div>
            )}
          </Card>

          {/* CodeChef */}
          <Card className="p-5 border-slate-800/80">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 font-black text-xs flex items-center justify-center">
                  CC
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-200">CodeChef</span>
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">Stats Only</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {platforms.codechef?.username ? `@${platforms.codechef.username}` : 'Not Linked'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={platforms.codechef?.status || (platforms.codechef?.username ? 'PENDING' : 'NOT_CONNECTED')} />
                {ccUrl ? (
                  <a
                    href={ccUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-400 transition"
                    title="View CodeChef Profile"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <span className="text-[10px] text-slate-500 font-mono">Not Linked</span>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-medium">Stars Rating</div>
                <div className="text-sm font-bold text-rose-400">{stats.codechef?.stars ? `${stats.codechef.stars} ★` : (stats.codechef?.rating ?? '—')}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-medium">Global Rank</div>
                <div className="text-sm font-bold text-slate-200">{stats.codechef?.globalRank ?? '—'}</div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/60 pt-3">
              <span>Solved: <strong className="text-slate-200">{stats.codechef?.totalSolved ?? 0}</strong></span>
              <span className="text-slate-500">0% Weight (Statistics Only)</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Last Sync: {platforms.codechef?.lastFetchedAt ? new Date(platforms.codechef.lastFetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
              {ccUrl && (
                <a href={ccUrl} target="_blank" rel="noopener noreferrer" className="text-rose-400 hover:underline flex items-center gap-1">
                  View Profile <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            {platforms.codechef?.errorMessage && (
              <div className="mt-2 text-[10px] text-rose-400 bg-rose-950/40 p-2 rounded border border-rose-900">
                {platforms.codechef.errorMessage}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Score Adjustments & Audit Trail */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Score Adjustments */}
        <Card>
          <CardHeader
            title="Manual Score Adjustments"
            subtitle="Audited adjustments applied by administrators"
          />
          <CardContent className="p-0">
            {scoreAdjustments.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No manual adjustments recorded for this student.</p>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {scoreAdjustments.map((adj, idx) => (
                  <div key={adj.id || idx} className="p-3.5 text-xs space-y-1">
                    <div className="flex justify-between font-semibold text-slate-200">
                      <span>Adjustment: <span className={adj.adjustment >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{adj.adjustment >= 0 ? '+' : ''}{adj.adjustment}</span></span>
                      <span className="font-mono text-slate-400 text-[11px]">{new Date(adj.timestamp).toLocaleDateString()}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Previous: {adj.previousScore} → New: <span className="text-slate-200 font-bold">{adj.newScore}</span>
                    </div>
                    <div className="text-[11px] text-slate-300 bg-slate-950/60 p-1.5 rounded border border-slate-800/80">
                      Reason: {adj.reason}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Audit Log for Student */}
        <Card>
          <CardHeader
            title="Modification History"
            subtitle="Actions taken regarding this student"
          />
          <CardContent className="p-0">
            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No audit records logged for this student.</p>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3.5 text-xs flex justify-between items-center gap-2">
                    <div>
                      <div className="font-semibold text-slate-200">{log.action?.replace(/_/g, ' ')}</div>
                      <div className="text-[11px] text-slate-400">By {log.adminName || log.adminEmail}</div>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {new Date(log.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Student Information"
        subtitle="Update profile metadata and platform handles."
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Roll Number</label>
              <input
                type="text"
                value={editFormData.rollNumber}
                onChange={(e) => setEditFormData({ ...editFormData, rollNumber: e.target.value })}
                className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Department</label>
              <input
                type="text"
                value={editFormData.department}
                onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Academic Year</label>
              <select
                value={editFormData.year}
                onChange={(e) => setEditFormData({ ...editFormData, year: parseInt(e.target.value, 10) })}
                className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-brand-500"
              >
                <option value={1}>1st Year</option>
                <option value={2}>2nd Year</option>
                <option value={3}>3rd Year</option>
                <option value={4}>4th Year</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-200">Coding Platform Links</h4>
              <span className="text-[10px] text-amber-400 font-semibold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                Formula: LC 40% + GFG 30% + HackerRank 30%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-amber-300 mb-1">LeetCode URL (40% Weight)</label>
                <input
                  type="text"
                  placeholder="https://leetcode.com/u/username"
                  value={editFormData.leetcodeUrl}
                  onChange={(e) => setEditFormData({ ...editFormData, leetcodeUrl: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-emerald-300 mb-1">GeeksforGeeks URL (30% Weight)</label>
                <input
                  type="text"
                  placeholder="https://www.geeksforgeeks.org/user/username/"
                  value={editFormData.gfgUrl}
                  onChange={(e) => setEditFormData({ ...editFormData, gfgUrl: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                />
              </div>

              <div className="sm:col-span-2 p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40">
                <label className="block text-[11px] font-bold text-emerald-300 mb-1 flex items-center justify-between">
                  <span>HackerRank URL (30% Weight)</span>
                  {editFormData.hackerrankUrl ? (
                    <span className="text-emerald-400 text-[10px] font-bold">✓ Added</span>
                  ) : (
                    <span className="text-amber-400 text-[10px] font-bold">⚠️ Missing / Not Added</span>
                  )}
                </label>
                <input
                  type="text"
                  placeholder="https://www.hackerrank.com/profile/username"
                  value={editFormData.hackerrankUrl}
                  onChange={(e) => setEditFormData({ ...editFormData, hackerrankUrl: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-950 border border-emerald-700/60 rounded-lg text-slate-100 placeholder-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Codeforces URL (Stats Only)</label>
                <input
                  type="text"
                  placeholder="https://codeforces.com/profile/handle"
                  value={editFormData.codeforcesUrl}
                  onChange={(e) => setEditFormData({ ...editFormData, codeforcesUrl: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">CodeChef URL (Stats Only)</label>
                <input
                  type="text"
                  placeholder="https://www.codechef.com/users/handle"
                  value={editFormData.codechefUrl}
                  onChange={(e) => setEditFormData({ ...editFormData, codechefUrl: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={editSubmitting}>
              Save & Sync Platform Score
            </Button>
          </div>
        </form>
      </Modal>

      {/* Manual Score Adjustment Modal */}
      <Modal
        isOpen={isScoreModalOpen}
        onClose={() => setIsScoreModalOpen(false)}
        title="Manual Score Adjustment"
        subtitle="Apply a verified score modification with a mandatory audit reason."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleScoreAdjustment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Current Score: <span className="text-brand-300 font-bold">{student.finalScore || 0}</span>
            </label>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Adjustment Delta (+ or - points) <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              step="any"
              required
              placeholder="e.g. +10.5 or -5.0"
              value={adjustmentValue}
              onChange={(e) => setAdjustmentValue(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Mandatory Audit Reason <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="Provide reason (e.g. Verified college internal contest bonus, verified offline hackathon score)"
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setIsScoreModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={adjustmentSubmitting}>
              Confirm Adjustment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StudentDetails;
