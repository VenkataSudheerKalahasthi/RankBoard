import React from 'react';
import Card from '../common/Card';
import RankBadge from '../common/RankBadge';
import AnimatedCounter from '../common/AnimatedCounter';
import { Trophy, CheckCircle2, Layers, ExternalLink, Sparkles } from 'lucide-react';
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
      dotColor: 'bg-sky-400',
      isScoring: true,
      connected: !!platforms.hackerrank?.username,
      username: platforms.hackerrank?.username,
      problemsSolved: stats.hackerrank?.totalSolved,
    },
    {
      key: 'codeforces',
      name: 'Codeforces',
      dotColor: 'bg-blue-400',
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
    <Card hoverable className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white border border-blue-900/60 shadow-xl overflow-hidden relative rounded-2xl card-hover-interactive">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-blue-900/50 pb-5">
        <div className="min-w-0">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Competitive Standing Overview
          </span>
          <h2 className="text-xl sm:text-2xl font-black mt-1 text-white tracking-tight break-words">
            {student?.name || 'Student Score Overview'}
          </h2>
          <div className="text-xs text-slate-300 mt-1 font-medium flex flex-wrap items-center gap-1.5">
            <span>Roll:</span>
            <span className="font-mono text-white font-bold bg-white/10 px-2 py-0.5 rounded">{student?.rollNumber || '—'}</span>
            <span>•</span>
            <span className="truncate max-w-[200px]" title={student?.department}>{student?.department || 'Department'}</span>
            <span>•</span>
            <span>Year {student?.year || 1}</span>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-4 bg-slate-950/80 backdrop-blur-md px-4 sm:px-5 py-3 rounded-2xl border border-blue-500/30 shadow-inner w-full sm:w-auto shrink-0">
          <div className="text-left sm:text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              College Rank
            </span>
            <div className="mt-1">
              <RankBadge rank={student?.rank} />
            </div>
          </div>

          <div className="h-10 w-[1px] bg-slate-700/60"></div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Overall Score
            </span>
            <span className="text-2xl sm:text-3xl font-black text-sky-400 font-mono">
              <AnimatedCounter value={finalScore} />
            </span>
          </div>
        </div>
      </div>

      {/* Connected Platforms Overview */}
      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            Connected Coding Profiles
          </h3>
          <Link to="/student/platforms" className="text-[11px] text-sky-400 hover:text-sky-300 font-bold">
            Manage Profiles &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {platformList.map((p) => (
            <div
              key={p.key}
              className={`p-3.5 rounded-xl border transition-all ${
                p.connected
                  ? 'bg-slate-950/60 border-blue-900/80 shadow-xs'
                  : 'bg-slate-950/30 border-slate-800/60 opacity-50'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2 font-bold text-slate-200">
                  <div className="w-5 h-5 rounded-md bg-white border border-slate-700/80 overflow-hidden flex items-center justify-center shrink-0 p-0.5 shadow-2xs">
                    <img src={`/logos/${p.key}.jpg`} alt={p.name} className="w-full h-full object-contain" />
                  </div>
                  {p.name}
                </div>
              </div>

              {p.connected ? (
                <div className="space-y-1 mt-2">
                  <div className="text-xs text-slate-300 font-mono flex items-center justify-between gap-1.5">
                    <span className="truncate min-w-0 font-bold">@{p.username}</span>
                    <span className="text-[10px] text-emerald-400 font-extrabold shrink-0">Active</span>
                  </div>
                  {p.problemsSolved !== null && p.problemsSolved !== undefined && (
                    <div className="text-sm font-extrabold font-mono text-white pt-1.5 border-t border-slate-800">
                      <AnimatedCounter value={p.problemsSolved} /> <span className="text-[10px] font-normal text-slate-400">solved</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 py-1.5 font-medium">
                  {p.isScoring ? 'Connect for score' : 'Connect for stats'}
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

