import React, { useState, useEffect, useCallback } from 'react';
import { adminService } from '../services/adminService';
import { subscribeToAdminUpdates } from '../services/supabase';
import { useNotifications } from '../context/NotificationContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import {
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  RefreshCw,
  ExternalLink,
  Activity,
  Terminal,
  Users,
  ShieldAlert,
  HelpCircle,
  TrendingUp,
  Award,
} from 'lucide-react';

const formatRelativeTime = (dateStr) => {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Never';

  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const Platforms = () => {
  const { notifySuccess, notifyError } = useNotifications();

  const [platformStats, setPlatformStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Test Connectivity Modal
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testPlatform, setTestPlatform] = useState('leetcode');
  const [testHandle, setTestHandle] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const fetchStats = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      if (platformStats) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
    }
    setError(null);
    try {
      const response = await adminService.getPlatformStats();
      if (response && response.success) {
        setPlatformStats(response.platforms || response.stats || {});
      } else {
        throw new Error(response?.message || 'Failed to retrieve telemetry data.');
      }
    } catch (err) {
      console.error('Failed to load platform stats:', err);
      if (!isBackground) {
        setError(err.message || 'Unable to load platform telemetry.');
        notifyError(err.message || 'Failed to refresh telemetry.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [platformStats, notifyError]);

  useEffect(() => {
    fetchStats();
  }, []);

  // Realtime subscription for sync/student updates
  useEffect(() => {
    const unsubscribe = subscribeToAdminUpdates(() => {
      fetchStats(true);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [fetchStats]);

  const openTestModal = (platKey) => {
    setTestPlatform(platKey);
    const data = platformStats?.[platKey];
    setTestHandle(data?.sampleHandle || '');
    setTestResult(null);
    setIsTestModalOpen(true);
  };

  const handleTestConnectivity = async (e) => {
    if (e) e.preventDefault();
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await adminService.testPlatformConnectivity(testPlatform, testHandle.trim());
      setTestResult(res);
      if (res.success) {
        notifySuccess(`${testPlatform.toUpperCase()} scraper test succeeded (${res.durationMs}ms)`);
        // Refresh telemetry in the background to update stats
        fetchStats(true);
      } else {
        notifyError(res.error || res.message || 'Scraper test failed.');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Platform test execution failed.';
      notifyError(errMsg);
      setTestResult({
        success: false,
        platform: testPlatform,
        handle: testHandle,
        error: errMsg,
        message: errMsg,
      });
    } finally {
      setTestLoading(false);
    }
  };

  if (loading && !platformStats) {
    return <LoadingState message="Connecting to platform telemetry..." />;
  }

  if (error && !platformStats) {
    return <ErrorState message={error} onRetry={() => fetchStats(false)} />;
  }

  const platformsList = [
    {
      key: 'leetcode',
      label: 'LeetCode',
      color: 'amber',
      icon: 'LC',
      weight: '40%',
      internalWeights: 'Easy (30%) • Medium (40%) • Hard (30%)',
      isScoring: true,
    },
    {
      key: 'gfg',
      label: 'GeeksforGeeks',
      color: 'emerald',
      icon: 'GFG',
      weight: '30%',
      internalWeights: 'Easy (30%) • Medium (40%) • Hard (30%) • School/Basic (0%)',
      isScoring: true,
    },
    {
      key: 'hackerrank',
      label: 'HackerRank',
      color: 'emerald',
      icon: 'HR',
      weight: '30%',
      internalWeights: 'Solved problems, skill stars, and domain badges',
      isScoring: true,
    },
    {
      key: 'codeforces',
      label: 'Codeforces',
      color: 'sky',
      icon: 'CF',
      weight: '0% (Statistics Only)',
      internalWeights: 'Non-scoring: Real-time contest ratings & problems solved',
      isScoring: false,
    },
    {
      key: 'codechef',
      label: 'CodeChef',
      color: 'rose',
      icon: 'CC',
      weight: '0% (Statistics Only)',
      internalWeights: 'Non-scoring: Real-time global ratings, stars & problems solved',
      isScoring: false,
    },
  ];

  const getHealthBadge = (health, connected) => {
    if (connected === 0 || health === 'NOT_CONFIGURED') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
          <HelpCircle className="w-3 h-3 text-slate-400" />
          Not Configured
        </span>
      );
    }
    if (health === 'FAILED') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
          <ShieldAlert className="w-3 h-3 text-rose-400" />
          Failed
        </span>
      );
    }
    if (health === 'WARNING') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <AlertCircle className="w-3 h-3 text-amber-400" />
          Warning
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
        Healthy
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand-400" />
            <span>Platform Services & Integration</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor scraper health, data-fetching telemetry, and connectivity status across all 5 coding platforms.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchStats(false)}
            loading={refreshing}
            icon={RefreshCw}
          >
            {refreshing ? 'Refreshing...' : 'Refresh Telemetry'}
          </Button>
        </div>
      </div>

      {/* Platform Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {platformsList.map(({ key, label, color, icon, weight, internalWeights, isScoring }) => {
          const data = platformStats?.[key] || {};
          const connectedCount = data.connected || 0;
          const successCount = data.success || 0;
          const failedCount = data.failed || 0;
          const pendingCount = data.pending || 0;
          const completedCount = successCount + failedCount;
          const successRate =
            data.successRate !== null && data.successRate !== undefined
              ? data.successRate
              : completedCount > 0
              ? Math.round((successCount / completedCount) * 100)
              : null;

          return (
            <Card key={key} className="p-5 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-xs shadow-sm ${
                      color === 'amber'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : color === 'emerald'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : color === 'sky'
                        ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-slate-100">{label}</h3>
                      {isScoring ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand-950 text-brand-400 border border-brand-800">
                          Scoring
                        </span>
                      ) : (
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          Stats only
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Weight: <strong className="text-slate-200">{weight}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  {getHealthBadge(data.health, connectedCount)}
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => openTestModal(key)}
                    icon={Activity}
                    className="mt-1"
                  >
                    Test Scraper
                  </Button>
                </div>
              </div>

              {/* Internal Weights & Overview */}
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300">
                <div className="flex items-center justify-between font-mono text-[10px] text-slate-400 mb-1 border-b border-slate-800/80 pb-1">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-brand-400" />
                    Linked Students: <strong className="text-slate-200">{connectedCount}</strong>
                  </span>
                  {data.totalSolved !== undefined && data.totalSolved > 0 && (
                    <span className="text-emerald-400">
                      Solved: <strong className="text-emerald-300">{data.totalSolved.toLocaleString()}</strong>
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  <span className="text-slate-300 font-medium">Scoring: </span>
                  {internalWeights}
                </div>
              </div>

              {/* Status Metrics Grid */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-medium">Connected</div>
                  <div className="text-base font-bold text-slate-100 mt-0.5">{connectedCount}</div>
                </div>

                <div className="p-2 rounded-lg bg-slate-950 border border-emerald-900/40 bg-emerald-950/10">
                  <div className="text-[10px] text-emerald-400 font-medium">Success</div>
                  <div className="text-base font-bold text-emerald-300 mt-0.5">{successCount}</div>
                </div>

                <div className="p-2 rounded-lg bg-slate-950 border border-rose-900/40 bg-rose-950/10">
                  <div className="text-[10px] text-rose-400 font-medium">Failed</div>
                  <div className="text-base font-bold text-rose-300 mt-0.5">{failedCount}</div>
                </div>

                <div className="p-2 rounded-lg bg-slate-950 border border-amber-900/40 bg-amber-950/10">
                  <div className="text-[10px] text-amber-400 font-medium">Pending</div>
                  <div className="text-base font-bold text-amber-300 mt-0.5">{pendingCount}</div>
                </div>
              </div>

              {/* Success Rate Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Sync Success Rate</span>
                  <span className="font-semibold text-slate-200">
                    {successRate !== null ? `${successRate}%` : 'No data'}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      successRate === null
                        ? 'bg-slate-700 w-0'
                        : successRate >= 80
                        ? 'bg-emerald-500'
                        : successRate >= 50
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: successRate !== null ? `${successRate}%` : '0%' }}
                  />
                </div>
              </div>

              {/* Last Fetch Timestamps */}
              <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/60 flex flex-col gap-1 font-mono text-[10px]">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Last Success:</span>
                  <span className={data.lastSuccess ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
                    {formatRelativeTime(data.lastSuccess)}
                  </span>
                </div>
                <div className="flex justify-between items-center truncate">
                  <span className="text-slate-400">Last Error:</span>
                  <span
                    className={`truncate max-w-[180px] ${data.lastError ? 'text-rose-400' : 'text-slate-500'}`}
                    title={data.lastError || 'None'}
                  >
                    {data.lastError || (data.lastFailed ? formatRelativeTime(data.lastFailed) : 'None')}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Connectivity Test Modal */}
      <Modal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        title={`Test ${testPlatform.toUpperCase()} Scraper`}
        subtitle="Executes a live scraper diagnostic fetch against the actual platform service without altering student scores."
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleTestConnectivity} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Test Profile Handle / URL
            </label>
            <input
              type="text"
              placeholder="Leave empty to test with a real linked student"
              value={testHandle}
              onChange={(e) => setTestHandle(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-brand-500 font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              If left blank, the backend will automatically pick an existing linked student from the database.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsTestModalOpen(false)}>
              Close
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={testLoading}
              disabled={testLoading}
              icon={Zap}
            >
              {testLoading ? 'Testing...' : 'Run Live Test'}
            </Button>
          </div>

          {/* Test Result Terminal Box */}
          {testResult && (
            <div className="mt-4 p-3.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold flex items-center gap-1.5 text-slate-200">
                  <Terminal className="w-4 h-4 text-brand-400" />
                  Diagnostic Report ({testResult.platform?.toUpperCase()})
                </span>
                <Badge variant={testResult.success ? 'success' : 'danger'}>
                  {testResult.success ? `SUCCESS (${testResult.durationMs}ms)` : 'FAILED'}
                </Badge>
              </div>

              {testResult.success && testResult.stats ? (
                <div className="space-y-2">
                  <div className="text-[11px] text-slate-400">
                    Profile Tested: <span className="text-slate-200 font-bold">{testResult.handle}</span>
                  </div>

                  {/* Platform-specific structured results */}
                  {testResult.platform === 'leetcode' && (
                    <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                      <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                        <div className="text-emerald-400 text-[10px]">Easy</div>
                        <div className="font-bold text-slate-100">{testResult.stats.easySolved ?? 0}</div>
                      </div>
                      <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                        <div className="text-amber-400 text-[10px]">Medium</div>
                        <div className="font-bold text-slate-100">{testResult.stats.mediumSolved ?? 0}</div>
                      </div>
                      <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                        <div className="text-rose-400 text-[10px]">Hard</div>
                        <div className="font-bold text-slate-100">{testResult.stats.hardSolved ?? 0}</div>
                      </div>
                      <div className="p-1.5 bg-slate-900 rounded border border-brand-500/30">
                        <div className="text-brand-400 text-[10px]">Total</div>
                        <div className="font-bold text-brand-300">{testResult.stats.totalSolved ?? 0}</div>
                      </div>
                    </div>
                  )}

                  {testResult.platform === 'gfg' && (
                    <div className="grid grid-cols-5 gap-1.5 text-center text-[10px]">
                      <div className="p-1 bg-slate-900 rounded border border-slate-800">
                        <div className="text-slate-400">School</div>
                        <div className="font-bold text-slate-200">{testResult.stats.schoolSolved ?? 0}</div>
                      </div>
                      <div className="p-1 bg-slate-900 rounded border border-slate-800">
                        <div className="text-slate-400">Basic</div>
                        <div className="font-bold text-slate-200">{testResult.stats.basicSolved ?? 0}</div>
                      </div>
                      <div className="p-1 bg-slate-900 rounded border border-slate-800">
                        <div className="text-emerald-400">Easy</div>
                        <div className="font-bold text-emerald-300">{testResult.stats.easySolved ?? 0}</div>
                      </div>
                      <div className="p-1 bg-slate-900 rounded border border-slate-800">
                        <div className="text-amber-400">Medium</div>
                        <div className="font-bold text-amber-300">{testResult.stats.mediumSolved ?? 0}</div>
                      </div>
                      <div className="p-1 bg-slate-900 rounded border border-slate-800">
                        <div className="text-rose-400">Hard</div>
                        <div className="font-bold text-rose-300">{testResult.stats.hardSolved ?? 0}</div>
                      </div>
                    </div>
                  )}

                  {testResult.platform === 'hackerrank' && (
                    <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                      <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                        <div className="text-slate-400 text-[10px]">Problems Solved</div>
                        <div className="font-bold text-emerald-300">{testResult.stats.totalSolved ?? 0}</div>
                      </div>
                      <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                        <div className="text-slate-400 text-[10px]">Badges</div>
                        <div className="font-bold text-amber-300">
                          {testResult.stats.badgesCount ?? (Array.isArray(testResult.stats.badges) ? testResult.stats.badges.length : 0)}
                        </div>
                      </div>
                      <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                        <div className="text-slate-400 text-[10px]">Certificates</div>
                        <div className="font-bold text-brand-300">
                          {testResult.stats.certificatesCount ?? (Array.isArray(testResult.stats.certificates) ? testResult.stats.certificates.length : 0)}
                        </div>
                      </div>
                    </div>
                  )}

                  {testResult.platform === 'codeforces' && (
                    <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                      <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                        <div className="text-slate-400 text-[10px]">Rating</div>
                        <div className="font-bold text-sky-400">{testResult.stats.rating ?? 'Unrated'}</div>
                      </div>
                      <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                        <div className="text-slate-400 text-[10px]">Max Rating</div>
                        <div className="font-bold text-indigo-300">{testResult.stats.maxRating ?? 'N/A'}</div>
                      </div>
                      <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                        <div className="text-slate-400 text-[10px]">Problems Solved</div>
                        <div className="font-bold text-emerald-300">{testResult.stats.totalSolved ?? 0}</div>
                      </div>
                    </div>
                  )}

                  {testResult.platform === 'codechef' && (
                    <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                      <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                        <div className="text-slate-400 text-[10px]">Stars / Rating</div>
                        <div className="font-bold text-rose-400">
                          {testResult.stats.stars || '1★'} ({testResult.stats.rating ?? 'N/A'})
                        </div>
                      </div>
                      <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                        <div className="text-slate-400 text-[10px]">Global Rank</div>
                        <div className="font-bold text-slate-200">{testResult.stats.globalRank ?? 'N/A'}</div>
                      </div>
                      <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                        <div className="text-slate-400 text-[10px]">Problems Solved</div>
                        <div className="font-bold text-emerald-300">{testResult.stats.totalSolved ?? 0}</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[11px] text-rose-400 p-2 rounded bg-rose-950/30 border border-rose-900/40">
                  <div className="font-bold">Failure Reason:</div>
                  <div className="mt-0.5">{testResult.error || testResult.message || 'Scraper failed to parse profile.'}</div>
                </div>
              )}

              {/* Raw JSON toggle / display */}
              <details className="text-[10px] text-slate-400 pt-1">
                <summary className="cursor-pointer hover:text-slate-200">View Raw Diagnostics JSON</summary>
                <pre className="mt-2 text-[10px] text-slate-300 bg-slate-900/80 p-2 rounded border border-slate-800 overflow-x-auto max-h-40 whitespace-pre-wrap">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
};

export default Platforms;
