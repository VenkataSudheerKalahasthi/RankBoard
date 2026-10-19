import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { leaderboardService } from '../services/leaderboardService';
import { subscribeToRankboardUpdates } from '../services/supabase';
import { TOTAL_CONFIGURED_PLATFORMS } from '../config/platforms';
import Podium from '../components/leaderboard/Podium';
import LeaderboardTable from '../components/leaderboard/LeaderboardTable';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import Button from '../components/common/Button';
import ScrollReveal from '../components/common/ScrollReveal';
import { Users, Search, ArrowRight, Trophy, Code2, BarChart2 } from 'lucide-react';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { useStudent } from '../context/StudentContext';

const DEPARTMENTS = [
  'ALL',
  'Computer Science and Engineering',
  'Information Technology',
  'Artificial Intelligence & DS',
  'Electronics & Communication',
  'Electrical & Electronics',
  'Mechanical Engineering',
  'Prime',
  'CIVIL',
  'CSIT',
  'AI',
  'AIML',
  'CSDS',
  'CSBS',
  'CSIOT',
  'VLSI',
 
];

const LeetCodeLogo = () => (
  <svg viewBox="1.5 0.5 21 23" className="w-7 h-7 sm:w-8 sm:h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      className="fill-[#1A1A1A] dark:fill-white transition-colors duration-200"
      d="M16.102 1.452C15.129.474 13.828 0 12.526 0s-2.603.474-3.576 1.452L4.637 5.809c-.725.724-.725 1.899 0 2.623.725.725 1.9.725 2.624 0l4.313-4.357a1.956 1.956 0 0 1 2.705 0l4.354 4.357c.725.725 1.9.725 2.624 0 .725-.724.725-1.899 0-2.623L16.102 1.452z"
    />
    <path
      fill="#FFA116"
      d="M16.102 17.93l-2.697 2.607c-.466.467-1.111.662-1.823.662s-1.357-.195-1.824-.662l-4.332-4.363c-.467-.467-.702-1.15-.702-1.863s.235-1.357.702-1.824l4.319-4.38c.467-.467 1.125-.649 1.837-.649s1.357.195 1.823.662l2.697 2.606c.514.515 1.365.497 1.9-.038.535-.536.553-1.387.039-1.901l-2.609-2.636a5.074 5.074 0 0 0-3.85-1.372c-1.547 0-3.037.603-4.148 1.714L3.088 10.95c-1.112 1.112-1.728 2.602-1.728 4.149 0 1.548.616 3.038 1.728 4.15l4.332 4.364c1.11 1.11 2.6 1.727 4.148 1.727 1.547 0 3.037-.617 4.148-1.727l2.697-2.608c.514-.514.496-1.365-.039-1.901-.535-.535-1.386-.552-1.9-.038z"
    />
    <path
      fill="#FFA116"
      d="M10.676 15.701h10.064c.696 0 1.26-.603 1.26-1.346s-.564-1.346-1.26-1.346H10.676c-.696 0-1.26.604-1.26 1.346s.564 1.346 1.26 1.346z"
    />
  </svg>
);

const GFGLogo = () => (
  <svg viewBox="0 0 120 70" className="w-8 h-6 sm:w-9 sm:h-7" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      fill="#2F8D46"
      fillRule="evenodd"
      clipRule="evenodd"
      d="M35 10 C18 10 5 22 5 35 C5 48 18 60 35 60 C47 60 57 52 60 41 L47 41 C44 47 39 50 35 50 C25 50 17 43 16 35 L60 35 L60 30 C59 19 48 10 35 10 Z M35 20 C42 20 48 24 49 30 L16 30 C18 24 25 20 35 20 Z"
    />
    <path
      fill="#2F8D46"
      fillRule="evenodd"
      clipRule="evenodd"
      d="M85 10 C72 10 61 19 60 30 L60 35 L104 35 C103 43 95 50 85 50 C81 50 76 47 73 41 L60 41 C63 52 73 60 85 60 C102 60 115 48 115 35 C115 22 102 10 85 10 Z M85 20 C95 20 102 24 104 30 L71 30 C72 24 78 20 85 20 Z"
    />
  </svg>
);

const HackerRankLogo = () => (
  <svg viewBox="0 0 32 32" className="w-7 h-7 sm:w-8 sm:h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="7" fill="#00EA64" />
    <path d="M9 8h4v6.5h6V8h4v16h-4v-6.5h-6V24H9V8z" fill="#FFFFFF" />
  </svg>
);

const CodeforcesLogo = () => (
  <svg viewBox="2.5 3.5 19 18" className="w-7 h-7 sm:w-8 sm:h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2.5" y="10.5" width="5" height="11" rx="1.2" fill="#F0AF00" />
    <rect x="9.5" y="3.5" width="5" height="18" rx="1.2" fill="#1F8ACB" />
    <rect x="16.5" y="7" width="5" height="14.5" rx="1.2" fill="#AF1414" />
  </svg>
);

const CodeChefLogo = () => (
  <svg viewBox="0 0 64 64" className="w-7 h-7 sm:w-8 sm:h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M18 28 C10 27 9 12 19 8 C24 4 40 4 45 8 C55 12 54 27 46 28 Z"
      fill="#FFFFFF"
      stroke="#CBD5E1"
      strokeWidth="1.2"
    />
    <path d="M26 12 C24 18 25 24 25 27" stroke="#E2E8F0" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M38 12 C40 18 39 24 39 27" stroke="#E2E8F0" strokeWidth="1.2" strokeLinecap="round" />
    <rect x="17" y="26" width="30" height="5" rx="1.5" fill="#E11D48" />
    <path
      d="M14 40 L8 44 L14 48"
      className="stroke-[#3B1F08] dark:stroke-white transition-colors duration-200"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M50 40 L56 44 L50 48"
      className="stroke-[#3B1F08] dark:stroke-white transition-colors duration-200"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="26" cy="38" r="2" className="fill-[#3B1F08] dark:fill-white transition-colors duration-200" />
    <circle cx="38" cy="38" r="2" className="fill-[#3B1F08] dark:fill-white transition-colors duration-200" />
    <path
      d="M30 42 Q32 44 34 42"
      className="stroke-[#3B1F08] dark:stroke-white transition-colors duration-200"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M23 49 C23 46 29 46 32 49 C35 46 41 46 41 49 C41 53 35 53 32 50 C29 53 23 53 23 49 Z"
      className="fill-[#3B1F08] dark:fill-white transition-colors duration-200"
    />
  </svg>
);

const PLATFORMS = [
  {
    name: 'LeetCode',
    component: LeetCodeLogo,
  },
  {
    name: 'GeeksforGeeks',
    component: GFGLogo,
  },
  {
    name: 'HackerRank',
    component: HackerRankLogo,
  },
  {
    name: 'Codeforces',
    component: CodeforcesLogo,
  },
  {
    name: 'CodeChef',
    component: CodeChefLogo,
  },
];

const Home = () => {
  const { isRegistered, isRegistrationChecking } = useStudent();
  // Synchronous cache hydration for instant initial render
  const initialCache = leaderboardService.getCachedLeaderboard();

  const [data, setData] = useState(() => initialCache || null);
  const [loading, setLoading] = useState(() => !initialCache);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [department, setDepartment] = useState('ALL');
  const [year, setYear] = useState('ALL');

  // Track active request ID to prevent race conditions and ensure latest response wins
  const activeRequestId = useRef(0);

  // Debounce search input for instant live search as user types
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 200);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchLeaderboard = async (isBackground = false) => {
    const requestId = ++activeRequestId.current;

    // Only set loading if initial load or explicit user-triggered retry
    if (!isBackground && !data) {
      setLoading(true);
      setError(null);
    }

    try {
      const response = await leaderboardService.getLeaderboard({
        search: debouncedSearch.trim() || undefined,
        department: department !== 'ALL' ? department : undefined,
        year: year !== 'ALL' ? year : undefined,
      });

      // Discard slower, outdated responses if a newer request was dispatched
      if (requestId !== activeRequestId.current) {
        return;
      }

      if (response && response.success) {
        setData(response);
        setError(null);
      } else {
        throw new Error(response?.message || 'Failed to load leaderboard data.');
      }
    } catch (err) {
      if (requestId !== activeRequestId.current) {
        return;
      }
      console.error('Failed to load leaderboard data:', err);
      if (!data) {
        setError(err.response?.data?.message || err.message || 'Failed to load leaderboard information.');
      }
    } finally {
      if (requestId === activeRequestId.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchLeaderboard(false);

    // Subscribe to Supabase Realtime table changes to auto-update without flashing
    const unsubscribe = subscribeToRankboardUpdates(() => {
      fetchLeaderboard(true);
    });

    return () => {
      unsubscribe();
    };
  }, [department, year, debouncedSearch]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLeaderboard(false);
  };

  const isInitialLoading = loading && !data;

  return (
    <div className="-mt-16 space-y-10 pb-16 bg-[#F8FAFC] dark:bg-[#081225] text-[#0F172A] dark:text-white transition-colors duration-300">
      {/* Hero Section with Reference Workspace Background */}
      <section className="relative overflow-hidden min-h-[644px] lg:min-h-[724px] flex flex-col justify-between border-b border-[#D9E4F2] dark:border-slate-800/80 transition-colors duration-300">
        
        {/* Full-bleed Reference Workspace Photograph Background */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0">
          {/* Dark Theme Workspace (Nighttime reference with warm lamp, books, poster) */}
          <img
            src="/workspace-dark.png"
            alt="Study Workspace"
            className="w-full h-full object-cover object-right lg:object-[80%_center] hidden dark:block"
          />
          {/* Light Theme Workspace (Daytime reference with morning sunlight, books, poster) */}
          <img
            src="/workspace-light.jpg"
            alt="Study Workspace"
            className="w-full h-full object-cover object-right lg:object-[80%_center] block dark:hidden"
          />

          {/* Left-side Gradient Overlays for Maximum Text Contrast and Readability */}
          {/* Light Theme Vignette: Gentle soft tint so background image is clearly visible while text stays readable */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#F8FAFC]/45 via-[#F8FAFC]/20 via-40% to-transparent block dark:hidden"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#F8FAFC]/30 via-transparent to-transparent block dark:hidden"></div>

          {/* Dark Theme Vignette: Gentle soft tint so background image is clearly visible while text stays readable */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#060D1A]/55 via-[#060D1A]/25 via-40% to-transparent hidden dark:block"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#060D1A]/35 via-transparent to-transparent hidden dark:block"></div>
        </div>

        {/* Hero Content Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 lg:pt-32 pb-10 relative z-10 w-full flex-1 flex flex-col justify-between">
          <div className="max-w-2xl text-left">
            
            {/* 1. College Coding Community Capsule Pill */}
            <ScrollReveal delay={0} distance={14}>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 dark:bg-[#0E1A30]/85 border border-slate-300/90 dark:border-slate-700/60 text-black dark:text-slate-200 text-xs font-black tracking-wide backdrop-blur-md shadow-xs mb-6">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span>COLLEGE CODING COMMUNITY</span>
              </div>
            </ScrollReveal>

            {/* 2. Main Heading: College DSA / Rankboard */}
            <ScrollReveal delay={70} distance={16}>
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08] text-black dark:text-white">
                College DSA <br />
                <span className="bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#1E40AF] dark:from-[#3B82F6] dark:via-[#6366F1] dark:to-[#8B5CF6] bg-clip-text text-transparent">
                  Rankboard
                </span>
              </h1>
            </ScrollReveal>

            {/* 3. Description */}
            <ScrollReveal delay={130} distance={16}>
              <p className="mt-5 text-base sm:text-lg text-slate-900 dark:text-slate-300 font-bold sm:font-semibold leading-relaxed max-w-xl">
                Track, evaluate, and benchmark student DSA performance across leading competitive coding platforms in real time.
              </p>
            </ScrollReveal>

            {/* 4. Action Buttons (Side by Side matching Image 3 & 4) */}
            <ScrollReveal delay={190} distance={16}>
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <SignedOut>
                  {isRegistrationChecking ? (
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-44 bg-slate-200/60 dark:bg-slate-800 animate-pulse rounded-xl" />
                      <div className="h-12 w-40 bg-slate-200/60 dark:bg-slate-800 animate-pulse rounded-xl hidden sm:block" />
                    </div>
                  ) : isRegistered ? (
                    <Link to="/login">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                      >
                        <ArrowRight className="w-4 h-4" />
                        Sign In to Portal
                      </button>
                    </Link>
                  ) : (
                    <Link to="/register">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                      >
                        <ArrowRight className="w-4 h-4" />
                        Register as Student
                      </button>
                    </Link>
                  )}
                  <Link to="/leaderboard">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/95 hover:bg-white dark:bg-[#0B1528]/85 dark:hover:bg-[#122240] text-black dark:text-white font-extrabold text-sm border border-slate-300 dark:border-slate-700/70 shadow-sm backdrop-blur-md transform hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                    >
                      <Trophy className="w-4 h-4 text-amber-500" />
                      View Leaderboard
                    </button>
                  </Link>
                </SignedOut>

                <SignedIn>
                  <Link to="/student/dashboard">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                    >
                      <ArrowRight className="w-4 h-4" />
                      Open Student Dashboard
                    </button>
                  </Link>
                  <Link to="/leaderboard">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/95 hover:bg-white dark:bg-[#0B1528]/85 dark:hover:bg-[#122240] text-black dark:text-white font-extrabold text-sm border border-slate-300 dark:border-slate-700/70 shadow-sm backdrop-blur-md transform hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                    >
                      <Trophy className="w-4 h-4 text-amber-500" />
                      View Leaderboard
                    </button>
                  </Link>
                </SignedIn>
              </div>
            </ScrollReveal>

            {/* 5. Integrated Platforms Row (Original logos floating directly on background image, reduced size, unboxed) */}
            <ScrollReveal delay={250} distance={16}>
              <div id="platforms" className="mt-8">
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-slate-400 block mb-3.5">
                  Integrated Platforms
                </span>
                <div className="flex items-center gap-5 sm:gap-6">
                  {PLATFORMS.map((platform) => (
                    <div
                      key={platform.name}
                      title={platform.name}
                      className="flex items-center justify-center p-1 transition-transform duration-200 hover:scale-125 cursor-pointer filter drop-shadow-sm select-none"
                    >
                      <platform.component />
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>

          </div>

          {/* 6. Bottom Statistics Strip (Spanning Across Hero) */}
          <ScrollReveal delay={310} distance={16}>
            <div className="mt-12 sm:mt-14 w-full p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl bg-white/45 dark:bg-[#071329]/45 border border-white/60 dark:border-white/10 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_8px_32px_0_rgba(0,0,0,0.08),inset_0_1px_0_0_rgba(255,255,255,0.7)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.45),inset_0_1px_0_0_rgba(255,255,255,0.08)] grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/50 dark:divide-white/10">
              
              {/* Stat 1: Students */}
              <div className="flex items-center gap-3.5 sm:px-4 pt-3 sm:pt-0">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-purple-100/80 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-200/50 dark:border-purple-500/30">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-black dark:text-white tracking-tight">
                    {data?.stats?.totalRegisteredStudents ? `${data.stats.totalRegisteredStudents}+` : '500+'}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-300 font-bold sm:font-semibold">
                    Students
                  </div>
                </div>
              </div>

              {/* Stat 2: Problems Tracked */}
              <div className="flex items-center gap-3.5 sm:px-4 pt-3 sm:pt-0">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-emerald-100/80 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/50 dark:border-emerald-500/30">
                  <Code2 className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-black dark:text-white tracking-tight">
                    {data?.stats?.totalProblemsSolved
                      ? `${(data.stats.totalProblemsSolved >= 1000 ? (data.stats.totalProblemsSolved / 1000).toFixed(0) : data.stats.totalProblemsSolved)}K+`
                      : '3K+'}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-300 font-bold sm:font-semibold">
                    Problems Tracked
                  </div>
                </div>
              </div>

              {/* Stat 3: Real-Time Rankings */}
              <div className="flex items-center gap-3.5 sm:px-4 pt-3 sm:pt-0">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-amber-100/80 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200/50 dark:border-amber-500/30">
                  <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-black dark:text-white tracking-tight">
                    Live
                  </div>
                  <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-300 font-bold sm:font-semibold">
                    Real-Time Rankings
                  </div>
                </div>
              </div>

              {/* Stat 4: Coding Platforms */}
              <div className="flex items-center gap-3.5 sm:px-4 pt-3 sm:pt-0">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-pink-100/80 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0 border border-pink-200/50 dark:border-pink-500/30">
                  <BarChart2 className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-black dark:text-white tracking-tight">
                    {data?.stats?.codingPlatforms ?? TOTAL_CONFIGURED_PLATFORMS ?? 5}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-300 font-bold sm:font-semibold">
                    Coding Platforms
                  </div>
                </div>
              </div>

            </div>
          </ScrollReveal>

        </div>
      </section>

      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-4 space-y-10 relative z-20">

        {/* Top 3 Podium */}
        {!search && department === 'ALL' && year === 'ALL' && (
          <ScrollReveal rootMargin="100px 0px" delay={0} as="section">
            <Podium topStudents={data?.podium || []} loading={isInitialLoading} />
          </ScrollReveal>
        )}

        {/* Official College Leaderboard Header & Filters */}
        <ScrollReveal rootMargin="100px 0px" delay={0} as="section" className="space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-[#111E3D] p-5 rounded-2xl border border-[#D9E4F2] dark:border-blue-500/20 shadow-sm transition-colors duration-300 card-hover-interactive">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-sky-400"></div>
                <h2 className="text-base font-extrabold text-[#0F172A] dark:text-white">
                  Official College Leaderboard
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                Real-time rankings sorted by platform-weighted evaluation points.
              </p>
            </div>

            {/* Filter and Search */}
            <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-[#0D1830] border border-slate-200 dark:border-blue-500/30 text-slate-800 dark:text-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              >
                <option value="ALL">All Departments</option>
                {DEPARTMENTS.filter((d) => d !== 'ALL').map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>

              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-[#0D1830] border border-slate-200 dark:border-blue-500/30 text-slate-800 dark:text-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              >
                <option value="ALL">All Years</option>
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
              </select>

              <div className="relative flex-1 md:w-60">
                <input
                  type="text"
                  placeholder="Search name or roll..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full text-xs pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-[#0D1830] border border-slate-200 dark:border-blue-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 font-medium"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </form>
          </div>
        </ScrollReveal>

        {/* Leaderboard Table (Revealed progressively as user scrolls down) */}
        <ScrollReveal rootMargin="100px 0px" delay={0}>
          {error && !data ? (
            <ErrorState title="Leaderboard Unavailable" message={error} onRetry={() => fetchLeaderboard(false)} />
          ) : (
            <LeaderboardTable students={data?.leaderboard || []} loading={loading} />
          )}
        </ScrollReveal>
      </div>
    </div>
  );
};

export default Home;


