import React from 'react';
import { Trophy, Medal, Award, Sparkles } from 'lucide-react';
import AnimatedCounter from '../common/AnimatedCounter';

export const PodiumSkeleton = () => {
  return (
    <div className="w-full max-w-6xl mx-auto mb-10 animate-pulse" aria-hidden="true">
      <div className="text-center mb-8 flex flex-col items-center">
        <div className="h-6 w-36 bg-blue-100/70 dark:bg-blue-500/20 rounded-full mb-2"></div>
        <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700/60 rounded-xl mb-1"></div>
        <div className="h-4 w-72 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 items-end pt-2 w-full">
        {/* Silver Rank 2 Skeleton */}
        <div className="order-2 md:order-1 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-800/80 mb-3 border-2 border-slate-300 dark:border-slate-700"></div>
          <div className="w-full h-44 bg-white dark:bg-[#111E3D] rounded-2xl p-5 border border-[#D9E4F2] dark:border-blue-900/40 shadow-sm flex flex-col items-center justify-between">
            <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
            <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
            <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800 rounded"></div>
            <div className="w-full pt-3 border-t border-slate-100 dark:border-blue-900/30 flex justify-between">
              <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded"></div>
              <div className="h-6 w-12 bg-blue-100/70 dark:bg-blue-900/40 rounded"></div>
            </div>
          </div>
        </div>

        {/* Gold Champion Rank 1 Skeleton */}
        <div className="order-1 md:order-2 flex flex-col items-center mt-0 md:-mt-6">
          <div className="w-20 h-20 rounded-2xl bg-amber-100 dark:bg-amber-900/30 mb-3 border-4 border-amber-300 dark:border-amber-600/50"></div>
          <div className="w-full h-52 bg-white dark:bg-[#111E3D] rounded-2xl p-6 border-2 border-amber-300 dark:border-amber-500/40 shadow-lg flex flex-col items-center justify-between">
            <div className="h-6 w-28 bg-amber-100 dark:bg-amber-900/40 rounded-full"></div>
            <div className="h-6 w-36 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
            <div className="h-3.5 w-28 bg-slate-100 dark:bg-slate-800 rounded"></div>
            <div className="w-full pt-3 border-t border-amber-100 dark:border-amber-900/30 flex justify-between">
              <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded"></div>
              <div className="h-7 w-14 bg-blue-100/70 dark:bg-blue-900/40 rounded"></div>
            </div>
          </div>
        </div>

        {/* Bronze Rank 3 Skeleton */}
        <div className="order-3 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-800/80 mb-3 border-2 border-amber-300/40 dark:border-amber-700/50"></div>
          <div className="w-full h-44 bg-white dark:bg-[#111E3D] rounded-2xl p-5 border border-[#D9E4F2] dark:border-blue-900/40 shadow-sm flex flex-col items-center justify-between">
            <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
            <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
            <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800 rounded"></div>
            <div className="w-full pt-3 border-t border-slate-100 dark:border-blue-900/30 flex justify-between">
              <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded"></div>
              <div className="h-6 w-12 bg-blue-100/70 dark:bg-blue-900/40 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Podium = ({ topStudents = [], loading = false }) => {
  if (loading && (!topStudents || topStudents.length === 0)) {
    return <PodiumSkeleton />;
  }

  if (!topStudents || topStudents.length === 0) return null;

  const first = topStudents.find((s) => s.rank === 1) || topStudents[0];
  const second = topStudents.find((s) => s.rank === 2) || topStudents[1];
  const third = topStudents.find((s) => s.rank === 3) || topStudents[2];

  const renderInitial = (name) => {
    if (!name) return 'ST';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="w-full max-w-6xl mx-auto mb-10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100/80 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-400/30 text-blue-700 dark:text-sky-300 text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
          Hall of Champions
        </div>
        <h2 className="text-2xl font-black text-[#0F172A] dark:text-white tracking-tight">
          Top Performing DSA Leaders
        </h2>
        <p className="text-xs text-[#475569] dark:text-slate-300 max-w-md mx-auto mt-1 font-medium">
          Leading students with highest evaluated competitive programming scores.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 items-end pt-2 w-full">
        {/* Rank 2 (Silver) */}
        {second ? (
          <div className="order-2 md:order-1 flex flex-col items-center group">
            <div className="relative mb-3 flex flex-col items-center">
              <div className="absolute -top-3 right-0 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 p-2 rounded-full shadow-md border border-slate-300 dark:border-slate-700 z-10">
                <Medal className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </div>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800 text-slate-800 dark:text-slate-100 font-black flex items-center justify-center border-2 border-slate-300 dark:border-slate-600 shadow-md text-base group-hover:scale-105 transition-all">
                {renderInitial(second.name)}
              </div>
            </div>

            <div className="text-center w-full bg-white dark:bg-[#111E3D] rounded-2xl p-5 border border-[#D9E4F2] dark:border-blue-400/20 shadow-sm card-hover-interactive">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 mb-2">
                RANK #2
              </span>
              <h3 className="font-extrabold text-[#0F172A] dark:text-white text-sm truncate" title={second.name}>
                {second.name}
              </h3>
              <p className="text-xs text-[#475569] dark:text-slate-300 truncate mt-0.5 font-medium">
                {second.department || 'Computer Science'}
              </p>

              <div className="mt-4 pt-3 border-t border-[#D9E4F2] dark:border-blue-900/30 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Overall Score</span>
                <span className="font-black text-blue-700 dark:text-sky-300 font-mono text-base bg-blue-50 dark:bg-blue-600/20 px-2 py-0.5 rounded-lg border border-blue-100 dark:border-blue-400/30">
                  <AnimatedCounter value={second.finalScore ?? 0} />
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="order-2 md:order-1 hidden md:block"></div>
        )}

        {/* Rank 1 (Gold / Champion) */}
        {first ? (
          <div className="order-1 md:order-2 flex flex-col items-center mt-0 md:-mt-6 group">
            <div className="relative mb-3 flex flex-col items-center">
              <div className="absolute -top-4 right-0 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 p-2.5 rounded-full shadow-lg border border-amber-300 z-10 animate-bounce">
                <Trophy className="w-5 h-5 text-amber-950" />
              </div>
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-300 via-amber-200 to-yellow-100 dark:from-amber-500 dark:to-yellow-400 text-amber-950 font-black flex items-center justify-center border-4 border-amber-300 ring-4 ring-amber-100 dark:ring-amber-900/50 shadow-xl text-xl group-hover:scale-105 transition-all">
                {renderInitial(first.name)}
              </div>
            </div>

            <div className="text-center w-full bg-gradient-to-b from-white via-amber-50/20 to-white dark:from-[#111E3D] dark:via-[#162653] dark:to-[#111E3D] rounded-2xl p-6 border-2 border-amber-300 dark:border-amber-400/60 shadow-lg relative overflow-hidden group-hover:border-amber-400 card-hover-interactive">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500"></div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 dark:bg-amber-400/20 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-400/40 mb-2 shadow-sm">
                <Trophy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                CHAMPION • #1
              </span>
              <h3 className="font-black text-[#0F172A] dark:text-white text-base truncate" title={first.name}>
                {first.name}
              </h3>
              <p className="text-xs text-[#475569] dark:text-slate-300 truncate mt-0.5 font-semibold">
                {first.department || 'Computer Science'} • Yr {first.year || 1}
              </p>

              <div className="mt-4 pt-3 border-t border-amber-100 dark:border-amber-400/20 flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300 font-bold">Overall Score</span>
                <span className="font-black text-blue-700 dark:text-sky-300 font-mono text-lg bg-blue-100/80 dark:bg-blue-600/30 px-2.5 py-0.5 rounded-lg border border-blue-200 dark:border-blue-400/40">
                  <AnimatedCounter value={first.finalScore ?? 0} />
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Rank 3 (Bronze) */}
        {third ? (
          <div className="order-3 flex flex-col items-center group">
            <div className="relative mb-3 flex flex-col items-center">
              <div className="absolute -top-3 right-0 bg-amber-700 text-white p-2 rounded-full shadow-md border border-amber-800 z-10">
                <Award className="w-4 h-4" />
              </div>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-200 to-amber-100 dark:from-amber-800 dark:to-orange-900 text-amber-950 dark:text-amber-100 font-black flex items-center justify-center border-2 border-amber-300 dark:border-amber-600 shadow-md text-base group-hover:scale-105 transition-all">
                {renderInitial(third.name)}
              </div>
            </div>

            <div className="text-center w-full bg-white dark:bg-[#111E3D] rounded-2xl p-5 border border-[#D9E4F2] dark:border-blue-400/20 shadow-sm card-hover-interactive">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-orange-50 dark:bg-orange-950/40 text-amber-900 dark:text-orange-300 border border-orange-200 dark:border-orange-800 mb-2">
                RANK #3
              </span>
              <h3 className="font-extrabold text-[#0F172A] dark:text-white text-sm truncate" title={third.name}>
                {third.name}
              </h3>
              <p className="text-xs text-[#475569] dark:text-slate-300 truncate mt-0.5 font-medium">
                {third.department || 'Computer Science'}
              </p>

              <div className="mt-4 pt-3 border-t border-[#D9E4F2] dark:border-blue-900/30 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Overall Score</span>
                <span className="font-black text-blue-700 dark:text-sky-300 font-mono text-base bg-blue-50 dark:bg-blue-600/20 px-2 py-0.5 rounded-lg border border-blue-100 dark:border-blue-400/30">
                  <AnimatedCounter value={third.finalScore ?? 0} />
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="order-3 hidden md:block"></div>
        )}
      </div>
    </div>
  );
};

export default Podium;
