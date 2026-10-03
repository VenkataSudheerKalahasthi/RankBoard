import React from 'react';
import { Code2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-brand-600 text-white flex items-center justify-center font-bold">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white text-sm block">College DSA Rankboard</span>
              <span className="text-[11px] text-slate-400">Competitive programming analytics</span>
            </div>
          </div>

          <div className="flex items-center gap-5 text-slate-400 font-medium">
            <Link to="/leaderboard" className="hover:text-white transition-colors">
              Leaderboard
            </Link>
            <Link to="/login" className="hover:text-white transition-colors">
              Student Sign In
            </Link>
            <Link to="/register" className="hover:text-white transition-colors">
              Registration
            </Link>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-500 text-[11px]">
          <p>© {new Date().getFullYear()} College DSA Rankboard. Built for university coding excellence.</p>
          <div className="font-mono text-slate-400">
            LeetCode • GeeksforGeeks • Codeforces • CodeChef
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
