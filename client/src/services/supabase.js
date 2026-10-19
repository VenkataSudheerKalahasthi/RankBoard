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
 * and handles connection drops gracefully.
 * 
 * @param {Function} onChange - Callback triggered when data changes in Supabase: (table, payload) => void
 * @param {Object} options - { debounceMs: number }
 * @returns {Function} Unsubscribe cleanup function
 */
export const subscribeToRankboardUpdates = (onChange, options = {}) => {
  if (!supabase) return () => { };

  const debounceMs = options.debounceMs || 2500;
  let debounceTimer = null;
  let pendingTable = null;
  let pendingPayload = null;

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
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        // Connection error or quota reached; fail silently and let HTTP polling handle updates
        console.info('[Realtime Status Notice]: Realtime channel in fallback mode (' + status + '). Periodic refresh active.');
      }
    });

  return () => {
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