import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStudent } from '../context/StudentContext';
import { getStudentRank } from '../services/studentService';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import { 
  Trophy, 
  Award, 
  Users, 
  TrendingUp, 
  ArrowUpRight, 
  Flame, 
  Sparkles, 
  CheckCircle2, 
  ExternalLink 
} from 'lucide-react';

export default function StudentRank() {
  const { student, loading: studentLoading } = useStudent();
  const [rankData, setRankData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRankInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getStudentRank();
      if (res.success) {
        setRankData(res.data);
      }
    } catch (err) {
      console.error('Failed to load rank info:', err);
      setError(err.response?.data?.message || 'Failed to fetch ranking information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankInfo();
  }, []);

  if (studentLoading || loading) {
    return <LoadingState message="Calculating college standings and rank percentile..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchRankInfo} />;
  }

  const rank = rankData?.rank || student?.rank || null;
  const finalScore = rankData?.finalScore ?? student?.finalScore ?? 0;
  const totalStudents = rankData?.totalStudents ?? 0;
  const collegeName = rankData?.collegeName || 'Your College';

  // Calculate dynamic percentile
  const percentile = totalStudents > 1 && rank
    ? Math.max(1, Math.round(((totalStudents - rank + 1) / totalStudents) * 100))
    : 100;

  const getRankBadgeTheme = (r) => {
    if (r === 1) return { bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400', label: 'College Rank 1 👑' };
    if (r === 2) return { bg: 'bg-slate-400/10 border-slate-400/30 text-slate-300', label: 'College Rank 2 🥈' };
    if (r === 3) return { bg: 'bg-amber-700/10 border-amber-700/30 text-amber-500', label: 'College Rank 3 🥉' };
    if (r <= 10) return { bg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400', label: 'Top 10 Elite' };
    if (r <= 50) return { bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400', label: 'Top 50 Achiever' };
    return { bg: 'bg-zinc-800 border-zinc-700 text-zinc-300', label: 'Active Competitor' };
  };

  const badge = rank ? getRankBadgeTheme(rank) : null;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-amber-400" />
            College Standing & Rank
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Dynamic competitive programming rank calculated across all registered students in {collegeName}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/leaderboard">
            <Button variant="secondary" icon={ExternalLink}>
              View Full Leaderboard
            </Button>
          </Link>
          <Link to="/student/platforms">
            <Button variant="primary" icon={ArrowUpRight}>
              Sync Statistics
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Hero Rank Showcase */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 p-8 sm:p-10 shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {/* Rank Big Number */}
          <div className="md:col-span-2 space-y-4">
            {badge && (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${badge.bg}`}>
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                {badge.label}
              </span>
            )}

            <div>
              <div className="text-xs uppercase tracking-widest text-zinc-400 font-semibold mb-1">
                Your Current Official Rank
              </div>
              <div className="flex items-baseline gap-4">
                <span className="text-6xl sm:text-7xl font-extrabold tracking-tight text-white font-mono">
                  {rank ? `#${rank}` : 'Unranked'}
                </span>
                <span className="text-xl sm:text-2xl text-zinc-400 font-medium">
                  / {totalStudents} {totalStudents === 1 ? 'Student' : 'Students'}
                </span>
              </div>
            </div>

            <p className="text-zinc-400 text-sm max-w-xl leading-relaxed">
              {rank
                ? `You are currently ranking higher than ${(percentile - 1).toFixed(0)}% of your peers in ${collegeName} with a combined performance score of ${finalScore.toFixed(2)}.`
                : 'Connect your coding profiles (LeetCode, GFG, HackerRank, Codeforces, CodeChef) on the platforms page to calculate your platform scores and establish your college rank.'}
            </p>
          </div>

          {/* Key Stat Badges Box */}
          <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
              <span className="text-xs text-zinc-400 uppercase tracking-wider font-medium flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                Total Score
              </span>
              <span className="text-lg font-bold text-white font-mono">
                {finalScore.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
              <span className="text-xs text-zinc-400 uppercase tracking-wider font-medium flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                Percentile Tier
              </span>
              <span className="text-lg font-bold text-indigo-400 font-mono">
                Top {100 - percentile + 1}%
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 uppercase tracking-wider font-medium flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" />
                College Pool
              </span>
              <span className="text-lg font-bold text-white font-mono">
                {totalStudents}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Rank Determinants and Guidance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Deterministic Rank Factors" subtitle="How your rank is assigned relative to other students">
          <ul className="space-y-3.5 text-sm text-slate-700">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-900">Primary Metric: Overall Score</span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your rank is directly determined by your evaluated Overall Score across your connected coding profiles.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-900">Tie-Breaking Rules</span>
                <p className="text-xs text-slate-500 mt-0.5">
                  In the event of identical overall scores, ties are resolved deterministically based on problem solves, contest ratings, and registration timeline.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-900">Dynamic College Scope</span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ranks scale dynamically with every student who registers in your college.
                </p>
              </div>
            </li>
          </ul>
        </Card>

        <Card title="Ways to Improve Your Rank" subtitle="Actionable steps to climb the leaderboard">
          <div className="space-y-3 text-sm">
            <div className="p-3.5 bg-[#0b0f19] rounded-lg border border-slate-800">
              <div className="font-semibold text-white">
                Solve Varied & Challenging Problems
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Tackle diverse problem difficulties across platforms like LeetCode and GeeksforGeeks to strengthen foundational and advanced skills.
              </p>
            </div>

            <div className="p-3.5 bg-[#0b0f19] rounded-lg border border-slate-800">
              <div className="font-semibold text-white">
                Participate in Live Contests
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Regular participation in timed rounds on Codeforces and CodeChef boosts your contest standing and competitive separation.
              </p>
            </div>

            <div className="p-3.5 bg-[#0b0f19] rounded-lg border border-slate-800">
              <div className="font-semibold text-white">
                Keep Profiles Connected & Updated
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Ensure all four platform accounts remain active and synced regularly to capture your latest problem-solving achievements.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
