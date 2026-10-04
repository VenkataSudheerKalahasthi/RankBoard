const { createClient } = require('@supabase/supabase-js');
const { config } = require('../config/env');

let supabase = null;

const initSupabase = () => {
  if (supabase) return supabase;

  const url = config.SUPABASE_URL;
  const key = config.SUPABASE_SERVICE_ROLE_KEY || config.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn('[Supabase Client]: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured in environment.');
    return null;
  }

  try {
    supabase = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    console.log('[Supabase Client]: Successfully initialized Supabase client.');
    return supabase;
  } catch (error) {
    console.error('[Supabase Client Error]: Failed to initialize:', error.message);
    return null;
  }
};

const getSupabase = () => {
  if (!supabase) {
    initSupabase();
  }
  return supabase;
};

// Initialize on module load
initSupabase();

module.exports = {
  getSupabase,
  initSupabase,
};
