import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SignedIn, SignedOut, UserButton, useClerk } from '@clerk/clerk-react';
import { Code2, Menu, X, Trophy, Layers, Award, User, BarChart2 } from 'lucide-react';
import Button from '../common/Button';

const Navbar = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-brand-400 flex items-center justify-center font-bold shadow-subtle group-hover:bg-brand-600 group-hover:text-white transition-all">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm text-slate-900 leading-tight block">
                COLLEGE DSA
              </span>
              <span className="text-[10px] font-semibold text-brand-600 uppercase tracking-wider block">
                RANKBOARD
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/leaderboard"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                isActive('/leaderboard') || isActive('/')
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              Leaderboard
            </Link>

            <SignedIn>
              <Link
                to="/student/dashboard"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isActive('/student/dashboard')
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/student/platforms"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  isActive('/student/platforms')
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-brand-600" />
                Platforms
              </Link>
              <Link
                to="/student/score"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  isActive('/student/score')
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5 text-slate-500" />
                Score
              </Link>
              <Link
                to="/student/rank"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  isActive('/student/rank')
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Award className="w-3.5 h-3.5 text-slate-500" />
                My Rank
              </Link>
              <Link
                to="/student/profile"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isActive('/student/profile')
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Profile
              </Link>
            </SignedIn>
          </nav>

          {/* Right Auth controls via Clerk */}
          <div className="hidden md:flex items-center gap-3">
            <SignedOut>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">
                  Student Register
                </Button>
              </Link>
            </SignedOut>

            <SignedIn>
              <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      userButtonAvatarBox: 'w-8 h-8 rounded-full ring-1 ring-slate-200',
                    },
                  }}
                />
              </div>
            </SignedIn>
          </div>

          {/* Mobile drawer button */}
          <div className="flex md:hidden items-center gap-2">
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-2 text-sm">
          <Link
            to="/leaderboard"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
          >
            Public Leaderboard
          </Link>

          <SignedIn>
            <Link
              to="/student/dashboard"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
            >
              Student Dashboard
            </Link>
            <Link
              to="/student/platforms"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
            >
              Coding Platform Links
            </Link>
            <Link
              to="/student/score"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
            >
              Score Breakdown
            </Link>
            <Link
              to="/student/rank"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
            >
              Rank Standing
            </Link>
            <Link
              to="/student/profile"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
            >
              Academic Profile
            </Link>
          </SignedIn>

          <SignedOut>
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <Link to="/login" onClick={() => setMobileOpen(false)}>
                <Button variant="secondary" className="w-full">
                  Sign In
                </Button>
              </Link>
              <Link to="/register" onClick={() => setMobileOpen(false)}>
                <Button variant="primary" className="w-full">
                  Register
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
