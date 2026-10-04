import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Subscribes to realtime changes on students and scores
 * @param {Function} onChange - Callback triggered when data changes in Supabase
 * @returns {Function} Unsubscribe cleanup function
 */
export const subscribeToRankboardUpdates = (onChange) => {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('rankboard-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'students' },
      (payload) => {
        onChange && onChange(payload);
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'scores' },
      (payload) => {
        onChange && onChange(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
