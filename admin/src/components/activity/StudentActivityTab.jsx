import React, { useState, useEffect, useCallback } from 'react';
import { adminService } from '../../services/adminService';
import { Card, CardHeader, CardContent } from '../common/Card';
import { Button } from '../common/Button';
import { LoadingState } from '../common/LoadingState';
import { EmptyState } from '../common/EmptyState';
import {
  Activity,
  Calendar,
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Info,
  RefreshCw,
  TrendingUp,
  Award,
  Layers,
  ShieldCheck,
  Camera,
} from 'lucide-react';

export const StudentActivityTab = ({ student, studentId, notifySuccess, notifyError }) => {
  const [period, setPeriod] = useState('7d'); // 'today' | '7d' | '30d' | 'custom'
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [activityReport, setActivityReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [takingSnapshot, setTakingSnapshot] = useState(false);

  const fetchActivity = useCallback(async (isBackground = false) => {
    if (!studentId) return;
    if (!isBackground) setLoading(true);
    try {
      const res = await adminService.getStudentActivity(studentId, {
        period,
        startDate: period === 'custom' ? customStartDate : undefined,
        endDate: period === 'custom' ? customEndDate : undefined,
      });
      if (res && res.success) {
        setActivityReport(res.data);
      }
    } catch (err) {
      console.error('Failed to load student activity:', err);
      if (!isBackground && notifyError) {
        notifyError(err.message || 'Failed to load activity report.');
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [studentId, period, customStartDate, customEndDate, notifyError]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const handleTakeSnapshot = async () => {
    setTakingSnapshot(true);
    try {
      const res = await adminService.recordStudentSnapshot(studentId);
      if (res.success) {
        if (notifySuccess) notifySuccess(res.message || 'Activity snapshot recorded successfully.');
        fetchActivity(true);
      }
    } catch (err) {
      if (notifyError) notifyError(err.message || 'Failed to record snapshot.');
    } finally {
      setTakingSnapshot(false);
    }
  };

  const platforms = activityReport?.platforms || {};
  const lc = platforms.leetcode || {};
  const gfg = platforms.gfg || {};
  const hr = platforms.hackerrank || {};
  const cf = platforms.codeforces || {};
  const cc = platforms.codechef || {};

  return (
    <div className="space-y-6">
      {/* Top Header & Date Range Controls */}
      <Card className="p-4 bg-slate-900/80 border-slate-800">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-brand-400" />
                <span>Historical Problem-Solving Activity</span>
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-950/80 text-brand-300 border border-brand-800/80">
                Asia/Kolkata (IST)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Differences calculated from historical snapshots. Lifetime cumulative counts are never presented as period solves.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Period Buttons */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 overflow-x-auto">
              <button
                onClick={() => setPeriod('today')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  period === 'today' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setPeriod('2d')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  period === '2d' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Last 2 Days
              </button>
              <button
                onClick={() => setPeriod('7d')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  period === '7d' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setPeriod('30d')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  period === '30d' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Last 30 Days
              </button>
              <button
                onClick={() => setPeriod('month')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  period === 'month' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => setPeriod('custom')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  period === 'custom' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Custom Range
              </button>
            </div>

            {/* Custom Date Pickers */}
            {period === 'custom' && (
              <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-xs text-slate-300">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-transparent border-0 text-xs text-slate-200 focus:outline-none"
                />
                <span className="text-slate-500">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-transparent border-0 text-xs text-slate-200 focus:outline-none"
                />
              </div>
            )}

            {/* Take Snapshot Button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleTakeSnapshot}
              loading={takingSnapshot}
              icon={Camera}
              title="Record current live statistics as an activity snapshot anchor"
            >
              Take Snapshot Now
            </Button>
          </div>
        </div>
      </Card>

      {/* External Limitation Disclaimer */}
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs flex items-start gap-3">
        <Info className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
        <p className="text-slate-400 leading-relaxed">
          <strong className="text-slate-200">Investigation Note:</strong> Activity counts reflect verified problem solves recorded across student profiles. RankBoard does not have access to external browser keystrokes or copy-paste events on external platforms.
        </p>
      </div>

      {loading ? (
        <LoadingState message="Aggregating period problem-solving activity from historical records..." />
      ) : !activityReport?.hasHistoricalData && activityReport?.totalNewSolvesAllPlatforms === 0 ? (
        <Card className="p-8 text-center bg-slate-900/60 border-slate-800 space-y-3">
          <Clock className="w-8 h-8 text-amber-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-200">Historical activity data is not available yet</h3>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            Historical snapshots are collected prospectively on each synchronization run. Click "Take Snapshot Now" or run a synchronization to establish this student's initial historical anchor.
          </p>
          <div className="pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleTakeSnapshot}
              loading={takingSnapshot}
              icon={Camera}
            >
              Take Initial Activity Snapshot
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Summary Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 bg-slate-900 border-slate-800">
              <span className="text-xs text-slate-400">Total Verified Solves in Period</span>
              <div className="text-3xl font-black text-emerald-400 mt-1 font-mono">
                +{activityReport.totalNewSolvesAllPlatforms || 0}
              </div>
              <span className="text-[11px] text-slate-500">Across all connected platforms</span>
            </Card>

            <Card className="p-4 bg-slate-900 border-slate-800">
              <span className="text-xs text-slate-400">Scored Solves (LC + GFG + HR)</span>
              <div className="text-3xl font-black text-brand-300 mt-1 font-mono">
                +{activityReport.scoredNewSolves || 0}
              </div>
              <span className="text-[11px] text-slate-500">Solves affecting RankBoard score</span>
            </Card>

            <Card className="p-4 bg-slate-900 border-slate-800">
              <span className="text-xs text-slate-400">Historical Baseline Daily Rate</span>
              <div className="text-3xl font-black text-amber-400 mt-1 font-mono">
                {activityReport.historicalDailyAverage !== null ? `${activityReport.historicalDailyAverage}/day` : 'Establishing'}
              </div>
              <span className="text-[11px] text-slate-500">14-day established baseline average</span>
            </Card>
          </div>

          {/* Detailed Platform Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 1. LEETCODE */}
            <Card className="p-5 border-slate-800 bg-slate-900 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 font-black text-xs flex items-center justify-center">
                    LC
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-200">LeetCode</span>
                    <span className="text-[10px] text-amber-400 font-semibold bg-amber-950/60 px-1.5 py-0.5 rounded ml-1.5 border border-amber-900/60">
                      40% Scored
                    </span>
                  </div>
                </div>
                {lc.profileUrl && (
                  <a href={lc.profileUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-amber-400">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Period New Solves</span>
                <div className="text-2xl font-black text-amber-300 font-mono mt-0.5">
                  +{lc.newSolves ?? 0}
                </div>
                <span className="text-[10px] text-slate-500">Lifetime Total: {lc.cumulativeSolved ?? 0}</span>
              </div>

              {/* LeetCode Difficulty Breakdown */}
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-medium block mb-2">Verified Difficulty Delta</span>
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="bg-slate-900 p-1.5 rounded border border-emerald-900/40">
                    <span className="text-[9px] text-emerald-400 block">Easy</span>
                    <span className="text-xs font-bold text-emerald-300 font-mono">+{lc.easyNew ?? 0}</span>
                  </div>
                  <div className="bg-slate-900 p-1.5 rounded border border-amber-900/40">
                    <span className="text-[9px] text-amber-400 block">Medium</span>
                    <span className="text-xs font-bold text-amber-300 font-mono">+{lc.mediumNew ?? 0}</span>
                  </div>
                  <div className="bg-slate-900 p-1.5 rounded border border-rose-900/40">
                    <span className="text-[9px] text-rose-400 block">Hard</span>
                    <span className="text-xs font-bold text-rose-300 font-mono">+{lc.hardNew ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* Data Freshness */}
              <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 space-y-1">
                <div>Status: <span className="text-slate-300 font-semibold">{lc.status}</span></div>
                <div>Last Synced: <span className="text-slate-400">{lc.lastFetchedAt ? new Date(lc.lastFetchedAt).toLocaleString() : 'Never'}</span></div>
                {lc.isIntervalBased && (
                  <div className="text-amber-400 bg-amber-950/40 p-1.5 rounded">
                    Interval-based delta ({lc.intervalDays} days between snapshots)
                  </div>
                )}
              </div>
            </Card>

            {/* 2. GEEKSFORGEEKS */}
            <Card className="p-5 border-slate-800 bg-slate-900 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 font-black text-xs flex items-center justify-center">
                    GFG
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-200">GeeksforGeeks</span>
                    <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 px-1.5 py-0.5 rounded ml-1.5 border border-emerald-900/60">
                      30% Scored
                    </span>
                  </div>
                </div>
                {gfg.profileUrl && (
                  <a href={gfg.profileUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-emerald-400">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Period New Solves</span>
                <div className="text-2xl font-black text-emerald-400 font-mono mt-0.5">
                  +{gfg.newSolves ?? 0}
                </div>
                <span className="text-[10px] text-slate-500">Lifetime Total: {gfg.cumulativeSolved ?? 0}</span>
              </div>

              {/* GFG 5-Level Structured Breakdown */}
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-slate-400 font-medium">Difficulty Breakdown</span>
                  <span className="text-[9px] text-slate-500">Easy 30% • Med 40% • Hard 30%</span>
                </div>
                <div className="grid grid-cols-5 gap-1 text-center">
                  <div className="bg-slate-900 p-1.5 rounded border border-slate-800" title="School (Stats Only)">
                    <span className="text-[8px] text-slate-400 block">Sch</span>
                    <span className="text-[11px] font-bold text-slate-300 font-mono">+{gfg.schoolNew ?? 0}</span>
                  </div>
                  <div className="bg-slate-900 p-1.5 rounded border border-slate-800" title="Basic (Stats Only)">
                    <span className="text-[8px] text-slate-400 block">Bas</span>
                    <span className="text-[11px] font-bold text-slate-300 font-mono">+{gfg.basicNew ?? 0}</span>
                  </div>
                  <div className="bg-slate-900 p-1.5 rounded border border-emerald-900/40" title="Easy (30% weight)">
                    <span className="text-[8px] text-emerald-400 block">Easy</span>
                    <span className="text-[11px] font-bold text-emerald-300 font-mono">+{gfg.easyNew ?? 0}</span>
                  </div>
                  <div className="bg-slate-900 p-1.5 rounded border border-amber-900/40" title="Medium (40% weight)">
                    <span className="text-[8px] text-amber-400 block">Med</span>
                    <span className="text-[11px] font-bold text-amber-300 font-mono">+{gfg.mediumNew ?? 0}</span>
                  </div>
                  <div className="bg-slate-900 p-1.5 rounded border border-rose-900/40" title="Hard (30% weight)">
                    <span className="text-[8px] text-rose-400 block">Hard</span>
                    <span className="text-[11px] font-bold text-rose-300 font-mono">+{gfg.hardNew ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* Data Freshness */}
              <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 space-y-1">
                <div>Status: <span className="text-slate-300 font-semibold">{gfg.status}</span></div>
                <div>Last Synced: <span className="text-slate-400">{gfg.lastFetchedAt ? new Date(gfg.lastFetchedAt).toLocaleString() : 'Never'}</span></div>
                {gfg.isIntervalBased && (
                  <div className="text-amber-400 bg-amber-950/40 p-1.5 rounded">
                    Interval-based delta ({gfg.intervalDays} days between snapshots)
                  </div>
                )}
              </div>
            </Card>

            {/* 3. HACKERRANK */}
            <Card className="p-5 border-slate-800 bg-slate-900 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 font-black text-xs flex items-center justify-center">
                    HR
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-200">HackerRank</span>
                    <span className="text-[10px] text-teal-400 font-semibold bg-teal-950/60 px-1.5 py-0.5 rounded ml-1.5 border border-teal-900/60">
                      30% Scored
                    </span>
                  </div>
                </div>
                {hr.profileUrl && (
                  <a href={hr.profileUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-teal-400">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Period New Solves</span>
                <div className="text-2xl font-black text-teal-300 font-mono mt-0.5">
                  +{hr.newSolves ?? 0}
                </div>
                <span className="text-[10px] text-slate-500">Lifetime Solved: {hr.cumulativeSolved ?? 0}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Difficulty Classification:</span>
                  <span className="text-slate-500 italic">Not exposed by platform API</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  HackerRank public endpoint exposes badge/star milestones rather than per-problem easy/medium/hard classifications. Honest reporting prevents artificial counts.
                </p>
              </div>

              {/* Data Freshness */}
              <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 space-y-1">
                <div>Status: <span className="text-slate-300 font-semibold">{hr.status}</span></div>
                <div>Last Synced: <span className="text-slate-400">{hr.lastFetchedAt ? new Date(hr.lastFetchedAt).toLocaleString() : 'Never'}</span></div>
              </div>
            </Card>

            {/* 4. CODECHEF (Stats Only) */}
            <Card className="p-5 border-slate-800 bg-slate-900 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 font-black text-xs flex items-center justify-center">
                    CC
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-200">CodeChef</span>
                    <span className="text-[10px] text-slate-400 font-semibold bg-slate-800 px-1.5 py-0.5 rounded ml-1.5">
                      0% (Stats Only)
                    </span>
                  </div>
                </div>
                {cc.profileUrl && (
                  <a href={cc.profileUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-rose-400">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Period Solves (Monitoring)</span>
                <div className="text-2xl font-black text-slate-300 font-mono mt-0.5">
                  +{cc.newSolves ?? 0}
                </div>
                <span className="text-[10px] text-slate-500">Lifetime Solved: {cc.cumulativeSolved ?? 0}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                CodeChef statistics are recorded exclusively for monitoring purposes and do not alter the overall RankBoard score.
              </div>

              <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 space-y-1">
                <div>Status: <span className="text-slate-300 font-semibold">{cc.status}</span></div>
                <div>Last Synced: <span className="text-slate-400">{cc.lastFetchedAt ? new Date(cc.lastFetchedAt).toLocaleString() : 'Never'}</span></div>
              </div>
            </Card>

            {/* 5. CODEFORCES (Stats Only) */}
            <Card className="p-5 border-slate-800 bg-slate-900 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 font-black text-xs flex items-center justify-center">
                    CF
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-200">Codeforces</span>
                    <span className="text-[10px] text-slate-400 font-semibold bg-slate-800 px-1.5 py-0.5 rounded ml-1.5">
                      0% (Stats Only)
                    </span>
                  </div>
                </div>
                {cf.profileUrl && (
                  <a href={cf.profileUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-sky-400">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Period Solves (Monitoring)</span>
                <div className="text-2xl font-black text-slate-300 font-mono mt-0.5">
                  +{cf.newSolves ?? 0}
                </div>
                <span className="text-[10px] text-slate-500">Lifetime Solved: {cf.cumulativeSolved ?? 0}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                Codeforces statistics are tracked for competitive programming monitoring and do not contribute to the RankBoard leaderboard.
              </div>

              <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 space-y-1">
                <div>Status: <span className="text-slate-300 font-semibold">{cf.status}</span></div>
                <div>Last Synced: <span className="text-slate-400">{cf.lastFetchedAt ? new Date(cf.lastFetchedAt).toLocaleString() : 'Never'}</span></div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentActivityTab;
