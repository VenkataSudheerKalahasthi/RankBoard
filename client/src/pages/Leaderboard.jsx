import React, { useState, useEffect } from 'react';
import { leaderboardService } from '../services/leaderboardService';
import LeaderboardTable from '../components/leaderboard/LeaderboardTable';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';
import { Trophy, Search, Filter } from 'lucide-react';
import { subscribeToRankboardUpdates } from '../services/supabase';

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
  'CSDS',
  'CSBS',
  'IOT',
  'AI&ML',
  'CSIT',
  'VLSI',
  
];

const Leaderboard = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('ALL');
  const [year, setYear] = useState('ALL');
  const [totalCount, setTotalCount] = useState(0);

  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search query by 200ms for instant live search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 200);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchRankings = async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
      setError(null);
    }
    try {
      const response = await leaderboardService.getLeaderboard({
        search: debouncedSearch.trim() || undefined,
        department: department !== 'ALL' ? department : undefined,
        year: year !== 'ALL' ? year : undefined,
      });

      if (response.success) {
        setStudents(response.leaderboard || []);
        setTotalCount(response.stats?.totalRegisteredStudents || response.leaderboard?.length || 0);
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      if (!isBackground) {
        setError(err.response?.data?.message || 'Failed to load rankings.');
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchRankings();

    // Subscribe to Supabase Realtime table changes
    const unsubscribe = subscribeToRankboardUpdates(() => {
      fetchRankings(true);
    });

    // Fallback auto-refresh periodically (every 60s)
    const interval = setInterval(() => {
      fetchRankings(true);
    }, 60000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [department, year, debouncedSearch]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRankings();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-1.5 text-brand-600 font-bold text-xs uppercase tracking-wider">
            <Trophy className="w-4 h-4 text-amber-500" />
            Standings & Analytics
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            College DSA Leaderboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Displaying live performance scores for all {totalCount} registered students.
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-card flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          Filter Rankings
        </div>

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

          <div className="relative flex-1 md:w-64">
            <input
              type="text"
              placeholder="Search by student name or roll..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
          </div>
        </form>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingState message="Loading leaderboard standings..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchRankings} />
      ) : students.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No students ranked yet"
          description="Registered students will appear here once they link their coding profiles."
        />
      ) : (
        <LeaderboardTable students={students} loading={loading} />
      )}
    </div>
  );
};

export default Leaderboard;
