import React from 'react';
import Card from '../common/Card';
import RankBadge from '../common/RankBadge';
import { Trophy, CheckCircle2, Layers, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const ScoreBreakdownCard = ({ student }) => {
  const finalScore = student?.overallScore ?? student?.finalScore ?? 0;
  const platforms = student?.platforms || {};
  const stats = student?.platformStats || {};

  const platformList = [
    {
      key: 'leetcode',
      name: 'LeetCode',
      dotColor: 'bg-amber-500',
      isScoring: true,
      connected: !!platforms.leetcode?.username,
      username: platforms.leetcode?.username,
      problemsSolved: stats.leetcode?.totalSolved,
    },
    {
      key: 'gfg',
      name: 'GeeksforGeeks',
      dotColor: 'bg-emerald-500',
      isScoring: true,
      connected: !!platforms.gfg?.username,
      username: platforms.gfg?.username,
      problemsSolved: stats.gfg?.totalSolved,
    },
    {
      key: 'hackerrank',
      name: 'HackerRank',
      dotColor: 'bg-emerald-400',
      isScoring: true,
      connected: !!platforms.hackerrank?.username,
      username: platforms.hackerrank?.username,
      problemsSolved: stats.hackerrank?.totalSolved,
    },
    {
      key: 'codeforces',
      name: 'Codeforces',
      dotColor: 'bg-blue-500',
      isScoring: false,
      connected: !!platforms.codeforces?.username,
      username: platforms.codeforces?.username,
      problemsSolved: stats.codeforces?.totalSolved,
    },
    {
      key: 'codechef',
      name: 'CodeChef',
      dotColor: 'bg-orange-500',
      isScoring: false,
      connected: !!platforms.codechef?.username,
      username: platforms.codechef?.username,
      problemsSolved: stats.codechef?.totalSolved,
    },
  ];

  return (
    <Card className="bg-[#0b0f19] text-white border-slate-800 shadow-xl overflow-hidden relative">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand-400 block">
            Competitive Standing
          </span>
          <h2 className="text-2xl font-black mt-0.5 text-white">
            {student?.name || 'Student Score Overview'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Roll: <span className="font-mono text-slate-200 font-semibold">{student?.rollNumber || '—'}</span> • {student?.department || 'Department'} • Year {student?.year || 1}
          </p>
        </div>

        <div className="flex items-center gap-4 bg-[#070a12] px-4 py-3 rounded-xl border border-slate-800">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              College Rank
            </span>
            <div className="mt-1">
              <RankBadge rank={student?.rank} />
            </div>
          </div>

          <div className="h-10 w-[1px] bg-slate-700"></div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Overall Score
            </span>
            <span className="text-3xl font-black text-brand-400 font-mono">
              {finalScore}
            </span>
          </div>
        </div>
      </div>

      {/* Connected Platforms Overview */}
      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-brand-400" />
            Connected Coding Profiles
          </h3>
          <Link to="/student/platforms" className="text-[11px] text-brand-400 hover:text-brand-300 font-semibold">
            Manage Profiles &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {platformList.map((p) => (
            <div
              key={p.key}
              className={`p-3.5 rounded-xl border transition-all ${
                p.connected
                  ? 'bg-[#0b0f19] border-slate-800'
                  : 'bg-[#0b0f19]/70 border-slate-800/60 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-200">
                  <span className={`w-2 h-2 rounded-full ${p.dotColor}`}></span>
                  {p.name}
                </div>
              </div>

              {p.connected ? (
                <div className="space-y-1 mt-2">
                  <div className="text-xs text-slate-400 font-mono flex items-center justify-between gap-1.5">
                    <span className="truncate min-w-0">@{p.username}</span>
                    <span className="text-[10px] text-emerald-400 font-semibold shrink-0">Active</span>
                  </div>
                  {p.problemsSolved !== null && p.problemsSolved !== undefined && (
                    <div className="text-sm font-bold font-mono text-white pt-1 border-t border-slate-700/50">
                      {p.problemsSolved} <span className="text-[10px] font-normal text-slate-400">problems solved</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 py-1.5">
                  {p.isScoring ? 'Connect to earn rank score' : 'Connect for profile stats'}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default ScoreBreakdownCard;
