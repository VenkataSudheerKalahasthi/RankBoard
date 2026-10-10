import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useNotifications } from '../context/NotificationContext';
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  Trophy,
  Layers,
  RefreshCw,
  Calculator,
  AlertOctagon,
  Sparkles,
  ClipboardList,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  Activity,
} from 'lucide-react';
import clsx from 'clsx';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Students', path: '/students', icon: Users },
  { name: 'Import Students', path: '/import', icon: FileSpreadsheet },
  { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
  { name: 'Platforms', path: '/platforms', icon: Layers },
  { name: 'Synchronization', path: '/synchronization', icon: RefreshCw },
  { name: 'Scores', path: '/scores', icon: Calculator },
  { name: 'Anomalies', path: '/anomalies', icon: AlertOctagon },
  { name: 'AI Insights', path: '/insights', icon: Sparkles },
  { name: 'Audit Logs', path: '/audit-logs', icon: ClipboardList },
  { name: 'Notifications', path: '/notifications', icon: Bell, hasBadge: true },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export const AdminLayout = () => {
  const { admin, logout } = useAdminAuth();
  const { unreadCount } = useNotifications();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const currentNav = NAV_ITEMS.find((item) =>
    location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path))
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row">
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center font-black text-sm text-white shadow-sm">
            DSA
          </div>
          <div>
            <span className="text-xs font-bold text-slate-100 tracking-wider">ADMIN CONSOLE</span>
            <span className="block text-[10px] text-slate-400">Rankboard Management</span>
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Overlay on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-slate-900/95 border-r border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div>
          <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center font-extrabold text-sm text-white shadow-md shadow-brand-900/40">
                DSA
              </div>
              <div>
                <h1 className="text-xs font-black tracking-wider uppercase text-slate-100">
                  Rankboard Admin
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">
                    {admin?.collegeName || 'Engineering College'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.path ||
                (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={clsx(
                    'flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group',
                    isActive
                      ? 'bg-brand-600/15 text-brand-400 border border-brand-500/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={clsx(
                        'w-4 h-4 transition-colors',
                        isActive ? 'text-brand-400' : 'text-slate-400 group-hover:text-slate-200'
                      )}
                    />
                    <span>{item.name}</span>
                  </div>

                  {item.hasBadge && unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {unreadCount}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Admin User Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50 border border-slate-800">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                {admin?.name?.charAt(0) || 'A'}
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-slate-200 truncate">
                  {admin?.name || 'Administrator'}
                </div>
                <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                  <Shield className="w-2.5 h-2.5 text-brand-400" />
                  {admin?.role || 'Admin'}
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-md hover:bg-slate-700/50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="hidden lg:flex items-center justify-between px-4 sm:px-6 lg:px-8 xl:px-10 py-4 bg-slate-900/60 border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-30">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
              <span>Admin Console</span>
              <span>/</span>
              <span className="text-slate-200 font-semibold">{currentNav?.name || 'Dashboard'}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-100 mt-0.5">
              {currentNav?.name || 'Dashboard'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>System Live</span>
            </div>

            <NavLink
              to="/notifications"
              className="relative p-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[9px] font-extrabold flex items-center justify-center text-white">
                  {unreadCount}
                </span>
              )}
            </NavLink>
          </div>
        </header>

        {/* Page Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 xl:px-10 xl:py-8 w-full min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
