import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../services/adminService';
import { subscribeToAdminUpdates } from '../services/supabase';
import { useNotifications } from '../context/NotificationContext';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import {
  Calculator,
  RefreshCw,
  Award,
  Search,
  CheckCircle2,
  FileSpreadsheet,
  AlertCircle,
  Plus,
  ExternalLink,
  ShieldAlert,
  Zap,
} from 'lucide-react';

export const Scores = () => {
  const navigate = useNavigate();
  const { notifySuccess, notifyError } = useNotifications();

  const [scoresData, setScoresData] = useState(null);
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recalculatingAll, setRecalculatingAll] = useState(false);
  const [recalculatingId, setRecalculatingId] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);

  // Adjustment Modal
  const [isAdjModalOpen, setIsAdjModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [adjDelta, setAdjDelta] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [adjSubmitting, setAdjSubmitting] = useState(false);

  const fetchScores = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      if (scoresData) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
    }
    setError(null);
    try {
      const [overviewRes, adjRes] = await Promise.all([
        adminService.getScoresOverview(),
        adminService.getScoreAdjustments(),
      ]);

      if (overviewRes && overviewRes.success) {
        setScoresData(overviewRes);
      }
      if (adjRes && adjRes.success) {
        setAdjustments(adjRes.adjustments || []);
      }
    } catch (err) {
      console.error('Failed to load scores data:', err);
      if (!isBackground) {
        setError(err.message || 'Failed to retrieve score datasets.');
        notifyError(err.message || 'Failed to refresh scores.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [scoresData, notifyError]);

  useEffect(() => {
    fetchScores();
  }, []);

  // Supabase Realtime updates subscription
  useEffect(() => {
    const unsubscribe = subscribeToAdminUpdates(() => {
      fetchScores(true);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [fetchScores]);

  const handleRecalculateAll = async () => {
    setRecalculatingAll(true);
    try {
      const res = await adminService.recalculateAllScores();
      if (res.success) {
        notifySuccess(res.message || 'All student scores recalculated successfully.');
        fetchScores(true);
      }
    } catch (err) {
      notifyError(err.response?.data?.message || err.message || 'Failed to recalculate scores.');
    } finally {
      setRecalculatingAll(false);
    }
  };

  const handleRecalculateSingle = async (studentId, studentName) => {
    setRecalculatingId(studentId);
    try {
      const res = await adminService.recalculateSingleScore(studentId);
      if (res.success) {
        notifySuccess(`Score updated for ${res.student?.name || studentName || 'student'}: ${res.student?.finalScore}`);
        fetchScores(true);
      }
    } catch (err) {
      notifyError(err.response?.data?.message || err.message || 'Failed to recalculate score.');
    } finally {
      setRecalculatingId(null);
    }
  };

  const openAdjustmentModal = (student) => {
    setSelectedStudent(student);
    setAdjDelta('');
    setAdjReason('');
    setIsAdjModalOpen(true);
  };

  const handleSaveAdjustment = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !adjReason.trim()) return;

    const deltaNum = parseFloat(adjDelta);
    if (isNaN(deltaNum)) {
      notifyError('Please enter a valid numeric adjustment delta.');
      return;
    }

    setAdjSubmitting(true);
    try {
      const res = await adminService.adjustStudentScore(selectedStudent.id, {
        adjustment: deltaNum,
        reason: adjReason.trim(),
      });
      if (res.success) {
        notifySuccess(res.message || 'Score adjustment applied successfully.');
        setIsAdjModalOpen(false);
        fetchScores(true);
      }
    } catch (err) {
      notifyError(err.response?.data?.message || err.message || 'Failed to adjust score.');
    } finally {
      setAdjSubmitting(false);
    }
  };

  const studentsList = scoresData?.students || scoresData?.scores || [];
  const filteredStudents = studentsList.filter((s) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      (s.name || '').toLowerCase().includes(q) ||
      (s.rollNumber || '').toLowerCase().includes(q)
    );
  });

  if (loading && !scoresData) {
    return <LoadingState message="Calculating composite scores and loading student records..." />;
  }

  if (error && !scoresData) {
    return <ErrorState message={error} onRetry={() => fetchScores(false)} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-brand-400" />
            <span>Scoring Engine & Audit Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Evaluate composite scoring formulas, review breakdown weights, and execute audited manual adjustments.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchScores(false)}
            loading={refreshing}
            icon={RefreshCw}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleRecalculateAll}
            loading={recalculatingAll}
            disabled={recalculatingAll}
            icon={Calculator}
          >
            {recalculatingAll ? 'Recalculating Scores...' : 'Recalculate All Scores'}
          </Button>
        </div>
      </div>

      {/* Formula & Weight Allocation Display Card */}
      <Card className="p-5 border-slate-800/90 bg-gradient-to-r from-slate-900 via-slate-900 to-brand-950/20">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-400"></span>
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Official College Scoring Formula (100% Total)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Composite Score = (LeetCode × 40%) + (GFG × 30%) + (HackerRank × 30%)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="warning">LeetCode 40%</Badge>
            <Badge variant="success">GFG 30%</Badge>
            <Badge variant="success">HackerRank 30%</Badge>
            <Badge variant="secondary">Codeforces 0% (Stats)</Badge>
            <Badge variant="secondary">CodeChef 0% (Stats)</Badge>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex flex-wrap gap-4">
          <span>• LeetCode: Easy (30%), Medium (40%), Hard (30%)</span>
          <span>• GFG: Easy (30%), Medium (40%), Hard (30%) • School & Basic (Stats)</span>
          <span>• Non-Scoring Platforms: Codeforces & CodeChef are tracked for statistics only</span>
          <span>• Deterministic Tie-Breaker: Total Combined Solved Problems, then Alphabetical</span>
        </div>
      </Card>

      {/* Search Bar */}
      <Card className="p-4 flex items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search student scores by name or roll..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
          />
        </div>
      </Card>

      {/* Student Scores Table */}
      <Card>
        <CardHeader
          title="Student Performance Scores"
          subtitle={`Showing ${filteredStudents.length} evaluated students`}
        />
        {filteredStudents.length === 0 ? (
          <EmptyState
            icon={Calculator}
            title={studentsList.length === 0 ? 'No evaluated students found' : 'No students match your search'}
            description={
              studentsList.length === 0
                ? 'Click "Recalculate All Scores" to evaluate scores from platform statistics.'
                : 'Try adjusting your search query to find students.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr>
                  <th className="table-th w-16">Rank</th>
                  <th className="table-th">Student Name & Roll</th>
                  <th className="table-th">Overall Score</th>
                  <th className="table-th">LeetCode (40%)</th>
                  <th className="table-th">GFG (30%)</th>
                  <th className="table-th">HackerRank (30%)</th>
                  <th className="table-th text-slate-400">Codeforces (Stats)</th>
                  <th className="table-th text-slate-400">CodeChef (Stats)</th>
                  <th className="table-th">Last Evaluated</th>
                  <th className="table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredStudents.map((s) => {
                  const isRecalc = recalculatingId === s.id;
                  const breakdown = s.scores?.breakdown || {};
                  const stats = s.platformStats || {};

                  return (
                    <tr
                      key={s.id}
                      onClick={() => s.id && navigate(`/students/${s.id}`)}
                      className="hover:bg-slate-800/30 transition-colors cursor-pointer group"
                    >
                      <td className="table-td font-black text-slate-100">
                        {s.rank ? `#${s.rank}` : '—'}
                      </td>
                      <td className="table-td">
                        <div className="font-bold text-slate-100 group-hover:text-brand-300 transition-colors">
                          {s.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {s.rollNumber || '—'} {s.department ? `• ${s.department}` : ''}
                        </div>
                      </td>
                      <td className="table-td">
                        <span className="font-black text-sm text-brand-300">
                          {typeof s.finalScore === 'number' ? s.finalScore.toFixed(2) : '0.00'}
                        </span>
                      </td>
                      <td className="table-td font-mono text-amber-400 font-medium">
                        {breakdown.leetcodeContribution !== undefined
                          ? breakdown.leetcodeContribution.toFixed(2)
                          : s.scores?.leetcodeScore !== undefined
                          ? (s.scores.leetcodeScore * 0.4).toFixed(2)
                          : '0.00'}
                      </td>
                      <td className="table-td font-mono text-emerald-400 font-medium">
                        {breakdown.gfgContribution !== undefined
                          ? breakdown.gfgContribution.toFixed(2)
                          : s.scores?.gfgScore !== undefined
                          ? (s.scores.gfgScore * 0.3).toFixed(2)
                          : '0.00'}
                      </td>
                      <td className="table-td font-mono text-emerald-400 font-medium">
                        {breakdown.hackerrankContribution !== undefined
                          ? breakdown.hackerrankContribution.toFixed(2)
                          : s.scores?.hackerrankScore !== undefined
                          ? (s.scores.hackerrankScore * 0.3).toFixed(2)
                          : '0.00'}
                      </td>
                      <td className="table-td font-mono text-slate-400">
                        {stats.codeforces?.totalSolved !== undefined && stats.codeforces?.totalSolved !== null
                          ? `${stats.codeforces.totalSolved} solved`
                          : '—'}
                      </td>
                      <td className="table-td font-mono text-slate-400">
                        {stats.codechef?.totalSolved !== undefined && stats.codechef?.totalSolved !== null
                          ? `${stats.codechef.totalSolved} solved`
                          : '—'}
                      </td>
                      <td className="table-td font-mono text-[11px] text-slate-400">
                        {s.lastDataUpdatedAt ? new Date(s.lastDataUpdatedAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td
                        className="table-td text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => openAdjustmentModal(s)}
                            className="text-amber-400 hover:text-amber-300"
                          >
                            Adjust
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => handleRecalculateSingle(s.id, s.name)}
                            loading={isRecalc}
                            disabled={isRecalc}
                            icon={RefreshCw}
                            className="text-brand-400 hover:text-brand-300"
                          >
                            Recalc
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Manual Score Adjustments Audit Table */}
      <Card>
        <CardHeader
          title="Manual Adjustment Audit Trail"
          subtitle="Complete record of manual score modifications and reasons"
        />
        <CardContent className="p-0">
          {adjustments.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">No manual score adjustments on record.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="table-th">Timestamp</th>
                    <th className="table-th">Student</th>
                    <th className="table-th">Adjustment Delta</th>
                    <th className="table-th">Score Shift</th>
                    <th className="table-th">Mandatory Reason</th>
                    <th className="table-th">Adjusted By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {adjustments.map((a, idx) => (
                    <tr key={a.id || idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="table-td font-mono text-[11px] text-slate-400">
                        {new Date(a.timestamp).toLocaleString()}
                      </td>
                      <td className="table-td font-semibold text-slate-100">
                        <div>{a.studentName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{a.rollNumber}</div>
                      </td>
                      <td className="table-td">
                        <span className={`font-bold ${a.adjustment >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {a.adjustment >= 0 ? '+' : ''}{a.adjustment}
                        </span>
                      </td>
                      <td className="table-td font-mono">
                        {a.previousScore} → <strong className="text-slate-100">{a.newScore}</strong>
                      </td>
                      <td className="table-td text-slate-300 max-w-sm xl:max-w-xl 2xl:max-w-none truncate" title={a.reason}>
                        {a.reason}
                      </td>
                      <td className="table-td font-mono text-[11px] text-slate-400">
                        {a.adminName || a.adminEmail}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Score Adjustment Modal */}
      <Modal
        isOpen={isAdjModalOpen}
        onClose={() => setIsAdjModalOpen(false)}
        title="Apply Manual Score Adjustment"
        subtitle={`Modifying score for ${selectedStudent?.name} (Current: ${selectedStudent?.finalScore ? Number(selectedStudent.finalScore).toFixed(2) : '0.00'})`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveAdjustment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Score Delta (+ or - points) <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              step="any"
              required
              placeholder="e.g. +15 or -5"
              value={adjDelta}
              onChange={(e) => setAdjDelta(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-brand-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Mandatory Audit Reason <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="State the justification (e.g. Verified college hackathon finalist points, certified external ICPC contest performance)"
              value={adjReason}
              onChange={(e) => setAdjReason(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setIsAdjModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={adjSubmitting} disabled={adjSubmitting}>
              Apply & Log Adjustment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Scores;
