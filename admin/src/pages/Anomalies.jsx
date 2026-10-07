import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../services/adminService';
import { subscribeToAdminUpdates } from '../services/supabase';
import { useNotifications } from '../context/NotificationContext';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import {
  AlertOctagon,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  Search,
  Filter,
  ShieldAlert,
  Database,
  Layers,
  Users,
} from 'lucide-react';

export const Anomalies = () => {
  const navigate = useNavigate();
  const { notifySuccess, notifyError } = useNotifications();

  const [anomalies, setAnomalies] = useState([]);
  const [scanMeta, setScanMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [platformFilter, setPlatformFilter] = useState('ALL');

  const fetchAnomalies = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      if (anomalies.length > 0 || scanMeta) {
        setScanning(true);
      } else {
        setLoading(true);
      }
    }
    setError(null);
    try {
      const response = await adminService.getAnomalies();
      if (response && response.success) {
        setAnomalies(response.anomalies || []);
        setScanMeta(response.meta || null);
      } else {
        throw new Error(response?.message || 'Failed to detect database anomalies.');
      }
    } catch (err) {
      console.error('Failed to load anomalies:', err);
      if (!isBackground) {
        setError(err.message || 'Unable to complete database scan.');
        notifyError(err.message || 'Failed to scan database for anomalies.');
      }
    } finally {
      setLoading(false);
      setScanning(false);
    }
  }, [anomalies.length, scanMeta, notifyError]);

  useEffect(() => {
    fetchAnomalies();
  }, []);

  // Realtime updates subscription
  useEffect(() => {
    const unsubscribe = subscribeToAdminUpdates(() => {
      fetchAnomalies(true);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [fetchAnomalies]);

  const handleRetrySync = async (anomaly) => {
    setResolvingId(anomaly.id);
    try {
      const res = await adminService.resolveAnomaly({
        studentId: anomaly.studentId,
        action: 'RETRY_SYNC',
        platform: anomaly.platform,
      });
      if (res.success) {
        notifySuccess(`Synchronization triggered for ${anomaly.studentName || 'student'}.`);
        fetchAnomalies(true);
      }
    } catch (err) {
      notifyError(err.response?.data?.message || err.message || 'Failed to retry synchronization.');
    } finally {
      setResolvingId(null);
    }
  };

  const filteredAnomalies = anomalies.filter((item) => {
    if (severityFilter !== 'ALL' && item.severity !== severityFilter) return false;
    if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
    if (platformFilter !== 'ALL' && item.platform !== platformFilter) return false;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      const mName = (item.studentName || '').toLowerCase();
      const mRoll = (item.rollNumber || '').toLowerCase();
      const mTitle = (item.title || '').toLowerCase();
      const mDesc = (item.description || '').toLowerCase();
      const mPlat = (item.platform || '').toLowerCase();
      if (!mName.includes(q) && !mRoll.includes(q) && !mTitle.includes(q) && !mDesc.includes(q) && !mPlat.includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-amber-400" />
            <span>Data Integrity & Anomaly Inspector</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Identify broken platform URLs, failed synchronization attempts, and profile inconsistencies.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchAnomalies(false)}
            loading={scanning}
            disabled={scanning}
            icon={RefreshCw}
          >
            {scanning ? 'Re-scanning Database...' : 'Re-scan Database'}
          </Button>
        </div>
      </div>

      {/* Live Scan Metrics Cards */}
      {scanMeta && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
              <Users className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-medium">Students Scanned</div>
              <div className="text-base font-bold text-slate-100 mt-0.5">{scanMeta.totalStudentsScanned}</div>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
              <Layers className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-medium">Platform Links Checked</div>
              <div className="text-base font-bold text-slate-100 mt-0.5">{scanMeta.platformLinksChecked}</div>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
              <Database className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-medium">Sync Records Verified</div>
              <div className="text-base font-bold text-slate-100 mt-0.5">{scanMeta.syncRecordsChecked}</div>
            </div>
          </Card>

          <Card className={`p-4 flex items-center gap-3 ${scanMeta.anomaliesCount > 0 ? 'border-amber-900/40 bg-amber-950/10' : 'border-emerald-900/40 bg-emerald-950/10'}`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${scanMeta.anomaliesCount > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-medium">Anomalies Detected</div>
              <div className={`text-base font-bold mt-0.5 ${scanMeta.anomaliesCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {scanMeta.anomaliesCount}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Overview Notice */}
      <Card className="p-4 bg-amber-950/20 border-amber-900/40 text-xs text-amber-200 flex items-start gap-3">
        <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <p>
          Anomalies flag administrative data sync issues, invalid platform URLs, and incomplete student records for inspection.
          These represent technical synchronization inconsistencies and are not punitive flags.
        </p>
      </Card>

      {/* Filter and Search Bar */}
      <Card className="p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search anomalies by student, roll, or issue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="text-xs bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="ALL">All Categories</option>
            <option value="INVALID_URL">Invalid URLs</option>
            <option value="SYNC_FAILURE">Sync Failures</option>
            <option value="MISSING_DATA">Missing Data</option>
            <option value="DUPLICATE_RECORD">Duplicates</option>
            <option value="SCORE_INCONSISTENCY">Score Mismatches</option>
            <option value="INVALID_METADATA">Invalid Branch/Year</option>
          </select>

          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="text-xs bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="ALL">All Platforms</option>
            <option value="leetcode">LeetCode</option>
            <option value="gfg">GeeksforGeeks</option>
            <option value="hackerrank">HackerRank</option>
            <option value="codeforces">Codeforces</option>
            <option value="codechef">CodeChef</option>
          </select>
        </div>
      </Card>

      {/* Anomalies List */}
      <Card>
        <CardHeader
          title="Detected Inconsistencies"
          subtitle={`Found ${filteredAnomalies.length} actionable item${filteredAnomalies.length === 1 ? '' : 's'} across the student dataset`}
        />
        {loading && !scanMeta ? (
          <LoadingState message="Analyzing student dataset for anomalies..." />
        ) : error && !scanMeta ? (
          <ErrorState message={error} onRetry={() => fetchAnomalies(false)} />
        ) : filteredAnomalies.length === 0 ? (
          anomalies.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Zero anomalies detected"
              description="All student profiles, platform statistics, and sync logs are fully consistent across the scanned dataset."
            />
          ) : (
            <EmptyState
              icon={AlertOctagon}
              title="No anomalies match the selected filters"
              description="Try adjusting your search query, severity, category, or platform filters."
            />
          )
        ) : (
          <div className="divide-y divide-slate-800/60">
            {filteredAnomalies.map((item) => (
              <div
                key={item.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      item.severity === 'CRITICAL' || item.severity === 'HIGH'
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        : item.severity === 'MEDIUM'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-100">{item.title}</span>
                      <Badge
                        variant={
                          item.severity === 'CRITICAL' || item.severity === 'HIGH'
                            ? 'danger'
                            : item.severity === 'MEDIUM'
                            ? 'warning'
                            : 'default'
                        }
                      >
                        {item.severity}
                      </Badge>
                      {item.platform && <Badge variant="primary">{item.platform.toUpperCase()}</Badge>}
                      {item.category && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {item.category}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 mt-1">{item.description}</p>

                    <div className="text-[11px] text-slate-400 mt-1.5 flex flex-wrap items-center gap-3">
                      <span>
                        Student: <strong className="text-slate-200">{item.studentName}</strong> ({item.rollNumber || '—'})
                      </span>
                      {item.email && (
                        <>
                          <span>•</span>
                          <span className="font-mono">{item.email}</span>
                        </>
                      )}
                      {item.detectedAt && (
                        <>
                          <span>•</span>
                          <span className="text-slate-500 text-[10px]">
                            Detected: {new Date(item.detectedAt).toLocaleString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                  {item.studentId && (
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => navigate(`/students/${item.studentId}`)}
                      icon={Eye}
                    >
                      View Student
                    </Button>
                  )}

                  {(item.type === 'SYNC_FAILURE' || item.category === 'SYNC_FAILURE') && (
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={() => handleRetrySync(item)}
                      loading={resolvingId === item.id}
                      disabled={resolvingId === item.id}
                      icon={RefreshCw}
                    >
                      Retry Sync
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Anomalies;
