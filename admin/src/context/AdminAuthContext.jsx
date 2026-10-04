import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth, useUser, useClerk } from '@clerk/clerk-react';
import { setAuthTokenGetter } from '../services/api';
import { adminService } from '../services/adminService';

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
  const { isSignedIn, isLoaded: authLoaded, getToken } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();

  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Bind Clerk's getToken into the Axios instance
  useEffect(() => {
    if (getToken) {
      setAuthTokenGetter(getToken);
    }
  }, [getToken]);

  const verifyAdminStatus = useCallback(async () => {
    if (!isSignedIn) {
      setAdmin(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setAuthError(null);

    try {
      const response = await adminService.getAdminProfile();
      if (response.success && response.admin) {
        setAdmin(response.admin);
      } else {
        setAuthError('Unauthorized: Administrator privileges could not be confirmed.');
      }
    } catch (err) {
      console.error('[Admin Auth Verification Error]:', err);
      setAuthError(err.message || 'Failed to verify admin status on the server.');
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (authLoaded) {
      if (isSignedIn) {
        verifyAdminStatus();
      } else {
        setAdmin(null);
        setLoading(false);
      }
    }
  }, [authLoaded, isSignedIn, verifyAdminStatus]);

  const handleLogout = async () => {
    try {
      await signOut();
      setAdmin(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const value = {
    admin,
    user,
    isSignedIn,
    loading: !authLoaded || loading,
    authError,
    isAuthenticated: isSignedIn && !!admin,
    refreshAdmin: verifyAdminStatus,
    logout: handleLogout,
  };

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
