import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminService } from '../services/adminService';
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
    if (!isBackground) setLoading(true);
    setError(null);
    try {
      const response = await adminService.getStudentById(studentId);
      if (response.success) {
        setStudent(response.student);
        setAuditLogs(response.auditLogs || []);
        setScoreAdjustments(response.scoreAdjustments || []);
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
      <ErrorState
        title="Student Not Found"
        message={error}
        onRetry={() => fetchStudentData()}
      />
    );
  }

  const platforms = student?.platforms || {};
  const stats = student?.platformStats || {};
  const scores = student?.scores || {};

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

      {/* Top Cards: Score & Rank Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Final Score Card */}
        <Card className="p-5 border-slate-800/80">
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
              Composite weighted score across 4 coding platforms.
            </p>
          </div>
        </Card>

        {/* Current Rank Card */}
        <Card className="p-5 border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">College Rank</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-amber-300">
              {student.rank ? `#${student.rank}` : 'Unranked'}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Deterministic college-wide leaderboard position.
            </p>
          </div>
        </Card>

        {/* Academic Details Card */}
        <Card className="p-5 border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Academic Standing</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 space-y-1 text-xs">
            <div className="text-slate-200 font-semibold truncate">{student.department || 'General'}</div>
            <div className="text-slate-400">Year {student.year || '—'} • {student.collegeId}</div>
            <div className="text-[11px] text-slate-500 font-mono">
              Last synced: {student.lastDataUpdatedAt ? new Date(student.lastDataUpdatedAt).toLocaleString() : 'Never'}
            </div>
          </div>
        </Card>
      </div>

      {/* Coding Platforms Grid (All 4 Platforms with live stats) */}
      <div>
        <h2 className="text-sm font-bold text-slate-200 mb-3">Linked Coding Platforms & Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* LeetCode */}
          <Card className="p-5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 font-black text-xs flex items-center justify-center">
                  LC
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">LeetCode</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {platforms.leetcode?.username ? `@${platforms.leetcode.username}` : 'Not Linked'}
                  </div>
                </div>
              </div>
              <StatusBadge status={platforms.leetcode?.status || 'NOT_CONNECTED'} />
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
              <span>Platform Score: <strong className="text-brand-300">{scores.leetcodeScore ?? 0}</strong></span>
            </div>
            {platforms.leetcode?.errorMessage && (
              <div className="mt-2 text-[10px] text-rose-400 bg-rose-950/40 p-2 rounded border border-rose-900">
                {platforms.leetcode.errorMessage}
              </div>
            )}
          </Card>

          {/* GeeksforGeeks */}
          <Card className="p-5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 font-black text-xs flex items-center justify-center">
                  GFG
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">GeeksforGeeks</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {platforms.gfg?.username ? `@${platforms.gfg.username}` : 'Not Linked'}
                  </div>
                </div>
              </div>
              <StatusBadge status={platforms.gfg?.status || 'NOT_CONNECTED'} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-medium">Coding Score</div>
                <div className="text-sm font-bold text-emerald-400">{stats.gfg?.rating ?? stats.gfg?.codingScore ?? '—'}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-medium">Problems Solved</div>
                <div className="text-sm font-bold text-slate-200">{stats.gfg?.totalSolved ?? '—'}</div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/60 pt-3">
              <span>Institution Rank: <strong className="text-slate-200">{stats.gfg?.institutionRank ?? '—'}</strong></span>
              <span>Platform Score: <strong className="text-brand-300">{scores.gfgScore ?? 0}</strong></span>
            </div>
            {platforms.gfg?.errorMessage && (
              <div className="mt-2 text-[10px] text-rose-400 bg-rose-950/40 p-2 rounded border border-rose-900">
                {platforms.gfg.errorMessage}
              </div>
            )}
          </Card>

          {/* Codeforces */}
          <Card className="p-5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 font-black text-xs flex items-center justify-center">
                  CF
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">Codeforces</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {platforms.codeforces?.username ? `@${platforms.codeforces.username}` : 'Not Linked'}
                  </div>
                </div>
              </div>
              <StatusBadge status={platforms.codeforces?.status || 'NOT_CONNECTED'} />
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
              <span>Platform Score: <strong className="text-brand-300">{scores.codeforcesScore ?? 0}</strong></span>
            </div>
            {platforms.codeforces?.errorMessage && (
              <div className="mt-2 text-[10px] text-rose-400 bg-rose-950/40 p-2 rounded border border-rose-900">
                {platforms.codeforces.errorMessage}
              </div>
            )}
          </Card>

          {/* CodeChef */}
          <Card className="p-5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 font-black text-xs flex items-center justify-center">
                  CC
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">CodeChef</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {platforms.codechef?.username ? `@${platforms.codechef.username}` : 'Not Linked'}
                  </div>
                </div>
              </div>
              <StatusBadge status={platforms.codechef?.status || 'NOT_CONNECTED'} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-medium">Stars Rating</div>
                <div className="text-sm font-bold text-rose-400">{stats.codechef?.stars ?? stats.codechef?.rating ?? '—'}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-medium">Global Rank</div>
                <div className="text-sm font-bold text-slate-200">{stats.codechef?.globalRank ?? '—'}</div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/60 pt-3">
              <span>Solved: <strong className="text-slate-200">{stats.codechef?.totalSolved ?? 0}</strong></span>
              <span>Platform Score: <strong className="text-brand-300">{scores.codechefScore ?? 0}</strong></span>
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
            <h4 className="text-xs font-bold text-slate-200">Coding Platform Links</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">LeetCode URL / Handle</label>
                <input
                  type="text"
                  value={editFormData.leetcodeUrl}
                  onChange={(e) => setEditFormData({ ...editFormData, leetcodeUrl: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">GeeksforGeeks URL / Handle</label>
                <input
                  type="text"
                  value={editFormData.gfgUrl}
                  onChange={(e) => setEditFormData({ ...editFormData, gfgUrl: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Codeforces URL / Handle</label>
                <input
                  type="text"
                  value={editFormData.codeforcesUrl}
                  onChange={(e) => setEditFormData({ ...editFormData, codeforcesUrl: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">CodeChef URL / Handle</label>
                <input
                  type="text"
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
              Save Changes
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
