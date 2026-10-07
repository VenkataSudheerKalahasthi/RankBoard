import React from 'react';
import Card from '../common/Card';
import { ExternalLink, CheckCircle2, AlertCircle, Clock, RefreshCw, Layers } from 'lucide-react';

const PLATFORM_META = {
  leetcode: {
    name: 'LeetCode',
    dotColor: 'bg-amber-500',
    borderColor: 'border-amber-200/80',
    bgLight: 'bg-amber-50/50',
    ratingLabel: 'Contest Rating',
  },
  gfg: {
    name: 'GeeksforGeeks',
    dotColor: 'bg-emerald-600',
    borderColor: 'border-emerald-200/80',
    bgLight: 'bg-emerald-50/50',
    ratingLabel: 'Coding Score',
  },
  hackerrank: {
    name: 'HackerRank',
    dotColor: 'bg-emerald-500',
    borderColor: 'border-emerald-200/80',
    bgLight: 'bg-emerald-50/50',
    ratingLabel: 'Badges & Stars',
  },
  codeforces: {
    name: 'Codeforces',
    dotColor: 'bg-blue-600',
    borderColor: 'border-blue-200/80',
    bgLight: 'bg-blue-50/50',
    ratingLabel: 'Contest Rating',
  },
  codechef: {
    name: 'CodeChef',
    dotColor: 'bg-orange-700',
    borderColor: 'border-orange-200/80',
    bgLight: 'bg-orange-50/50',
    ratingLabel: 'Contest Rating',
  },
};

