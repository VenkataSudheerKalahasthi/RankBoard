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
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider font-semibold border-b border-slate-800 select-none">
              <th className="py-4 px-4 text-center w-16">Rank</th>
              <th className="py-4 px-6 min-w-[220px]">Student Details</th>
              <th className="py-4 px-4 text-center min-w-[120px]">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  LeetCode
                </div>
              </th>
              <th className="py-4 px-4 text-center min-w-[120px]">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  GeeksforGeeks
                </div>
              </th>
              <th className="py-4 px-4 text-center min-w-[120px]">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  Codeforces
                </div>
              </th>
              <th className="py-4 px-4 text-center min-w-[120px]">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-700"></span>
                  CodeChef
                </div>
              </th>
              <th className="py-4 px-6 text-right min-w-[130px]">Overall Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {students.map((student, index) => {
              const platforms = student.platforms || {};

              return (
                <tr key={student.id || index} className="hover:bg-slate-50/80 transition-colors">
                  {/* Rank */}
                  <td className="py-4 px-4 text-center align-middle">
                    <RankBadge rank={student.rank || index + 1} />
                  </td>

                  {/* Student */}
                  <td className="py-4 px-6 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                        {renderInitial(student.name)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm leading-snug">
                          {student.name}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                          {student.rollNumber && (
                            <span className="font-mono font-medium text-slate-600">
                              {student.rollNumber}
                            </span>
                          )}
                          <span>•</span>
                          <span className="truncate max-w-[160px]">{student.department}</span>
                          <span>•</span>
                          <span>Yr {student.year}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* LeetCode */}
                  <td className="py-4 px-4 text-center align-middle">
                    {platforms.leetcode?.problemsSolved !== null && platforms.leetcode?.problemsSolved !== undefined ? (
                      <div>
                        <div className="font-bold text-slate-900 font-mono">
                          {platforms.leetcode.problemsSolved}
                          <span className="text-[11px] font-normal text-slate-400 ml-1">solved</span>
                        </div>
                        {platforms.leetcode.rating && (
                          <div className="text-[11px] text-amber-600 font-medium font-mono">
                            ★ {platforms.leetcode.rating}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">—</span>
                    )}
                  </td>

                  {/* GFG */}
                  <td className="py-4 px-4 text-center align-middle">
                    {platforms.gfg?.problemsSolved !== null && platforms.gfg?.problemsSolved !== undefined ? (
                      <div>
                        <div className="font-bold text-slate-900 font-mono">
                          {platforms.gfg.problemsSolved}
                          <span className="text-[11px] font-normal text-slate-400 ml-1">solved</span>
                        </div>
                        {platforms.gfg.rating && (
                          <div className="text-[11px] text-emerald-700 font-medium font-mono">
                            {platforms.gfg.rating} pts
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">—</span>
                    )}
                  </td>

                  {/* Codeforces */}
                  <td className="py-4 px-4 text-center align-middle">
                    {platforms.codeforces?.problemsSolved !== null && platforms.codeforces?.problemsSolved !== undefined ? (
                      <div>
                        <div className="font-bold text-slate-900 font-mono">
                          {platforms.codeforces.problemsSolved}
                          <span className="text-[11px] font-normal text-slate-400 ml-1">solved</span>
                        </div>
                        {platforms.codeforces.rating && (
                          <div className="text-[11px] text-blue-600 font-medium font-mono">
                            ★ {platforms.codeforces.rating}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">—</span>
                    )}
                  </td>

                  {/* CodeChef */}
                  <td className="py-4 px-4 text-center align-middle">
                    {platforms.codechef?.problemsSolved !== null && platforms.codechef?.problemsSolved !== undefined ? (
                      <div>
                        <div className="font-bold text-slate-900 font-mono">
                          {platforms.codechef.problemsSolved}
                          <span className="text-[11px] font-normal text-slate-400 ml-1">solved</span>
                        </div>
                        {platforms.codechef.rating && (
                          <div className="text-[11px] text-orange-700 font-medium font-mono">
                            ★ {platforms.codechef.rating}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">—</span>
                    )}
                  </td>

                  {/* Overall Score */}
                  <td className="py-4 px-6 text-right align-middle">
                    <div className="inline-flex flex-col items-end">
                      <span className="text-base font-black text-brand-700 font-mono">
                        {student.overallScore ?? student.finalScore ?? 0}
                      </span>
                      <span className="text-[10px] uppercase font-semibold text-slate-400">
                        Overall Score
                      </span>
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
