const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { config, validateEnv } = require('./config/env');
const apiRoutes = require('./routes');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

// CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin === config.FRONTEND_URL || origin.startsWith('http://localhost:')) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Request Logger
if (config.NODE_ENV !== 'test') {
  app.use(morgan(config.NODE_ENV === 'development' ? 'dev' : 'combined'));
}

// Body Parsing (allow 10mb for scalable bulk imports)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// General Rate Limiting
app.use('/api', apiLimiter);

// API Router
app.use('/api', apiRoutes);

// Root Index
app.get('/', (req, res) => {
  res.json({
    name: 'College DSA Rankboard API',
    version: '1.0.0',
    description: 'Backend services for College DSA Rankboard powered by Clerk & Supabase PostgreSQL.',
    health: '/api/health',
    leaderboard: '/api/leaderboard',
  });
});

// 404 & Global Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
