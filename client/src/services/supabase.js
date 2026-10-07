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
 * Creates an isolated channel per subscription to avoid collision, and cleans up on unmount.
 * 
 * @param {Function} onChange - Callback triggered when data changes in Supabase: (table, payload) => void
 * @returns {Function} Unsubscribe cleanup function
 */
export const subscribeToRankboardUpdates = (onChange) => {
  if (!supabase) return () => {};

  const channelId = `rankboard-client-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'students' },
      (payload) => onChange && onChange('students', payload)
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'scores' },
      (payload) => onChange && onChange('scores', payload)
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'platform_statistics' },
      (payload) => onChange && onChange('platform_statistics', payload)
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'student_platform_profiles' },
      (payload) => onChange && onChange('student_platform_profiles', payload)
    )
    .subscribe();

  return () => {
    try {
      supabase.removeChannel(channel);
    } catch (e) {
      // Ignored on teardown
    }
  };
};
