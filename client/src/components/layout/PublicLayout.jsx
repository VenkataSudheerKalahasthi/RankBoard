import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

const PublicLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#071226] text-[#0F172A] dark:text-white transition-colors duration-300">
      <Navbar />
      <main className="flex-1">
        {children || <Outlet />}
      </main>
      <Footer />
    </div>
  );
};

export default PublicLayout;

