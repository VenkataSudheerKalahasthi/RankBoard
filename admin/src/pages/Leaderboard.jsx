import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { adminService } from '../services/adminService';
import { useNotifications } from '../context/NotificationContext';
import { Card, CardHeader, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import {
  Trophy,
  Award,
  Search,
  RefreshCw,
  Download,
  Filter,
  Medal,
  TrendingUp,
} from 'lucide-react';

const DEPARTMENTS = [
  'ALL',
  'Computer Science and Engineering',
  'Information Technology',
  'Artificial Intelligence & DS',
  'Electronics & Communication',
  'Electrical & Electronics',
  'Mechanical Engineering',
];

export const Leaderboard = () => {
  const { notifySuccess, notifyError } = useNotifications();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('ALL');
  const [year, setYear] = useState('ALL');

  const fetchLeaderboard = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setError(null);
    try {
      const response = await adminService.getAdminLeaderboard({
        search: search.trim() || undefined,
        department: department !== 'ALL' ? department : undefined,
        year: year !== 'ALL' ? year : undefined,
      });

      if (response.success) {
        setStudents(response.leaderboard || []);
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      if (!isBackground) {
        setError(err.message || 'Failed to load rankings.');
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [search, department, year]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Real-time polling (every 60s)
  useEffect(() => {
    const timer = setInterval(() => {
      fetchLeaderboard(true);
    }, 60000);
    return () => clearInterval(timer);
  }, [fetchLeaderboard]);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const res = await adminService.recalculateLeaderboard();
      if (res.success) {
        notifySuccess('Leaderboard rankings recalculated across college.');
        fetchLeaderboard(true);
      }
    } catch (err) {
      notifyError(err.message || 'Failed to recalculate rankings.');
    } finally {
      setRecalculating(false);
    }
  };

  const handleExportExcel = () => {
    if (students.length === 0) {
      notifyError('No rankings data available to export.');
      return;
    }

    const exportRows = students.map((s) => ({
      Rank: s.rank || '—',
      Name: s.name,
      RollNumber: s.rollNumber || '—',
      Email: s.email,
      Department: s.department,
      Year: s.year,
      FinalScore: s.finalScore || 0,
      LeetCodeScore: s.scores?.leetcodeScore || 0,
      GFGScore: s.scores?.gfgScore || 0,
      CodeforcesScore: s.scores?.codeforcesScore || 0,
      CodeChefScore: s.scores?.codechefScore || 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leaderboard');
    XLSX.writeFile(workbook, `dsa_rankboard_leaderboard_${Date.now()}.xlsx`);
  };

  const top3 = students.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>Leaderboard Engine</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            College ranking standings computed from multi-platform weighted scoring formulas.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportExcel}
            icon={Download}
          >
            Export Excel
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleRecalculate}
            loading={recalculating}
            icon={RefreshCw}
          >
            Recalculate Rankings
          </Button>
        </div>
      </div>

      {/* Podium for Top 3 */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Rank 2 */}
          {top3[1] && (
            <Card className="p-5 border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 text-center order-2 md:order-1">
              <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-300 font-black text-sm flex items-center justify-center mx-auto mb-2 border border-slate-700">
                #2
              </div>
              <h3 className="font-bold text-slate-100 text-sm">{top3[1].name}</h3>
              <p className="text-[11px] text-slate-400 font-mono">{top3[1].rollNumber || top3[1].department}</p>
              <div className="text-xl font-black text-slate-200 mt-2">
                {top3[1].finalScore?.toFixed(2)} pts
              </div>
            </Card>
          )}

          {/* Rank 1 */}
          {top3[0] && (
            <Card className="p-6 border-amber-500/40 bg-gradient-to-b from-amber-950/30 to-slate-950 text-center order-1 md:order-2 transform md:-translate-y-2 shadow-lg shadow-amber-950/20">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 font-black text-base flex items-center justify-center mx-auto mb-2 border border-amber-500/50">
                <Trophy className="w-6 h-6" />
              </div>
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500 text-slate-950 uppercase mb-1">
                College Champion
              </span>
              <h3 className="font-black text-slate-100 text-base">{top3[0].name}</h3>
              <p className="text-xs text-amber-300/80 font-mono">{top3[0].rollNumber || top3[0].department}</p>
              <div className="text-2xl font-black text-amber-300 mt-2">
                {top3[0].finalScore?.toFixed(2)} pts
              </div>
            </Card>
          )}

          {/* Rank 3 */}
          {top3[2] && (
            <Card className="p-5 border-amber-900/40 bg-gradient-to-b from-amber-950/10 to-slate-950 text-center order-3 md:order-3">
              <div className="w-10 h-10 rounded-full bg-amber-950/40 text-amber-500 font-black text-sm flex items-center justify-center mx-auto mb-2 border border-amber-900/60">
                #3
              </div>
              <h3 className="font-bold text-slate-100 text-sm">{top3[2].name}</h3>
              <p className="text-[11px] text-slate-400 font-mono">{top3[2].rollNumber || top3[2].department}</p>
              <div className="text-xl font-black text-amber-500/90 mt-2">
                {top3[2].finalScore?.toFixed(2)} pts
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Filters Bar */}
      <Card className="p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search leaderboard by name, roll..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="text-xs bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500 max-w-[170px] truncate"
          >
            <option value="ALL">All Departments</option>
            {DEPARTMENTS.filter((d) => d !== 'ALL').map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="text-xs bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="ALL">All Years</option>
            <option value="1">Year 1</option>
            <option value="2">Year 2</option>
            <option value="3">Year 3</option>
            <option value="4">Year 4</option>
          </select>
        </div>
      </Card>

      {/* Leaderboard Standings Table */}
      <Card>
        {loading && students.length === 0 ? (
          <LoadingState message="Calculating leaderboard standings..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => fetchLeaderboard()} />
        ) : students.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="No students ranked"
            description="Active students will appear here once coding statistics are calculated."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="table-th w-16">Rank</th>
                  <th className="table-th">Student Name & Roll</th>
                  <th className="table-th">Department</th>
                  <th className="table-th">Year</th>
                  <th className="table-th">Overall Score</th>
                  <th className="table-th">LeetCode (40%)</th>
                  <th className="table-th">GFG (30%)</th>
                  <th className="table-th">Codeforces (20%)</th>
                  <th className="table-th">CodeChef (10%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="table-td font-black text-slate-100">
                      {student.rank ? (
                        <div className="flex items-center gap-1.5">
                          {student.rank === 1 && <Medal className="w-4 h-4 text-amber-400" />}
                          {student.rank === 2 && <Medal className="w-4 h-4 text-slate-300" />}
                          {student.rank === 3 && <Medal className="w-4 h-4 text-amber-600" />}
                          <span>#{student.rank}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    <td className="table-td">
                      <div className="font-bold text-slate-100">{student.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{student.rollNumber || student.email}</div>
                    </td>

                    <td className="table-td text-slate-300 truncate max-w-[150px]">
                      {student.department}
                    </td>

                    <td className="table-td text-slate-400">Year {student.year || 1}</td>

                    <td className="table-td">
                      <span className="font-extrabold text-sm text-brand-300">
                        {typeof student.finalScore === 'number' ? student.finalScore.toFixed(2) : '0.00'}
                      </span>
                    </td>

                    <td className="table-td text-slate-300 font-mono">
                      {student.scores?.leetcodeScore?.toFixed(1) ?? '0.0'}
                    </td>

                    <td className="table-td text-slate-300 font-mono">
                      {student.scores?.gfgScore?.toFixed(1) ?? '0.0'}
                    </td>

                    <td className="table-td text-slate-300 font-mono">
                      {student.scores?.codeforcesScore?.toFixed(1) ?? '0.0'}
                    </td>

                    <td className="table-td text-slate-300 font-mono">
                      {student.scores?.codechefScore?.toFixed(1) ?? '0.0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Leaderboard;
