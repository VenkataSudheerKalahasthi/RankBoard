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
