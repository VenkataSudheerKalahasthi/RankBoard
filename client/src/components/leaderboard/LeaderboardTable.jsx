import React, { useState, useEffect, useRef } from 'react';
import RankBadge from '../common/RankBadge';
import EmptyState from '../common/EmptyState';

const INITIAL_BATCH = 25;
const BATCH_SIZE = 25;

export const LeaderboardTableSkeleton = ({ rows = 6 }) => (
  <div className="bg-white dark:bg-[#111E3D] rounded-2xl border border-[#D9E4F2] dark:border-blue-400/20 shadow-md overflow-hidden animate-pulse" aria-hidden="true">
    {/* Desktop header skeleton */}
    <div className="hidden md:block border-b border-[#D9E4F2] dark:border-blue-900/40 bg-[#EFF6FF] dark:bg-[#0D1830] px-4 py-4">
      <div className="flex items-center justify-between">
        <div className="w-12 h-3.5 bg-blue-200/60 dark:bg-blue-800/40 rounded"></div>
        <div className="w-48 h-3.5 bg-blue-200/60 dark:bg-blue-800/40 rounded"></div>
        <div className="flex gap-8">
          <div className="w-16 h-3.5 bg-blue-200/60 dark:bg-blue-800/40 rounded"></div>
          <div className="w-16 h-3.5 bg-blue-200/60 dark:bg-blue-800/40 rounded"></div>
          <div className="w-16 h-3.5 bg-blue-200/60 dark:bg-blue-800/40 rounded"></div>
        </div>
        <div className="w-24 h-3.5 bg-blue-200/60 dark:bg-blue-800/40 rounded"></div>
      </div>
    </div>

    {/* Skeleton Rows */}
    <div className="divide-y divide-[#D9E4F2] dark:divide-blue-900/30">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-1/3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0"></div>
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
              <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-1/2"></div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6 flex-1 justify-center">
            <div className="h-4 w-12 bg-slate-100 dark:bg-slate-800 rounded"></div>
            <div className="h-4 w-12 bg-slate-100 dark:bg-slate-800 rounded"></div>
            <div className="h-4 w-12 bg-slate-100 dark:bg-slate-800 rounded"></div>
            <div className="h-4 w-12 bg-slate-100 dark:bg-slate-800 rounded"></div>
            <div className="h-4 w-12 bg-slate-100 dark:bg-slate-800 rounded"></div>
          </div>
          <div className="h-7 w-20 bg-blue-100/60 dark:bg-blue-900/30 rounded-lg shrink-0"></div>
        </div>
      ))}
    </div>
  </div>
);

