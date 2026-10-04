const app = require('./app');
const { config, validateEnv } = require('./config/env');
const { getSupabase } = require('./supabase/supabaseClient');

const startServer = () => {
  // Validate configuration variables cleanly
  validateEnv();

  // Test Supabase connection
  try {
    const supabase = getSupabase();
    if (supabase) {
      console.log('✅ Supabase PostgreSQL client active.');
    }
  } catch (err) {
    console.warn('⚠️  Supabase connection notice:', err.message);
  }

  const server = app.listen(config.PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 COLLEGE DSA RANKBOARD API RUNNING ON PORT ${config.PORT}`);
    console.log(`   Database: Supabase PostgreSQL`);
    console.log(`   Mode: ${config.NODE_ENV}`);
    console.log(`   Health Check: http://localhost:${config.PORT}/api/health`);
    console.log(`   Leaderboard:  http://localhost:${config.PORT}/api/leaderboard`);
    console.log(`====================================================`);
  });

  const shutdown = () => {
    console.log('\nShutting down server gracefully...');
    server.close(() => {
      console.log('Server process terminated.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

startServer();
