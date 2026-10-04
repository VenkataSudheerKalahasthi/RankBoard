import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../services/adminService';
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
} from 'lucide-react';

export const Anomalies = () => {
  const navigate = useNavigate();
  const { notifySuccess, notifyError } = useNotifications();

  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);

  const fetchAnomalies = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminService.getAnomalies();
      if (response.success) {
        setAnomalies(response.anomalies || []);
      }
    } catch (err) {
      console.error('Failed to load anomalies:', err);
      setError(err.message || 'Failed to detect anomalies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
  }, []);

  const handleRetrySync = async (anomaly) => {
    setResolvingId(anomaly.id);
    try {
      const res = await adminService.resolveAnomaly({
        studentId: anomaly.studentId,
        action: 'RETRY_SYNC',
        platform: anomaly.platform,
      });
      if (res.success) {
        notifySuccess('Synchronization retry triggered.');
        fetchAnomalies();
      }
    } catch (err) {
      notifyError(err.message || 'Failed to retry synchronization.');
    } finally {
      setResolvingId(null);
    }
  };

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
          <Button variant="secondary" size="sm" onClick={fetchAnomalies} icon={RefreshCw}>
            Re-scan Database
          </Button>
        </div>
      </div>

      {/* Overview Notice */}
      <Card className="p-4 bg-amber-950/20 border-amber-900/40 text-xs text-amber-200 flex items-start gap-3">
        <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <p>
          Anomalies flag administrative data sync issues, invalid platform URLs, and incomplete student records for inspection.
          These represent technical synchronization inconsistencies and are not punitive flags.
        </p>
      </Card>

      {/* Anomalies List */}
      <Card>
        <CardHeader
          title="Detected Inconsistencies"
          subtitle={`Found ${anomalies.length} actionable items across the student dataset`}
        />
        {loading ? (
          <LoadingState message="Analyzing student dataset for anomalies..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchAnomalies} />
        ) : anomalies.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Zero anomalies detected"
            description="All student profiles, platform statistics, and sync logs are fully consistent."
          />
        ) : (
          <div className="divide-y divide-slate-800/60">
            {anomalies.map((item) => (
              <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    item.severity === 'HIGH'
                      ? 'bg-rose-500/10 text-rose-400'
                      : item.severity === 'MEDIUM'
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    <AlertTriangle className="w-4 h-4" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-100">{item.title}</span>
                      <Badge variant={item.severity === 'HIGH' ? 'danger' : item.severity === 'MEDIUM' ? 'warning' : 'default'}>
                        {item.severity}
                      </Badge>
                      {item.platform && <Badge variant="primary">{item.platform.toUpperCase()}</Badge>}
                    </div>

                    <p className="text-xs text-slate-300 mt-1">{item.description}</p>

                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                      <span>Student: <strong className="text-slate-200">{item.studentName}</strong> ({item.rollNumber})</span>
                      <span>•</span>
                      <span className="font-mono">{item.email}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => navigate(`/students/${item.studentId}`)}
                    icon={Eye}
                  >
                    View Student
                  </Button>

                  {item.type === 'SYNC_FAILURE' && (
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={() => handleRetrySync(item)}
                      loading={resolvingId === item.id}
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
