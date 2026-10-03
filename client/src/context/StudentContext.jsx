import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { setAuthTokenGetter } from '../services/api';
import { studentService } from '../services/studentService';

const StudentContext = createContext(null);

export const StudentProvider = ({ children }) => {
  const { isSignedIn, isLoaded: authLoaded, getToken } = useAuth();
  const { user } = useUser();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);

  // Bind Clerk's getToken to Axios
  useEffect(() => {
    if (getToken) {
      setAuthTokenGetter(getToken);
    }
  }, [getToken]);

  const fetchStudentProfile = useCallback(async () => {
    if (!isSignedIn) {
      setStudent(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await studentService.getProfile();
      if (response.success && response.student) {
        setStudent(response.student);
      }
    } catch (err) {
      console.error('[Student Context Fetch Error]:', err);
      setError(err.response?.data?.message || 'Failed to fetch student profile.');
    } finally {
      setLoading(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (authLoaded) {
      if (isSignedIn) {
        fetchStudentProfile();
      } else {
        setStudent(null);
        setLoading(false);
      }
    }
  }, [authLoaded, isSignedIn, fetchStudentProfile]);

  const updateProfile = async (formData) => {
    const res = await studentService.updateProfile(formData);
    if (res.success && res.student) {
      setStudent((prev) => ({ ...prev, ...res.student }));
    }
    return res;
  };

  const syncPlatforms = async (urls = {}) => {
    setSyncing(true);
    try {
      const res = await studentService.syncPlatforms(urls);
      if (res.success && res.student) {
        setStudent((prev) => ({ ...prev, ...res.student }));
      }
      return res;
    } finally {
      setSyncing(false);
    }
  };

  const value = {
    student,
    loading: !authLoaded || loading,
    error,
    syncing,
    isSignedIn,
    user,
    refreshStudent: fetchStudentProfile,
    updateProfile,
    syncPlatforms,
  };

  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>;
};

export const useStudent = () => {
  const context = useContext(StudentContext);
  if (!context) {
    throw new Error('useStudent must be used within a StudentProvider');
  }
  return context;
};
