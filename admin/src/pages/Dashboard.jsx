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

export const Dashboard = () => {
  const navigate = useNavigate();
  const { notifySuccess, notifyError } = useNotifications();

  const [stats, setStats] = useState(null);
  const [recentAudits, setRecentAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDashboardData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setError(null);
    try {
      const response = await adminService.getDashboardStats();
      if (response.success) {
        setStats(response.stats);
        setRecentAudits(response.recentAudits || []);
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
            <span className="text-xs font-semibold text-slate-400">Total Cohort</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-100">{stats?.totalStudents || 0}</div>
            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
              <span className="text-emerald-400 font-semibold">{stats?.activeStudents || 0} Active</span>
              <span>•</span>
              <span className="text-rose-400">{stats?.disabledStudents || 0} Disabled</span>
            </div>
          </div>
        </Card>

        {/* Profile Completeness */}
        <Card className="p-5 border-slate-800/80 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Profiles Linked</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-100">{stats?.profilesComplete || 0}</div>
            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
              <span className="text-slate-300">All 4 platforms linked</span>
              <span>•</span>
              <span className="text-amber-400">{stats?.profilesIncomplete || 0} incomplete</span>
            </div>
          </div>
        </Card>

        {/* Scored Students */}
        <Card className="p-5 border-slate-800/80 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Scored Students</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-100">{stats?.studentsWithScores || 0}</div>
            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
              <span className="text-slate-300">Highest: {stats?.highestScore || 0}</span>
              <span>•</span>
              <span className="text-slate-400">Avg: {stats?.averageScore || 0}</span>
            </div>
          </div>
        </Card>

        {/* Sync Success Rate */}
        <Card className="p-5 border-slate-800/80 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Platform Syncs</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <RefreshCw className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-100">{stats?.successfulSynchronizations || 0}</div>
            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
              <span className="text-emerald-400 font-semibold">{stats?.successfulSynchronizations || 0} OK</span>
              <span>•</span>
              <span className="text-rose-400 font-semibold">{stats?.failedSynchronizations || 0} Err</span>
              <span>•</span>
              <span className="text-amber-400">{stats?.pendingSynchronizations || 0} Pend</span>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* LeetCode */}
          <Card className="p-4 border-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-amber-500/10 text-amber-400 font-black text-xs flex items-center justify-center">
                  LC
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">LeetCode</div>
                  <div className="text-[10px] text-slate-400">Weight: 40%</div>
                </div>
              </div>
              <Badge variant="warning">{stats?.platformConnectedCounts?.leetcode || 0} linked</Badge>
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
                  <div className="text-[10px] text-slate-400">Weight: 30%</div>
                </div>
              </div>
              <Badge variant="success">{stats?.platformConnectedCounts?.gfg || 0} linked</Badge>
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
                  <div className="text-[10px] text-slate-400">Weight: 20%</div>
                </div>
              </div>
              <Badge variant="info">{stats?.platformConnectedCounts?.codeforces || 0} linked</Badge>
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
                  <div className="text-[10px] text-slate-400">Weight: 10%</div>
                </div>
              </div>
              <Badge variant="danger">{stats?.platformConnectedCounts?.codechef || 0} linked</Badge>
            </div>
          </Card>
        </div>
      </div>

      {/* Two Column Section: Department Breakdown + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Distribution */}
        <Card className="lg:col-span-1">
          <CardHeader
            title="Department Distribution"
            subtitle="Student enrollment across branches"
          />
          <CardContent className="p-4 space-y-3">
            {Object.keys(stats?.departmentDistribution || {}).length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No department data recorded.</p>
            ) : (
              Object.entries(stats.departmentDistribution).map(([dept, count]) => {
                const percent = stats.totalStudents > 0 ? Math.round((count / stats.totalStudents) * 100) : 0;
                return (
                  <div key={dept} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-300 truncate max-w-[180px]">{dept}</span>
                      <span className="font-semibold text-slate-400">{count} ({percent}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Recent Audit Trail */}
        <Card className="lg:col-span-2">
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
