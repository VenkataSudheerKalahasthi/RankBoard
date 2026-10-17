import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { leaderboardService } from '../services/leaderboardService';
import { subscribeToRankboardUpdates } from '../services/supabase';
import { TOTAL_CONFIGURED_PLATFORMS } from '../config/platforms';
import StatCard from '../components/common/StatCard';
import Podium from '../components/leaderboard/Podium';
import LeaderboardTable from '../components/leaderboard/LeaderboardTable';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import Button from '../components/common/Button';
import ScrollReveal from '../components/common/ScrollReveal';
import { Users, CheckCircle, Layers, Clock, Search, Sparkles, ArrowRight, Building2 } from 'lucide-react';
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

const PLATFORMS = [
  {
    name: 'LeetCode',
    logo: '/logos/leetcode.jpg',
    imgClass: 'w-full h-full object-contain rounded-lg',
  },
  {
    name: 'GeeksforGeeks',
    logo: '/logos/gfg.jpg',
    imgClass: 'w-full h-full object-contain rounded-lg',
  },
  {
    name: 'HackerRank',
    logo: '/logos/hackerrank.jpg',
    imgClass: 'w-full h-full object-contain rounded-lg',
  },
  {
    name: 'Codeforces',
    logo: '/logos/codeforces.jpg',
    imgClass: 'w-full h-full object-contain rounded-lg',
  },
  {
    name: 'CodeChef',
    logo: '/logos/codechef.jpg',
    imgClass: 'w-full h-full object-contain rounded-lg',
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
    <div className="space-y-10 pb-16 bg-[#F8FAFC] dark:bg-[#081225] text-[#0F172A] dark:text-white transition-colors duration-300">
      {/* Hero Section with Seamless Blended College Campus Image */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#F8FBFF] via-[#F8FAFC] to-[#F8FAFC] dark:from-[#0B1635] dark:via-[#071226] dark:to-[#071226] border-b border-[#D9E4F2] dark:border-blue-900/40 transition-colors duration-300">
        
        {/* Background Subtle Grid & Atmospheric Radial Glow */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(37,99,235,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(37,99,235,0.04)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(96,165,250,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(96,165,250,0.05)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] pointer-events-none"></div>
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-400/10 dark:bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* ABSOLUTELY POSITIONED BLENDED COLLEGE IMAGE BACKGROUND LAYER */}
        <div className="absolute top-0 right-0 bottom-0 w-full lg:w-[58%] pointer-events-none overflow-hidden z-0">
          {/* Base Image with Left Edge Mask */}
          <img
            src="/college-campus.jpg"
            alt="College Campus"
            className="w-full h-full object-cover object-center hero-campus-image-mask-dark hidden dark:block opacity-80"
          />
          <img
            src="/college-campus.jpg"
            alt="College Campus"
            className="w-full h-full object-cover object-center hero-campus-image-mask-light block dark:hidden opacity-85"
          />

          {/* LIGHT THEME BLEND: Fades left edge directly into light background #F8FBFF */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#F8FBFF] via-[#F8FBFF]/85 via-25% to-transparent dark:opacity-0 pointer-events-none"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#F8FAFC] via-transparent to-[#F8FBFF]/60 dark:opacity-0 pointer-events-none"></div>

          {/* DARK THEME BLEND: Fades left edge directly into deep navy background #0B1635 */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B1635] via-[#0B1635]/85 via-25% to-transparent opacity-0 dark:opacity-100 pointer-events-none"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#071226] via-transparent to-[#0B1635]/60 opacity-0 dark:opacity-100 pointer-events-none"></div>

          {/* Cyan / Blue Atmospheric Glow Behind Image */}
          <div className="absolute bottom-12 right-12 w-80 h-80 bg-blue-500/15 dark:bg-sky-500/20 rounded-full blur-3xl pointer-events-none"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20 relative z-10">
          
          {/* DESKTOP & TABLET TWO-COLUMN / MOBILE STACKED HERO */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Content Column */}
            <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
              
              {/* 1. Institutional Badge */}
              <ScrollReveal delay={0} distance={14}>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/90 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-400/30 text-blue-700 dark:text-sky-300 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-sky-400 animate-pulse" />
                  Institutional Competitive Programming Hub
                </div>
              </ScrollReveal>

              {/* 2. Main Heading */}
              <ScrollReveal delay={70} distance={16}>
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-none text-[#0F172A] dark:text-white">
                  COLLEGEDSA <br className="hidden sm:inline" />
                  <span className="bg-gradient-to-r from-[#2563EB] to-[#38BDF8] bg-clip-text text-transparent">
                    RANKBOARD
                  </span>
                </h1>
              </ScrollReveal>

              {/* 3. Description */}
              <ScrollReveal delay={130} distance={16}>
                <p className="text-base sm:text-lg text-[#475569] dark:text-slate-300 max-w-xl mx-auto lg:mx-0 font-medium leading-relaxed">
                  Track, evaluate, and benchmark student DSA performance across leading competitive coding platforms in real time.
                </p>
              </ScrollReveal>

              {/* 4. Uploaded Platform Logos */}
              <ScrollReveal delay={190} distance={16}>
                <div className="pt-2 pb-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#64748B] dark:text-slate-400 block mb-2.5">
                    Integrated Platforms
                  </span>
                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                    {PLATFORMS.map((p) => (
                      <div
                        key={p.name}
                        title={p.name}
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white dark:bg-slate-900 border border-[#D9E4F2] dark:border-blue-400/25 shadow-xs dark:shadow-glow-blue flex items-center justify-center transform hover:scale-105 hover:border-blue-500 dark:hover:border-sky-400 hover:shadow-md transition-all duration-300 cursor-pointer group card-hover-interactive shrink-0 overflow-hidden p-1.5"
                      >
                        <img
                          src={p.logo}
                          alt={p.name}
                          className={`${p.imgClass || 'w-full h-full object-contain'} filter group-hover:brightness-105 transition-all select-none`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollReveal>

              {/* 5. CTAs */}
              <ScrollReveal delay={250} distance={16}>
                <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3.5 w-full sm:w-auto">
                  <SignedOut>
                    {isRegistrationChecking ? (
                      <div className="h-12 w-44 bg-slate-200/60 dark:bg-slate-800 animate-pulse rounded-xl" />
                    ) : isRegistered ? (
                      <Link to="/login" className="w-full sm:w-auto">
                        <Button variant="primary" size="lg" icon={ArrowRight} className="w-full sm:w-auto bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] dark:from-blue-600 dark:to-sky-400 hover:from-blue-700 hover:to-sky-500 text-white font-black shadow-md dark:shadow-glow-blue border-none">
                          Sign In
                        </Button>
                      </Link>
                    ) : (
                      <Link to="/register" className="w-full sm:w-auto">
                        <Button variant="primary" size="lg" className="w-full sm:w-auto bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] dark:from-blue-600 dark:to-sky-400 hover:from-blue-700 hover:to-sky-500 text-white font-black shadow-md dark:shadow-glow-blue border-none">
                          Register as Student
                        </Button>
                      </Link>
                    )}
                    <Link to="/leaderboard" className="w-full sm:w-auto">
                      <Button variant="secondary" size="lg" className="w-full sm:w-auto bg-white dark:bg-[#111E3D] hover:bg-blue-50 dark:hover:bg-[#162653] text-[#0F172A] dark:text-white border border-[#D9E4F2] dark:border-blue-400/30 font-bold">
                        View Standings
                      </Button>
                    </Link>
                  </SignedOut>
                  <SignedIn>
                    <Link to="/student/dashboard" className="w-full sm:w-auto">
                      <Button variant="primary" size="lg" icon={ArrowRight} className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white font-extrabold shadow-md dark:shadow-glow-blue border-none">
                        Open Student Dashboard
                      </Button>
                    </Link>
                  </SignedIn>
                </div>
              </ScrollReveal>

            </div>

            {/* Right Column: Floating University Coding Hub Glass Card over the Blended Image */}
            <div className="lg:col-span-5 flex flex-col items-center lg:items-end justify-end lg:self-end pt-6 lg:pt-16 lg:translate-y-2">
              <ScrollReveal delay={180} distance={20} className="w-full flex justify-center lg:justify-end">
                <div className="w-full max-w-md p-5 sm:p-6 rounded-2xl bg-white/85 dark:bg-[#111E3D]/85 backdrop-blur-md border border-[#D9E4F2] dark:border-blue-400/30 text-[#0F172A] dark:text-white shadow-xl hover:shadow-2xl transition-all duration-300 group card-hover-interactive">
                  
                  <div className="flex items-center justify-between pb-4 border-b border-[#D9E4F2] dark:border-blue-900/40">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-600/25 border border-blue-200 dark:border-blue-400/40 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0 shadow-xs">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-black leading-tight text-[#0F172A] dark:text-white">
                          University Coding Hub
                        </h4>
                        <p className="text-xs text-[#475569] dark:text-slate-300 font-semibold mt-0.5">
                          Official Competitive Programming Portal
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                      ACTIVE
                    </span>
                  </div>

                  <div className="pt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-[#0D1830]/80 border border-[#D9E4F2] dark:border-blue-500/20">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Scoring Scope</span>
                      <span className="font-extrabold text-[#0F172A] dark:text-white">5 Active Platforms</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-[#0D1830]/80 border border-[#D9E4F2] dark:border-blue-500/20">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Rank Calculation</span>
                      <span className="font-extrabold text-blue-600 dark:text-sky-400">Real-Time Sync</span>
                    </div>
                  </div>

                </div>
              </ScrollReveal>
            </div>

          </div>

        </div>
      </section>

      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-8 space-y-10 relative z-20">
        {/* Top Metric KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <ScrollReveal delay={0}>
            <StatCard
              title="Registered Students"
              value={data?.stats?.totalRegisteredStudents ?? 0}
              subtitle="Active student profiles"
              icon={Users}
              badgeText="Enrolled"
              badgeVariant="brand"
              loading={isInitialLoading}
            />
          </ScrollReveal>
          <ScrollReveal delay={75}>
            <StatCard
              title="Problems Solved"
              value={(data?.stats?.totalProblemsSolved ?? 0).toLocaleString()}
              subtitle="Verified across platforms"
              icon={CheckCircle}
              badgeText="Combined"
              badgeVariant="emerald"
              loading={isInitialLoading}
            />
          </ScrollReveal>
          <ScrollReveal delay={150}>
            <StatCard
              title="Coding Platforms"
              value={data?.stats?.codingPlatforms ?? TOTAL_CONFIGURED_PLATFORMS}
              subtitle="LC • GFG • HR • CF • CC"
              icon={Layers}
              badgeText="Integrated"
              badgeVariant="slate"
              loading={isInitialLoading}
            />
          </ScrollReveal>
          <ScrollReveal delay={225}>
            <StatCard
              title="Last Updated"
              value={data?.stats?.lastUpdated ? new Date(data.stats.lastUpdated).toLocaleDateString() : 'Just now'}
              subtitle={data?.stats?.lastUpdated ? new Date(data.stats.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
              icon={Clock}
              badgeText="Live Sync"
              badgeVariant="amber"
              loading={isInitialLoading}
            />
          </ScrollReveal>
        </section>

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


