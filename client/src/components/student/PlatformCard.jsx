import React from 'react';
import Card from '../common/Card';
import AnimatedCounter from '../common/AnimatedCounter';
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
        <div className="bg-slate-50/80 dark:bg-[#0D1830] p-2.5 sm:p-3 rounded-xl border border-slate-100 dark:border-blue-900/30 min-w-0">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-2">
            Difficulty Breakdown
          </span>
          <div className="grid grid-cols-5 gap-1 sm:gap-1.5 text-center text-xs min-w-0">
            <div className="bg-white dark:bg-[#111E3D] p-1 sm:p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm min-w-0">
              <span className="text-[8.5px] sm:text-[9px] uppercase font-bold text-slate-600 dark:text-slate-400 block truncate" title="School">
                School
              </span>
              <span className="font-bold text-slate-900 dark:text-white font-mono text-xs sm:text-sm block truncate">
                {stats.schoolSolved ?? 0}
              </span>
            </div>
            <div className="bg-white dark:bg-[#111E3D] p-1 sm:p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm min-w-0">
              <span className="text-[8.5px] sm:text-[9px] uppercase font-bold text-slate-600 dark:text-slate-400 block truncate" title="Basic">
                Basic
              </span>
              <span className="font-bold text-slate-900 dark:text-white font-mono text-xs sm:text-sm block truncate">
                {stats.basicSolved ?? 0}
              </span>
            </div>
            <div className="bg-white dark:bg-[#111E3D] p-1 sm:p-1.5 rounded-lg border border-emerald-100 dark:border-emerald-900/40 shadow-sm min-w-0">
              <span className="text-[8.5px] sm:text-[9px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block truncate" title="Easy">
                Easy
              </span>
              <span className="font-bold text-emerald-950 dark:text-emerald-300 font-mono text-xs sm:text-sm block truncate">
                {stats.easySolved ?? 0}
              </span>
            </div>
            <div className="bg-white dark:bg-[#111E3D] p-1 sm:p-1.5 rounded-lg border border-amber-100 dark:border-amber-900/40 shadow-sm min-w-0">
              <span className="text-[8.5px] sm:text-[9px] uppercase font-bold text-amber-700 dark:text-amber-400 block truncate" title="Medium">
                <span className="sm:hidden">Med</span>
                <span className="hidden sm:inline">Medium</span>
              </span>
              <span className="font-bold text-amber-950 dark:text-amber-300 font-mono text-xs sm:text-sm block truncate">
                {stats.mediumSolved ?? 0}
              </span>
            </div>
            <div className="bg-white dark:bg-[#111E3D] p-1 sm:p-1.5 rounded-lg border border-rose-100 dark:border-rose-900/40 shadow-sm min-w-0">
              <span className="text-[8.5px] sm:text-[9px] uppercase font-bold text-rose-700 dark:text-rose-400 block truncate" title="Hard">
                Hard
              </span>
              <span className="font-bold text-rose-950 dark:text-rose-300 font-mono text-xs sm:text-sm block truncate">
                {stats.hardSolved ?? 0}
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (pKey === 'leetcode') {
      return (
        <div className="bg-slate-50/80 dark:bg-[#0D1830] p-2.5 sm:p-3 rounded-xl border border-slate-100 dark:border-blue-900/30 min-w-0">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-2">
            Difficulty Breakdown
          </span>
          <div className="grid grid-cols-3 gap-2 text-center text-xs min-w-0">
            <div className="bg-white dark:bg-[#111E3D] p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/40 shadow-sm min-w-0">
              <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block truncate" title="Easy">
                Easy
              </span>
              <span className="font-bold text-emerald-950 dark:text-emerald-300 font-mono text-sm block truncate">
                {stats.easySolved ?? 0}
              </span>
            </div>
            <div className="bg-white dark:bg-[#111E3D] p-2 rounded-lg border border-amber-100 dark:border-amber-900/40 shadow-sm min-w-0">
              <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block truncate" title="Medium">
                Medium
              </span>
              <span className="font-bold text-amber-950 dark:text-amber-300 font-mono text-sm block truncate">
                {stats.mediumSolved ?? 0}
              </span>
            </div>
            <div className="bg-white dark:bg-[#111E3D] p-2 rounded-lg border border-rose-100 dark:border-rose-900/40 shadow-sm min-w-0">
              <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 block truncate" title="Hard">
                Hard
              </span>
              <span className="font-bold text-rose-950 dark:text-rose-300 font-mono text-sm block truncate">
                {stats.hardSolved ?? 0}
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (pKey === 'hackerrank') {
      return (
        <div className="bg-slate-50/80 dark:bg-[#0D1830] p-2.5 sm:p-3 rounded-xl border border-slate-100 dark:border-blue-900/30 min-w-0">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-2">
            Skills & Achievements
          </span>
          <div className="grid grid-cols-2 gap-2 text-center text-xs min-w-0">
            <div className="bg-white dark:bg-[#111E3D] p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/40 shadow-sm min-w-0">
              <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 block truncate" title="Badges Earned">
                Badges Earned
              </span>
              <span className="font-bold text-emerald-800 dark:text-emerald-300 font-mono text-sm block truncate">
                {stats.badgesCount ? `${stats.badgesCount} Badges` : (stats.stars ? `${stats.stars} ★` : '—')}
              </span>
            </div>
            <div className="bg-white dark:bg-[#111E3D] p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/40 shadow-sm min-w-0">
              <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 block truncate" title="Certificates">
                Certificates
              </span>
              <span className="font-bold text-slate-900 dark:text-white font-mono text-sm block truncate">
                {stats.certificatesCount ? `${stats.certificatesCount} Verified` : '0'}
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (pKey === 'codeforces') {
      return (
        <div className="bg-slate-50/80 dark:bg-[#0D1830] p-2.5 sm:p-3 rounded-xl border border-slate-100 dark:border-blue-900/30 min-w-0">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-2">
            Contest Standing
          </span>
          <div className="grid grid-cols-2 gap-2 text-center text-xs min-w-0">
            <div className="bg-white dark:bg-[#111E3D] p-2 rounded-lg border border-blue-100 dark:border-blue-900/40 shadow-sm min-w-0">
              <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 block truncate" title="Rank Tier">
                Rank Tier
              </span>
              <span className="font-bold text-blue-900 dark:text-sky-300 capitalize text-sm block truncate">
                {stats.rankTier || 'Unranked'}
              </span>
            </div>
            <div className="bg-white dark:bg-[#111E3D] p-2 rounded-lg border border-blue-100 dark:border-blue-900/40 shadow-sm min-w-0">
              <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 block truncate" title="Max Rating">
                Max Rating
              </span>
              <span className="font-bold text-slate-900 dark:text-white font-mono text-sm block truncate">
                {stats.maxRating || stats.rating || '—'}
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (pKey === 'codechef') {
      return (
        <div className="bg-slate-50/80 dark:bg-[#0D1830] p-2.5 sm:p-3 rounded-xl border border-slate-100 dark:border-blue-900/30 min-w-0">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-2">
            Competitive Standing
          </span>
          <div className="grid grid-cols-2 gap-2 text-center text-xs min-w-0">
            <div className="bg-white dark:bg-[#111E3D] p-2 rounded-lg border border-orange-100 dark:border-orange-900/40 shadow-sm min-w-0">
              <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 block truncate" title="Stars / Tier">
                Stars / Tier
              </span>
              <span className="font-bold text-orange-800 dark:text-amber-400 text-sm block truncate">
                {stats.stars ? `${stats.stars} ★` : '1 ★'}
              </span>
            </div>
            <div className="bg-white dark:bg-[#111E3D] p-2 rounded-lg border border-orange-100 dark:border-orange-900/40 shadow-sm min-w-0">
              <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 block truncate" title="Global Rank">
                Global Rank
              </span>
              <span className="font-bold text-slate-900 dark:text-white font-mono text-sm block truncate">
                {stats.globalRank || '—'}
              </span>
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
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-[11px] text-slate-500 dark:text-slate-400 pt-0.5 min-w-0">
        {tags.map((t, idx) => (
          <span
            key={idx}
            className="bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded font-medium text-slate-700 dark:text-slate-300 truncate max-w-full"
          >
            {t}
          </span>
        ))}
      </div>
    );
  };

  return (
    <Card
      noPadding
      hoverable
      className={`overflow-hidden border ${meta.borderColor} dark:border-blue-500/20 card-hover-interactive flex flex-col h-full bg-white dark:bg-[#111E3D] w-full min-w-0`}
    >
      {/* Header */}
      <div
        className={`px-4 sm:px-5 py-3 border-b border-slate-100 dark:border-blue-900/30 ${meta.bgLight} dark:bg-slate-800/40 flex items-center justify-between gap-2.5 shrink-0 min-w-0`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-md bg-white border border-slate-200/90 dark:border-slate-700/80 overflow-hidden flex items-center justify-center shrink-0 p-0.5 shadow-2xs">
            <img
              src={`/logos/${pKey}.jpg`}
              alt={meta.name}
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate" title={meta.name}>
            {meta.name}
          </h3>
        </div>

        {/* Status Badge */}
        <div className="shrink-0">
          {status === 'SUCCESS' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60">
              <CheckCircle2 className="w-3 h-3 shrink-0" /> Synced
            </span>
          )}
          {status === 'FETCHING' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-sky-300 border border-blue-200 dark:border-blue-800/60">
              <RefreshCw className="w-3 h-3 shrink-0 animate-spin" /> Fetching...
            </span>
          )}
          {status === 'PENDING' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
              <Clock className="w-3 h-3 shrink-0 animate-pulse" /> Pending
            </span>
          )}
          {status === 'FAILED' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60">
              <AlertCircle className="w-3 h-3 shrink-0" /> Sync Failed
            </span>
          )}
          {status === 'NOT_CONNECTED' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              Not Linked
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between min-w-0">
        {isConnected ? (
          <div className="space-y-3.5 flex-1 flex flex-col justify-between min-w-0">
            {/* User handle header */}
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between pb-3 border-b border-slate-100 dark:border-blue-900/30 text-xs gap-2 min-w-0">
              <div className="min-w-0 flex-1">
                <span className="text-slate-400 dark:text-slate-500 font-medium text-[10px] uppercase tracking-wider block">
                  Username
                </span>
                <span
                  className="font-bold text-slate-900 dark:text-white text-sm font-mono truncate block max-w-full"
                  title={username}
                >
                  {username}
                </span>
              </div>
              {profileUrl && (
                <a
                  href={profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 dark:text-sky-400 hover:text-blue-700 dark:hover:text-sky-300 font-semibold text-xs shrink-0 whitespace-nowrap bg-blue-50/70 dark:bg-blue-950/50 hover:bg-blue-100/70 dark:hover:bg-blue-900/50 px-2.5 py-1 rounded-md border border-blue-200/70 dark:border-blue-800/60 transition-colors"
                  title={`View ${meta.name} Profile`}
                >
                  View Profile <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              )}
            </div>

            {/* Platform statistics */}
            {status === 'SUCCESS' && stats ? (
              <div className="space-y-3 flex-1 flex flex-col justify-between min-w-0">
                {/* Solved + Rating KPI */}
                <div className="grid grid-cols-2 gap-2.5 min-w-0">
                  <div className="bg-slate-50 dark:bg-[#0D1830] p-3 rounded-xl border border-slate-100 dark:border-blue-900/30 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
                      Problems Solved
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5 block truncate">
                      <AnimatedCounter value={stats.totalSolved ?? 0} />
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-[#0D1830] p-3 rounded-xl border border-slate-100 dark:border-blue-900/30 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
                      {meta.ratingLabel}
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5 block truncate">
                      {pKey === 'hackerrank' ? (
                        stats.stars ? `${stats.stars} ★` : (stats.badgesCount ? `${stats.badgesCount} Badges` : 'Active')
                      ) : stats.rating ? (
                        <>
                          <AnimatedCounter value={stats.rating} />
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
                <div className="pt-3 mt-auto border-t border-slate-100 dark:border-blue-900/30 flex flex-wrap items-center justify-between gap-1.5 text-[11px] text-slate-400 dark:text-slate-400 min-w-0">
                  <span className="truncate">
                    {lastFetchedAt ? `Synced ${new Date(lastFetchedAt).toLocaleDateString()}` : 'Synced'}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                    Status: <strong className="font-semibold">Active</strong>
                  </span>
                </div>
              </div>
            ) : status === 'FAILED' ? (
              <div className="py-6 text-center text-xs space-y-2 my-auto min-w-0">
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-lg border border-rose-200 dark:border-rose-800/60 min-w-0">
                  <AlertCircle className="w-5 h-5 mx-auto mb-1 text-rose-600 dark:text-rose-400" />
                  <p className="font-semibold">Statistics unavailable</p>
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5 break-words">
                    {errorMessage || `Could not retrieve data for handle "${username}". Verify profile link.`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 my-auto min-w-0">
                <Clock className="w-5 h-5 mx-auto text-amber-500 mb-2 animate-pulse" />
                Synchronizing live platform data...
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 px-4 text-center text-slate-400 dark:text-slate-500 text-xs my-auto flex flex-col items-center justify-center space-y-2 min-w-0">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-400 dark:text-slate-400 mb-1 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">No {meta.name} Profile Linked</p>
            <p className="text-slate-400 dark:text-slate-400 text-[11px] max-w-[220px]">
              Add your profile handle above to display your verified problem stats and score.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default PlatformCard;
