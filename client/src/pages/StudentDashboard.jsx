import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStudent } from '../context/StudentContext';
import StatCard from '../components/common/StatCard';
import PlatformCard from '../components/student/PlatformCard';
import ScoreBreakdownCard from '../components/student/ScoreBreakdownCard';
import ShareAchievementModal from '../components/showcase/ShareAchievementModal';
import Button from '../components/common/Button';
import { Trophy, CheckCircle2, Layers, RefreshCw, Sparkles, ArrowRight, UserCheck, AlertCircle, Share2 } from 'lucide-react';

const StudentDashboard = () => {
  const { student, syncPlatforms, syncing } = useStudent();
  const [showcaseOpen, setShowcaseOpen] = useState(false);

  const handleGlobalRefresh = async () => {
    await syncPlatforms({});
  };

  const platforms = student?.platforms || {};
  const platformStats = student?.platformStats || {};
  const scores = student?.scores || {};
  const totalStudents = student?.totalCollegeStudents || 1;

  // Calculate connected platforms count
  const platformKeys = ['leetcode', 'gfg', 'codeforces', 'codechef', 'hackerrank'];
  const connectedCount = platformKeys.filter((k) => platforms[k]?.username).length;
  const isComplete = connectedCount >= 5;

  const totalSolvedCombined = ((platformStats.leetcode?.totalSolved || 0) +
                               (platformStats.gfg?.totalSolved || 0) +
                               (platformStats.codeforces?.totalSolved || 0) +
                               (platformStats.codechef?.totalSolved || 0) +
                               (platformStats.hackerrank?.totalSolved || 0));

  return (
    <div className="space-y-8 pb-10">
      {/* Share Achievement Modal */}
      <ShareAchievementModal
        isOpen={showcaseOpen}
        onClose={() => setShowcaseOpen(false)}
      />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-blue-100 dark:border-blue-900/40 pb-5">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-sky-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
            Student Dashboard
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
            Welcome, {student?.name || 'Student'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            Roll: <strong className="font-mono text-blue-700 dark:text-sky-300 bg-blue-50 dark:bg-blue-900/40 px-1.5 py-0.2 rounded border border-blue-100 dark:border-blue-800">{student?.rollNumber || 'Not set'}</strong> • {student?.department || 'Department pending'} • Year {student?.year || 1}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowcaseOpen(true)}
            icon={Share2}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold shadow-md shadow-blue-500/20"
          >
            Share Achievement
          </Button>

          <Button
            variant="secondary"
            size="sm"
            loading={syncing}
            onClick={handleGlobalRefresh}
            icon={RefreshCw}
          >
            Refresh All Stats
          </Button>

          <Link to="/student/platforms">
            <Button variant="secondary" size="sm" icon={Layers}>
              Platforms
            </Button>
          </Link>
        </div>
      </div>

      {/* Profile Incomplete Notice if roll number or handles missing */}
      {(!student?.rollNumber || connectedCount === 0) && (
        <div className="p-4 bg-amber-50/90 border border-amber-200/90 rounded-2xl text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <strong className="block text-amber-950 font-bold text-sm">Complete your profile setup</strong>
              <p className="text-amber-800 mt-0.5 font-medium">
                {!student?.rollNumber ? 'Add your roll number in settings. ' : ''}
                {connectedCount === 0 ? 'Connect your coding platforms to view statistics and rankings.' : `You have connected ${connectedCount}/5 coding platforms.`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!student?.rollNumber && (
              <Link to="/student/profile">
                <Button variant="secondary" size="sm" className="font-bold">Set Roll No</Button>
              </Link>
            )}
            <Link to="/student/platforms">
              <Button variant="primary" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold border-none">Link Platforms</Button>
            </Link>
          </div>
        </div>
      )}

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="College Rank"
          value={student?.rank ? `#${student.rank}` : 'Unranked'}
          subtitle={`Ranked out of ${totalStudents} students`}
          icon={Trophy}
          badgeText="Active"
          badgeVariant="brand"
        />

        <StatCard
          title="Final Score"
          value={student?.finalScore ?? 0}
          subtitle="Combined evaluated points"
          icon={CheckCircle2}
          badgeText="Evaluated"
          badgeVariant="emerald"
        />

        <StatCard
          title="Problems Solved"
          value={totalSolvedCombined.toLocaleString()}
          subtitle="Combined platforms"
          icon={CheckCircle2}
          badgeText="Verified"
          badgeVariant="slate"
        />

        <StatCard
          title="Platform Setup"
          value={`${connectedCount} / 5`}
          subtitle={connectedCount >= 4 ? 'Profiles active' : 'Profiles incomplete'}
          icon={Layers}
          badgeText={`${connectedCount * 20}%`}
          badgeVariant={connectedCount >= 4 ? 'emerald' : 'amber'}
        />
      </div>

      {/* Overall Score Breakdown Card */}
      <ScoreBreakdownCard student={student} />

      {/* Platform Specific Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-blue-100 dark:border-blue-900/40 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Coding Platform Statistics
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Actual statistics retrieved from your submitted public profiles.
            </p>
          </div>
          <Link to="/student/platforms" className="text-xs font-bold text-blue-600 dark:text-sky-400 hover:text-blue-700 dark:hover:text-sky-300">
            Manage Links &rarr;
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

export default StudentDashboard;

