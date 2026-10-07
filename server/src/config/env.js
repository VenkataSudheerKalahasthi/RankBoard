const dotenv = require('dotenv');
dotenv.config();

const config = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  COLLEGE_ID: process.env.COLLEGE_ID || 'COLLEGE_MAIN',
  COLLEGE_NAME: process.env.COLLEGE_NAME || 'Engineering College',

  // Clerk
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  CLERK_PUBLISHABLE_KEY: process.env.VITE_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY,

  // Supabase PostgreSQL
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

  // Near-Real-Time Synchronization Engine Configurations
  SYNC_CONFIG: {
    DEFAULT_INTERVAL_SECONDS: parseInt(process.env.PLATFORM_SYNC_INTERVAL_SECONDS, 10) || 60,
    LEETCODE_INTERVAL_SECONDS: parseInt(process.env.LEETCODE_SYNC_INTERVAL_SECONDS, 10) || 60,
    GFG_INTERVAL_SECONDS: parseInt(process.env.GFG_SYNC_INTERVAL_SECONDS, 10) || 120,
    HACKERRANK_INTERVAL_SECONDS: parseInt(process.env.HACKERRANK_SYNC_INTERVAL_SECONDS, 10) || 120,
    CODEFORCES_INTERVAL_SECONDS: parseInt(process.env.CODEFORCES_SYNC_INTERVAL_SECONDS, 10) || 120,
    CODECHEF_INTERVAL_SECONDS: parseInt(process.env.CODECHEF_SYNC_INTERVAL_SECONDS, 10) || 300,
    MAX_CONCURRENT_SYNCS: parseInt(process.env.MAX_CONCURRENT_SYNCS, 10) || 2,
    RATE_LIMIT_COOLDOWN_MS: parseInt(process.env.RATE_LIMIT_COOLDOWN_MS, 10) || 60000,
    BATCH_THROTTLE_MS: parseInt(process.env.BATCH_THROTTLE_MS, 10) || 600,

    // GFG Specific Throttling & Queue Configuration
    GFG_CONCURRENCY: parseInt(process.env.GFG_CONCURRENCY, 10) || 1,
    GFG_MIN_REQUEST_DELAY_MS: parseInt(process.env.GFG_MIN_REQUEST_DELAY_MS, 10) || 1500,
    GFG_TIMEOUT_MS: parseInt(process.env.GFG_TIMEOUT_MS, 10) || 10000,

    // CodeChef Specific Throttling & Backoff Queue Configuration
    CODECHEF_CONCURRENCY: parseInt(process.env.CODECHEF_CONCURRENCY, 10) || 1,
    CODECHEF_MIN_REQUEST_DELAY_MS: parseInt(process.env.CODECHEF_MIN_REQUEST_DELAY_MS, 10) || 2500,
    CODECHEF_MAX_RETRIES: parseInt(process.env.CODECHEF_MAX_RETRIES, 10) || 2,
    CODECHEF_INITIAL_BACKOFF_MS: parseInt(process.env.CODECHEF_INITIAL_BACKOFF_MS, 10) || 30000,
    CODECHEF_MAX_BACKOFF_MS: parseInt(process.env.CODECHEF_MAX_BACKOFF_MS, 10) || 300000,
  },
};

const validateEnv = () => {
  const missing = [];
  if (!config.CLERK_SECRET_KEY) missing.push('CLERK_SECRET_KEY');
  if (!config.SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!config.SUPABASE_SERVICE_ROLE_KEY && !config.SUPABASE_ANON_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY');

  if (missing.length > 0) {
    console.warn('\n======================================================');
    console.warn('⚠️  SERVER ENVIRONMENT CONFIGURATION WARNING');
    console.warn('======================================================');
    console.warn(`The following environment variables are not set in .env:`);
    missing.forEach((v) => console.warn(`  - ${v}`));
    console.warn('\nFor local development, verify your Supabase credentials in .env');
    console.warn('======================================================\n');
  }
};

module.exports = {
  config,
  validateEnv,
};
