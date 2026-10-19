import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { setAuthTokenGetter } from '../services/api';
import { studentService } from '../services/studentService';
import { subscribeToRankboardUpdates } from '../services/supabase';
import {
  getStoredRegistrationReceipt,
  saveRegistrationReceipt,
  clearRegistrationReceipt,
} from '../utils/registrationReceipt';

const StudentContext = createContext(null);

export const StudentProvider = ({ children }) => {
  const { isSignedIn, isLoaded: authLoaded, getToken } = useAuth();
  const { user } = useUser();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);

  // Persistent registration status for returning visitors on this browser/account
  const [isRegistered, setIsRegistered] = useState(() => {
    return !!getStoredRegistrationReceipt();
  });
  const [isRegistrationChecking, setIsRegistrationChecking] = useState(() => {
    return !isSignedIn && !!getStoredRegistrationReceipt();
  });

  // Bind Clerk's getToken to Axios
  useEffect(() => {
    if (getToken) {
      setAuthTokenGetter(getToken);
    }
  }, [getToken]);

  // Check persistent registration receipt against database when signed out
  useEffect(() => {
    let isCancelled = false;

    const checkSavedRegistration = async () => {
      if (isSignedIn) {
        setIsRegistered(true);
        setIsRegistrationChecking(false);
        return;
      }

      const savedReceipt = getStoredRegistrationReceipt();
      if (!savedReceipt) {
        setIsRegistered(false);
        setIsRegistrationChecking(false);
        return;
      }

      setIsRegistrationChecking(true);
      try {
        const result = await studentService.verifyRegistration(savedReceipt);
        if (!isCancelled) {
          if (result && result.success && result.isRegistered) {
            setIsRegistered(true);
            saveRegistrationReceipt(savedReceipt);
          } else if (result && result.networkError) {
            // Network error / offline / timeout: do NOT treat as a new visitor
            console.warn('[StudentContext] Network error during registration check; preserving registered status.');
            setIsRegistered(true);
          } else {
            // Invalid or expired receipt, or student deactivated in database
            setIsRegistered(false);
            clearRegistrationReceipt();
          }
        }
      } catch (err) {
        if (!isCancelled) {
          // If status verification fails due to network error, handle safely without demoting returning student
          console.warn('[StudentContext] Network exception during status check:', err);
          setIsRegistered(true);
        }
      } finally {
        if (!isCancelled) {
          setIsRegistrationChecking(false);
        }
      }
    };

    if (authLoaded) {
      checkSavedRegistration();
    }

    return () => {
      isCancelled = true;
    };
  }, [authLoaded, isSignedIn]);

  const recordRegistration = useCallback((receipt = null) => {
    setIsRegistered(true);
    if (receipt) {
      saveRegistrationReceipt(receipt);
    }
  }, []);

  const clearRegistrationRecord = useCallback(() => {
    clearRegistrationReceipt();
    setIsRegistered(false);
  }, []);

  const fetchStudentProfile = useCallback(async (showLoading = true) => {
    if (!isSignedIn) {
      setStudent(null);
      setLoading(false);
      return;
    }

    if (showLoading) setLoading(true);
    setError(null);
    try {
      const response = await studentService.getProfile();
      if (response.success && response.student) {
        setStudent(response.student);
        setIsRegistered(true);
        if (response.registrationReceipt) {
          saveRegistrationReceipt(response.registrationReceipt);
        }
      }
    } catch (err) {
      console.error('[Student Context Fetch Error]:', err);
      if (showLoading) setError(err.response?.data?.message || 'Failed to fetch student profile.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (authLoaded) {
      if (isSignedIn) {
        fetchStudentProfile(true);
      } else {
        setStudent(null);
        setLoading(false);
      }
    }
  }, [authLoaded, isSignedIn, fetchStudentProfile]);

  // Subscribe to Supabase Realtime for automatic background updates
  useEffect(() => {
    if (!isSignedIn || !student?.id) return;

    const unsubscribe = subscribeToRankboardUpdates((table, payload) => {
      const changedId = payload?.new?.id || payload?.new?.student_id;
      if (!changedId || changedId === student.id || changedId === student.clerkUserId) {
        fetchStudentProfile(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isSignedIn, student?.id, student?.clerkUserId, fetchStudentProfile]);

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
    isRegistered: isSignedIn ? true : isRegistered,
    isRegistrationChecking,
    recordRegistration,
    clearRegistrationRecord,
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
