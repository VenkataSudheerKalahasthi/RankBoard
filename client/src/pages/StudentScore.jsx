import React from 'react';
import Card from '../components/common/Card';
import ScoreBreakdownCard from '../components/student/ScoreBreakdownCard';
import ScrollReveal from '../components/common/ScrollReveal';
import AnimatedCounter from '../components/common/AnimatedCounter';
import { useStudent } from '../context/StudentContext';
import { Award, CheckCircle2, ShieldCheck, Sparkles, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';

const StudentScore = ({ previewStudent = null }) => {
  const { student: contextStudent } = useStudent();
  const student = previewStudent || contextStudent;
  const stats = student?.platformStats || {};
  const platforms = student?.platforms || {};
  const overallScore = student?.overallScore ?? student?.finalScore ?? 0;
  const totalStudents = student?.totalCollegeStudents || 1;

  const totalSolvedCombined = ((stats.leetcode?.totalSolved || 0) +
                               (stats.gfg?.totalSolved || 0) +
                               (stats.hackerrank?.totalSolved || 0) +
                               (stats.codeforces?.totalSolved || 0) +
                               (stats.codechef?.totalSolved || 0));

  return (
    <div className="space-y-8">
      {/* Header */}
      <ScrollReveal delay={0}>
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 mb-1">
            <Award className="w-3.5 h-3.5" />
            Competitive Score
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold theme-text-primary">
            Your Overall Score
          </h1>
          <p className="text-xs sm:text-sm theme-text-secondary mt-0.5">
            Performance evaluated across your connected coding platforms.
          </p>
        </div>
      </ScrollReveal>

      {/* Hero Score Overview */}
      <ScrollReveal delay={60}>
        <ScoreBreakdownCard student={student} />
      </ScrollReveal>

      {/* Overview & Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ScrollReveal delay={100}>
          <Card
            hoverable
            title="Score & Standing Summary"
            subtitle="Your official rankboard standing"
            className="card-hover-interactive h-full"
          >
            <div className="space-y-4 text-xs theme-text-secondary">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="font-semibold theme-text-muted">Overall Score</span>
                <span className="text-xl font-black font-mono text-brand-600 dark:text-brand-400">
                  <AnimatedCounter value={overallScore} />
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="font-semibold theme-text-muted">College Rank</span>
                <span className="text-base font-bold font-mono theme-text-primary">
                  {student?.rank ? (
                    <>
                      <AnimatedCounter value={`#${student.rank}`} /> of {totalStudents}
                    </>
                  ) : (
                    'Unranked'
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="font-semibold theme-text-muted">Total Solved (All Platforms)</span>
                <span className="text-base font-bold font-mono theme-text-primary">
                  <AnimatedCounter value={totalSolvedCombined} /> problems
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="font-semibold theme-text-muted">Last Synced</span>
                <span className="font-medium theme-text-muted">
                  {student?.lastDataUpdatedAt
                    ? new Date(student.lastDataUpdatedAt).toLocaleString()
                    : 'Pending sync'}
                </span>
              </div>
            </div>
          </Card>
        </ScrollReveal>

        <ScrollReveal delay={180}>
          <Card
            hoverable
            title="Scoring Platforms"
            subtitle="How your coding profiles contribute to your rankboard standing"
            className="card-hover-interactive h-full"
          >
            <div className="space-y-3.5 text-xs theme-text-secondary">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="theme-text-primary block font-semibold">LeetCode</strong>
                  <p className="mt-0.5 theme-text-muted">
                    Evaluated across Easy, Medium, and Hard problem solves.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="theme-text-primary block font-semibold">GeeksforGeeks</strong>
                  <p className="mt-0.5 theme-text-muted">
                    Evaluated across Easy, Medium, and Hard problem solves. School and Basic problems are tracked as statistics.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="theme-text-primary block font-semibold">HackerRank</strong>
                  <p className="mt-0.5 theme-text-muted">
                    Calculated from problems solved, skill stars, and verified domain badges.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="theme-text-secondary block font-semibold">Codeforces & CodeChef (Statistics Only)</strong>
                  <p className="mt-0.5 theme-text-muted">
                    Contest ratings and problem solves are displayed for your portfolio.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </ScrollReveal>
      </div>
    </div>
  );
};

export default StudentScore;
