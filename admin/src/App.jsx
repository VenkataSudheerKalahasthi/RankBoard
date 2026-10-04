import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAdminAuth } from './context/AdminAuthContext';
import { AdminLayout } from './layouts/AdminLayout';
import { LoadingState } from './components/common/LoadingState';
import { Button } from './components/common/Button';
import { ShieldAlert, LogOut } from 'lucide-react';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import StudentDetails from './pages/StudentDetails';
import ImportStudents from './pages/ImportStudents';
import Leaderboard from './pages/Leaderboard';
import Platforms from './pages/Platforms';
import Synchronization from './pages/Synchronization';
import Scores from './pages/Scores';
import Anomalies from './pages/Anomalies';
import Insights from './pages/Insights';
import AuditLogs from './pages/AuditLogs';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';

function ProtectedAdminRoute({ children }) {
  const { isSignedIn, loading, authError, isAuthenticated, logout } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <LoadingState message="Verifying administrator credentials on the server..." />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  if (authError || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-2xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Access Denied</h2>
          <p className="text-xs text-slate-400">
            {authError || 'Your Clerk identity does not have administrator authorization on this system.'}
          </p>
          <div className="pt-2">
            <Button variant="secondary" size="sm" onClick={logout} icon={LogOut}>
              Sign Out & Switch Account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

export function App() {
  const { isSignedIn, loading } = useAdminAuth();

  return (
    <Routes>
      {/* Public Route */}
      <Route
        path="/login"
        element={
          !loading && isSignedIn ? <Navigate to="/dashboard" replace /> : <Login />
        }
      />

      {/* Protected Admin Routes */}
      <Route
        path="/"
        element={
          <ProtectedAdminRoute>
            <AdminLayout />
          </ProtectedAdminRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="students" element={<Students />} />
        <Route path="students/:studentId" element={<StudentDetails />} />
        <Route path="import" element={<ImportStudents />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="platforms" element={<Platforms />} />
        <Route path="synchronization" element={<Synchronization />} />
        <Route path="scores" element={<Scores />} />
        <Route path="anomalies" element={<Anomalies />} />
        <Route path="insights" element={<Insights />} />
        <Route path="audit-logs" element={<AuditLogs />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
