import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { useNotifications } from '../context/NotificationContext';
import { Card, CardHeader, CardContent } from '../components/common/Card';
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
} from 'lucide-react';

export const Platforms = () => {
  const { notifySuccess, notifyError } = useNotifications();

  const [platformStats, setPlatformStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Test Connectivity Modal
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testPlatform, setTestPlatform] = useState('leetcode');
  const [testHandle, setTestHandle] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminService.getPlatformStats();
      if (response.success) {
        setPlatformStats(response.platforms);
      }
    } catch (err) {
      console.error('Failed to load platform stats:', err);
      setError(err.message || 'Failed to retrieve platform metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const openTestModal = (platKey) => {
    setTestPlatform(platKey);
    setTestHandle(platKey === 'leetcode' ? 'tourist' : platKey === 'gfg' ? 'sandeep_jain' : 'tourist');
    setTestResult(null);
    setIsTestModalOpen(true);
  };

  const handleTestConnectivity = async (e) => {
    e.preventDefault();
    if (!testHandle.trim()) return;
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await adminService.testPlatformConnectivity(testPlatform, testHandle.trim());
      setTestResult(res);
      if (res.success) {
        notifySuccess(`Connectivity verified (${res.durationMs}ms)`);
      } else {
        notifyError('Platform responded with failure.');
      }
    } catch (err) {
      notifyError(err.message || 'Connectivity test failed.');
      setTestResult({ success: false, error: err.message });
    } finally {
      setTestLoading(false);
    }
  };

  if (loading && !platformStats) {
    return <LoadingState message="Connecting to platform telemetry..." />;
  }

  if (error && !platformStats) {
    return <ErrorState message={error} onRetry={fetchStats} />;
  }

  const platformsList = [
    { key: 'leetcode', label: 'LeetCode', color: 'amber', icon: 'LC' },
    { key: 'gfg', label: 'GeeksforGeeks', color: 'emerald', icon: 'GFG' },
    { key: 'codeforces', label: 'Codeforces', color: 'sky', icon: 'CF' },
    { key: 'codechef', label: 'CodeChef', color: 'rose', icon: 'CC' },
  ];

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
            Monitor scraper health, data-fetching telemetry, and connectivity status across all 4 coding platforms.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" onClick={fetchStats} icon={RefreshCw}>
            Refresh Telemetry
          </Button>
        </div>
      </div>

      {/* Platform Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {platformsList.map(({ key, label, color, icon }) => {
          const data = platformStats?.[key] || {};
          const totalConnected = data.connected || 0;
          const successRate = totalConnected > 0 ? Math.round((data.success / totalConnected) * 100) : 0;

          return (
            <Card key={key} className="p-5 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs shadow-sm ${
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
                    <h3 className="text-sm font-bold text-slate-100">{label}</h3>
                    <p className="text-[11px] text-slate-400">Weight: <strong className="text-slate-200">{data.weight}</strong></p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => openTestModal(key)}
                  icon={Activity}
                >
                  Test Scraper
                </Button>
              </div>

              {/* Internal Weights Info */}
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300">
                <span className="text-slate-400 font-medium">Scoring Weights: </span>
                {data.internalWeights}
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                  <div className="text-[10px] text-slate-400 font-medium">Connected</div>
                  <div className="text-base font-bold text-slate-100 mt-0.5">{data.connected}</div>
                </div>

                <div className="p-2 rounded-lg bg-slate-950 border border-emerald-900/40 bg-emerald-950/10">
                  <div className="text-[10px] text-emerald-400 font-medium">Success</div>
                  <div className="text-base font-bold text-emerald-300 mt-0.5">{data.success}</div>
                </div>

                <div className="p-2 rounded-lg bg-slate-950 border border-rose-900/40 bg-rose-950/10">
                  <div className="text-[10px] text-rose-400 font-medium">Failed</div>
                  <div className="text-base font-bold text-rose-300 mt-0.5">{data.failed}</div>
                </div>

                <div className="p-2 rounded-lg bg-slate-950 border border-amber-900/40 bg-amber-950/10">
                  <div className="text-[10px] text-amber-400 font-medium">Pending</div>
                  <div className="text-base font-bold text-amber-300 mt-0.5">{data.pending}</div>
                </div>
              </div>

              {/* Success Rate Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Sync Success Rate</span>
                  <span className="font-semibold text-slate-200">{successRate}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${successRate}%` }}
                  />
                </div>
              </div>

              {/* Last Fetch Timestamps */}
              <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/60 flex justify-between font-mono">
                <span>Last Success: {data.lastSuccess ? new Date(data.lastSuccess).toLocaleTimeString() : 'Never'}</span>
                <span>Last Error: {data.lastFailed ? new Date(data.lastFailed).toLocaleTimeString() : 'None'}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Connectivity Test Modal */}
      <Modal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        title={`Test ${testPlatform.toUpperCase()} Connectivity`}
        subtitle="Verify that the live scraper service can successfully resolve profile statistics."
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleTestConnectivity} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Test Username / Profile URL
            </label>
            <input
              type="text"
              required
              placeholder="e.g. tourist or https://..."
              value={testHandle}
              onChange={(e) => setTestHandle(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-brand-500 font-mono"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsTestModalOpen(false)}>
              Close
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={testLoading} icon={Zap}>
              Run Live Test
            </Button>
          </div>

          {/* Test Result Terminal Box */}
          {testResult && (
            <div className="mt-4 p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-brand-400" />
                  Test Output
                </span>
                <Badge variant={testResult.success ? 'success' : 'danger'}>
                  {testResult.success ? `SUCCESS (${testResult.durationMs}ms)` : 'FAILED'}
                </Badge>
              </div>
              <pre className="text-[11px] text-slate-300 overflow-x-auto max-h-48 whitespace-pre-wrap">
                {JSON.stringify(testResult.stats || testResult.error, null, 2)}
              </pre>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
};

export default Platforms;
