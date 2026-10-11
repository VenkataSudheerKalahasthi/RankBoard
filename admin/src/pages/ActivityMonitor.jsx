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
  Activity,
  Trophy,
  AlertTriangle,
  TrendingUp,
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  ShieldAlert,
  Info,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ExternalLink,
  RefreshCw,
  Layers,
  ArrowRight,
  Eye,
  Check,
} from 'lucide-react';

export const ActivityMonitor = () => {
  const navigate = useNavigate();
  const { notifySuccess, notifyError } = useNotifications();

  // Active View Tab: 'top-solvers' | 'anomalies' | 'trends'
  const [activeTab, setActiveTab] = useState('top-solvers');

  // Today's & Period Top Solvers State
  const [topSolversData, setTopSolversData] = useState(null);
  const [topSolversLoading, setTopSolversLoading] = useState(true);
  const [solversSearch, setSolversSearch] = useState('');
  const [solversBranch, setSolversBranch] = useState('ALL');
  const [solversYear, setSolversYear] = useState('ALL');
  const [solversPlatform, setSolversPlatform] = useState('ALL');
  const [solversLimit, setSolversLimit] = useState(20);
  const [solversPeriod, setSolversPeriod] = useState('today'); // 'today' | '2d' | '7d' | '30d' | 'month' | 'custom'
  const [solversDate, setSolversDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [solversCustomStartDate, setSolversCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [solversCustomEndDate, setSolversCustomEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [appliedCustomStartDate, setAppliedCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [appliedCustomEndDate, setAppliedCustomEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Unusual Activity / Anomalies State
  const [anomaliesData, setAnomaliesData] = useState(null);
  const [anomaliesLoading, setAnomaliesLoading] = useState(true);
  const [anomaliesStatusFilter, setAnomaliesStatusFilter] = useState('ALL');
  const [anomaliesPlatformFilter, setAnomaliesPlatformFilter] = useState('ALL');
  const [anomaliesSearch, setAnomaliesSearch] = useState('');
  const [scanningAnomalies, setScanningAnomalies] = useState(false);

  // Anomaly Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);
  const [reviewStatusChoice, setReviewStatusChoice] = useState('REVIEWED');
  const [reviewReason, setReviewReason] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Trends State
  const [trendsData, setTrendsData] = useState(null);
  const [trendsLoading, setTrendsLoading] = useState(true);
  const [trendsDays, setTrendsDays] = useState(30);

  // General error state
  const [error, setError] = useState(null);

  // Apply Custom Date Range with Validation
  const handleApplyCustomRange = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!solversCustomStartDate || !solversCustomEndDate) {
      notifyError('Please specify both Start Date and End Date.');
      return;
    }
    if (solversCustomStartDate > solversCustomEndDate) {
      notifyError('End date must not be earlier than start date.');
      return;
    }
    setAppliedCustomStartDate(solversCustomStartDate);
    setAppliedCustomEndDate(solversCustomEndDate);
  };

  // Fetch Top Solvers for Selected Period
  const fetchTopSolvers = useCallback(async (isBackground = false) => {
    if (!isBackground) setTopSolversLoading(true);
    try {
      const res = await adminService.getTodayTopSolvers({
        period: solversPeriod,
        date: solversPeriod === 'today' ? solversDate : undefined,
        startDate: solversPeriod === 'custom' ? appliedCustomStartDate : undefined,
        endDate: solversPeriod === 'custom' ? appliedCustomEndDate : undefined,
        branch: solversBranch,
        year: solversYear,
        platform: solversPlatform,
        limit: solversLimit,
        search: solversSearch,
      });
      if (res && res.success) {
        setTopSolversData(res.data);
      }
    } catch (err) {
      console.error('Failed to load top solvers:', err);
      if (!isBackground) setError(err.message || 'Failed to load top solvers');
    } finally {
      if (!isBackground) setTopSolversLoading(false);
    }
  }, [solversPeriod, solversDate, appliedCustomStartDate, appliedCustomEndDate, solversBranch, solversYear, solversPlatform, solversLimit, solversSearch]);

  // Fetch Anomalies
  const fetchAnomalies = useCallback(async (isBackground = false) => {
    if (!isBackground) setAnomaliesLoading(true);
    try {
      const res = await adminService.getActivityAnomalies({
        reviewStatus: anomaliesStatusFilter,
        platform: anomaliesPlatformFilter,
        search: anomaliesSearch,
        limit: 100,
      });
      if (res && res.success) {
        setAnomaliesData(res.data);
      }
    } catch (err) {
      console.error('Failed to load activity anomalies:', err);
      if (!isBackground) setError(err.message || 'Failed to load anomalies');
    } finally {
      if (!isBackground) setAnomaliesLoading(false);
    }
  }, [anomaliesStatusFilter, anomaliesPlatformFilter, anomaliesSearch]);

  // Fetch Trends
  const fetchTrends = useCallback(async (isBackground = false) => {
    if (!isBackground) setTrendsLoading(true);
    try {
      const res = await adminService.getActivityTrends({
        days: trendsDays,
      });
      if (res && res.success) {
        setTrendsData(res.data);
      }
    } catch (err) {
      console.error('Failed to load activity trends:', err);
    } finally {
      if (!isBackground) setTrendsLoading(false);
    }
  }, [trendsDays]);

  // Initial load according to active tab
  useEffect(() => {
    if (activeTab === 'top-solvers') fetchTopSolvers();
    else if (activeTab === 'anomalies') fetchAnomalies();
    else if (activeTab === 'trends') fetchTrends();
  }, [activeTab, fetchTopSolvers, fetchAnomalies, fetchTrends]);

  // Supabase Realtime automatic updates
  useEffect(() => {
    const unsubscribe = subscribeToAdminUpdates(() => {
      if (activeTab === 'top-solvers') fetchTopSolvers(true);
      else if (activeTab === 'anomalies') fetchAnomalies(true);
      else if (activeTab === 'trends') fetchTrends(true);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [activeTab, fetchTopSolvers, fetchAnomalies, fetchTrends]);

  // Trigger Anomaly Scan across cohort
  const handleRunAnomalyScan = async () => {
    setScanningAnomalies(true);
    try {
      const res = await adminService.scanActivityAnomalies({ date: solversDate });
      if (res.success) {
        notifySuccess(res.message || 'Anomaly scan completed successfully.');
        fetchAnomalies();
      }
    } catch (err) {
      notifyError(err.message || 'Failed to run anomaly scan.');
    } finally {
      setScanningAnomalies(false);
    }
  };

  // Open Review Modal
  const openReviewModal = (anomaly) => {
    setSelectedAnomaly(anomaly);
    setReviewStatusChoice(anomaly.reviewStatus === 'NEEDS_REVIEW' ? 'REVIEWED' : anomaly.reviewStatus);
    setReviewReason(anomaly.reviewNotes || '');
    setReviewModalOpen(true);
  };

  // Submit Anomaly Review Action
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selectedAnomaly) return;
    setSubmittingReview(true);
    try {
      const res = await adminService.reviewActivityAnomaly(selectedAnomaly.id, {
        reviewStatus: reviewStatusChoice,
        reason: reviewReason,
      });
      if (res.success) {
        notifySuccess(`Anomaly status updated to ${reviewStatusChoice}. Action recorded in audit log.`);
        setReviewModalOpen(false);
        fetchAnomalies(true);
      }
    } catch (err) {
      notifyError(err.message || 'Failed to update review status.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // CSV Export Handler
  const handleExportCsv = (type) => {
    let url = '';
    if (type === 'anomalies') {
      url = adminService.exportActivityReportUrl({
        type: 'anomalies',
        reviewStatus: anomaliesStatusFilter,
        platform: anomaliesPlatformFilter,
        search: anomaliesSearch,
      });
    } else {
      url = adminService.exportActivityReportUrl({
        type: 'today-top-solvers',
        period: solversPeriod,
        date: solversPeriod === 'today' ? solversDate : undefined,
        startDate: solversPeriod === 'custom' ? appliedCustomStartDate : undefined,
        endDate: solversPeriod === 'custom' ? appliedCustomEndDate : undefined,
        branch: solversBranch,
        year: solversYear,
        platform: solversPlatform,
        search: solversSearch,
      });
    }
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-100 flex items-center gap-2.5">
              <Activity className="w-5 h-5 text-brand-400" />
              <span>Student Activity Monitor</span>
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-950/60 text-brand-300 border border-brand-800/60">
              Asia/Kolkata (IST)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Investigate daily problem-solving activity, compare platform metrics, and review unusual surges with evidence.
          </p>
        </div>

        {/* Global Tab Controls */}
        <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('top-solvers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
              activeTab === 'top-solvers'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Today's Top Solvers</span>
          </button>

          <button
            onClick={() => setActiveTab('anomalies')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
              activeTab === 'anomalies'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Unusual Activity / Needs Review</span>
            {anomaliesData?.total > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center justify-center">
                {anomaliesData.total}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('trends')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
              activeTab === 'trends'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Activity Trends</span>
          </button>
        </div>
      </div>

      {/* Limitation Notice Banner (Section 6) */}
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-start gap-3 text-xs">
        <Info className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
        <div className="text-slate-400 leading-relaxed">
          <strong className="text-slate-200 font-semibold">Evidence & Monitoring Notice:</strong> RankBoard monitors verified problem-solving counts and historical differences from public coding platform profiles. It detects statistical activity surges to support administrative inquiry. It does not monitor or claim proof of external code copying, browser keystrokes, or clipboard paste events.
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB A: TODAY'S TOP PROBLEM SOLVERS */}
      {/* ========================================================================= */}
      {activeTab === 'top-solvers' && (
        <div className="space-y-5">
          {/* Filters Bar */}
          <Card className="p-4 bg-slate-900/70 border-slate-800">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                {/* Search */}
                <div className="relative min-w-[180px] flex-1 sm:flex-none">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search name or roll no..."
                    value={solversSearch}
                    onChange={(e) => setSolversSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>

                {/* Period Selection Pills */}
                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 overflow-x-auto">
                  {[
                    { id: 'today', label: 'Today' },
                    { id: '2d', label: 'Last 2 Days' },
                    { id: '7d', label: 'Last 7 Days' },
                    { id: '30d', label: 'Last 30 Days' },
                    { id: 'month', label: 'This Month' },
                    { id: 'custom', label: 'Custom' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSolversPeriod(p.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                        solversPeriod === p.id
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Date Picker (for Today or specific date) */}
                {solversPeriod === 'today' && (
                  <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg text-xs text-slate-300">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="date"
                      value={solversDate}
                      onChange={(e) => setSolversDate(e.target.value)}
                      className="bg-transparent border-0 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                )}

                {/* Custom Date Range Pickers */}
                {solversPeriod === 'custom' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg text-xs text-slate-300">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-500 font-medium">Start:</span>
                        <input
                          type="date"
                          value={solversCustomStartDate}
                          onChange={(e) => setSolversCustomStartDate(e.target.value)}
                          className="bg-transparent border-0 text-xs text-slate-200 focus:outline-none cursor-pointer"
                          title="Start Date (Asia/Kolkata)"
                        />
                      </div>
                      <span className="text-slate-600 text-[10px]">→</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-500 font-medium">End:</span>
                        <input
                          type="date"
                          value={solversCustomEndDate}
                          onChange={(e) => setSolversCustomEndDate(e.target.value)}
                          className="bg-transparent border-0 text-xs text-slate-200 focus:outline-none cursor-pointer"
                          title="End Date (Asia/Kolkata)"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyCustomRange}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-sm flex items-center gap-1.5 transition active:scale-95"
                      title="Apply selected date range"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Apply Date Range</span>
                    </button>
                  </div>
                )}

                {/* Preset Period Display Badge */}
                {['2d', '7d', '30d', 'month'].includes(solversPeriod) && topSolversData?.date && (
                  <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-mono text-[11px] text-slate-300">
                      {topSolversData.date}
                    </span>
                  </div>
                )}

                {/* Branch */}
                <select
                  value={solversBranch}
                  onChange={(e) => setSolversBranch(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-300 px-2.5 py-1.5 rounded-lg focus:outline-none"
                >
                  <option value="ALL">All Branches</option>
                  <option value="Computer Science and Engineering">CSE</option>
                  <option value="Information Technology">IT</option>
                  <option value="Artificial Intelligence & DS">AI & DS</option>
                  <option value="Electronics & Communication">ECE</option>
                  <option value="Electrical & Electronics">EEE</option>
                  <option value="Mechanical Engineering">Mechanical</option>
                  <option value="Prime">Prime</option>
                  <option value="CIVIL">CIVIL</option>
                  <option value="CSIT">CSIT</option>
                  <option value="AI">AI</option>
                  <option value="AIML">AIML</option>
                  <option value="CSDS">CSDS</option>
                  <option value="CSBS">CSBS</option>
                  <option value="CSIOT">CSIOT</option>
                  <option value="VLSI">VLSI</option>
                </select>

                {/* Year */}
                <select
                  value={solversYear}
                  onChange={(e) => setSolversYear(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-300 px-2.5 py-1.5 rounded-lg focus:outline-none"
                >
                  <option value="ALL">All Years</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>

                {/* Platform */}
                <select
                  value={solversPlatform}
                  onChange={(e) => setSolversPlatform(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-300 px-2.5 py-1.5 rounded-lg focus:outline-none"
                >
                  <option value="ALL">All Platforms</option>
                  <option value="leetcode">LeetCode Only</option>
                  <option value="gfg">GFG Only</option>
                  <option value="hackerrank">HackerRank Only</option>
                  <option value="codeforces">Codeforces Only (Stats)</option>
                  <option value="codechef">CodeChef Only (Stats)</option>
                </select>

                {/* Limit */}
                <select
                  value={solversLimit}
                  onChange={(e) => setSolversLimit(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-300 px-2.5 py-1.5 rounded-lg focus:outline-none"
                >
                  <option value={10}>Top 10</option>
                  <option value={20}>Top 20</option>
                  <option value={50}>Top 50</option>
                  <option value="all">All Matching</option>
                </select>
              </div>

              <div className="flex items-center gap-2 self-end lg:self-auto">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => fetchTopSolvers()}
                  icon={RefreshCw}
                >
                  Refresh
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleExportCsv('top-solvers')}
                  icon={Download}
                >
                  Export CSV
                </Button>
              </div>
            </div>
          </Card>

          {/* Activity Overview KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <Card className="p-3.5 bg-slate-900/80 border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                {solversPeriod === 'today' ? 'Active Solvers Today' : 'Active Solvers in Period'}
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-1 block">
                {topSolversData?.activeSolversInPeriod ?? topSolversData?.activeSolversToday ?? (topSolversLoading ? '...' : 0)}
              </span>
            </Card>

            <Card className="p-3.5 bg-slate-900/80 border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                {solversPeriod === 'today' ? 'Total Solves Today' : 'Total Solves in Period'}
              </span>
              <span className="text-xl sm:text-2xl font-black text-brand-400 font-mono mt-1 block">
                +{topSolversData?.totalSolvesInPeriod ?? topSolversData?.totalSolvesToday ?? (topSolversLoading ? '...' : 0)}
              </span>
            </Card>

            <Card className="p-3.5 bg-slate-900/80 border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Evaluated Cohort
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-100 font-mono mt-1 block">
                {topSolversData?.totalStudentsEvaluated ?? (topSolversLoading ? '...' : 0)}
              </span>
            </Card>

            <Card className="p-3.5 bg-slate-900/80 border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Active Filter / Window
              </span>
              <span className="text-xs sm:text-sm font-bold text-amber-400 font-mono mt-2 block truncate" title={topSolversData?.periodLabel || 'Asia/Kolkata (IST)'}>
                {topSolversData?.periodLabel || 'Today (IST)'}
              </span>
            </Card>
          </div>

          {/* Solvers Table View */}
          {topSolversLoading ? (
            <LoadingState message="Calculating verified problem solves for the selected period..." />
          ) : !topSolversData?.hasHistoricalData && (!topSolversData?.solvers || topSolversData?.solvers?.length === 0) ? (
            <Card className="p-8 text-center bg-slate-900/60 border-slate-800 space-y-3">
              <Clock className="w-8 h-8 text-amber-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-200">Historical Activity Data is Not Available Yet</h3>
              <p className="text-xs text-slate-400 max-w-lg mx-auto">
                RankBoard calculates daily and period solves from verified differences between historical snapshots. Periodic synchronization will automatically record snapshots prospectively. Lifetime cumulative totals are never presented as period activity.
              </p>
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/synchronization')}
                >
                  Go to Synchronization Center
                </Button>
              </div>
            </Card>
          ) : topSolversData?.solvers?.length === 0 ? (
            <EmptyState
              title="No student activity found"
              message="No students match the current filters or recorded new solves in this period."
            />
          ) : (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-center">Period Activity Rank</th>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Branch & Year</th>
                      <th className="px-4 py-3 text-center font-bold text-emerald-400">
                        {solversPeriod === 'today' ? "Today's Verified Solves" : "Period Verified Solves"}
                      </th>
                      <th className="px-4 py-3 text-center">LeetCode</th>
                      <th className="px-4 py-3 text-center">GFG</th>
                      <th className="px-4 py-3 text-center">HackerRank</th>
                      <th className="px-4 py-3 text-center text-slate-500">CodeChef (Stats)</th>
                      <th className="px-4 py-3 text-center text-slate-500">Codeforces (Stats)</th>
                      <th className="px-4 py-3">Difficulty Breakdown</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {topSolversData.solvers.map((student) => (
                      <tr
                        key={student.studentId}
                        className="hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Rank */}
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${
                              student.rank === 1
                                ? 'bg-amber-400 text-slate-950 font-black'
                                : student.rank === 2
                                ? 'bg-slate-300 text-slate-950 font-black'
                                : student.rank === 3
                                ? 'bg-amber-700 text-white font-black'
                                : 'text-slate-400'
                            }`}
                            title={`Period Activity Rank #${student.rank}`}
                          >
                            #{student.rank}
                          </span>
                        </td>

                        {/* Student Name & Roll */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {student.profilePhoto ? (
                              <img
                                src={student.profilePhoto}
                                alt={student.name}
                                className="w-8 h-8 rounded-lg object-cover border border-slate-700"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[11px] text-slate-300">
                                {student.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span
                                  className="font-semibold text-slate-100 hover:text-brand-300 cursor-pointer"
                                  onClick={() => navigate(`/students/${student.studentId}`)}
                                >
                                  {student.name}
                                </span>
                                <span
                                  className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 whitespace-nowrap"
                                  title="Overall College Rank (Permanent RankBoard)"
                                >
                                  College #{student.globalRank || '—'}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                {student.rollNumber || '—'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Branch & Year */}
                        <td className="px-4 py-3">
                          <span className="text-slate-200 font-medium">{student.department}</span>
                          <span className="text-[11px] text-slate-400 block">Year {student.year}</span>
                        </td>

                        {/* Verified Solves in Period */}
                        <td className="px-4 py-3 text-center">
                          {!student.hasVerifiedHistory ? (
                            <span className="text-slate-500 font-mono text-xs" title="Historical baseline not established yet. Requires multiple syncs.">
                              —
                            </span>
                          ) : (
                            <span
                              className={`inline-block px-2.5 py-1 rounded-lg font-black text-sm ${
                                student.todayVerifiedSolves > 0
                                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 font-mono'
                                  : 'text-slate-500 font-mono'
                              }`}
                            >
                              +{student.todayVerifiedSolves}
                            </span>
                          )}
                        </td>

                        {/* LeetCode */}
                        <td className="px-4 py-3 text-center font-mono">
                          {!student.hasVerifiedHistory ? (
                            <span className="text-slate-600">—</span>
                          ) : student.leetcodeSolves > 0 ? (
                            <span className="text-amber-400 font-bold">+{student.leetcodeSolves}</span>
                          ) : (
                            <span className="text-slate-600">0</span>
                          )}
                        </td>

                        {/* GFG */}
                        <td className="px-4 py-3 text-center font-mono">
                          {!student.hasVerifiedHistory ? (
                            <span className="text-slate-600">—</span>
                          ) : student.gfgSolves > 0 ? (
                            <span className="text-emerald-400 font-bold">+{student.gfgSolves}</span>
                          ) : (
                            <span className="text-slate-600">0</span>
                          )}
                        </td>

                        {/* HackerRank */}
                        <td className="px-4 py-3 text-center font-mono">
                          {!student.hasVerifiedHistory ? (
                            <span className="text-slate-600">—</span>
                          ) : student.hackerrankSolves > 0 ? (
                            <span className="text-teal-400 font-bold">+{student.hackerrankSolves}</span>
                          ) : (
                            <span className="text-slate-600">0</span>
                          )}
                        </td>

                        {/* CodeChef (Stats only) */}
                        <td className="px-4 py-3 text-center font-mono text-slate-400">
                          {!student.hasVerifiedHistory ? (
                            <span className="text-slate-600">—</span>
                          ) : student.codechefSolves > 0 ? (
                            `+${student.codechefSolves}`
                          ) : (
                            '0'
                          )}
                        </td>

                        {/* Codeforces (Stats only) */}
                        <td className="px-4 py-3 text-center font-mono text-slate-400">
                          {!student.hasVerifiedHistory ? (
                            <span className="text-slate-600">—</span>
                          ) : student.codeforcesSolves > 0 ? (
                            `+${student.codeforcesSolves}`
                          ) : (
                            '0'
                          )}
                        </td>

                        {/* Difficulty Breakdown */}
                        <td className="px-4 py-3">
                          {!student.hasVerifiedHistory ? (
                            <span className="text-slate-500 font-mono text-[11px]">—</span>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[10px] font-mono">
                              <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-900/40" title="Easy">
                                E:{student.difficultyBreakdown?.easy || 0}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-900/40" title="Medium">
                                M:{student.difficultyBreakdown?.medium || 0}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-900/40" title="Hard">
                                H:{student.difficultyBreakdown?.hard || 0}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block whitespace-nowrap ${
                              student.activityStatus === 'Surge Activity'
                                ? 'bg-amber-950/80 text-amber-400 border border-amber-700/80'
                                : student.activityStatus === 'High Activity'
                                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/80'
                                : student.activityStatus === 'Active Today' || student.activityStatus === 'Active in Period' || student.activityStatus === 'Active'
                                ? 'bg-teal-950/80 text-teal-300 border border-teal-700/80'
                                : student.activityStatus === 'Sync Failed'
                                ? 'bg-rose-950/80 text-rose-400 border border-rose-800/80'
                                : student.activityStatus === 'Data Unavailable'
                                ? 'bg-amber-950/50 text-amber-300/90 border border-amber-800/50'
                                : student.activityStatus === 'Not Connected'
                                ? 'bg-slate-900 text-slate-500 border border-slate-800'
                                : student.activityStatus === 'No New Activity'
                                ? 'bg-slate-800/80 text-slate-400 border border-slate-700/60'
                                : 'bg-slate-800 text-slate-400 border border-slate-700/40'
                            }`}
                          >
                            {student.activityStatus}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate(`/students/${student.studentId}`)}
                            icon={Eye}
                          >
                            Inspect
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB B: UNUSUAL ACTIVITY / NEEDS REVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'anomalies' && (
        <div className="space-y-5">
          {/* Controls Bar */}
          <Card className="p-4 bg-slate-900/70 border-slate-800">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                {/* Search */}
                <div className="relative min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search student or reason..."
                    value={anomaliesSearch}
                    onChange={(e) => setAnomaliesSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                  />
                </div>

                {/* Review Status Filter */}
                <select
                  value={anomaliesStatusFilter}
                  onChange={(e) => setAnomaliesStatusFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-300 px-2.5 py-1.5 rounded-lg focus:outline-none"
                >
                  <option value="ALL">All Review Statuses</option>
                  <option value="NEEDS_REVIEW">Needs Review</option>
                  <option value="REVIEWED">Reviewed</option>
                  <option value="NEEDS_FURTHER_INVESTIGATION">Needs Further Investigation</option>
                  <option value="DISMISSED">Dismissed</option>
                </select>

                {/* Platform Filter */}
                <select
                  value={anomaliesPlatformFilter}
                  onChange={(e) => setAnomaliesPlatformFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-300 px-2.5 py-1.5 rounded-lg focus:outline-none"
                >
                  <option value="ALL">All Platforms</option>
                  <option value="leetcode">LeetCode</option>
                  <option value="gfg">GeeksforGeeks</option>
                  <option value="hackerrank">HackerRank</option>
                  <option value="codeforces">Codeforces</option>
                  <option value="codechef">CodeChef</option>
                  <option value="all">Multi-Platform</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleRunAnomalyScan}
                  loading={scanningAnomalies}
                  icon={RefreshCw}
                >
                  Run Anomaly Scan
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleExportCsv('anomalies')}
                  icon={Download}
                >
                  Export CSV
                </Button>
              </div>
            </div>
          </Card>

          {/* Anomalies List */}
          {anomaliesLoading ? (
            <LoadingState message="Scanning historical baseline and unusual activity flags..." />
          ) : !anomaliesData?.hasHistoricalData ? (
            <Card className="p-8 text-center bg-slate-900/60 border-slate-800 space-y-3">
              <Clock className="w-8 h-8 text-amber-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-200">Insufficient history for reliable comparison</h3>
              <p className="text-xs text-slate-400 max-w-lg mx-auto">
                Evidence-based anomaly detection requires establishing historical baselines from successive snapshots. As platforms sync, baseline statistics will automatically evaluate spikes transparently.
              </p>
            </Card>
          ) : anomaliesData?.anomalies?.length === 0 ? (
            <EmptyState
              title="No unusual activity detected"
              message="All recorded student problem-solving activity is consistent with historical baselines."
            />
          ) : (
            <div className="space-y-3">
              {anomaliesData.anomalies.map((item) => (
                <Card
                  key={item.id}
                  className="p-5 border-slate-800/90 bg-slate-900/90 hover:border-slate-700 transition"
                >
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      {/* Top Badges & Identity */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-white hover:text-brand-300 cursor-pointer" onClick={() => navigate(`/students/${item.studentId}`)}>
                          {item.studentName}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">({item.rollNumber})</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-xs text-slate-300">{item.department}</span>

                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 uppercase">
                          {item.platform}
                        </span>

                        {/* Review Status Badge */}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.reviewStatus === 'NEEDS_REVIEW'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : item.reviewStatus === 'REVIEWED'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : item.reviewStatus === 'NEEDS_FURTHER_INVESTIGATION'
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {item.reviewStatus?.replace(/_/g, ' ')}
                        </span>

                        {/* Severity */}
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            item.severity === 'CRITICAL'
                              ? 'bg-rose-950 text-rose-400 border border-rose-900'
                              : item.severity === 'HIGH'
                              ? 'bg-amber-950 text-amber-400 border border-amber-900'
                              : 'bg-sky-950 text-sky-400 border border-sky-900'
                          }`}
                        >
                          {item.severity} SEVERITY
                        </span>
                      </div>

                      {/* Detection Reason */}
                      <p className="text-xs text-slate-300 font-medium leading-relaxed">
                        {item.detectionReason}
                      </p>

                      {/* Supporting Evidence Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
                        <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
                          <span className="text-[10px] text-slate-500 block">Observed Activity</span>
                          <span className="text-sm font-bold text-amber-400 font-mono">
                            {item.observedCount} solves
                          </span>
                        </div>

                        <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
                          <span className="text-[10px] text-slate-500 block">Previous Baseline</span>
                          <span className="text-sm font-bold text-slate-300 font-mono">
                            {item.baselineCount} solves/day
                          </span>
                        </div>

                        <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
                          <span className="text-[10px] text-slate-500 block">Increase</span>
                          <span className="text-sm font-bold text-emerald-400 font-mono">
                            +{item.absoluteIncrease} ({item.relativeIncreasePct ? `+${item.relativeIncreasePct}%` : 'first burst'})
                          </span>
                        </div>

                        <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
                          <span className="text-[10px] text-slate-500 block">Data Confidence</span>
                          <span className="text-sm font-bold text-sky-400">
                            {item.dataConfidence}
                          </span>
                        </div>
                      </div>

                      {/* Review Trail Note */}
                      {item.reviewedBy && (
                        <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800/70">
                          Reviewed by <strong className="text-slate-200">{item.reviewedBy}</strong> on {item.reviewedAt ? new Date(item.reviewedAt).toLocaleDateString() : '—'}
                          {item.reviewNotes && <span>: "{item.reviewNotes}"</span>}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex sm:flex-col items-center gap-2 w-full lg:w-auto">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => openReviewModal(item)}
                        icon={CheckCircle2}
                        className="w-full sm:w-auto"
                      >
                        Update Review
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/students/${item.studentId}`)}
                        icon={Eye}
                        className="w-full sm:w-auto"
                      >
                        Student Detail
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB C: OVERALL ACTIVITY TRENDS */}
      {/* ========================================================================= */}
      {activeTab === 'trends' && (
        <div className="space-y-5">
          {/* Controls Bar */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-slate-200">Cohort Problem Solving Trends</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Time Window:</span>
              <select
                value={trendsDays}
                onChange={(e) => setTrendsDays(Number(e.target.value))}
                className="bg-slate-900 border border-slate-800 text-xs text-slate-200 px-3 py-1.5 rounded-lg focus:outline-none"
              >
                <option value={7}>Last 7 Days</option>
                <option value={14}>Last 14 Days</option>
                <option value={30}>Last 30 Days</option>
              </select>
            </div>
          </div>

          {trendsLoading ? (
            <LoadingState message="Aggregating daily problem-solving trend data..." />
          ) : !trendsData?.hasHistoricalData ? (
            <Card className="p-8 text-center bg-slate-900/60 border-slate-800 space-y-3">
              <Clock className="w-8 h-8 text-amber-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-200">Historical activity data is not available yet</h3>
              <p className="text-xs text-slate-400 max-w-lg mx-auto">
                Daily activity curves will appear once multiple snapshots are persisted across subsequent days.
              </p>
            </Card>
          ) : (
            <div className="space-y-5">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-4 bg-slate-900 border-slate-800">
                  <span className="text-xs text-slate-400">Total Period Solves</span>
                  <div className="text-2xl font-black text-brand-400 mt-1">
                    {trendsData.totalPeriodSolves}
                  </div>
                  <span className="text-[11px] text-slate-500">Across all students & platforms</span>
                </Card>

                <Card className="p-4 bg-slate-900 border-slate-800">
                  <span className="text-xs text-slate-400">Daily Average Solves</span>
                  <div className="text-2xl font-black text-emerald-400 mt-1">
                    {(trendsData.totalPeriodSolves / trendsData.periodDays).toFixed(1)}
                  </div>
                  <span className="text-[11px] text-slate-500">Average solves per day</span>
                </Card>

                <Card className="p-4 bg-slate-900 border-slate-800">
                  <span className="text-xs text-slate-400">Active Window</span>
                  <div className="text-lg font-bold text-slate-200 mt-1">
                    {trendsData.startDate} → {trendsData.endDate}
                  </div>
                  <span className="text-[11px] text-slate-500">Asia/Kolkata Calendar</span>
                </Card>
              </div>

              {/* Day-by-Day Activity List / Bars */}
              <Card className="p-5 border-slate-800 bg-slate-900">
                <h3 className="text-xs font-bold text-slate-200 mb-4">Daily Verified Solves</h3>
                <div className="space-y-2">
                  {trendsData.dailyTrends.map((d) => (
                    <div key={d.date} className="flex items-center gap-3 text-xs">
                      <span className="w-24 text-slate-400 font-mono text-[11px]">{d.date}</span>
                      <div className="flex-1 bg-slate-950 rounded-full h-3 overflow-hidden flex border border-slate-800">
                        {d.totalSolves > 0 ? (
                          <div
                            className="bg-brand-500 h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, Math.max(5, (d.totalSolves / Math.max(1, trendsData.totalPeriodSolves)) * 100 * 4))}%`,
                            }}
                          />
                        ) : null}
                      </div>
                      <span className="w-16 text-right font-mono text-slate-200 font-bold">
                        {d.totalSolves} solves
                      </span>
                      <span className="w-20 text-right text-[11px] text-slate-400">
                        {d.activeStudentsCount} active
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Review Modal */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title="Review Activity Anomaly"
        subtitle={`Student: ${selectedAnomaly?.studentName || ''} (${selectedAnomaly?.rollNumber || ''})`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmitReview} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Review Status
            </label>
            <select
              value={reviewStatusChoice}
              onChange={(e) => setReviewStatusChoice(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-brand-500"
            >
              <option value="REVIEWED">Reviewed (Acceptable / Clarified)</option>
              <option value="NEEDS_FURTHER_INVESTIGATION">Needs Further Investigation</option>
              <option value="DISMISSED">Dismissed (False Positive / Anomaly Cleared)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Administrative Review Notes / Justification
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Student participated in official contest; baseline verified."
              value={reviewReason}
              onChange={(e) => setReviewReason(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-400">
            Note: This action records an entry in the system audit log and updates the review status. It does not automatically modify student scores or account privileges.
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setReviewModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={submittingReview}
            >
              Save Review
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ActivityMonitor;
