import React from 'react';
import { Award, Medal, Trophy } from 'lucide-react';

const RankBadge = ({ rank }) => {
  if (rank === null || rank === undefined) {
    return (
      <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
        Unranked
      </span>
    );
  }

  const numRank = Number(rank);

  if (numRank === 1) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-100 via-amber-50 to-yellow-100 text-amber-900 border border-amber-300 shadow-xs">
        <Trophy className="w-3.5 h-3.5 text-amber-600" />
        #1
      </span>
    );
  }

  if (numRank === 2) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-800 border border-slate-300 shadow-xs">
        <Medal className="w-3.5 h-3.5 text-slate-600" />
        #2
      </span>
    );
  }

  if (numRank === 3) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-orange-50 text-amber-900 border border-orange-200 shadow-xs">
        <Award className="w-3.5 h-3.5 text-amber-700" />
        #3
      </span>
    );
  }

  return (
    <span className="inline-flex items-center justify-center min-w-[2.2rem] px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50/80 text-blue-700 border border-blue-100">
      #{numRank}
    </span>
  );
};

export default RankBadge;

