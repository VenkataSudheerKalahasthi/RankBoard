import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';

// Layouts
import PublicLayout from './components/layout/PublicLayout';
import StudentLayout from './components/layout/StudentLayout';

// Public Pages
import Home from './pages/Home';
import Leaderboard from './pages/Leaderboard';
import Login from './pages/Login';
import Register from './pages/Register';

// Protected Student Pages
import StudentDashboard from './pages/StudentDashboard';
import StudentProfile from './pages/StudentProfile';
import StudentPlatforms from './pages/StudentPlatforms';
import StudentScore from './pages/StudentScore';
import StudentRank from './pages/StudentRank';

// Protected Route Wrapper Component
function ProtectedStudentRoute({ children }) {
  return (
    <>
      <SignedIn>
        <StudentLayout>{children}</StudentLayout>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public Pages with Public Navbar & Footer */}
      <Route
        path="/"
        element={
          <PublicLayout>
            <Home />
          </PublicLayout>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <PublicLayout>
            <Leaderboard />
          </PublicLayout>
        }
      />

      {/* Auth Pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected Student Portal Routes */}
      <Route
        path="/student/dashboard"
        element={
          <ProtectedStudentRoute>
            <StudentDashboard />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/student/profile"
        element={
          <ProtectedStudentRoute>
            <StudentProfile />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/student/platforms"
        element={
          <ProtectedStudentRoute>
            <StudentPlatforms />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/student/score"
        element={
          <ProtectedStudentRoute>
            <StudentScore />
          </ProtectedStudentRoute>
        }
      />
      <Route
        path="/student/rank"
        element={
          <ProtectedStudentRoute>
            <StudentRank />
          </ProtectedStudentRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
