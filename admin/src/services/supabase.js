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
 * Subscribes to realtime changes for Admin Portal (students, scores, stats, notifications, audit_logs)
 * @param {Function} onChange - Callback triggered when data changes in Supabase: (table, payload) => void
 * @returns {Function} Unsubscribe cleanup function
 */
export const subscribeToAdminUpdates = (onChange) => {
  if (!supabase) return () => {};

  const channelId = `admin-realtime-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'system_settings' },
      (payload) => onChange && onChange('system_settings', payload)
    )
    .subscribe();

  return () => {
    try {
      supabase.removeChannel(channel);
    } catch (e) {
      // Ignored
    }
  };
};

/**
 * Dedicated realtime listener for System Settings updates across multiple admin sessions
 * @param {Function} onSettingsChange - Callback when system_settings changes in Supabase
 * @returns {Function} Unsubscribe cleanup function
 */
export const subscribeToSettingsUpdates = (onSettingsChange) => {
  if (!supabase) return () => {};

  const channelId = `admin-settings-realtime-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'system_settings' },
      (payload) => onSettingsChange && onSettingsChange(payload)
    )
    .subscribe();

  return () => {
    try {
      supabase.removeChannel(channel);
    } catch (e) {
      // Ignored
    }
  };
};
