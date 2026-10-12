import React from 'react';
import RankBadge from '../common/RankBadge';
import EmptyState from '../common/EmptyState';

const LeaderboardTable = ({ students = [], loading = false }) => {
  if (!loading && students.length === 0) {
    return (
      <EmptyState
        title="No students match the criteria"
        description="Try adjusting your department or search query to find students."
      />
    );
  }

  const renderInitial = (name) => {
    if (!name) return 'ST';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="bg-white dark:bg-[#111E3D] rounded-2xl border border-[#D9E4F2] dark:border-blue-400/20 shadow-md overflow-hidden transition-colors duration-300">
      {/* Mobile Card Layout (< md screens) */}
      <div className="block md:hidden divide-y divide-[#D9E4F2] dark:divide-blue-900/30">
        {students.map((student, index) => {
          const platforms = student.platforms || {};
          const score = typeof (student.overallScore ?? student.finalScore) === 'number'
            ? Number(student.overallScore ?? student.finalScore).toFixed(1)
            : (student.overallScore ?? student.finalScore ?? 0);

          return (
            <div key={student.id || index} className="p-4 space-y-3 hover:bg-blue-50/60 dark:hover:bg-[#162653]/60 transition-colors">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <RankBadge rank={student.rank || index + 1} />
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-100 to-sky-50 dark:from-blue-600/30 dark:to-sky-500/20 border border-blue-200 dark:border-blue-400/40 text-blue-800 dark:text-sky-300 font-extrabold flex items-center justify-center text-[11px] shrink-0">
                    {renderInitial(student.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-[#0F172A] dark:text-white text-xs truncate" title={student.name}>
                      {student.name}
                    </div>
                    <div className="text-[11px] text-[#64748B] dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                      {student.rollNumber && (
                        <span className="font-mono font-bold text-blue-600 dark:text-sky-300 bg-blue-50 dark:bg-blue-500/20 px-1.5 py-0.2 rounded border border-blue-100 dark:border-blue-400/30">
                          {student.rollNumber}
                        </span>
                      )}
                      <span>•</span>
                      <span className="truncate max-w-[150px]" title={student.department}>{student.department}</span>
                      <span>•</span>
                      <span>Yr {student.year}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <div className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-600/20 dark:to-sky-500/10 border border-blue-200/80 dark:border-blue-400/30 px-2 py-1 rounded-lg">
                    <span className="text-xs font-black text-blue-700 dark:text-sky-300 font-mono">{score}</span>
                    <span className="text-[9px] font-extrabold text-blue-600 dark:text-sky-400 uppercase">pts</span>
                  </div>
                </div>
              </div>

              {/* Platform breakdown chips */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-1 border-t border-[#D9E4F2] dark:border-blue-900/30 text-[11px]">
                <div className="bg-amber-50/70 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-400/20 rounded-md p-1.5 text-center">
                  <div className="text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase">LeetCode</div>
                  <div className="font-mono font-bold text-[#0F172A] dark:text-white text-xs">
                    {platforms.leetcode?.problemsSolved ?? '—'}
                  </div>
                </div>
                <div className="bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-400/20 rounded-md p-1.5 text-center">
                  <div className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">GFG</div>
                  <div className="font-mono font-bold text-[#0F172A] dark:text-white text-xs">
                    {platforms.gfg?.problemsSolved ?? '—'}
                  </div>
                </div>
                <div className="bg-sky-50/70 dark:bg-sky-500/10 border border-sky-200/60 dark:border-sky-400/20 rounded-md p-1.5 text-center">
                  <div className="text-[9px] font-bold text-sky-700 dark:text-sky-400 uppercase">HackerRank</div>
                  <div className="font-mono font-bold text-[#0F172A] dark:text-white text-xs">
                    {platforms.hackerrank?.problemsSolved ?? '—'}
                  </div>
                </div>
                <div className="bg-blue-50/70 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-400/20 rounded-md p-1.5 text-center">
                  <div className="text-[9px] font-medium text-blue-700 dark:text-blue-300 uppercase">Codeforces</div>
                  <div className="font-mono font-bold text-[#0F172A] dark:text-slate-100 text-xs">
                    {platforms.codeforces?.problemsSolved ?? '—'}
                  </div>
                </div>
                <div className="bg-orange-50/70 dark:bg-orange-500/10 border border-orange-200/60 dark:border-orange-400/20 rounded-md p-1.5 text-center">
                  <div className="text-[9px] font-medium text-orange-700 dark:text-orange-400 uppercase">CodeChef</div>
                  <div className="font-mono font-bold text-[#0F172A] dark:text-slate-100 text-xs">
                    {platforms.codechef?.problemsSolved ?? '—'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table View (>= md screens) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#EFF6FF] dark:bg-[#0D1830] text-[#0F172A] dark:text-white text-[11px] uppercase tracking-wider font-extrabold border-b border-[#D9E4F2] dark:border-blue-900/40 select-none">
              <th className="py-4 px-4 text-center w-16">Rank</th>
              <th className="py-4 px-4 min-w-[180px]">Student Details</th>
              <th className="py-4 px-3 text-center min-w-[100px]">
                <div className="flex items-center justify-center gap-1.5 font-bold text-amber-500 dark:text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  LeetCode
                </div>
              </th>
              <th className="py-4 px-3 text-center min-w-[90px]">
                <div className="flex items-center justify-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  GFG
                </div>
              </th>
              <th className="py-4 px-3 text-center min-w-[100px]">
                <div className="flex items-center justify-center gap-1.5 font-bold text-sky-600 dark:text-sky-400">
                  <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                  HackerRank
                </div>
              </th>
              <th className="py-4 px-3 text-center min-w-[100px]">
                <div className="flex items-center justify-center gap-1.5 font-bold text-blue-600 dark:text-blue-300">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Codeforces
                </div>
              </th>
              <th className="py-4 px-3 text-center min-w-[100px]">
                <div className="flex items-center justify-center gap-1.5 font-bold text-orange-600 dark:text-orange-400">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  CodeChef
                </div>
              </th>
              <th className="py-4 px-4 text-right min-w-[110px]">
                <div className="flex flex-col items-end">
                  <span className="font-black text-[#0F172A] dark:text-white">Overall Score</span>
                  <span className="text-[9px] text-blue-600 dark:text-blue-300 font-normal lowercase">eval points</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D9E4F2] dark:divide-blue-900/30 text-[#0F172A] dark:text-slate-200">
            {students.map((student, index) => {
              const platforms = student.platforms || {};

              return (
                <tr
                  key={student.id || index}
                  className="hover:bg-blue-50/60 dark:hover:bg-[#162653]/60 transition-colors group"
                >
                  {/* Rank */}
                  <td className="py-3.5 px-4 text-center align-middle">
                    <RankBadge rank={student.rank || index + 1} />
                  </td>

                  {/* Student Details */}
                  <td className="py-3.5 px-4 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-100 to-sky-50 dark:from-blue-600/30 dark:to-sky-500/20 border border-blue-200 dark:border-blue-400/40 text-blue-800 dark:text-sky-300 font-extrabold flex items-center justify-center text-xs shrink-0 shadow-sm group-hover:scale-105 transition-all">
                        {renderInitial(student.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-[#0F172A] dark:text-white text-xs truncate max-w-[200px] lg:max-w-xs xl:max-w-none" title={student.name}>
                          {student.name}
                        </div>
                        <div className="text-[11px] text-[#64748B] dark:text-slate-400 flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {student.rollNumber && (
                            <span className="font-mono font-bold text-blue-600 dark:text-sky-300 bg-blue-50 dark:bg-blue-500/20 px-1.5 py-0.2 rounded border border-blue-100 dark:border-blue-400/30">
                              {student.rollNumber}
                            </span>
                          )}
                          <span>•</span>
                          <span className="truncate max-w-[140px] xl:max-w-none font-medium" title={student.department}>{student.department}</span>
                          <span>•</span>
                          <span className="shrink-0 font-medium">Yr {student.year}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* LeetCode */}
                  <td className="py-3.5 px-3 text-center align-middle">
                    {platforms.leetcode?.problemsSolved !== null && platforms.leetcode?.problemsSolved !== undefined ? (
                      <div className="font-extrabold text-[#0F172A] dark:text-white font-mono text-xs">
                        {platforms.leetcode.problemsSolved}
                        <span className="text-[10px] font-normal text-slate-400 dark:text-slate-400 ml-0.5">solved</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300 dark:text-slate-600 italic">—</span>
                    )}
                  </td>

                  {/* GFG */}
                  <td className="py-3.5 px-3 text-center align-middle">
                    {platforms.gfg?.problemsSolved !== null && platforms.gfg?.problemsSolved !== undefined ? (
                      <div className="font-extrabold text-[#0F172A] dark:text-white font-mono text-xs">
                        {platforms.gfg.problemsSolved}
                        <span className="text-[10px] font-normal text-slate-400 dark:text-slate-400 ml-0.5">solved</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300 dark:text-slate-600 italic">—</span>
                    )}
                  </td>

                  {/* HackerRank */}
                  <td className="py-3.5 px-3 text-center align-middle">
                    {platforms.hackerrank?.problemsSolved !== null && platforms.hackerrank?.problemsSolved !== undefined ? (
                      <div className="font-extrabold text-[#0F172A] dark:text-white font-mono text-xs">
                        {platforms.hackerrank.problemsSolved}
                        <span className="text-[10px] font-normal text-slate-400 dark:text-slate-400 ml-0.5">solved</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300 dark:text-slate-600 italic">—</span>
                    )}
                  </td>

                  {/* Codeforces */}
                  <td className="py-3.5 px-3 text-center align-middle">
                    {platforms.codeforces?.problemsSolved !== null && platforms.codeforces?.problemsSolved !== undefined ? (
                      <div className="font-bold text-[#0F172A] dark:text-white font-mono text-xs">
                        {platforms.codeforces.problemsSolved}
                        <span className="text-[10px] font-normal text-slate-400 dark:text-slate-400 ml-0.5">solved</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300 dark:text-slate-600 italic">—</span>
                    )}
                  </td>

                  {/* CodeChef */}
                  <td className="py-3.5 px-3 text-center align-middle">
                    {platforms.codechef?.problemsSolved !== null && platforms.codechef?.problemsSolved !== undefined ? (
                      <div className="font-bold text-[#0F172A] dark:text-white font-mono text-xs">
                        {platforms.codechef.problemsSolved}
                        <span className="text-[10px] font-normal text-slate-400 dark:text-slate-400 ml-0.5">solved</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300 dark:text-slate-600 italic">—</span>
                    )}
                  </td>

                  {/* Overall Score */}
                  <td className="py-3.5 px-4 text-right align-middle">
                    <div className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-600/20 dark:to-sky-500/10 border border-blue-200/80 dark:border-blue-400/30 px-2.5 py-1 rounded-xl shadow-xs">
                      <span className="text-xs font-black text-blue-700 dark:text-sky-300 font-mono">
                        {typeof (student.overallScore ?? student.finalScore) === 'number'
                          ? Number(student.overallScore ?? student.finalScore).toFixed(1)
                          : (student.overallScore ?? student.finalScore ?? 0)}
                      </span>
                      <span className="text-[9px] font-extrabold text-blue-600 dark:text-sky-400 uppercase">pts</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeaderboardTable;
