import React from 'react';
import { Users, Code2, Trophy, BarChart2, AlertCircle, RefreshCw } from 'lucide-react';
import { TOTAL_CONFIGURED_PLATFORMS, PLATFORM_REGISTRY } from '../../config/platforms';
import { useCountUp } from '../../hooks/useCountUp';

/**
 * Single Stat Item with Animated Counter, Skeletons, and Theme Support
 */
const StatItem = ({
  icon: Icon,
  iconBgClass,
  value,
  formattedValue,
  exactValue,
  label,
  loading,
  error,
  isStale,
  customContent,
  tooltip,
}) => {
  return (
    <div className="flex items-center gap-3.5 sm:px-4 pt-3 sm:pt-0" title={tooltip || ''}>
      <div
        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full ${iconBgClass} flex items-center justify-center shrink-0 border`}
      >
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
      <div className="min-w-0 flex-1">
        {loading ? (
          <div className="h-7 sm:h-8 w-16 sm:w-20 bg-slate-200/80 dark:bg-slate-700/60 rounded-md animate-pulse my-0.5" />
        ) : customContent ? (
          customContent
        ) : error && (value === null || value === undefined) ? (
          <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
            <span className="text-xl sm:text-2xl font-black tracking-tight">—</span>
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" title={error} />
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-black dark:text-white tracking-tight">
              {formattedValue ?? '0'}
            </span>
            {isStale && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
                title="Showing cached data; updates currently paused"
              />
            )}
          </div>
        )}
        <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-300 font-bold sm:font-semibold truncate">
          {label}
        </div>
      </div>
    </div>
  );
};

/**
 * Bottom Statistics Strip for Home Page
 * Displays 4 authoritative RankBoard metrics with real-time updates and count-up animations:
 * 1. Total Registered Students (Authoritative eligible student count)
 * 2. Problems Tracked (Authoritative sum across active platform integrations)
 * 3. Live Real-Time Rankings (Connected directly to Supabase Realtime channel status)
 * 4. Coding Platforms (Configured platform integrations)
 */
export const HomeStatisticsStrip = ({
  stats,
  loading = false,
  error = null,
  isLive = true,
  realtimeStatus = 'SUBSCRIBED',
  onRetry = null,
}) => {
  const registeredStudents = stats?.totalRegisteredStudents ?? null;
  const problemsSolved = stats?.totalProblemsSolved ?? null;
  const configuredPlatforms = stats?.codingPlatforms ?? TOTAL_CONFIGURED_PLATFORMS;

  // Animated counters for numerical values
  const studentsAnim = useCountUp(registeredStudents, { duration: 700, compact: false });
  const problemsAnim = useCountUp(problemsSolved, { duration: 800, compact: true });
  const platformsAnim = useCountUp(configuredPlatforms, { duration: 500, compact: false });

  const isInitialLoading = loading && !stats;
  const isStale = !!error && !!stats;

  // Real-time status badge content
  const renderLiveStatusContent = () => {
    if (isInitialLoading) {
      return (
        <div className="h-7 sm:h-8 w-16 sm:w-20 bg-slate-200/80 dark:bg-slate-700/60 rounded-md animate-pulse my-0.5" />
      );
    }

    if (isLive) {
      return (
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xl sm:text-2xl font-black text-black dark:text-white tracking-tight">
            Live
          </span>
        </div>
      );
    }

    if (realtimeStatus === 'CONNECTING') {
      return (
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-full h-2.5 w-2.5 bg-amber-400 animate-pulse"></span>
          <span className="text-xl sm:text-2xl font-black text-slate-700 dark:text-slate-300 tracking-tight">
            Syncing
          </span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex rounded-full h-2.5 w-2.5 bg-slate-400"></span>
        <span className="text-xl sm:text-2xl font-black text-slate-600 dark:text-slate-400 tracking-tight">
          Offline
        </span>
      </div>
    );
  };

  const platformNames = PLATFORM_REGISTRY.filter((p) => p.enabled)
    .map((p) => p.name)
    .join(', ');

  const liveTooltip = isLive
    ? 'Realtime channel active: Leaderboard updates stream live'
    : realtimeStatus === 'CONNECTING'
    ? 'Connecting to real-time sync channel...'
    : 'Realtime updates offline: periodic HTTP polling active';

  return (
    <div className="relative">
      <div className="mt-12 sm:mt-14 w-full p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl bg-white/45 dark:bg-[#071329]/45 border border-white/60 dark:border-white/10 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_8px_32px_0_rgba(0,0,0,0.08),inset_0_1px_0_0_rgba(255,255,255,0.7)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.45),inset_0_1px_0_0_rgba(255,255,255,0.08)] grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/50 dark:divide-white/10">
        {/* Stat 1: Students */}
        <StatItem
          icon={Users}
          iconBgClass="bg-purple-100/80 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-200/50 dark:border-purple-500/30"
          value={registeredStudents}
          formattedValue={studentsAnim.formatted}
          exactValue={studentsAnim.exact}
          label="Students"
          loading={isInitialLoading}
          error={error}
          isStale={isStale}
          tooltip={studentsAnim.exact ? `${studentsAnim.exact} active registered students` : 'Registered students'}
        />

        {/* Stat 2: Problems Tracked */}
        <StatItem
          icon={Code2}
          iconBgClass="bg-emerald-100/80 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-500/30"
          value={problemsSolved}
          formattedValue={problemsAnim.formatted}
          exactValue={problemsAnim.exact}
          label="Problems Tracked"
          loading={isInitialLoading}
          error={error}
          isStale={isStale}
          tooltip={problemsAnim.exact ? `${problemsAnim.exact} problems solved across platforms` : 'Problems tracked'}
        />

        {/* Stat 3: Real-Time Rankings */}
        <StatItem
          icon={Trophy}
          iconBgClass="bg-amber-100/80 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-500/30"
          label="Real-Time Rankings"
          loading={isInitialLoading}
          customContent={renderLiveStatusContent()}
          tooltip={liveTooltip}
        />

        {/* Stat 4: Coding Platforms */}
        <StatItem
          icon={BarChart2}
          iconBgClass="bg-pink-100/80 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400 border-pink-200/50 dark:border-pink-500/30"
          value={configuredPlatforms}
          formattedValue={platformsAnim.formatted}
          exactValue={platformsAnim.exact}
          label="Coding Platforms"
          loading={isInitialLoading}
          error={error}
          isStale={isStale}
          tooltip={`Integrated Platforms (${configuredPlatforms}): ${platformNames}`}
        />
      </div>

      {/* Subtle Error Banner if initial load completely failed */}
      {error && !stats && onRetry && (
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-rose-600 dark:text-rose-400">
          <span>Failed to load live metrics.</span>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1 font-bold underline hover:no-underline cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

export default HomeStatisticsStrip;
