import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import { Code2, Menu, X, Trophy, Layers, Award, BarChart2, Sparkles } from 'lucide-react';
import Button from '../common/Button';
import ThemeToggle from '../common/ThemeToggle';

const Navbar = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#081225]/90 backdrop-blur-md border-b border-[#D9E4F2] dark:border-blue-500/20 shadow-sm transition-colors duration-300">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-blue-500 to-sky-400 text-white flex items-center justify-center font-extrabold shadow-md shadow-blue-500/20 group-hover:scale-105 transition-all duration-300">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base text-[#0F172A] dark:text-white leading-tight tracking-tight">
                  COLLEGE DSA
                </span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-sky-300 dark:border dark:border-blue-400/30">
                  <Sparkles className="w-2.5 h-2.5" /> PORTAL
                </span>
              </div>
              <span className="text-[10px] font-bold text-blue-600 dark:text-sky-400 uppercase tracking-widest block -mt-0.5">
                RANKBOARD
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-100/80 dark:bg-[#0D1830] p-1 rounded-xl border border-slate-200/80 dark:border-blue-500/20">
            <Link
              to="/leaderboard"
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                isActive('/leaderboard') || isActive('/')
                  ? 'bg-white text-blue-700 dark:bg-[#111E3D] dark:text-sky-300 shadow-sm border border-blue-100 dark:border-blue-400/30'
                  : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/50'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              Leaderboard
            </Link>

            <SignedIn>
              <Link
                to="/student/dashboard"
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isActive('/student/dashboard')
                    ? 'bg-white text-blue-700 dark:bg-[#111E3D] dark:text-sky-300 shadow-sm border border-blue-100 dark:border-blue-400/30'
                    : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/50'
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/student/platforms"
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isActive('/student/platforms')
                    ? 'bg-white text-blue-700 dark:bg-[#111E3D] dark:text-sky-300 shadow-sm border border-blue-100 dark:border-blue-400/30'
                    : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/50'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
                Platforms
              </Link>
              <Link
                to="/student/score"
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isActive('/student/score')
                    ? 'bg-white text-blue-700 dark:bg-[#111E3D] dark:text-sky-300 shadow-sm border border-blue-100 dark:border-blue-400/30'
                    : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/50'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5 text-sky-500" />
                Score
              </Link>
              <Link
                to="/student/rank"
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isActive('/student/rank')
                    ? 'bg-white text-blue-700 dark:bg-[#111E3D] dark:text-sky-300 shadow-sm border border-blue-100 dark:border-blue-400/30'
                    : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/50'
                }`}
              >
                <Award className="w-3.5 h-3.5 text-blue-500" />
                My Rank
              </Link>
              <Link
                to="/student/profile"
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isActive('/student/profile')
                    ? 'bg-white text-blue-700 dark:bg-[#111E3D] dark:text-sky-300 shadow-sm border border-blue-100 dark:border-blue-400/30'
                    : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/50'
                }`}
              >
                Profile
              </Link>
            </SignedIn>
          </nav>

          {/* Right Auth controls + Segmented Theme Toggle */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />

            <SignedOut>
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-sky-400 hover:bg-blue-50 dark:hover:bg-[#111E3D] font-semibold">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm" className="bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white font-bold shadow-md shadow-blue-500/20">
                  Student Register
                </Button>
              </Link>
            </SignedOut>

            <SignedIn>
              <div className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-blue-900/40">
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      userButtonAvatarBox: 'w-9 h-9 rounded-full ring-2 ring-blue-500/30 hover:ring-blue-600 transition-all',
                    },
                  }}
                />
              </div>
            </SignedIn>
          </div>

          {/* Mobile controls */}
          <div className="flex md:hidden items-center gap-2">
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-xl bg-blue-50 dark:bg-[#111E3D] text-blue-700 dark:text-sky-300 border border-blue-200 dark:border-blue-500/30 focus:outline-none transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-blue-900/40 bg-white/98 dark:bg-[#081225]/98 backdrop-blur-lg px-4 pt-3 pb-6 space-y-3 text-sm shadow-xl">
          <div className="pt-1 pb-2 border-b border-slate-100 dark:border-blue-900/40 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Theme</span>
            <ThemeToggle />
          </div>

          <Link
            to="/leaderboard"
            onClick={() => setMobileOpen(false)}
            className="block px-3.5 py-2 rounded-xl text-slate-800 dark:text-slate-100 hover:bg-blue-50 dark:hover:bg-[#111E3D] hover:text-blue-700 dark:hover:text-sky-300 font-bold transition-colors"
          >
            Public Leaderboard
          </Link>

          <SignedIn>
            <Link
              to="/student/dashboard"
              onClick={() => setMobileOpen(false)}
              className="block px-3.5 py-2 rounded-xl text-slate-800 dark:text-slate-100 hover:bg-blue-50 dark:hover:bg-[#111E3D] hover:text-blue-700 dark:hover:text-sky-300 font-bold transition-colors"
            >
              Student Dashboard
            </Link>
            <Link
              to="/student/platforms"
              onClick={() => setMobileOpen(false)}
              className="block px-3.5 py-2 rounded-xl text-slate-800 dark:text-slate-100 hover:bg-blue-50 dark:hover:bg-[#111E3D] hover:text-blue-700 dark:hover:text-sky-300 font-bold transition-colors"
            >
              Coding Platform Links
            </Link>
            <Link
              to="/student/score"
              onClick={() => setMobileOpen(false)}
              className="block px-3.5 py-2 rounded-xl text-slate-800 dark:text-slate-100 hover:bg-blue-50 dark:hover:bg-[#111E3D] hover:text-blue-700 dark:hover:text-sky-300 font-bold transition-colors"
            >
              Score Breakdown
            </Link>
            <Link
              to="/student/rank"
              onClick={() => setMobileOpen(false)}
              className="block px-3.5 py-2 rounded-xl text-slate-800 dark:text-slate-100 hover:bg-blue-50 dark:hover:bg-[#111E3D] hover:text-blue-700 dark:hover:text-sky-300 font-bold transition-colors"
            >
              Rank Standing
            </Link>
            <Link
              to="/student/profile"
              onClick={() => setMobileOpen(false)}
              className="block px-3.5 py-2 rounded-xl text-slate-800 dark:text-slate-100 hover:bg-blue-50 dark:hover:bg-[#111E3D] hover:text-blue-700 dark:hover:text-sky-300 font-bold transition-colors"
            >
              Academic Profile
            </Link>
          </SignedIn>

          <SignedOut>
            <div className="pt-3 border-t border-slate-100 dark:border-blue-900/40 flex flex-col gap-2">
              <Link to="/login" onClick={() => setMobileOpen(false)}>
                <Button variant="secondary" className="w-full justify-center">
                  Sign In
                </Button>
              </Link>
              <Link to="/register" onClick={() => setMobileOpen(false)}>
                <Button variant="primary" className="w-full justify-center bg-blue-600 text-white font-bold">
                  Register as Student
                </Button>
              </Link>
            </div>
          </SignedOut>
        </div>
      )}
    </header>
  );
};

export default Navbar;


