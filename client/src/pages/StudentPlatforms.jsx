import React from 'react';
import ProfileLinkForm from '../components/student/ProfileLinkForm';
import PlatformCard from '../components/student/PlatformCard';
import { useStudent } from '../context/StudentContext';
import { Layers, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const StudentPlatforms = () => {
  const { student, syncPlatforms, syncing } = useStudent();

  const platforms = student?.platforms || {};
  const platformStats = student?.platformStats || {};
  const scores = student?.scores || {};

  const handleGlobalRefresh = async () => {
    await syncPlatforms({});
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 mb-1">
          <Layers className="w-3.5 h-3.5" />
          Platform Integrations
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold theme-text-primary">
          Coding Platform Profiles
        </h1>
        <p className="text-xs sm:text-sm theme-text-secondary mt-0.5">
          Connect your competitive programming handles to automatically fetch problems solved, contest ratings, and calculate your overall score.
        </p>
      </div>

      {/* Main Profile Link Setup Form */}
      <ProfileLinkForm />

      {/* Current Platform Status Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold theme-text-primary">
              Synchronized Platform Metrics
            </h3>
            <p className="text-xs theme-text-secondary">
              Live statistics verified directly from external platforms.
            </p>
          </div>

          <Link to="/student/score" className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
            View Overall Score <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-5 xl:gap-4 2xl:gap-5">
          <PlatformCard
            platformKey="leetcode"
            platformConfig={platforms.leetcode}
            stats={platformStats.leetcode}
            onRefreshSingle={handleGlobalRefresh}
            refreshing={syncing}
          />

          <PlatformCard
            platformKey="gfg"
            platformConfig={platforms.gfg}
            stats={platformStats.gfg}
            onRefreshSingle={handleGlobalRefresh}
            refreshing={syncing}
          />

          <PlatformCard
            platformKey="hackerrank"
            platformConfig={platforms.hackerrank}
            stats={platformStats.hackerrank}
            onRefreshSingle={handleGlobalRefresh}
            refreshing={syncing}
          />

          <PlatformCard
            platformKey="codeforces"
            platformConfig={platforms.codeforces}
            stats={platformStats.codeforces}
            onRefreshSingle={handleGlobalRefresh}
            refreshing={syncing}
          />

          <PlatformCard
            platformKey="codechef"
            platformConfig={platforms.codechef}
            stats={platformStats.codechef}
            onRefreshSingle={handleGlobalRefresh}
            refreshing={syncing}
          />
        </div>
      </div>
    </div>
  );
};

export default StudentPlatforms;
