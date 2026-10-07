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
    <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-900 text-white text-[11px] uppercase tracking-wider font-semibold border-b border-slate-800 select-none">
              <th className="py-3.5 px-3 text-center w-14">Rank</th>
              <th className="py-3.5 px-3 min-w-[170px]">Student Details</th>
              <th className="py-3.5 px-2 text-center min-w-[95px]">
                <div className="flex items-center justify-center gap-1 font-bold text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  LeetCode
                </div>
              </th>
              <th className="py-3.5 px-2 text-center min-w-[85px]">
                <div className="flex items-center justify-center gap-1 font-bold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  GFG
                </div>
              </th>
              <th className="py-3.5 px-2 text-center min-w-[95px]">
                <div className="flex items-center justify-center gap-1 font-bold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  HackerRank
                </div>
              </th>
              <th className="py-3.5 px-2 text-center min-w-[95px]">
                <div className="flex items-center justify-center gap-1 font-medium text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                  Codeforces
                </div>
              </th>
              <th className="py-3.5 px-2 text-center min-w-[95px]">
                <div className="flex items-center justify-center gap-1 font-medium text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                  CodeChef
                </div>
              </th>
              <th className="py-3.5 px-3 text-right min-w-[105px]">
                <div className="flex flex-col items-end">
                  <span className="font-extrabold text-white">Overall Score</span>
                  <span className="text-[9px] text-brand-300/90 font-normal lowercase">out of 100</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {students.map((student, index) => {
              const platforms = student.platforms || {};

              return (
                <tr key={student.id || index} className="hover:bg-slate-50/80 transition-colors">
                  {/* Rank */}
                  <td className="py-3 px-3 text-center align-middle">
                    <RankBadge rank={student.rank || index + 1} />
                  </td>

                  {/* Student */}
                  <td className="py-3 px-3 align-middle">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center text-[11px] shrink-0">
                        {renderInitial(student.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-xs truncate max-w-[170px]" title={student.name}>
                          {student.name}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {student.rollNumber && (
                            <span className="font-mono font-medium text-slate-600">
                              {student.rollNumber}
                            </span>
                          )}
                          <span>•</span>
                          <span className="truncate max-w-[110px]" title={student.department}>{student.department}</span>
                          <span>•</span>
                          <span className="shrink-0">Yr {student.year}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* LeetCode */}
                  <td className="py-3 px-2 text-center align-middle">
                    {platforms.leetcode?.problemsSolved !== null && platforms.leetcode?.problemsSolved !== undefined ? (
                      <div className="font-bold text-slate-900 font-mono text-xs">
                        {platforms.leetcode.problemsSolved}
                        <span className="text-[10px] font-normal text-slate-400 ml-0.5">solved</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300 italic">—</span>
                    )}
                  </td>

                  {/* GFG */}
                  <td className="py-3 px-2 text-center align-middle">
                    {platforms.gfg?.problemsSolved !== null && platforms.gfg?.problemsSolved !== undefined ? (
                      <div className="font-bold text-slate-900 font-mono text-xs">
                        {platforms.gfg.problemsSolved}
                        <span className="text-[10px] font-normal text-slate-400 ml-0.5">solved</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300 italic">—</span>
                    )}
                  </td>

                  {/* HackerRank */}
                  <td className="py-3 px-2 text-center align-middle">
                    {platforms.hackerrank?.problemsSolved !== null && platforms.hackerrank?.problemsSolved !== undefined ? (
                      <div className="font-bold text-slate-900 font-mono text-xs">
                        {platforms.hackerrank.problemsSolved}
                        <span className="text-[10px] font-normal text-slate-400 ml-0.5">solved</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300 italic">—</span>
                    )}
                  </td>

                  {/* Codeforces */}
                  <td className="py-3 px-2 text-center align-middle">
                    {platforms.codeforces?.problemsSolved !== null && platforms.codeforces?.problemsSolved !== undefined ? (
                      <div className="font-semibold text-slate-600 font-mono text-xs">
                        {platforms.codeforces.problemsSolved}
                        <span className="text-[10px] font-normal text-slate-400 ml-0.5">solved</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300 italic">—</span>
                    )}
                  </td>

                  {/* CodeChef */}
                  <td className="py-3 px-2 text-center align-middle">
                    {platforms.codechef?.problemsSolved !== null && platforms.codechef?.problemsSolved !== undefined ? (
                      <div className="font-semibold text-slate-600 font-mono text-xs">
                        {platforms.codechef.problemsSolved}
                        <span className="text-[10px] font-normal text-slate-400 ml-0.5">solved</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300 italic">—</span>
                    )}
                  </td>

                  {/* Overall Score */}
                  <td className="py-3 px-3 text-right align-middle">
                    <div className="inline-flex items-center gap-1 bg-brand-50/80 border border-brand-200/80 px-2 py-1 rounded-lg">
                      <span className="text-xs font-black text-brand-700 font-mono">
                        {typeof (student.overallScore ?? student.finalScore) === 'number'
                          ? Number(student.overallScore ?? student.finalScore).toFixed(1)
                          : (student.overallScore ?? student.finalScore ?? 0)}
                      </span>
                      <span className="text-[9px] font-bold text-brand-600 uppercase">pts</span>
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
