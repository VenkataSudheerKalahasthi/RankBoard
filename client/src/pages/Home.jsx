import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { leaderboardService } from '../services/leaderboardService';
import StatCard from '../components/common/StatCard';
import Podium from '../components/leaderboard/Podium';
import LeaderboardTable from '../components/leaderboard/LeaderboardTable';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import Button from '../components/common/Button';
import { Users, CheckCircle, Layers, Clock, Search, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
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
  const [data, setData] = useState({
    stats: {
      totalRegisteredStudents: 0,
      totalProblemsSolved: 0,
      codingPlatforms: 4,
      lastUpdated: null,
    },
    podium: [],
    leaderboard: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [department, setDepartment] = useState('ALL');
  const [year, setYear] = useState('ALL');

  // Debounce search input for instant live search as user types
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 200);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await leaderboardService.getLeaderboard({
        search: debouncedSearch.trim() || undefined,
        department: department !== 'ALL' ? department : undefined,
        year: year !== 'ALL' ? year : undefined,
      });

      if (response.success) {
        setData(response);
      }
    } catch (err) {
      console.error('Failed to load leaderboard data:', err);
      setError(err.response?.data?.message || 'Failed to load leaderboard information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [department, year, debouncedSearch]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLeaderboard();
  };

  return (
    <div className="space-y-10 pb-16">
      {/* Hero Section */}
      <section className="bg-slate-900 text-white py-14 px-4 sm:px-6 lg:px-8 border-b border-slate-800 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10 text-center">
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 -mt-8 relative z-20">
        {/* Top Metric KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Registered Students"
            value={data.stats.totalRegisteredStudents}
            subtitle="Active student profiles"
            icon={Users}
            badgeText="Enrolled"
            badgeVariant="brand"
          />
          <StatCard
            title="Problems Solved"
            value={data.stats.totalProblemsSolved.toLocaleString()}
            subtitle="Verified across platforms"
            icon={CheckCircle}
            badgeText="Combined"
            badgeVariant="emerald"
          />
          <StatCard
            title="Coding Platforms"
            value={data.stats.codingPlatforms}
            subtitle="LC • GFG • HR • CF • CC"
            icon={Layers}
            badgeText="Integrated"
            badgeVariant="slate"
          />
          <StatCard
            title="Last Updated"
            value={data.stats.lastUpdated ? new Date(data.stats.lastUpdated).toLocaleDateString() : 'Just now'}
            subtitle={data.stats.lastUpdated ? new Date(data.stats.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
            icon={Clock}
            badgeText="Live Sync"
            badgeVariant="amber"
          />
        </section>

        {/* Top 3 Podium */}
        {!loading && data.podium.length > 0 && !search && department === 'ALL' && year === 'ALL' && (
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

          {loading ? (
            <LoadingState message="Fetching live leaderboard from Firestore..." />
          ) : error ? (
            <ErrorState message={error} onRetry={fetchLeaderboard} />
          ) : (
            <LeaderboardTable students={data.leaderboard} loading={loading} />
          )}
        </section>
      </div>
    </div>
  );
};

export default Home;
