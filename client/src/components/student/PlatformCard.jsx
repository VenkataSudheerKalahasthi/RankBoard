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
  onRefreshSingle,
  refreshing = false,
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

  // Render secondary platform-specific badge / info box with standardized container & tiles
  const renderSecondaryMetrics = () => {
    if (!stats) return <div className="min-h-[92px]" />;

    if (pKey === 'gfg') {
      return (
        <div className="bg-slate-50/80 p-2.5 sm:p-3 rounded-lg border border-slate-100 flex flex-col justify-between min-h-[92px]">
          <span className="text-[11px] font-semibold text-slate-500 block mb-1.5 truncate">
            Difficulty Breakdown
          </span>
          <div className="grid grid-cols-5 gap-1 text-center">
            <div className="bg-white p-1 rounded border border-slate-200 shadow-sm flex flex-col items-center justify-center min-h-[46px] min-w-0" title={`School: ${stats.schoolSolved ?? 0}`}>
              <span className="text-[8px] sm:text-[9px] uppercase font-bold text-slate-600 block truncate max-w-full">School</span>
              <span className="font-bold text-slate-900 font-mono text-xs sm:text-sm mt-0.5 block truncate">{stats.schoolSolved ?? 0}</span>
            </div>
            <div className="bg-white p-1 rounded border border-slate-200 shadow-sm flex flex-col items-center justify-center min-h-[46px] min-w-0" title={`Basic: ${stats.basicSolved ?? 0}`}>
              <span className="text-[8px] sm:text-[9px] uppercase font-bold text-slate-600 block truncate max-w-full">Basic</span>
              <span className="font-bold text-slate-900 font-mono text-xs sm:text-sm mt-0.5 block truncate">{stats.basicSolved ?? 0}</span>
            </div>
            <div className="bg-white p-1 rounded border border-emerald-100 shadow-sm flex flex-col items-center justify-center min-h-[46px] min-w-0" title={`Easy: ${stats.easySolved ?? 0}`}>
              <span className="text-[8px] sm:text-[9px] uppercase font-bold text-emerald-700 block truncate max-w-full">Easy</span>
              <span className="font-bold text-emerald-950 font-mono text-xs sm:text-sm mt-0.5 block truncate">{stats.easySolved ?? 0}</span>
            </div>
            <div className="bg-white p-1 rounded border border-amber-100 shadow-sm flex flex-col items-center justify-center min-h-[46px] min-w-0" title={`Medium: ${stats.mediumSolved ?? 0}`}>
              <span className="text-[8px] sm:text-[9px] uppercase font-bold text-amber-700 block truncate max-w-full">Medium</span>
              <span className="font-bold text-amber-950 font-mono text-xs sm:text-sm mt-0.5 block truncate">{stats.mediumSolved ?? 0}</span>
            </div>
            <div className="bg-white p-1 rounded border border-rose-100 shadow-sm flex flex-col items-center justify-center min-h-[46px] min-w-0" title={`Hard: ${stats.hardSolved ?? 0}`}>
              <span className="text-[8px] sm:text-[9px] uppercase font-bold text-rose-700 block truncate max-w-full">Hard</span>
              <span className="font-bold text-rose-950 font-mono text-xs sm:text-sm mt-0.5 block truncate">{stats.hardSolved ?? 0}</span>
            </div>
          </div>
        </div>
      );
    }

    if (pKey === 'leetcode') {
      return (
        <div className="bg-slate-50/80 p-2.5 sm:p-3 rounded-lg border border-slate-100 flex flex-col justify-between min-h-[92px]">
          <span className="text-[11px] font-semibold text-slate-500 block mb-1.5 truncate">
            Difficulty Breakdown
          </span>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center">
            <div className="bg-white p-1.5 sm:p-2 rounded border border-emerald-100 shadow-sm flex flex-col items-center justify-center min-h-[46px] min-w-0" title={`Easy: ${stats.easySolved ?? 0}`}>
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-emerald-700 block truncate max-w-full">Easy</span>
              <span className="font-bold text-emerald-950 font-mono text-xs sm:text-sm mt-0.5 block truncate">{stats.easySolved ?? 0}</span>
            </div>
            <div className="bg-white p-1.5 sm:p-2 rounded border border-amber-100 shadow-sm flex flex-col items-center justify-center min-h-[46px] min-w-0" title={`Medium: ${stats.mediumSolved ?? 0}`}>
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-amber-700 block truncate max-w-full">Medium</span>
              <span className="font-bold text-amber-950 font-mono text-xs sm:text-sm mt-0.5 block truncate">{stats.mediumSolved ?? 0}</span>
            </div>
            <div className="bg-white p-1.5 sm:p-2 rounded border border-rose-100 shadow-sm flex flex-col items-center justify-center min-h-[46px] min-w-0" title={`Hard: ${stats.hardSolved ?? 0}`}>
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-rose-700 block truncate max-w-full">Hard</span>
              <span className="font-bold text-rose-950 font-mono text-xs sm:text-sm mt-0.5 block truncate">{stats.hardSolved ?? 0}</span>
            </div>
          </div>
        </div>
      );
    }

    if (pKey === 'hackerrank') {
      return (
        <div className="bg-slate-50/80 p-2.5 sm:p-3 rounded-lg border border-slate-100 flex flex-col justify-between min-h-[92px]">
          <span className="text-[11px] font-semibold text-slate-500 block mb-1.5 truncate">
            Skills & Achievements
          </span>
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-center">
            <div className="bg-white p-1.5 sm:p-2 rounded border border-emerald-100 shadow-sm flex flex-col items-center justify-center min-h-[46px] min-w-0">
              <span className="text-[9px] sm:text-[10px] uppercase font-semibold text-slate-500 block truncate max-w-full">Badges Earned</span>
              <span className="font-bold text-emerald-800 font-mono text-xs sm:text-sm mt-0.5 block truncate max-w-full">
                {stats.badgesCount ? `${stats.badgesCount} Badges` : (stats.stars ? `${stats.stars} ★` : '—')}
              </span>
            </div>
            <div className="bg-white p-1.5 sm:p-2 rounded border border-emerald-100 shadow-sm flex flex-col items-center justify-center min-h-[46px] min-w-0">
              <span className="text-[9px] sm:text-[10px] uppercase font-semibold text-slate-500 block truncate max-w-full">Certificates</span>
              <span className="font-bold text-slate-900 font-mono text-xs sm:text-sm mt-0.5 block truncate max-w-full">
                {stats.certificatesCount ? `${stats.certificatesCount} Verified` : '0'}
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (pKey === 'codeforces') {
      return (
        <div className="bg-slate-50/80 p-2.5 sm:p-3 rounded-lg border border-slate-100 flex flex-col justify-between min-h-[92px]">
          <span className="text-[11px] font-semibold text-slate-500 block mb-1.5 truncate">
            Contest Standing
          </span>
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-center">
            <div className="bg-white p-1.5 sm:p-2 rounded border border-blue-100 shadow-sm flex flex-col items-center justify-center min-h-[46px] min-w-0">
              <span className="text-[9px] sm:text-[10px] uppercase font-semibold text-slate-500 block truncate max-w-full">Rank Tier</span>
              <span className="font-bold text-blue-900 capitalize text-xs sm:text-sm mt-0.5 block truncate max-w-full">
                {stats.rankTier || 'Unranked'}
              </span>
            </div>
            <div className="bg-white p-1.5 sm:p-2 rounded border border-blue-100 shadow-sm flex flex-col items-center justify-center min-h-[46px] min-w-0">
              <span className="text-[9px] sm:text-[10px] uppercase font-semibold text-slate-500 block truncate max-w-full">Max Rating</span>
              <span className="font-bold text-slate-900 font-mono text-xs sm:text-sm mt-0.5 block truncate max-w-full">
                {stats.maxRating || stats.rating || '—'}
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (pKey === 'codechef') {
      return (
        <div className="bg-slate-50/80 p-2.5 sm:p-3 rounded-lg border border-slate-100 flex flex-col justify-between min-h-[92px]">
          <span className="text-[11px] font-semibold text-slate-500 block mb-1.5 truncate">
            Competitive Standing
          </span>
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-center">
            <div className="bg-white p-1.5 sm:p-2 rounded border border-orange-100 shadow-sm flex flex-col items-center justify-center min-h-[46px] min-w-0">
              <span className="text-[9px] sm:text-[10px] uppercase font-semibold text-slate-500 block truncate max-w-full">Stars / Tier</span>
              <span className="font-bold text-orange-800 text-xs sm:text-sm mt-0.5 block truncate max-w-full">
                {stats.stars ? `${stats.stars} ★` : '1 ★'}
              </span>
            </div>
            <div className="bg-white p-1.5 sm:p-2 rounded border border-orange-100 shadow-sm flex flex-col items-center justify-center min-h-[46px] min-w-0">
              <span className="text-[9px] sm:text-[10px] uppercase font-semibold text-slate-500 block truncate max-w-full">Global Rank</span>
              <span className="font-bold text-slate-900 font-mono text-xs sm:text-sm mt-0.5 block truncate max-w-full">
                {stats.globalRank || '—'}
              </span>
            </div>
          </div>
        </div>
      );
    }

    return <div className="min-h-[92px]" />;
  };

  // Render extra metadata tags (streak, contests, etc.) with standardized min-height
  const renderExtraTags = () => {
    if (!stats) return <div className="min-h-[24px]" />;

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

    if (tags.length === 0) {
      return <div className="min-h-[24px]" />;
    }

    return (
      <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500 min-h-[24px]">
        {tags.map((t, idx) => (
          <span key={idx} className="bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-700 text-[10px] sm:text-[11px]">
            {t}
          </span>
        ))}
      </div>
    );
  };

  const isFetchingState = status === 'FETCHING' || refreshing;

  return (
    <Card
      noPadding
      className={`overflow-hidden border ${meta.borderColor} hover:shadow-card-hover transition-all flex flex-col h-full bg-white rounded-xl`}
    >
      {/* Header (Section A) */}
      <div className={`px-4 sm:px-5 py-3 border-b border-slate-100 ${meta.bgLight} flex items-center justify-between min-h-[48px] shrink-0 gap-2`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2.5 h-2.5 rounded-full ${meta.dotColor} shrink-0`}></span>
          <h3 className="font-bold text-slate-900 text-sm truncate">{meta.name}</h3>
        </div>

        {/* Sync Status Badge */}
        <div className="shrink-0 flex items-center">
          {status === 'SUCCESS' && !isFetchingState && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" /> Synced
            </span>
          )}
          {isFetchingState && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <RefreshCw className="w-3 h-3 text-blue-600 animate-spin shrink-0" /> Fetching...
            </span>
          )}
          {status === 'PENDING' && !isFetchingState && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <Clock className="w-3 h-3 text-amber-600 animate-pulse shrink-0" /> Pending
            </span>
          )}
          {status === 'FAILED' && !isFetchingState && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" /> Failed
            </span>
          )}
          {status === 'NOT_CONNECTED' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500">
              Not Linked
            </span>
          )}
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        {isConnected ? (
          <div className="flex-1 flex flex-col gap-3">
            {/* Profile Information (Section B) */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2 min-h-[44px]">
              <div className="min-w-0 flex-1">
                <span className="text-slate-400 font-medium text-[10px] uppercase tracking-wider block">Username</span>
                <span className="font-bold text-slate-900 text-xs sm:text-sm font-mono truncate block" title={username}>
                  {username}
                </span>
              </div>
              {profileUrl ? (
                <a
                  href={profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-800 font-semibold text-[11px] shrink-0 whitespace-nowrap bg-brand-50/70 hover:bg-brand-100/70 px-2 py-1 rounded-md border border-brand-200/70 transition-colors"
                >
                  View Profile <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <div className="shrink-0 h-6" />
              )}
            </div>

            {/* Platform Statistics & Performance Details (Section C & D) */}
            {status === 'SUCCESS' && stats ? (
              <div className="flex-1 flex flex-col gap-3">
                {/* Primary Statistics (Section C) */}
                <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                  <div className="bg-slate-50 p-2.5 sm:p-3 rounded-lg border border-slate-100 flex flex-col justify-between min-h-[64px] sm:min-h-[68px]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block truncate" title="Problems Solved">
                      Problems Solved
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-0.5 block truncate">
                      {stats.totalSolved ?? 0}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 sm:p-3 rounded-lg border border-slate-100 flex flex-col justify-between min-h-[64px] sm:min-h-[68px]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block truncate" title={meta.ratingLabel}>
                      {meta.ratingLabel}
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-0.5 block truncate">
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

                {/* Platform-Specific Details & Difficulty Breakdown (Section D) */}
                {renderSecondaryMetrics()}

                {/* Extra Tags */}
                {renderExtraTags()}

                {/* Footer (Section E) */}
                <div className="pt-3 mt-auto border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 min-h-[36px]">
                  <span className="truncate mr-2">
                    {lastFetchedAt ? `Synced ${new Date(lastFetchedAt).toLocaleDateString()}` : 'Synced'}
                  </span>
                  <span className="text-emerald-600 font-medium shrink-0">
                    Status: <strong>Active</strong>
                  </span>
                </div>
              </div>
            ) : status === 'FAILED' ? (
              <div className="flex-1 flex flex-col items-center justify-center py-6 text-center text-xs space-y-2 my-auto">
                <div className="p-3 bg-rose-50 text-rose-700 rounded-lg border border-rose-200 max-w-full">
                  <AlertCircle className="w-5 h-5 mx-auto mb-1 text-rose-600" />
                  <p className="font-semibold">Statistics unavailable</p>
                  <p className="text-[11px] text-rose-600 mt-0.5 break-words">
                    {errorMessage || `Could not retrieve data for handle "${username}". Verify profile link.`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-xs text-slate-500 my-auto">
                <Clock className="w-5 h-5 mx-auto text-amber-500 mb-2 animate-pulse" />
                Synchronizing live platform data...
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-10 px-4 text-center text-slate-400 text-xs my-auto space-y-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
              <Layers className="w-5 h-5" />
            </div>
            <p className="font-semibold text-slate-700 text-sm">No {meta.name} Profile Linked</p>
            <p className="text-slate-400 text-[11px] max-w-[220px]">
              Add your profile handle to display your verified problem stats and score.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default PlatformCard;
