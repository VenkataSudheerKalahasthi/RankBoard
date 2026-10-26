import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn, AuthenticateWithRedirectCallback } from '@clerk/clerk-react';

// Layouts
import PublicLayout from './components/layout/PublicLayout';
import StudentLayout from './components/layout/StudentLayout';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// Public Pages
import Home from './pages/Home';
import Leaderboard from './pages/Leaderboard';
import Login from './pages/Login';
import Register from './pages/Register';
import PublicShowcase from './pages/PublicShowcase';

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

const SAMPLE_STUDENT_PREVIEW = {
  name: 'Alex Morgan',
  rollNumber: '21CS042',
  department: 'Computer Science and Engineering',
  year: 3,
  rank: 7,
  finalScore: 842.5,
  totalCollegeStudents: 140,
  platforms: {
    leetcode: {
      username: 'alex_morgan_competitive_coder',
      profileUrl: 'https://leetcode.com/u/alex_morgan_competitive_coder/',
      status: 'SUCCESS',
      lastFetchedAt: '2026-10-12T14:30:00Z',
    },
    gfg: {
      username: 'alexmorgan_geeks_pro_2026',
      profileUrl: 'https://www.geeksforgeeks.org/user/alexmorgan_geeks_pro_2026/',
      status: 'SUCCESS',
      lastFetchedAt: '2026-10-12T14:30:00Z',
    },
    hackerrank: {
      username: 'alex_hackerrank_star',
      profileUrl: 'https://www.hackerrank.com/profile/alex_hackerrank_star',
      status: 'SUCCESS',
      lastFetchedAt: '2026-10-12T14:30:00Z',
    },
    codeforces: {
      username: 'tourist_morgan_cf',
      profileUrl: 'https://codeforces.com/profile/tourist_morgan_cf',
      status: 'SUCCESS',
      lastFetchedAt: '2026-10-12T14:30:00Z',
    },
    codechef: {
      username: 'chef_alex_elite',
      profileUrl: 'https://www.codechef.com/users/chef_alex_elite',
      status: 'SUCCESS',
      lastFetchedAt: '2026-10-12T14:30:00Z',
    },
  },
  platformStats: {
    leetcode: {
      totalSolved: 486,
      easySolved: 215,
      mediumSolved: 220,
      hardSolved: 51,
      rating: 1845,
      ranking: 42100,
      streak: 48,
    },
    gfg: {
      totalSolved: 342,
      schoolSolved: 24,
      basicSolved: 58,
      easySolved: 130,
      mediumSolved: 105,
      hardSolved: 25,
      rating: 1720,
      instituteRank: 12,
    },
    hackerrank: {
      totalSolved: 180,
      badgesCount: 14,
      stars: 5,
      certificatesCount: 4,
    },
    codeforces: {
      totalSolved: 275,
      rating: 1492,
      maxRating: 1540,
      rankTier: 'Specialist',
      contests: 28,
    },
    codechef: {
      totalSolved: 195,
      rating: 1715,
      maxRating: 1780,
      stars: 3,
      globalRank: 8420,
      contests: 16,
    },
  },
};

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

      {/* Public Shareable Achievement Showcase */}
      <Route path="/showcase/:studentId" element={<PublicShowcase />} />

      {/* Auth Pages */}
      <Route path="/login/*" element={<Login />} />
      <Route path="/register/*" element={<Register />} />
      <Route path="/sso-callback" element={<AuthenticateWithRedirectCallback />} />

      {/* Visual / Inspection Preview Routes */}
      <Route
        path="/student/profile-preview"
        element={
          <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#071226] text-[#0F172A] dark:text-white transition-colors duration-300">
            <Navbar />
            <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-8">
              <StudentProfile previewStudent={SAMPLE_STUDENT_PREVIEW} />
            </main>
            <Footer />
          </div>
        }
      />
      <Route
        path="/student/dashboard-preview"
        element={
          <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#071226] text-[#0F172A] dark:text-white transition-colors duration-300">
            <Navbar />
            <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-8">
              <StudentDashboard previewStudent={SAMPLE_STUDENT_PREVIEW} />
            </main>
            <Footer />
          </div>
        }
      />
      <Route
        path="/student/platforms-preview"
        element={
          <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#071226] text-[#0F172A] dark:text-white transition-colors duration-300">
            <Navbar />
            <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-8">
              <StudentPlatforms previewStudent={SAMPLE_STUDENT_PREVIEW} />
            </main>
            <Footer />
          </div>
        }
      />

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
