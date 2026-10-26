import React from 'react';
import { Code2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStudent } from '../../context/StudentContext';

const Footer = () => {
  const { isRegistered } = useStudent();

  return (
    <footer className="bg-white dark:bg-[#071226] text-[#475569] dark:text-slate-400 border-t border-[#D9E4F2] dark:border-blue-900/40 text-xs mt-auto transition-colors duration-300">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-brand-600 text-white flex items-center justify-center font-bold">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-[#0F172A] dark:text-white text-sm block">College DSA Rankboard</span>
              <span className="text-[11px] text-[#64748B] dark:text-slate-400">Competitive programming analytics</span>
            </div>
          </div>

          <div className="flex items-center gap-5 text-[#475569] dark:text-slate-300 font-medium">
            <Link to="/leaderboard" className="hover:text-blue-600 dark:hover:text-white transition-colors">
              Leaderboard
            </Link>
            <Link to="/login" className="hover:text-blue-600 dark:hover:text-white transition-colors">
              Student Sign In
            </Link>
            {!isRegistered && (
              <Link to="/register" className="hover:text-blue-600 dark:hover:text-white transition-colors">
                Registration
              </Link>
            )}
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-[#D9E4F2] dark:border-blue-900/30 flex flex-col sm:flex-row items-center justify-between gap-2 text-[#64748B] dark:text-slate-400 text-[11px]">
          <p>© {new Date().getFullYear()} College DSA Rankboard. Built for university coding excellence.</p>
          <div className="font-mono text-[#475569] dark:text-slate-400">
            LeetCode • GeeksforGeeks • HackerRank • Codeforces • CodeChef
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
