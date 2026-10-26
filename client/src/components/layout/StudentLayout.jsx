import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import Navbar from './Navbar';
import Footer from './Footer';
import LoadingState from '../common/LoadingState';
import { useStudent } from '../../context/StudentContext';

const StudentLayout = ({ children }) => {
  const { isLoaded, isSignedIn } = useAuth();
  const { loading: studentLoading } = useStudent();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#071226]">
        <LoadingState message="Verifying Clerk authentication session..." />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#071226] text-[#0F172A] dark:text-white transition-colors duration-300">
      <Navbar />
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-8">
        {studentLoading ? (
          <LoadingState message="Loading your student profile from Firestore..." />
        ) : (
          children || <Outlet />
        )}
      </main>
      <Footer />
    </div>
  );
};

export default StudentLayout;

