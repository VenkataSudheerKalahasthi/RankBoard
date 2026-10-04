import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Subscribes to realtime changes for Admin Portal (students, scores, notifications, audit_logs)
 * @param {Function} onChange - Callback triggered when data changes in Supabase
 * @returns {Function} Unsubscribe cleanup function
 */
export const subscribeToAdminUpdates = (onChange) => {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('admin-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'students' },
      (payload) => onChange && onChange('students', payload)
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'admin_notifications' },
      (payload) => onChange && onChange('notifications', payload)
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'audit_logs' },
      (payload) => onChange && onChange('audit_logs', payload)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
