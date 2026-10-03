import React from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import { ExternalLink, CheckCircle2, AlertCircle, Clock, RefreshCw, XCircle } from 'lucide-react';

const PLATFORM_META = {
  leetcode: {
    name: 'LeetCode',
    dotColor: 'bg-amber-500',
    borderColor: 'border-amber-200',
    bgLight: 'bg-amber-50/40',
  },
  gfg: {
    name: 'GeeksforGeeks',
    dotColor: 'bg-emerald-600',
    borderColor: 'border-emerald-200',
    bgLight: 'bg-emerald-50/40',
  },
  codeforces: {
    name: 'Codeforces',
    dotColor: 'bg-blue-600',
    borderColor: 'border-blue-200',
    bgLight: 'bg-blue-50/40',
  },
  codechef: {
    name: 'CodeChef',
    dotColor: 'bg-orange-700',
    borderColor: 'border-orange-200',
    bgLight: 'bg-orange-50/40',
  },
};

const PlatformCard = ({
  platformKey,
  platformConfig = {},
  stats = null,
  onRefreshSingle,
  refreshing = false,
}) => {
  const meta = PLATFORM_META[platformKey.toLowerCase()] || {
    name: platformKey,
    dotColor: 'bg-slate-600',
    borderColor: 'border-slate-200',
    bgLight: 'bg-slate-50',
  };

  const status = platformConfig?.status || 'NOT_CONNECTED';
  const username = platformConfig?.username || '';
  const profileUrl = platformConfig?.profileUrl || '';
  const lastFetchedAt = platformConfig?.lastFetchedAt;
  const errorMessage = platformConfig?.errorMessage;

  const isConnected = !!username;

  return (
    <Card className={`overflow-hidden border ${meta.borderColor} hover:shadow-card-hover transition-all`}>
      {/* Header */}
      <div className={`px-5 py-3.5 border-b border-slate-100 ${meta.bgLight} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${meta.dotColor}`}></span>
          <h3 className="font-bold text-slate-900 text-sm">{meta.name}</h3>
        </div>

        {/* Status Badge */}
        <div>
          {status === 'SUCCESS' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" /> Synced
            </span>
          )}
          {status === 'FETCHING' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <RefreshCw className="w-3 h-3 animate-spin" /> Fetching...
            </span>
          )}
          {status === 'PENDING' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <Clock className="w-3 h-3 animate-pulse" /> Pending
            </span>
          )}
          {status === 'FAILED' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
              <AlertCircle className="w-3 h-3" /> Sync Failed
            </span>
          )}
          {status === 'NOT_CONNECTED' && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500">
              Not Linked
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        {isConnected ? (
          <div className="space-y-4">
            {/* User handle header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 font-medium text-[11px] block">Username</span>
                <span className="font-bold text-slate-900 text-sm font-mono">
                  {username}
                </span>
              </div>
              {profileUrl && (
                <a
                  href={profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-800 font-medium text-xs hover:underline"
                >
                  View Profile <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Platform statistics */}
            {status === 'SUCCESS' && stats ? (
              <div className="space-y-3.5">
                {/* Solved + Rating KPI */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Problems Solved
                    </span>
                    <span className="text-2xl font-black text-slate-900 font-mono mt-0.5 block">
                      {stats.totalSolved ?? 0}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      {platformKey === 'gfg' ? 'Coding Score' : 'Contest Rating'}
                    </span>
                    <span className="text-2xl font-black text-slate-900 font-mono mt-0.5 block">
                      {stats.rating ? (
                        <>
                          {stats.rating}
                          {platformKey !== 'gfg' && <span className="text-xs text-amber-500 ml-1">★</span>}
                        </>
                      ) : (
                        <span className="text-sm font-normal text-slate-400">Unrated</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Difficulty breakdown for LeetCode & GFG */}
                {(stats.easySolved !== null || stats.mediumSolved !== null || stats.hardSolved !== null) && (
                  <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-500 block mb-2">
                      Difficulty Breakdown
                    </span>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-white p-2 rounded border border-emerald-200">
                        <span className="text-[10px] uppercase font-bold text-emerald-700 block">Easy</span>
                        <span className="font-bold text-emerald-950 font-mono text-sm">{stats.easySolved ?? 0}</span>
                      </div>
                      <div className="bg-white p-2 rounded border border-amber-200">
                        <span className="text-[10px] uppercase font-bold text-amber-700 block">Medium</span>
                        <span className="font-bold text-amber-950 font-mono text-sm">{stats.mediumSolved ?? 0}</span>
                      </div>
                      <div className="bg-white p-2 rounded border border-red-200">
                        <span className="text-[10px] uppercase font-bold text-red-700 block">Hard</span>
                        <span className="font-bold text-red-950 font-mono text-sm">{stats.hardSolved ?? 0}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Contests or Streak */}
                {(stats.contests !== null || stats.streak !== null || stats.maxRating !== null) && (
                  <div className="flex items-center justify-between text-xs text-slate-600 px-1 pt-1">
                    {stats.contests !== null && (
                      <span>Contests: <strong className="text-slate-900 font-mono">{stats.contests}</strong></span>
                    )}
                    {stats.streak !== null && (
                      <span>Active Streak: <strong className="text-slate-900 font-mono">{stats.streak} days</strong></span>
                    )}
                    {stats.maxRating !== null && (
                      <span>Max Rating: <strong className="text-slate-900 font-mono">{stats.maxRating}</strong></span>
                    )}
                  </div>
                )}

                {/* Platform Sync Timestamp Footer */}
                {lastFetchedAt && (
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">
                      Synced {new Date(lastFetchedAt).toLocaleDateString()}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Status: <strong className="text-emerald-600">Active</strong>
                    </span>
                  </div>
                )}
              </div>
            ) : status === 'FAILED' ? (
              <div className="py-4 text-center text-xs space-y-2">
                <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">
                  <AlertCircle className="w-4 h-4 mx-auto mb-1 text-red-600" />
                  <p className="font-medium">Statistics unavailable</p>
                  <p className="text-[11px] text-red-600 mt-0.5">
                    {errorMessage || `Could not retrieve data for handle "${username}". Verify the profile is public.`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-500">
                <Clock className="w-5 h-5 mx-auto text-amber-500 mb-1.5 animate-pulse" />
                Statistics synchronization pending...
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs">
            <p>No {meta.name} profile connected.</p>
            <p className="text-slate-500 mt-1">Submit your profile URL to include your performance in your college rank.</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default PlatformCard;