const PlatformCard = ({
  platformKey,
  platformConfig = {},
  stats = null,
}) => {
  const pKey = platformKey?.toLowerCase() || '';
  const meta = PLATFORM_META[pKey] || {
    name: platformKey,
    dotColor: 'bg-slate-600',
    borderColor: 'border-slate-200',
    bgLight: 'bg-slate-50',
    ratingLabel: 'Rating',
  };

  const status = platformConfig?.status || 'NOT_CONNECTED';
  const username = platformConfig?.username || '';
  const profileUrl = platformConfig?.profileUrl || '';
  const lastFetchedAt = platformConfig?.lastFetchedAt;
  const errorMessage = platformConfig?.errorMessage;

  const isConnected = !!username;

  // Render secondary platform-specific badge / info box
  const renderSecondaryMetrics = () => {
    if (!stats) return null;

    if (pKey === 'gfg') {
      return (
        <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-100">
          <span className="text-[11px] font-semibold text-slate-500 block mb-2">
            Difficulty Breakdown
          </span>
          <div className="grid grid-cols-5 gap-1.5 text-center text-xs">
            <div className="bg-white p-1.5 rounded border border-slate-200 shadow-sm">
              <span className="text-[9px] uppercase font-bold text-slate-600 block">School</span>
              <span className="font-bold text-slate-900 font-mono text-xs sm:text-sm">{stats.schoolSolved ?? 0}</span>
            </div>
            <div className="bg-white p-1.5 rounded border border-slate-200 shadow-sm">
              <span className="text-[9px] uppercase font-bold text-slate-600 block">Basic</span>
              <span className="font-bold text-slate-900 font-mono text-xs sm:text-sm">{stats.basicSolved ?? 0}</span>
            </div>
            <div className="bg-white p-1.5 rounded border border-emerald-100 shadow-sm">
              <span className="text-[9px] uppercase font-bold text-emerald-700 block">Easy</span>
              <span className="font-bold text-emerald-950 font-mono text-xs sm:text-sm">{stats.easySolved ?? 0}</span>
            </div>
            <div className="bg-white p-1.5 rounded border border-amber-100 shadow-sm">
              <span className="text-[9px] uppercase font-bold text-amber-700 block">Medium</span>
              <span className="font-bold text-amber-950 font-mono text-xs sm:text-sm">{stats.mediumSolved ?? 0}</span>
            </div>
            <div className="bg-white p-1.5 rounded border border-rose-100 shadow-sm">
              <span className="text-[9px] uppercase font-bold text-rose-700 block">Hard</span>
              <span className="font-bold text-rose-950 font-mono text-xs sm:text-sm">{stats.hardSolved ?? 0}</span>
            </div>
          </div>
        </div>
      );
    }

    if (pKey === 'leetcode') {
      return (
        <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-100">
          <span className="text-[11px] font-semibold text-slate-500 block mb-2">
            Difficulty Breakdown
          </span>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-white p-2 rounded border border-emerald-100 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Easy</span>
              <span className="font-bold text-emerald-950 font-mono text-sm">{stats.easySolved ?? 0}</span>
            </div>
            <div className="bg-white p-2 rounded border border-amber-100 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-amber-700 block">Medium</span>
              <span className="font-bold text-amber-950 font-mono text-sm">{stats.mediumSolved ?? 0}</span>
            </div>
            <div className="bg-white p-2 rounded border border-rose-100 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-rose-700 block">Hard</span>
              <span className="font-bold text-rose-950 font-mono text-sm">{stats.hardSolved ?? 0}</span>
            </div>
          </div>
        </div>
      );
    }

    if (pKey === 'hackerrank') {
      return (
        <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-100">
          <span className="text-[11px] font-semibold text-slate-500 block mb-2">
            Skills & Achievements
          </span>
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="bg-white p-2 rounded border border-emerald-100 shadow-sm">
              <span className="text-[10px] uppercase font-semibold text-slate-500 block">Badges Earned</span>
              <span className="font-bold text-emerald-800 font-mono text-sm">
                {stats.badgesCount ? `${stats.badgesCount} Badges` : (stats.stars ? `${stats.stars} ★` : '—')}
              </span>
            </div>
            <div className="bg-white p-2 rounded border border-emerald-100 shadow-sm">
              <span className="text-[10px] uppercase font-semibold text-slate-500 block">Certificates</span>
              <span className="font-bold text-slate-900 font-mono text-sm">
                {stats.certificatesCount ? `${stats.certificatesCount} Verified` : '0'}
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (pKey === 'codeforces') {
      return (
        <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-100">
          <span className="text-[11px] font-semibold text-slate-500 block mb-2">
            Contest Standing
          </span>
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="bg-white p-2 rounded border border-blue-100 shadow-sm">
              <span className="text-[10px] uppercase font-semibold text-slate-500 block">Rank Tier</span>
              <span className="font-bold text-blue-900 capitalize text-sm">{stats.rankTier || 'Unranked'}</span>
            </div>
            <div className="bg-white p-2 rounded border border-blue-100 shadow-sm">
              <span className="text-[10px] uppercase font-semibold text-slate-500 block">Max Rating</span>
              <span className="font-bold text-slate-900 font-mono text-sm">{stats.maxRating || stats.rating || '—'}</span>
            </div>
          </div>
        </div>
      );
    }

    if (pKey === 'codechef') {
      return (
        <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-100">
          <span className="text-[11px] font-semibold text-slate-500 block mb-2">
            Competitive Standing
          </span>
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="bg-white p-2 rounded border border-orange-100 shadow-sm">
              <span className="text-[10px] uppercase font-semibold text-slate-500 block">Stars / Tier</span>
              <span className="font-bold text-orange-800 text-sm">{stats.stars ? `${stats.stars} ★` : '1 ★'}</span>
            </div>
            <div className="bg-white p-2 rounded border border-orange-100 shadow-sm">
              <span className="text-[10px] uppercase font-semibold text-slate-500 block">Global Rank</span>
              <span className="font-bold text-slate-900 font-mono text-sm">{stats.globalRank || '—'}</span>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  // Render extra metadata tags (streak, contests, etc.) safely
  const renderExtraTags = () => {
    if (!stats) return null;

    const tags = [];
    if (typeof stats.contests === 'number' && stats.contests > 0) {
      tags.push(`Contests: ${stats.contests}`);
    }
    if (typeof stats.streak === 'number' && stats.streak > 0) {
      tags.push(`Active Streak: ${stats.streak}d`);
    }
    if (pKey === 'gfg' && (stats.institutionRank || stats.instituteRank)) {
      tags.push(`Institute Rank: #${stats.institutionRank || stats.instituteRank}`);
    }
    if (stats.maxRating && pKey !== 'codeforces') {
      tags.push(`Max Rating: ${stats.maxRating}`);
    }

    if (tags.length === 0) return null;

    return (
      <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500 pt-0.5">
        {tags.map((t, idx) => (
          <span key={idx} className="bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-700">
            {t}
          </span>
        ))}
      </div>
    );
  };

  return (
    <Card noPadding className={`overflow-hidden border ${meta.borderColor} hover:shadow-card-hover transition-all flex flex-col h-full bg-white`}>
      {/* Header */}
      <div className={`px-5 py-3 border-b border-slate-100 ${meta.bgLight} flex items-center justify-between shrink-0`}>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${meta.dotColor}`}></span>
          <h3 className="font-bold text-slate-900 text-sm">{meta.name}</h3>
        </div>

        {/* Status Badge */}
        <div>
          {status === 'SUCCESS' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <CheckCircle2 className="w-3 h-3" /> Synced
            </span>
          )}
          {status === 'FETCHING' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <RefreshCw className="w-3 h-3 animate-spin" /> Fetching...
            </span>
          )}
          {status === 'PENDING' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <Clock className="w-3 h-3 animate-pulse" /> Pending
            </span>
          )}
          {status === 'FAILED' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              <AlertCircle className="w-3 h-3" /> Sync Failed
            </span>
          )}
          {status === 'NOT_CONNECTED' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500">
              Not Linked
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        {isConnected ? (
          <div className="space-y-3.5 flex-1 flex flex-col justify-between">
            {/* User handle header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-slate-400 font-medium text-[10px] uppercase tracking-wider block">Username</span>
                <span className="font-bold text-slate-900 text-sm font-mono truncate block" title={username}>
                  {username}
                </span>
              </div>
              {profileUrl && (
                <a
                  href={profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-800 font-semibold text-xs shrink-0 whitespace-nowrap bg-brand-50/60 hover:bg-brand-50 px-2.5 py-1 rounded-md border border-brand-200/60 transition-colors"
                >
                  View Profile <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Platform statistics */}
            {status === 'SUCCESS' && stats ? (
              <div className="space-y-3 flex-1 flex flex-col justify-between">
                {/* Solved + Rating KPI */}
                <div className="grid grid-cols-2 gap-2.5">
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
                      {meta.ratingLabel}
                    </span>
                    <span className="text-2xl font-black text-slate-900 font-mono mt-0.5 block truncate">
                      {pKey === 'hackerrank' ? (
                        stats.stars ? `${stats.stars} ★` : (stats.badgesCount ? `${stats.badgesCount} Badges` : 'Active')
                      ) : stats.rating ? (
                        <>
                          {stats.rating}
                          {pKey === 'codechef' && <span className="text-xs text-amber-500 ml-1">★</span>}
                        </>
                      ) : (
                        <span className="text-sm font-normal text-slate-400">Unrated</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Secondary Breakdown */}
                {renderSecondaryMetrics()}

                {/* Extra tags */}
                {renderExtraTags()}

                {/* Platform Sync Timestamp Footer */}
                <div className="pt-3 mt-auto border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    {lastFetchedAt ? `Synced ${new Date(lastFetchedAt).toLocaleDateString()}` : 'Synced'}
                  </span>
                  <span className="text-emerald-600 font-medium">
                    Status: <strong>Active</strong>
                  </span>
                </div>
              </div>
            ) : status === 'FAILED' ? (
              <div className="py-6 text-center text-xs space-y-2 my-auto">
                <div className="p-3 bg-rose-50 text-rose-700 rounded-lg border border-rose-200">
                  <AlertCircle className="w-5 h-5 mx-auto mb-1 text-rose-600" />
                  <p className="font-semibold">Statistics unavailable</p>
                  <p className="text-[11px] text-rose-600 mt-0.5">
                    {errorMessage || `Could not retrieve data for handle "${username}". Verify profile link.`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500 my-auto">
                <Clock className="w-5 h-5 mx-auto text-amber-500 mb-2 animate-pulse" />
                Synchronizing live platform data...
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 px-4 text-center text-slate-400 text-xs my-auto flex flex-col items-center justify-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
              <Layers className="w-5 h-5" />
            </div>
            <p className="font-semibold text-slate-700 text-sm">No {meta.name} Profile Linked</p>
            <p className="text-slate-400 text-[11px] max-w-[220px]">
              Add your profile handle above to display your verified problem stats and score.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default PlatformCard;

