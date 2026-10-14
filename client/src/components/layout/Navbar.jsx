import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import {
  Code2,
  Menu,
  X,
  Home,
  Trophy,
  LayoutDashboard,
  Layers,
  Award,
  BarChart2,
  Sparkles,
  User,
} from 'lucide-react';
import Button from '../common/Button';
import ThemeToggle from '../common/ThemeToggle';
import { useStudent } from '../../context/StudentContext';

const Navbar = () => {
  const location = useLocation();
  const { isRegistered, isRegistrationChecking } = useStudent();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const isPreview = location.pathname.includes('-preview');

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 16;
      setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev));
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path, previewPath) => {
    const currentPath =
      location.pathname.length > 1 && location.pathname.endsWith('/')
        ? location.pathname.slice(0, -1)
        : location.pathname;

    if (previewPath && currentPath === previewPath) {
      return true;
    }
    return currentPath === path;
  };

  const publicNavLinks = [
    {
      label: 'Home',
      path: '/',
      icon: Home,
      activeIconColor: 'text-blue-600 dark:text-sky-400',
    },
    {
      label: 'Leaderboard',
      path: '/leaderboard',
      icon: Trophy,
      activeIconColor: 'text-amber-500',
    },
  ];

  const studentNavLinks = [
    {
      label: 'Dashboard',
      path: '/student/dashboard',
      previewPath: '/student/dashboard-preview',
      icon: LayoutDashboard,
      activeIconColor: 'text-blue-600 dark:text-sky-400',
    },
    {
      label: 'Platforms',
      path: '/student/platforms',
      previewPath: '/student/platforms-preview',
      icon: Layers,
      activeIconColor: 'text-blue-600 dark:text-sky-400',
    },
    {
      label: 'Score',
      path: '/student/score',
      icon: BarChart2,
      activeIconColor: 'text-sky-500',
    },
    {
      label: 'My Rank',
      path: '/student/rank',
      icon: Award,
      activeIconColor: 'text-blue-500 dark:text-sky-400',
    },
    {
      label: 'Profile',
      path: '/student/profile',
      previewPath: '/student/profile-preview',
      icon: User,
      activeIconColor: 'text-blue-600 dark:text-sky-400',
    },
  ];

  const renderNavLink = (item) => {
    const active = isActive(item.path, item.previewPath);
    const Icon = item.icon;
    const targetPath = isPreview && item.previewPath ? item.previewPath : item.path;

    return (
      <Link
        key={item.path}
        to={targetPath}
        className={`student-nav-link group py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#071226] rounded-sm ${
          active
            ? 'text-blue-600 dark:text-sky-400'
            : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white'
        }`}
      >
        <span className="flex items-center gap-1.5">
          {Icon && (
            <Icon
              className={`w-4 h-4 transition-colors duration-200 ${
                active
                  ? item.activeIconColor || 'text-blue-600 dark:text-sky-400'
                  : 'text-slate-400 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-sky-400'
              }`}
            />
          )}
          <span className="relative">
            {item.label}
            <span
              aria-hidden="true"
              className={`student-nav-underline ${active ? 'active' : ''}`}
            />
          </span>
        </span>
      </Link>
    );
  };

  const renderMobileLink = (item) => {
    const active = isActive(item.path, item.previewPath);
    const Icon = item.icon;
    const targetPath = isPreview && item.previewPath ? item.previewPath : item.path;

    return (
      <Link
        key={item.path}
        to={targetPath}
        onClick={() => setMobileOpen(false)}
        className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-200 ${
          active
            ? 'text-blue-600 dark:text-sky-400 bg-blue-50/70 dark:bg-blue-500/10'
            : 'text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-sky-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {Icon && (
            <Icon
              className={`w-4 h-4 ${
                active
                  ? item.activeIconColor || 'text-blue-600 dark:text-sky-400'
                  : 'text-slate-400 dark:text-slate-400'
              }`}
            />
          )}
          <span>{item.label}</span>
        </div>
        {active && (
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-sky-400" />
        )}
      </Link>
    );
  };

  return (
    <header
      className={`student-navbar ${
        isScrolled ? 'student-navbar-scrolled' : 'student-navbar-top'
      }`}
    >
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

          {/* Desktop Navigation - Clean, unboxed surface layout */}
          <nav
            className="hidden md:flex items-center gap-6 lg:gap-8"
            aria-label="Student portal navigation"
          >
            {publicNavLinks.map(renderNavLink)}

            <SignedIn>
              {studentNavLinks.map(renderNavLink)}
            </SignedIn>

            {isPreview && (
              <SignedOut>
                {studentNavLinks.map(renderNavLink)}
              </SignedOut>
            )}
          </nav>

          {/* Right Auth controls + Icon-only Theme Toggle */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />

            <SignedIn>
              <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-blue-900/40">
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      userButtonAvatarBox:
                        'w-9 h-9 rounded-full ring-2 ring-blue-500/30 hover:ring-blue-600 transition-all',
                    },
                  }}
                />
              </div>
            </SignedIn>

            {isPreview ? (
              <SignedOut>
                <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-blue-900/40">
                  <div
                    className="w-9 h-9 rounded-full ring-2 ring-blue-500/30 bg-gradient-to-tr from-blue-600 to-sky-400 text-white font-bold text-xs flex items-center justify-center shadow-sm"
                    aria-label="Student Alex Morgan"
                  >
                    AM
                  </div>
                </div>
              </SignedOut>
            ) : (
              <SignedOut>
                {isRegistrationChecking ? (
                  <div className="h-8 w-20 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg" />
                ) : isRegistered ? (
                  <Link to="/login">
                    <Button
                      variant="primary"
                      size="sm"
                      className="bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white font-bold shadow-md shadow-blue-500/20"
                    >
                      Sign In
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/login">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-sky-400 hover:bg-blue-50 dark:hover:bg-[#111E3D] font-semibold"
                      >
                        Sign In
                      </Button>
                    </Link>
                    <Link to="/register">
                      <Button
                        variant="primary"
                        size="sm"
                        className="bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white font-bold shadow-md shadow-blue-500/20"
                      >
                        Student Register
                      </Button>
                    </Link>
                  </>
                )}
              </SignedOut>
            )}
          </div>

          {/* Mobile controls */}
          <div className="flex md:hidden items-center gap-2">
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            {isPreview && (
              <SignedOut>
                <div className="w-8 h-8 rounded-full ring-2 ring-blue-500/30 bg-gradient-to-tr from-blue-600 to-sky-400 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                  AM
                </div>
              </SignedOut>
            )}
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              className="p-2 rounded-xl bg-slate-100 dark:bg-[#111E3D] text-slate-700 dark:text-sky-300 border border-slate-200 dark:border-blue-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200/80 dark:border-blue-900/40 bg-white/80 dark:bg-[#081225]/80 backdrop-blur-2xl px-4 pt-3 pb-6 space-y-2 text-sm shadow-2xl transition-all">
          <div className="flex flex-col gap-1 py-1">
            {publicNavLinks.map(renderMobileLink)}

            <SignedIn>
              {studentNavLinks.map(renderMobileLink)}
            </SignedIn>

            {isPreview && (
              <SignedOut>
                {studentNavLinks.map(renderMobileLink)}
              </SignedOut>
            )}
          </div>

          <SignedOut>
            {!isPreview && (
              <div className="pt-3 border-t border-slate-100 dark:border-blue-900/40 flex flex-col gap-2">
                {isRegistrationChecking ? (
                  <div className="h-10 w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />
                ) : isRegistered ? (
                  <Link to="/login" onClick={() => setMobileOpen(false)}>
                    <Button
                      variant="primary"
                      className="w-full justify-center bg-blue-600 text-white font-bold"
                    >
                      Sign In
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMobileOpen(false)}>
                      <Button variant="secondary" className="w-full justify-center">
                        Sign In
                      </Button>
                    </Link>
                    <Link to="/register" onClick={() => setMobileOpen(false)}>
                      <Button
                        variant="primary"
                        className="w-full justify-center bg-blue-600 text-white font-bold"
                      >
                        Register as Student
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            )}
          </SignedOut>
        </div>
      )}
    </header>
  );
};

export default Navbar;
