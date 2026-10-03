import React from 'react';
import { Award, Medal, Trophy } from 'lucide-react';

const RankBadge = ({ rank }) => {
  if (rank === null || rank === undefined) {
    return (
      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">
        Unranked
      </span>
    );
  }

  const numRank = Number(rank);

  if (numRank === 1) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-subtle">
        <Trophy className="w-3.5 h-3.5 text-amber-500" />
        #1
      </span>
    );
  }

  if (numRank === 2) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 shadow-subtle">
        <Medal className="w-3.5 h-3.5 text-slate-500" />
        #2
      </span>
    );
  }

  if (numRank === 3) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-amber-900 border border-orange-200 shadow-subtle">
        <Award className="w-3.5 h-3.5 text-amber-700" />
        #3
      </span>
    );
  }

  return (
    <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">
      #{numRank}
    </span>
  );
};

export default RankBadge;
