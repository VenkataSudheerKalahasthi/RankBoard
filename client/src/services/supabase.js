import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  })
  : null;

/**
 * Subscribes to realtime changes across students, scores, platform_statistics, and profiles.
 * Features debounce coalescing to prevent rapid request storms during batch synchronization,
 * and handles connection drops and status changes gracefully.
 * 
 * @param {Function} onChange - Callback triggered when data changes in Supabase: (table, payload) => void
 * @param {Object} options - { debounceMs?: number, onStatusChange?: (statusInfo: { isLive: boolean, status: string, error?: any }) => void }
 * @returns {Function} Unsubscribe cleanup function
 */
export const subscribeToRankboardUpdates = (onChange, options = {}) => {
  const { onStatusChange } = options;

  if (!supabase) {
    if (onStatusChange) {
      onStatusChange({ isLive: false, status: 'UNAVAILABLE', error: null });
    }
    return () => { };
  }

  const debounceMs = options.debounceMs || 2000;
  let debounceTimer = null;
  let pendingTable = null;
  let pendingPayload = null;
  let currentSubscriptionStatus = 'CONNECTING';

  const reportStatus = (status, error = null) => {
    currentSubscriptionStatus = status;
    const isOnline = typeof window !== 'undefined' && typeof window.navigator !== 'undefined' ? window.navigator.onLine : true;
    const isLive = isOnline && status === 'SUBSCRIBED';
    if (onStatusChange) {
      try {
        onStatusChange({ isLive, status, error });
      } catch (err) {
        console.warn('[Realtime Status Callback Warning]:', err);
      }
    }
  };

  // Initial status notification
  reportStatus('CONNECTING');

  const handleOnline = () => {
    reportStatus(currentSubscriptionStatus);
  };

  const handleOffline = () => {
    reportStatus('OFFLINE');
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  const triggerThrottled = (table, payload) => {
    pendingTable = table;
    pendingPayload = payload;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      if (onChange) {
        try {
          onChange(pendingTable, pendingPayload);
        } catch (err) {
          console.warn('[Realtime Callback Warning]:', err);
        }
      }
    }, debounceMs);
  };

  const channelId = `rankboard-client-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'students' },
      (payload) => triggerThrottled('students', payload)
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'scores' },
      (payload) => triggerThrottled('scores', payload)
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'platform_statistics' },
      (payload) => triggerThrottled('platform_statistics', payload)
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'student_platform_profiles' },
      (payload) => triggerThrottled('student_platform_profiles', payload)
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        reportStatus('SUBSCRIBED');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.info('[Realtime Status Notice]: Realtime channel in fallback mode (' + status + '). Periodic refresh active.');
        reportStatus(status, err);
      } else if (status === 'CLOSED') {
        reportStatus('CLOSED');
      }
    });

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    try {
      supabase.removeChannel(channel);
    } catch (e) {
      // Ignored on teardown
    }
  };
};