import React from 'react';
import { Trophy, Medal, Award } from 'lucide-react';

const Podium = ({ topStudents = [] }) => {
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
    <div className="w-full mb-8">
      <div className="text-center mb-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Hall of Champions
        </h2>
        <p className="text-lg font-extrabold text-slate-900 mt-0.5">
          Top Performing DSA Leaders
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 items-end pt-2 w-full">
        {/* Rank 2 (Silver) */}
        {second ? (
          <div className="order-2 md:order-1 flex flex-col items-center">
            <div className="relative mb-2.5 flex flex-col items-center">
              <div className="absolute -top-2.5 right-0 bg-slate-200 text-slate-800 p-1.5 rounded-full shadow-subtle border border-slate-300">
                <Medal className="w-3.5 h-3.5" />
              </div>
              <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center border border-slate-300 text-sm">
                {renderInitial(second.name)}
              </div>
            </div>

            <div className="text-center w-full bg-white rounded-xl p-4 border border-slate-200 shadow-card">
              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 mb-1.5">
                RANK #2
              </span>
              <h3 className="font-bold text-slate-900 text-sm truncate">
                {second.name}
              </h3>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                {second.department || 'Computer Science'}
              </p>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">Final Score</span>
                <span className="font-bold text-slate-900 font-mono text-sm">
                  {second.finalScore ?? 0}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="order-2 md:order-1 hidden md:block"></div>
        )}

        {/* Rank 1 (Gold) */}
        {first ? (
          <div className="order-1 md:order-2 flex flex-col items-center -mt-4">
            <div className="relative mb-2.5 flex flex-col items-center">
              <div className="absolute -top-3.5 right-0 bg-amber-400 text-slate-950 p-2 rounded-full shadow-md border border-amber-300 animate-bounce">
                <Trophy className="w-4 h-4" />
              </div>
              <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-900 font-extrabold flex items-center justify-center border-2 border-amber-300 ring-4 ring-amber-100 text-base">
                {renderInitial(first.name)}
              </div>
            </div>

            <div className="text-center w-full bg-white rounded-xl p-5 border-2 border-amber-300 shadow-card relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-amber-400"></div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 mb-1.5">
                <Trophy className="w-3 h-3 text-amber-600" />
                CHAMPION • #1
              </span>
              <h3 className="font-extrabold text-slate-900 text-base truncate">
                {first.name}
              </h3>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                {first.department || 'Computer Science'} • Yr {first.year || 1}
              </p>

              <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium text-[11px]">Final Score</span>
                <span className="font-black text-brand-600 font-mono text-base">
                  {first.finalScore ?? 0}
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Rank 3 (Bronze) */}
        {third ? (
          <div className="order-3 flex flex-col items-center">
            <div className="relative mb-2.5 flex flex-col items-center">
              <div className="absolute -top-2.5 right-0 bg-amber-700 text-white p-1.5 rounded-full shadow-subtle border border-amber-800">
                <Award className="w-3.5 h-3.5" />
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-100 text-amber-900 font-bold flex items-center justify-center border border-orange-200 text-sm">
                {renderInitial(third.name)}
              </div>
            </div>

            <div className="text-center w-full bg-white rounded-xl p-4 border border-slate-200 shadow-card">
              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-amber-900 border border-orange-200 mb-1.5">
                RANK #3
              </span>
              <h3 className="font-bold text-slate-900 text-sm truncate">
                {third.name}
              </h3>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                {third.department || 'Computer Science'}
              </p>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">Final Score</span>
                <span className="font-bold text-slate-900 font-mono text-sm">
                  {third.finalScore ?? 0}
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
