const dotenv = require('dotenv');
dotenv.config();

// Helper to format Firebase private key with proper newline characters
const formatPrivateKey = (key) => {
  if (!key) return undefined;
  if (key.includes('\\n')) {
    return key.replace(/\\n/g, '\n');
  }
  return key;
};

const config = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  COLLEGE_ID: process.env.COLLEGE_ID || 'COLLEGE_MAIN',
  COLLEGE_NAME: process.env.COLLEGE_NAME || 'Engineering College',

  // Clerk
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  CLERK_PUBLISHABLE_KEY: process.env.VITE_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY,

  // Firebase
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY: formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY),
};

const validateEnv = () => {
  const missing = [];
  if (!config.CLERK_SECRET_KEY) missing.push('CLERK_SECRET_KEY');
  if (!config.FIREBASE_PROJECT_ID) missing.push('FIREBASE_PROJECT_ID');
  if (!config.FIREBASE_CLIENT_EMAIL) missing.push('FIREBASE_CLIENT_EMAIL');
  if (!config.FIREBASE_PRIVATE_KEY) missing.push('FIREBASE_PRIVATE_KEY');

  if (missing.length > 0) {
    console.warn('\n======================================================');
    console.warn('⚠️  SERVER ENVIRONMENT CONFIGURATION WARNING');
    console.warn('======================================================');
    console.warn(`The following environment variables are not set in .env:`);
    missing.forEach((v) => console.warn(`  - ${v}`));
    console.warn('\nFor local development, copy .env.example to .env and supply your credentials.');
    console.warn('======================================================\n');
  }
};

module.exports = {
  config,
  validateEnv,
};
