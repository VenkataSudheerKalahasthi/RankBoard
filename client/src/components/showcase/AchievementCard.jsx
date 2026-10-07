import React, { forwardRef } from 'react';
import leetcodeLogo from '../../assets/logos/leetcode.png';
import gfgLogo from '../../assets/logos/gfg.png';
import {
  Trophy,
  CheckCircle2,
  ShieldCheck,
  Code2,
  Calendar,
  Layers,
  GraduationCap,
  Landmark,
  BarChart2,
  ClipboardCheck,
  ChevronRight,
  Star,
} from 'lucide-react';

// Platform Brand SVGs & Exact User-Provided Logos
const PlatformIcon = ({ platform }) => {
  switch (platform) {
    case 'leetcode':
      return (
        <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center p-0.5 shrink-0 shadow-xs overflow-hidden">
          <img
            src={leetcodeLogo}
            alt="LeetCode"
            className="w-full h-full object-contain rounded-md"
          />
        </div>
      );
    case 'gfg':
      return (
        <div className="w-8 h-8 rounded-lg bg-[#2f8d46] flex items-center justify-center p-0.5 shrink-0 shadow-xs overflow-hidden">
          <img
            src={gfgLogo}
            alt="GeeksforGeeks"
            className="w-full h-full object-contain rounded-md"
          />
        </div>
      );
    case 'hackerrank':
      return (
        <div className="w-8 h-8 rounded-lg bg-[#0e141e] flex items-center justify-center p-1.5 shrink-0 shadow-xs">
          <svg viewBox="0 0 32 32" className="w-full h-full">
            {/* Official HackerRank White H */}
            <path d="M6 7h4v6.5h6V7h4v18h-4v-7.5h-6V25H6V7z" fill="#FFFFFF" />
            {/* Official HackerRank Bright Green Block */}
            <rect x="21" y="7" width="5" height="18" rx="0.5" fill="#00EA64" />
          </svg>
        </div>
      );
    case 'codeforces':
      return (
        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center p-1.5 shrink-0 shadow-xs">
          <svg viewBox="0 0 24 24" className="w-full h-full">
            {/* Official Codeforces Yellow Bar (Left) */}
            <rect x="2.5" y="10.5" width="5" height="11" rx="1.2" fill="#F0AF00" />
            {/* Official Codeforces Blue Bar (Center) */}
            <rect x="9.5" y="3.5" width="5" height="18" rx="1.2" fill="#1F8ACB" />
            {/* Official Codeforces Red Bar (Right) */}
            <rect x="16.5" y="7" width="5" height="14.5" rx="1.2" fill="#AF1414" />
          </svg>
        </div>
      );
    case 'codechef':
      return (
        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center p-0.5 shrink-0 shadow-xs overflow-hidden">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Official CodeChef Chef Hat Top & Folds */}
            <path
              d="M30 38 C18 38 16 16 30 12 C36 6 64 6 70 12 C84 16 82 38 70 38 Z"
              fill="#F8FAFC"
              stroke="#CBD5E1"
              strokeWidth="2"
            />
            <path
              d="M35 36 C30 26 36 16 50 14 C64 16 70 26 65 36 Z"
              fill="#FFFFFF"
            />
            <path d="M42 18 C40 26 41 33 41 36" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M58 18 C60 26 59 33 59 36" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" fill="none" />
            {/* Red Headband Ribbon */}
            <rect x="28" y="36" width="44" height="8" rx="2" fill="#E11D48" />
            {/* Face */}
            <circle cx="50" cy="60" r="22" fill="#FFFFFF" stroke="#F1F5F9" strokeWidth="1" />
            {/* Eyebrow left */}
            <path d="M36 48 Q40 44 44 47" stroke="#334155" strokeWidth="2" strokeLinecap="round" fill="none" />
            {/* Left Eye < */}
            <path d="M41 54 L35 57 L41 60" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            {/* Right Eye > */}
            <path d="M59 54 L65 57 L59 60" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            {/* Small smile */}
            <path d="M48 65 Q50 68 52 65" stroke="#334155" strokeWidth="2" strokeLinecap="round" fill="none" />
            {/* Brown Mustache */}
            <path
              d="M30 72 C37 68 44 71 50 74 C56 71 63 68 70 72 C65 80 56 76 50 79 C44 76 35 80 30 72 Z"
              fill="#4A2810"
            />
          </svg>
        </div>
      );
    default:
      return <div className="w-8 h-8 rounded-lg bg-slate-200 shrink-0" />;
  }
};

