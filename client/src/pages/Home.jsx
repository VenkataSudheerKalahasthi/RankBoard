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
import { Users, CheckCircle, Layers, Clock, Search, Sparkles, ArrowRight } from 'lucide-react';
import { SignedIn, SignedOut } from '@clerk/clerk-react';

const DEPARTMENTS = [
  'ALL',
  'Computer Science and Engineering',
  'Information Technology',
  'Artificial Intelligence & DS',
  'Electronics & Communication',
  'Electrical & Electronics',
  'Mechanical Engineering',
  'Prime',
];

const Home = () => {
  // Authoritative data state; null while awaiting initial response
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
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
    <div className="space-y-10 pb-16">
      {/* Hero Section */}
      <section className="bg-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8 xl:px-10 border-b border-slate-800 relative">
        <div className="w-full relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Institutional Competitive Programming Rankboard
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            COLLEGE DSA RANKBOARD
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mt-3 font-medium">
            Track coding performance across leading programming platforms.
          </p>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs font-mono text-slate-400">
            <span>LeetCode</span> • <span>GeeksforGeeks</span> • <span>HackerRank</span> • <span>Codeforces</span> • <span>CodeChef</span>
          </div>

          {/* Quick CTA */}
          <div className="mt-6 flex items-center justify-center gap-3">
            <SignedOut>
              <Link to="/register">
                <Button variant="primary" size="md">
                  Register as Student
                </Button>
              </Link>
              <Link to="/leaderboard">
                <Button variant="secondary" size="md">
                  View Standings
                </Button>
              </Link>
            </SignedOut>
            <SignedIn>
              <Link to="/student/dashboard">
                <Button variant="primary" size="md" icon={ArrowRight}>
                  Open My Student Dashboard
                </Button>
              </Link>
            </SignedIn>
          </div>
        </div>
      </section>

      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-8 space-y-8">
        {/* Top Metric KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCard
            title="Registered Students"
            value={data?.stats?.totalRegisteredStudents ?? 0}
            subtitle="Active student profiles"
            icon={Users}
            badgeText="Enrolled"
            badgeVariant="brand"
            loading={isInitialLoading}
          />
          <StatCard
            title="Problems Solved"
            value={(data?.stats?.totalProblemsSolved ?? 0).toLocaleString()}
            subtitle="Verified across platforms"
            icon={CheckCircle}
            badgeText="Combined"
            badgeVariant="emerald"
            loading={isInitialLoading}
          />
          <StatCard
            title="Coding Platforms"
            value={data?.stats?.codingPlatforms ?? TOTAL_CONFIGURED_PLATFORMS}
            subtitle="LC • GFG • HR • CF • CC"
            icon={Layers}
            badgeText="Integrated"
            badgeVariant="slate"
            loading={isInitialLoading}
          />
          <StatCard
            title="Last Updated"
            value={data?.stats?.lastUpdated ? new Date(data.stats.lastUpdated).toLocaleDateString() : 'Just now'}
            subtitle={data?.stats?.lastUpdated ? new Date(data.stats.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
            icon={Clock}
            badgeText="Live Sync"
            badgeVariant="amber"
            loading={isInitialLoading}
          />
        </section>

        {/* Top 3 Podium */}
        {!isInitialLoading && data?.podium && data.podium.length > 0 && !search && department === 'ALL' && year === 'ALL' && (
          <section>
            <Podium topStudents={data.podium} />
          </section>
        )}

        {/* Leaderboard Section */}
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Official College Leaderboard
              </h2>
              <p className="text-xs text-slate-500">
                Real-time rankings sorted by evaluated final scores.
              </p>
            </div>

            {/* Filter and Search */}
            <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 text-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
              >
                <option value="ALL">All Departments</option>
                {DEPARTMENTS.filter((d) => d !== 'ALL').map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>

              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 text-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
              >
                <option value="ALL">All Years</option>
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
              </select>

              <div className="relative flex-1 md:w-56">
                <input
                  type="text"
                  placeholder="Search name or roll..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              </div>
            </form>
          </div>

          {isInitialLoading ? (
            <LoadingState message="Fetching live leaderboard from database..." />
          ) : error && !data ? (
            <ErrorState title="Leaderboard Unavailable" message={error} onRetry={() => fetchLeaderboard(false)} />
          ) : (
            <LeaderboardTable students={data?.leaderboard || []} loading={loading} />
          )}
        </section>
      </div>
    </div>
  );
};

export default Home;
