import React, { useState, useEffect, useRef } from 'react';
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
  const [totalCount, setTotalCount] = useState(null);

  const [debouncedSearch, setDebouncedSearch] = useState('');
  const activeRequestId = useRef(0);

  // Debounce search query by 200ms for instant live search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 200);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchRankings = async (isBackground = false) => {
    const requestId = ++activeRequestId.current;

    if (!isBackground && students.length === 0) {
      setLoading(true);
      setError(null);
    }

    try {
      const response = await leaderboardService.getLeaderboard({
        search: debouncedSearch.trim() || undefined,
        department: department !== 'ALL' ? department : undefined,
        year: year !== 'ALL' ? year : undefined,
      });

      // Discard slower, outdated responses
      if (requestId !== activeRequestId.current) {
        return;
      }

      if (response && response.success) {
        setStudents(response.leaderboard || []);
        setTotalCount(response.stats?.totalRegisteredStudents || response.leaderboard?.length || 0);
        setError(null);
      } else {
        throw new Error(response?.message || 'Failed to load rankings.');
      }
    } catch (err) {
      if (requestId !== activeRequestId.current) {
        return;
      }
      console.error('Failed to load leaderboard:', err);
      if (students.length === 0) {
        setError(err.response?.data?.message || err.message || 'Failed to load rankings.');
      }
    } finally {
      if (requestId === activeRequestId.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchRankings(false);

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
    fetchRankings(false);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9E4F2] dark:border-blue-900/40 pb-5">
        <div>
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-sky-400 font-extrabold text-xs uppercase tracking-wider">
            <Trophy className="w-4 h-4 text-amber-500" />
            Standings & Analytics
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-white mt-1 tracking-tight">
            College DSA Leaderboard
          </h1>
          <p className="text-xs text-[#475569] dark:text-slate-300 mt-0.5 font-medium">
            {loading && totalCount === null
              ? 'Loading live performance standings...'
              : `Displaying live performance scores for all ${totalCount ?? 0} registered students.`}
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white dark:bg-[#111E3D] p-4 sm:p-5 rounded-2xl border border-[#D9E4F2] dark:border-blue-400/20 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 transition-colors duration-300">
        <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A] dark:text-white w-full md:w-auto">
          <Filter className="w-4 h-4 text-blue-600 dark:text-sky-400" />
          Filter Rankings
        </div>

        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-[#0D1830] border border-[#D9E4F2] dark:border-blue-500/30 text-[#0F172A] dark:text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
          >
            <option value="ALL">All Departments</option>
            {DEPARTMENTS.filter((d) => d !== 'ALL').map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-[#0D1830] border border-[#D9E4F2] dark:border-blue-500/30 text-[#0F172A] dark:text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
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
              className="w-full text-xs pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-[#0D1830] border border-[#D9E4F2] dark:border-blue-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-[#0F172A] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-medium"
            />
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-3 pointer-events-none" />
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
