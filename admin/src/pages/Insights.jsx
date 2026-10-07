import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../services/adminService';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge, StatusBadge } from '../components/common/Badge';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  Award,
  Layers,
  Users,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  ExternalLink,
  BarChart3,
  PieChart,
  ShieldAlert,
  Activity,
  Clock,
  FileWarning,
  HelpCircle,
  ChevronRight,
  Trophy,
  GraduationCap,
  ArrowRight,
  Database,
} from 'lucide-react';

export const Insights = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'platforms' | 'cohort' | 'health' | 'recommendations'

  const loadInsights = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const response = isManualRefresh
        ? await adminService.refreshAiInsights()
        : await adminService.getAiInsights();

      if (response && response.success && response.insights) {
        setData(response.insights);
      } else {
        throw new Error(response?.message || 'Invalid insight response received from server.');
      }
    } catch (err) {
      console.error('Failed to load AI insights:', err);
      setError(err.response?.data?.message || err.message || 'Failed to synthesize cohort insights.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, []);

  if (loading && !data) {
    return (
      <div className="py-12">
        <LoadingState message="Synthesizing real-time RankBoard cohort analytics from Supabase..." />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="py-12">
        <ErrorState message={error} onRetry={() => loadInsights(false)} />
      </div>
    );
  }

  const {
    overview = {},
    performance = {},
    platforms = {},
    departments = [],
    years = [],
    syncHealth = {},
    incompleteProfiles = {},
    anomalies = {},
    recommendations = [],
    metadata = {},
  } = data || {};

  const formatTimestamp = (ts) => {
    if (!ts) return 'Never';
    try {
      return new Date(ts).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return ts;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-100 flex items-center gap-2">
                <span>AI Analytical Insights & Cohort Intelligence</span>
                <Badge variant="primary" size="xs">Live Database</Badge>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Authoritative analytical decision support & data health intelligence for college administrators.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <div className="text-[11px] text-slate-500">Last Computed</div>
            <div className="text-xs font-mono font-medium text-slate-300">
              {formatTimestamp(metadata.generatedAt)}
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadInsights(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-brand-400' : ''}`} />
            <span>{refreshing ? 'Recalculating...' : 'Refresh Insights'}</span>
          </Button>
        </div>
      </div>

      {/* Executive Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <Card className="p-3.5 border-slate-800 bg-slate-900/60">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
            <span>Total Cohort</span>
            <Users className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-2xl font-black text-slate-100 mt-1">{overview.activeStudentCount || 0}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{overview.totalCohortSize || 0} registered</div>
        </Card>

        <Card className="p-3.5 border-slate-800 bg-slate-900/60">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
            <span>Ranked Students</span>
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-300 mt-1">{overview.rankedStudentCount || 0}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {overview.activeStudentCount > 0 ? Math.round((overview.rankedStudentCount / overview.activeStudentCount) * 100) : 0}% of active cohort
          </div>
        </Card>

        <Card className="p-3.5 border-slate-800 bg-slate-900/60">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
            <span>Combined Solves</span>
            <Activity className="w-3.5 h-3.5 text-brand-400" />
          </div>
          <div className="text-2xl font-black text-brand-300 mt-1">
            {(overview.totalProblemsSolvedCombined || 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Across 5 platforms</div>
        </Card>

        <Card className="p-3.5 border-slate-800 bg-slate-900/60">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
            <span>Average Score</span>
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-300 mt-1">{overview.avgOverallScore || 0}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Top: {overview.highestOverallScore || 0}</div>
        </Card>

        <Card className="p-3.5 border-slate-800 bg-slate-900/60">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
            <span>Sync Issues</span>
            <AlertTriangle className={`w-3.5 h-3.5 ${overview.syncIssuesCount > 0 ? 'text-rose-400' : 'text-slate-500'}`} />
          </div>
          <div className={`text-2xl font-black mt-1 ${overview.syncIssuesCount > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
            {overview.syncIssuesCount || 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {overview.syncIssuesCount > 0 ? 'Requires attention' : 'All platforms healthy'}
          </div>
        </Card>

        <Card className="p-3.5 border-slate-800 bg-slate-900/60">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
            <span>Missing HR Link</span>
            <FileWarning className={`w-3.5 h-3.5 ${incompleteProfiles.missingHackerRankCount > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
          </div>
          <div className={`text-2xl font-black mt-1 ${incompleteProfiles.missingHackerRankCount > 0 ? 'text-amber-300' : 'text-slate-200'}`}>
            {incompleteProfiles.missingHackerRankCount || 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">30% scoring weight</div>
        </Card>
      </div>

      {/* AI Synthesis Executive Narrative Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-brand-950/70 via-slate-900/90 to-indigo-950/70 border border-brand-500/30 flex items-start gap-3.5 shadow-lg">
        <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-300 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-300">Executive Cohort Synthesis</h3>
            <Badge variant="primary" size="xs">Live Computed</Badge>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">
            {overview.summaryNarrative || 'No executive summary available.'}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-1 overflow-x-auto pb-px">
        {[
          { id: 'overview', label: 'Performance & Tiers', icon: BarChart3 },
          { id: 'platforms', label: 'Platform Analytics', icon: Layers },
          { id: 'cohort', label: 'Departments & Years', icon: GraduationCap },
          { id: 'health', label: 'Sync & Data Health', icon: Activity, count: overview.syncIssuesCount },
          { id: 'recommendations', label: 'Actionable Insights', icon: Lightbulb, count: recommendations.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold rounded-t-lg transition-colors whitespace-nowrap border-b-2 ${
                isActive
                  ? 'border-brand-500 text-brand-300 bg-slate-900/80'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-brand-400' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${isActive ? 'bg-brand-500/20 text-brand-300' : 'bg-slate-800 text-slate-400'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & PERFORMANCE */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score Tier Distribution */}
            <Card className="border-slate-800">
              <CardHeader
                title="Performance Tier Distribution"
                subtitle="Categorization of students by composite score bands"
              />
              <CardContent className="p-5 space-y-4">
                {Object.entries(performance.scoreDistribution || {}).map(([band, count]) => {
                  const percent = overview.activeStudentCount > 0 ? Math.round((count / overview.activeStudentCount) * 100) : 0;
                  return (
                    <div key={band} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-200">{band}</span>
                        <span className="font-mono text-slate-400">{count} students ({percent}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-brand-600 via-indigo-500 to-emerald-400 rounded-full transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Key Observations & Historical Movement Note */}
            <Card className="border-slate-800 flex flex-col justify-between">
              <CardHeader
                title="Analytical Observations"
                subtitle="Data-backed findings across student activity and scoring"
              />
              <CardContent className="p-5 space-y-3 flex-1">
                {(performance.observations || []).map((obs, i) => (
                  <div key={i} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>{obs}</span>
                  </div>
                ))}

                <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/60 flex items-start gap-2.5 text-[11px] text-slate-400 mt-4">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-300 block mb-0.5">Historical Rank Movement</span>
                    <span>{performance.historicalRankMovement?.message || 'Historical rank movements are not available.'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top 10 Performers Snapshot */}
          <Card className="border-slate-800">
            <CardHeader
              title="Top 10 Ranked Performers Snapshot"
              subtitle="Current highest composite scoring students across connected platforms"
              action={
                <Button variant="ghost" size="sm" onClick={() => navigate('/leaderboard')} className="text-xs text-brand-400 hover:text-brand-300">
                  <span>Full Leaderboard</span>
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Branch / Year</th>
                    <th className="py-3 px-4 text-center">LC Solves</th>
                    <th className="py-3 px-4 text-center">GFG Solves</th>
                    <th className="py-3 px-4 text-center">HR Solves</th>
                    <th className="py-3 px-4 text-center">Total Solves</th>
                    <th className="py-3 px-4 text-right">Composite Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {(performance.top10Performers || []).map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => navigate(`/students/${s.id}`)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 px-4 font-bold text-amber-400">#{s.rank}</td>
                      <td className="py-2.5 px-4 font-sans font-bold text-slate-100 flex items-center gap-2">
                        <span>{s.name}</span>
                        <ExternalLink className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100" />
                      </td>
                      <td className="py-2.5 px-4 font-sans text-slate-400">{s.department} (Y{s.year})</td>
                      <td className="py-2.5 px-4 text-center text-amber-300">{s.solved?.leetcode ?? 0}</td>
                      <td className="py-2.5 px-4 text-center text-emerald-300">{s.solved?.gfg ?? 0}</td>
                      <td className="py-2.5 px-4 text-center text-sky-300">{s.solved?.hackerrank ?? 0}</td>
                      <td className="py-2.5 px-4 text-center font-bold text-slate-200">{s.solved?.combined ?? 0}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-brand-300">{s.finalScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: PLATFORM ANALYTICS */}
      {activeTab === 'platforms' && (
        <div className="space-y-6">
          {/* 5 Platforms Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* LeetCode */}
            <Card className="border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs">
                    LC
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">LeetCode</h3>
                    <span className="text-[10px] text-slate-400">Scoring Weight: 40%</span>
                  </div>
                </div>
                <Badge variant="warning">{platforms.leetcode?.linkedPercent}% Linked</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">Linked Students</div>
                  <div className="text-base font-bold text-slate-100 mt-0.5">{platforms.leetcode?.linkedCount} / {overview.activeStudentCount}</div>
                </div>
                <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">Total Solved</div>
                  <div className="text-base font-bold text-amber-300 mt-0.5">{(platforms.leetcode?.totalSolved || 0).toLocaleString()}</div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <span className="text-[11px] font-semibold text-slate-400 block">Difficulty Breakdown</span>
                <div className="grid grid-cols-3 gap-1.5 text-center text-[11px] font-mono">
                  <div className="p-1.5 rounded bg-emerald-950/40 border border-emerald-800/40">
                    <span className="text-[9px] text-emerald-400 block uppercase">Easy</span>
                    <span className="font-bold text-emerald-300">{platforms.leetcode?.easySolved || 0}</span>
                  </div>
                  <div className="p-1.5 rounded bg-amber-950/40 border border-amber-800/40">
                    <span className="text-[9px] text-amber-400 block uppercase">Medium</span>
                    <span className="font-bold text-amber-300">{platforms.leetcode?.mediumSolved || 0}</span>
                  </div>
                  <div className="p-1.5 rounded bg-rose-950/40 border border-rose-800/40">
                    <span className="text-[9px] text-rose-400 block uppercase">Hard</span>
                    <span className="font-bold text-rose-300">{platforms.leetcode?.hardSolved || 0}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* GeeksforGeeks */}
            <Card className="border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    GFG
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">GeeksforGeeks</h3>
                    <span className="text-[10px] text-slate-400">Scoring Weight: 30%</span>
                  </div>
                </div>
                <Badge variant="success">{platforms.gfg?.linkedPercent}% Linked</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">Linked Students</div>
                  <div className="text-base font-bold text-slate-100 mt-0.5">{platforms.gfg?.linkedCount} / {overview.activeStudentCount}</div>
                </div>
                <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">Total Solved</div>
                  <div className="text-base font-bold text-emerald-300 mt-0.5">{(platforms.gfg?.totalSolved || 0).toLocaleString()}</div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <span className="text-[11px] font-semibold text-slate-400 block">Authoritative Solved Categories</span>
                <div className="grid grid-cols-5 gap-1 text-center text-[10px] font-mono">
                  <div className="p-1 rounded bg-slate-950 border border-slate-800">
                    <span className="text-[8px] text-slate-500 block">SCH</span>
                    <span className="font-bold text-slate-300">{platforms.gfg?.schoolSolved || 0}</span>
                  </div>
                  <div className="p-1 rounded bg-slate-950 border border-slate-800">
                    <span className="text-[8px] text-slate-500 block">BAS</span>
                    <span className="font-bold text-slate-300">{platforms.gfg?.basicSolved || 0}</span>
                  </div>
                  <div className="p-1 rounded bg-emerald-950/40 border border-emerald-800/40">
                    <span className="text-[8px] text-emerald-400 block">EAS</span>
                    <span className="font-bold text-emerald-300">{platforms.gfg?.easySolved || 0}</span>
                  </div>
                  <div className="p-1 rounded bg-amber-950/40 border border-amber-800/40">
                    <span className="text-[8px] text-amber-400 block">MED</span>
                    <span className="font-bold text-amber-300">{platforms.gfg?.mediumSolved || 0}</span>
                  </div>
                  <div className="p-1 rounded bg-rose-950/40 border border-rose-800/40">
                    <span className="text-[8px] text-rose-400 block">HRD</span>
                    <span className="font-bold text-rose-300">{platforms.gfg?.hardSolved || 0}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* HackerRank */}
            <Card className="border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold text-xs">
                    HR
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">HackerRank</h3>
                    <span className="text-[10px] text-slate-400">Scoring Weight: 30%</span>
                  </div>
                </div>
                <Badge variant={platforms.hackerrank?.linkedPercent < 20 ? 'danger' : 'info'}>
                  {platforms.hackerrank?.linkedPercent}% Linked
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">Linked Students</div>
                  <div className="text-base font-bold text-slate-100 mt-0.5">{platforms.hackerrank?.linkedCount} / {overview.activeStudentCount}</div>
                </div>
                <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">Total Solved</div>
                  <div className="text-base font-bold text-sky-300 mt-0.5">{(platforms.hackerrank?.totalSolved || 0).toLocaleString()}</div>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Badges Earned:</span>
                  <span className="font-mono text-slate-200">{platforms.hackerrank?.totalBadges || 0}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Certificates Earned:</span>
                  <span className="font-mono text-slate-200">{platforms.hackerrank?.totalCertificates || 0}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Total Score Points:</span>
                  <span className="font-mono text-slate-200">{platforms.hackerrank?.totalPoints || 0}</span>
                </div>
              </div>
            </Card>

            {/* CodeChef */}
            <Card className="border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold text-xs">
                    CC
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">CodeChef</h3>
                    <span className="text-[10px] text-slate-500">Statistics Only (0%)</span>
                  </div>
                </div>
                <Badge variant="default">{platforms.codechef?.linkedPercent}% Linked</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">Linked Students</div>
                  <div className="text-base font-bold text-slate-100 mt-0.5">{platforms.codechef?.linkedCount} / {overview.activeStudentCount}</div>
                </div>
                <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">Total Solved</div>
                  <div className="text-base font-bold text-rose-300 mt-0.5">{(platforms.codechef?.totalSolved || 0).toLocaleString()}</div>
                </div>
              </div>

              <div className="p-2.5 rounded bg-slate-950/40 border border-slate-800 text-[11px] text-slate-400">
                CodeChef problems are tracked for competitive activity benchmarks and rate-limited safely with sequential queue backoff.
              </div>
            </Card>

            {/* Codeforces */}
            <Card className="border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs">
                    CF
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">Codeforces</h3>
                    <span className="text-[10px] text-slate-500">Statistics Only (0%)</span>
                  </div>
                </div>
                <Badge variant="default">{platforms.codeforces?.linkedPercent}% Linked</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">Linked Students</div>
                  <div className="text-base font-bold text-slate-100 mt-0.5">{platforms.codeforces?.linkedCount} / {overview.activeStudentCount}</div>
                </div>
                <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">Total Solved</div>
                  <div className="text-base font-bold text-indigo-300 mt-0.5">{(platforms.codeforces?.totalSolved || 0).toLocaleString()}</div>
                </div>
              </div>

              <div className="p-2.5 rounded bg-slate-950/40 border border-slate-800 text-[11px] text-slate-400">
                Codeforces tracking is configured for contest rating & algorithmic practice visibility without score inflation.
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: COHORT & DEPARTMENTS */}
      {activeTab === 'cohort' && (
        <div className="space-y-6">
          {/* Department Performance Table */}
          <Card className="border-slate-800">
            <CardHeader
              title="Department & Branch Performance Comparison"
              subtitle="Canonical academic department metrics and coding platform participation"
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Department / Branch</th>
                    <th className="py-3 px-4 text-center">Total Students</th>
                    <th className="py-3 px-4 text-center">Ranked</th>
                    <th className="py-3 px-4 text-center">Combined Solves</th>
                    <th className="py-3 px-4 text-center">Top Student</th>
                    <th className="py-3 px-4 text-center">Top Score</th>
                    <th className="py-3 px-4 text-right">Average Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {departments.map((dept, i) => (
                    <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-sans font-bold text-slate-100">{dept.name}</td>
                      <td className="py-3 px-4 text-center text-slate-300">{dept.totalStudents}</td>
                      <td className="py-3 px-4 text-center text-slate-300">{dept.rankedStudents}</td>
                      <td className="py-3 px-4 text-center font-bold text-brand-300">{dept.totalSolved.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center font-sans text-slate-300">
                        {dept.topStudent ? (
                          <button
                            onClick={() => navigate(`/students/${dept.topStudent.id}`)}
                            className="text-slate-200 hover:text-brand-300 font-medium underline-offset-2 hover:underline"
                          >
                            {dept.topStudent.name}
                          </button>
                        ) : '—'}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-400">{dept.topScore}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-100">{dept.avgScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Academic Year Comparison Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {years.map((y) => (
              <Card key={y.year} className="p-4 border-slate-800 bg-slate-900/60 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-brand-300 uppercase">{y.label}</span>
                  <Badge variant="default" size="xs">{y.totalStudents} students</Badge>
                </div>
                <div className="text-xl font-black text-slate-100">Avg: {y.avgScore}</div>
                <div className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-slate-800">
                  <span>Top: {y.topScore}</span>
                  <span>Solves: {y.totalSolved.toLocaleString()}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SYNC & DATA HEALTH */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          {/* Sync Health Summary Gauge & Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card className="p-5 border-slate-800 bg-slate-900/60 flex flex-col justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-100">Platform Sync Health Index</h3>
                <p className="text-xs text-slate-400">Proportion of successfully synchronized coding profiles</p>
              </div>
              <div className="py-4">
                <div className="text-4xl font-black text-emerald-400">{syncHealth.healthScore || 100}%</div>
                <div className="text-xs text-slate-400 mt-1">
                  {syncHealth.totalSyncErrors || 0} active errors out of {syncHealth.totalTrackedLinks || 0} tracked links
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => navigate('/sync')} className="w-full">
                Open Synchronization Queue
              </Button>
            </Card>

            <Card className="lg:col-span-2 p-5 border-slate-800 bg-slate-900/60 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-100">Missing Platform Profile Distribution</h3>
                <span className="text-xs text-slate-400">Total active: {overview.activeStudentCount}</span>
              </div>
              <div className="space-y-2.5 pt-1">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-amber-400 font-medium">Missing HackerRank Profile (30% Weight)</span>
                    <span className="font-mono text-slate-300">{incompleteProfiles.missingHackerRankCount} students</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${overview.activeStudentCount > 0 ? (incompleteProfiles.missingHackerRankCount / overview.activeStudentCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-400 font-medium">Missing GeeksforGeeks Profile (30% Weight)</span>
                    <span className="font-mono text-slate-300">{incompleteProfiles.missingGFGCount} students</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${overview.activeStudentCount > 0 ? (incompleteProfiles.missingGFGCount / overview.activeStudentCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-sky-400 font-medium">Missing LeetCode Profile (40% Weight)</span>
                    <span className="font-mono text-slate-300">{incompleteProfiles.missingLeetCodeCount} students</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-sky-500 rounded-full"
                      style={{ width: `${overview.activeStudentCount > 0 ? (incompleteProfiles.missingLeetCodeCount / overview.activeStudentCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Active Synchronization Failures Table */}
          <Card className="border-slate-800">
            <CardHeader
              title={`Active Platform Fetch Errors (${syncHealth.totalSyncErrors || 0})`}
              subtitle="Students whose platform profiles currently failed during background synchronization"
            />
            {syncHealth.syncErrorsList?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Roll Number</th>
                      <th className="py-3 px-4">Platform</th>
                      <th className="py-3 px-4">Error Reason</th>
                      <th className="py-3 px-4">Last Attempted</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {syncHealth.syncErrorsList.map((err, i) => (
                      <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-4 font-sans font-bold text-slate-100">{err.name}</td>
                        <td className="py-2.5 px-4 text-slate-300">{err.rollNumber}</td>
                        <td className="py-2.5 px-4">
                          <Badge variant="danger" size="xs">{err.platformName}</Badge>
                        </td>
                        <td className="py-2.5 px-4 font-sans text-rose-300 text-[11px] max-w-xs truncate">
                          {err.errorMessage}
                        </td>
                        <td className="py-2.5 px-4 text-slate-400 text-[11px]">{formatTimestamp(err.lastFetchedAt)}</td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => navigate(`/students/${err.studentId}`)}
                            className="text-brand-400 hover:text-brand-300 underline font-sans text-xs"
                          >
                            Inspect Profile
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                No active synchronization errors detected.
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 5: ACTIONABLE RECOMMENDATIONS */}
      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200">Data-Driven Administrative Recommendations</h2>
            <span className="text-xs text-slate-400">{recommendations.length} recommendations available</span>
          </div>

          <div className="space-y-3.5">
            {recommendations.map((rec) => {
              const priorityVariant =
                rec.priority === 'HIGH' ? 'danger' : rec.priority === 'MEDIUM' ? 'warning' : 'info';

              return (
                <div
                  key={rec.id}
                  className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:border-slate-700 transition-all"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Lightbulb className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-100">{rec.title}</h4>
                        <Badge variant={priorityVariant} size="xs">{rec.priority} Priority</Badge>
                        <Badge variant="default" size="xs">{rec.category}</Badge>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">{rec.description}</p>
                    </div>
                  </div>

                  {rec.actionLabel && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        if (rec.actionType === 'NAVIGATE_SYNC') navigate('/sync');
                        else if (rec.actionType === 'NAVIGATE_PLATFORMS') navigate('/platforms');
                        else if (rec.actionType === 'NAVIGATE_LEADERBOARD') navigate('/leaderboard');
                        else navigate('/students');
                      }}
                      className="whitespace-nowrap flex-shrink-0"
                    >
                      <span>{rec.actionLabel}</span>
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Insights;
