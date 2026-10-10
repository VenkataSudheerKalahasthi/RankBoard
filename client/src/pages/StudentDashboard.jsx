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
    <div className="space-y-8">
      {/* Share Achievement Modal */}
      <ShareAchievementModal
        isOpen={showcaseOpen}
        onClose={() => setShowcaseOpen(false)}
      />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-600 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Student Dashboard
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Welcome, {student?.name || 'Student'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Roll: <strong className="font-mono text-slate-700">{student?.rollNumber || 'Not set'}</strong> • {student?.department || 'Department pending'} • Year {student?.year || 1}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowcaseOpen(true)}
            icon={Share2}
            className="bg-brand-600 hover:bg-brand-700 shadow-sm"
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
        <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <div>
              <strong className="block text-amber-900 font-semibold">Complete your profile setup</strong>
              <p className="text-amber-800 mt-0.5">
                {!student?.rollNumber ? 'Add your roll number in settings. ' : ''}
                {connectedCount === 0 ? 'Connect your coding platforms to view statistics and rankings.' : `You have connected ${connectedCount}/5 coding platforms.`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!student?.rollNumber && (
              <Link to="/student/profile">
                <Button variant="secondary" size="sm">Set Roll No</Button>
              </Link>
            )}
            <Link to="/student/platforms">
              <Button variant="primary" size="sm">Link Platforms</Button>
            </Link>
          </div>
        </div>
      )}

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Coding Platform Statistics
            </h3>
            <p className="text-xs text-slate-500">
              Actual statistics retrieved from your submitted public profiles.
            </p>
          </div>
          <Link to="/student/platforms" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
            Manage Links &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