const AchievementCard = forwardRef(({ showcase }, ref) => {
  if (!showcase) return null;

  const {
    name = 'sudheer',
    rollNumber = '24495a0510',
    department = 'prime',
    year = 4,
    collegeName = 'Engineering College',
    profilePhoto = '',
    rank = 10,
    totalStudents = 92,
    overallScore = 49.23,
    totalSolved = 396,
    platformStats = {},
    verifiedAt = new Date().toISOString(),
  } = showcase;

  const leetcode = platformStats.leetcode || {};
  const gfg = platformStats.gfg || {};
  const hackerrank = platformStats.hackerrank || {};
  const codeforces = platformStats.codeforces || {};
  const codechef = platformStats.codechef || {};

  const renderInitial = (n) => {
    if (!n) return 'ST';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return n.slice(0, 2).toUpperCase();
  };

  const formattedDate = new Date(verifiedAt).toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      ref={ref}
      className="w-full max-w-2xl mx-auto bg-white text-slate-900 rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden p-6 sm:p-8 select-none font-sans relative"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
    >
      {/* 1. Header & Institutional Branding */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Code2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-slate-900 leading-tight">
              COLLEGE DSA RANKBOARD
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Official Competitive Programming Achievement
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200/80 rounded-full text-emerald-700 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Verified
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-medium">
            Data verified from official platforms
          </div>
        </div>
      </div>

      {/* 2. Student Identity Section */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 mt-6">
        {/* Profile Photo (Circular) */}
        <div className="relative shrink-0">
          {profilePhoto ? (
            <img
              src={profilePhoto}
              alt={name}
              crossOrigin="anonymous"
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-slate-100 shadow-sm bg-slate-100"
            />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-indigo-600 to-slate-800 border-2 border-slate-100 flex items-center justify-center text-2xl font-black text-white shadow-sm">
              {renderInitial(name)}
            </div>
          )}
        </div>

        {/* Student Name & Meta */}
        <div className="text-center sm:text-left flex-1 min-w-0">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight truncate">
            {name}
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5">
            {department} • Year {year}
          </p>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mt-3">
            {rollNumber && (
              <div className="inline-flex items-center gap-1.5 bg-slate-100/90 text-slate-700 px-3 py-1 rounded-xl text-xs font-mono font-semibold border border-slate-200/60">
                <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
                Roll: {rollNumber}
              </div>
            )}
            <span className="text-slate-300 hidden sm:inline">|</span>
            <div className="inline-flex items-center gap-1.5 bg-slate-100/90 text-slate-700 px-3 py-1 rounded-xl text-xs font-semibold border border-slate-200/60">
              <Landmark className="w-3.5 h-3.5 text-slate-500" />
              {collegeName}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Key Metrics Cards (3 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 my-6">
        {/* Card 1: College Rank */}
        <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-amber-100/90 text-amber-600 flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6 fill-amber-500/20 text-amber-600" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block leading-tight">
              COLLEGE RANK
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono leading-none mt-0.5">
              #{rank}
            </div>
            <span className="text-xs text-slate-500 font-medium block mt-0.5">
              of {totalStudents} students
            </span>
          </div>
        </div>

        {/* Card 2: Overall Score */}
        <div className="bg-blue-50/50 border border-blue-200/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-blue-100/90 text-blue-600 flex items-center justify-center shrink-0">
            <BarChart2 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block leading-tight">
              OVERALL SCORE
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono leading-none mt-0.5">
              {overallScore}
            </div>
            <span className="text-xs text-slate-500 font-medium block mt-0.5">
              Evaluated Score
            </span>
          </div>
        </div>

        {/* Card 3: Total Solved */}
        <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-emerald-100/90 text-emerald-600 flex items-center justify-center shrink-0">
            <ClipboardCheck className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block leading-tight">
              TOTAL SOLVED
            </span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono leading-none mt-0.5">
              {totalSolved}
            </div>
            <span className="text-xs text-slate-500 font-medium block mt-0.5">
              Combined Solves
            </span>
          </div>
        </div>
      </div>

      {/* 4. Platform Breakdown (5 Rows) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between pb-1 text-slate-500">
          <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-slate-700">
            <Layers className="w-4 h-4 text-blue-600" />
            VERIFIED PLATFORM BREAKDOWN
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Last Updated: {formattedDate}
          </div>
        </div>

        {/* Row 1: LeetCode */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-3 flex items-center justify-between shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center gap-3">
            <PlatformIcon platform="leetcode" />
            <span className="font-bold text-slate-900 text-sm">LeetCode</span>
            <span className="text-slate-300 font-light">|</span>
            {leetcode.status === 'NOT_CONNECTED' ? (
              <span className="text-xs text-slate-400 font-medium">Not Connected</span>
            ) : (
              <span className="font-bold text-amber-500 text-sm font-mono">
                {leetcode.totalSolved ?? 0} solved
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {leetcode.status !== 'NOT_CONNECTED' && (
              <div className="flex items-center gap-1.5 text-xs font-bold font-mono">
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/90 px-2.5 py-0.5 rounded-lg">
                  E: {leetcode.easySolved ?? 0}
                </span>
                <span className="bg-amber-50 text-amber-700 border border-amber-200/90 px-2.5 py-0.5 rounded-lg">
                  M: {leetcode.mediumSolved ?? 0}
                </span>
                <span className="bg-rose-50 text-rose-700 border border-rose-200/90 px-2.5 py-0.5 rounded-lg">
                  H: {leetcode.hardSolved ?? 0}
                </span>
              </div>
            )}
            <ChevronRight className="w-4 h-4 text-slate-400 ml-1" />
          </div>
        </div>

        {/* Row 2: GeeksforGeeks */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-3 flex items-center justify-between shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center gap-3">
            <PlatformIcon platform="gfg" />
            <span className="font-bold text-slate-900 text-sm">GeeksforGeeks</span>
            <span className="text-slate-300 font-light">|</span>
            {gfg.status === 'NOT_CONNECTED' ? (
              <span className="text-xs text-slate-400 font-medium">Not Connected</span>
            ) : (
              <span className="font-bold text-emerald-600 text-sm font-mono">
                {gfg.totalSolved ?? 0} solved
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {gfg.status !== 'NOT_CONNECTED' && (
              <div className="flex items-center gap-1.5 text-xs font-bold font-mono">
                <span className="bg-slate-100 text-slate-600 border border-slate-200/80 px-2 py-0.5 rounded-lg font-medium">
                  Sch: {gfg.schoolSolved ?? 0}
                </span>
                <span className="bg-slate-100 text-slate-600 border border-slate-200/80 px-2 py-0.5 rounded-lg font-medium">
                  Bas: {gfg.basicSolved ?? 0}
                </span>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/90 px-2.5 py-0.5 rounded-lg">
                  E: {gfg.easySolved ?? 0}
                </span>
                <span className="bg-amber-50 text-amber-700 border border-amber-200/90 px-2.5 py-0.5 rounded-lg">
                  M: {gfg.mediumSolved ?? 0}
                </span>
                <span className="bg-rose-50 text-rose-700 border border-rose-200/90 px-2.5 py-0.5 rounded-lg">
                  H: {gfg.hardSolved ?? 0}
                </span>
              </div>
            )}
            <ChevronRight className="w-4 h-4 text-slate-400 ml-1" />
          </div>
        </div>

        {/* Row 3: HackerRank */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-3 flex items-center justify-between shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center gap-3">
            <PlatformIcon platform="hackerrank" />
            <span className="font-bold text-slate-900 text-sm">HackerRank</span>
            <span className="text-slate-300 font-light">|</span>
            {hackerrank.status === 'NOT_CONNECTED' ? (
              <span className="text-xs text-slate-400 font-medium">Not Connected</span>
            ) : (
              <span className="font-bold text-emerald-600 text-sm font-mono">
                {hackerrank.totalSolved ?? 0} solved
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {hackerrank.status !== 'NOT_CONNECTED' && (
              <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200/90 px-3 py-0.5 rounded-lg text-xs font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                {hackerrank.stars || 2} Stars
              </div>
            )}
            <ChevronRight className="w-4 h-4 text-slate-400 ml-1" />
          </div>
        </div>

        {/* Row 4: Codeforces */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-3 flex items-center justify-between shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center gap-3">
            <PlatformIcon platform="codeforces" />
            <span className="font-bold text-slate-900 text-sm">Codeforces</span>
            <span className="text-slate-300 font-light">|</span>
            <span className="text-xs font-medium text-slate-400 font-mono">
              {codeforces.status === 'NOT_CONNECTED'
                ? 'Not Connected'
                : `${codeforces.totalSolved ?? 0} solved`}
            </span>
          </div>

          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        {/* Row 5: CodeChef */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-3 flex items-center justify-between shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center gap-3">
            <PlatformIcon platform="codechef" />
            <span className="font-bold text-slate-900 text-sm">CodeChef</span>
            <span className="text-slate-300 font-light">|</span>
            {codechef.status === 'NOT_CONNECTED' ? (
              <span className="text-xs text-slate-400 font-medium">Not Connected</span>
            ) : (
              <span className="font-bold text-amber-600 text-sm font-mono">
                {codechef.totalSolved ?? 0} solved
              </span>
            )}
          </div>

          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* 5. Footer */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Live Verified • Official Rankboard Data</span>
        </div>
      </div>
    </div>
  );
});

AchievementCard.displayName = 'AchievementCard';

export default AchievementCard;
