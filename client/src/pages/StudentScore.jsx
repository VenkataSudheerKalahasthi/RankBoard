import React from 'react';
import Card from '../components/common/Card';
import ScoreBreakdownCard from '../components/student/ScoreBreakdownCard';
import { useStudent } from '../context/StudentContext';
import { Award, CheckCircle2, ShieldCheck, Sparkles, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';

const StudentScore = () => {
  const { student } = useStudent();
  const stats = student?.platformStats || {};
  const platforms = student?.platforms || {};
  const overallScore = student?.overallScore ?? student?.finalScore ?? 0;
  const totalStudents = student?.totalCollegeStudents || 1;

  const totalSolvedCombined = ((stats.leetcode?.totalSolved || 0) +
                               (stats.gfg?.totalSolved || 0) +
                               (stats.codeforces?.totalSolved || 0) +
                               (stats.codechef?.totalSolved || 0));

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-600 mb-1">
          <Award className="w-3.5 h-3.5" />
          Competitive Score
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          Your Overall Score
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Your evaluated overall score determined from your connected coding platforms.
        </p>
      </div>

      {/* Hero Score Overview */}
      <ScoreBreakdownCard student={student} />

      {/* Overview & Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card
          title="Score & Standing Summary"
          subtitle="Your official rankboard standing"
        >
          <div className="space-y-4 text-xs text-slate-700">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-semibold text-slate-600">Overall Score</span>
              <span className="text-xl font-black font-mono text-brand-600">{overallScore}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-semibold text-slate-600">College Rank</span>
              <span className="text-base font-bold font-mono text-slate-900">
                {student?.rank ? `#${student.rank} of ${totalStudents}` : 'Unranked'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-semibold text-slate-600">Total Solved (All Platforms)</span>
              <span className="text-base font-bold font-mono text-slate-900">
                {totalSolvedCombined} problems
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-semibold text-slate-600">Last Synced</span>
              <span className="font-medium text-slate-500">
                {student?.lastDataUpdatedAt
                  ? new Date(student.lastDataUpdatedAt).toLocaleString()
                  : 'Pending sync'}
              </span>
            </div>
          </div>
        </Card>

        <Card
          title="Improving Your Score"
          subtitle="Key areas to focus on across platforms"
        >
          <div className="space-y-3.5 text-xs text-slate-600">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block font-semibold">Solve Problems Regularly</strong>
                <p className="mt-0.5 text-slate-500">
                  Continuous practice and solving challenging problems across your connected platforms elevates your overall performance.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block font-semibold">Participate in Contests</strong>
                <p className="mt-0.5 text-slate-500">
                  Higher contest ratings and regular contest participation positively impact your overall competitive evaluation.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block font-semibold">Connect All 4 Profiles</strong>
                <p className="mt-0.5 text-slate-500">
                  Connecting LeetCode, GeeksforGeeks, Codeforces, and CodeChef ensures your complete problem solving footprint is counted.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default StudentScore;