const LeaderboardTable = ({ students = [], loading = false }) => {
  const [displayLimit, setDisplayLimit] = useState(INITIAL_BATCH);
  const sentinelRef = useRef(null);

  // Reset progressive count whenever students array changes (filter/search/data update)
  useEffect(() => {
    setDisplayLimit(INITIAL_BATCH);
  }, [students]);

  // Observer to lazily append next batch as user scrolls near bottom
  useEffect(() => {
    if (displayLimit >= students.length) return;

    const sentinelNode = sentinelRef.current;
    if (!sentinelNode) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry && entry.isIntersecting) {
          setDisplayLimit((prev) => Math.min(prev + BATCH_SIZE, students.length));
        }
      },
      { rootMargin: '350px 0px' }
    );

    observer.observe(sentinelNode);
    return () => observer.disconnect();
  }, [displayLimit, students.length]);

  if (loading && students.length === 0) {
    return <LeaderboardTableSkeleton />;
  }

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

  const visibleStudents = students.slice(0, displayLimit);

  return (
    <div className="bg-white dark:bg-[#111E3D] rounded-2xl border border-[#D9E4F2] dark:border-blue-400/20 shadow-md overflow-hidden transition-colors duration-300">
      {/* Mobile Card Layout (< md screens) */}
      <div className="block md:hidden divide-y divide-[#D9E4F2] dark:divide-blue-900/30">
        {visibleStudents.map((student, index) => {
          const platforms = student.platforms || {};
          const score = typeof (student.overallScore ?? student.finalScore) === 'number'
            ? Number(student.overallScore ?? student.finalScore).toFixed(1)
            : (student.overallScore ?? student.finalScore ?? 0);

          const staggerDelay = (index % BATCH_SIZE) * 20;

          return (
            <div
              key={student.id || index}
              className="p-4 space-y-3 hover:bg-blue-50/60 dark:hover:bg-[#162653]/60 transition-colors leaderboard-row-progressive"
              style={{ animationDelay: `${staggerDelay}ms` }}
            >
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
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 sm:gap-2 pt-1 border-t border-[#D9E4F2] dark:border-blue-900/30 text-[11px]">
                <div className="bg-amber-50/70 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-400/20 rounded-md p-1 sm:p-1.5 text-center min-w-0">
                  <div className="flex items-center justify-center gap-1 text-[8px] sm:text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase truncate">
                    <img src="/logos/leetcode.jpg" alt="LC" className="w-2.5 h-2.5 sm:w-3 sm:h-3 object-contain rounded-xs shrink-0" />
                    <span className="truncate">LeetCode</span>
                  </div>
                  <div className="font-mono font-bold text-[#0F172A] dark:text-white text-[11px] sm:text-xs">
                    {platforms.leetcode?.problemsSolved ?? '—'}
                  </div>
                </div>
                <div className="bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-400/20 rounded-md p-1 sm:p-1.5 text-center min-w-0">
                  <div className="flex items-center justify-center gap-1 text-[8px] sm:text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase truncate">
                    <img src="/logos/gfg.jpg" alt="GFG" className="w-2.5 h-2.5 sm:w-3 sm:h-3 object-contain rounded-xs shrink-0" />
                    <span className="truncate">GFG</span>
                  </div>
                  <div className="font-mono font-bold text-[#0F172A] dark:text-white text-[11px] sm:text-xs">
                    {platforms.gfg?.problemsSolved ?? '—'}
                  </div>
                </div>
                <div className="bg-sky-50/70 dark:bg-sky-500/10 border border-sky-200/60 dark:border-sky-400/20 rounded-md p-1 sm:p-1.5 text-center min-w-0">
                  <div className="flex items-center justify-center gap-1 text-[8px] sm:text-[9px] font-bold text-sky-700 dark:text-sky-400 uppercase truncate">
                    <img src="/logos/hackerrank.jpg" alt="HR" className="w-2.5 h-2.5 sm:w-3 sm:h-3 object-contain rounded-xs shrink-0" />
                    <span className="truncate">HackerRank</span>
                  </div>
                  <div className="font-mono font-bold text-[#0F172A] dark:text-white text-[11px] sm:text-xs">
                    {platforms.hackerrank?.problemsSolved ?? '—'}
                  </div>
                </div>
                <div className="bg-blue-50/70 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-400/20 rounded-md p-1 sm:p-1.5 text-center min-w-0">
                  <div className="flex items-center justify-center gap-1 text-[8px] sm:text-[9px] font-medium text-blue-700 dark:text-blue-300 uppercase truncate">
                    <img src="/logos/codeforces.jpg" alt="CF" className="w-2.5 h-2.5 sm:w-3 sm:h-3 object-contain rounded-xs shrink-0" />
                    <span className="truncate">Codeforces</span>
                  </div>
                  <div className="font-mono font-bold text-[#0F172A] dark:text-slate-100 text-[11px] sm:text-xs">
                    {platforms.codeforces?.problemsSolved ?? '—'}
                  </div>
                </div>
                <div className="bg-orange-50/70 dark:bg-orange-500/10 border border-orange-200/60 dark:border-orange-400/20 rounded-md p-1 sm:p-1.5 text-center min-w-0">
                  <div className="flex items-center justify-center gap-1 text-[8px] sm:text-[9px] font-medium text-orange-700 dark:text-orange-400 uppercase truncate">
                    <img src="/logos/codechef.jpg" alt="CC" className="w-2.5 h-2.5 sm:w-3 sm:h-3 object-contain rounded-xs shrink-0" />
                    <span className="truncate">CodeChef</span>
                  </div>
                  <div className="font-mono font-bold text-[#0F172A] dark:text-slate-100 text-[11px] sm:text-xs">
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
                  <img src="/logos/leetcode.jpg" alt="LeetCode" className="w-4 h-4 object-contain rounded-xs shrink-0" />
                  LeetCode
                </div>
              </th>
              <th className="py-4 px-3 text-center min-w-[90px]">
                <div className="flex items-center justify-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                  <img src="/logos/gfg.jpg" alt="GFG" className="w-4 h-4 object-contain rounded-xs shrink-0" />
                  GFG
                </div>
              </th>
              <th className="py-4 px-3 text-center min-w-[100px]">
                <div className="flex items-center justify-center gap-1.5 font-bold text-sky-600 dark:text-sky-400">
                  <img src="/logos/hackerrank.jpg" alt="HackerRank" className="w-4 h-4 object-contain rounded-xs shrink-0" />
                  HackerRank
                </div>
              </th>
              <th className="py-4 px-3 text-center min-w-[100px]">
                <div className="flex items-center justify-center gap-1.5 font-bold text-blue-600 dark:text-blue-300">
                  <img src="/logos/codeforces.jpg" alt="Codeforces" className="w-4 h-4 object-contain rounded-xs shrink-0" />
                  Codeforces
                </div>
              </th>
              <th className="py-4 px-3 text-center min-w-[100px]">
                <div className="flex items-center justify-center gap-1.5 font-bold text-orange-600 dark:text-orange-400">
                  <img src="/logos/codechef.jpg" alt="CodeChef" className="w-4 h-4 object-contain rounded-xs shrink-0" />
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
            {visibleStudents.map((student, index) => {
              const platforms = student.platforms || {};
              const staggerDelay = (index % BATCH_SIZE) * 20;

              return (
                <tr
                  key={student.id || index}
                  className="hover:bg-blue-50/60 dark:hover:bg-[#162653]/60 transition-colors group leaderboard-row-progressive"
                  style={{ animationDelay: `${staggerDelay}ms` }}
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

      {/* Progressive Scroll Sentinel & Status Bar */}
      <div
        ref={sentinelRef}
        className="py-3.5 px-4 text-center text-xs font-semibold text-slate-400 dark:text-slate-500 border-t border-[#D9E4F2] dark:border-blue-900/30 bg-slate-50/50 dark:bg-[#0D1830]/40 flex items-center justify-center gap-2"
      >
        {visibleStudents.length < students.length ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            <span>Showing top {visibleStudents.length} of {students.length} ranked students (scroll to reveal more)</span>
          </>
        ) : (
          <span>Displaying all {students.length} students</span>
        )}
      </div>
    </div>
  );
};

export default LeaderboardTable;
