import api from './api';

const memoryCache = new Map();
const CACHE_TTL_MS = 45000; // 45 seconds

const getCacheKey = (params = {}) => {
  return JSON.stringify({
    search: params.search?.trim().toLowerCase() || '',
    department: params.department || 'ALL',
    year: params.year || 'ALL',
  });
};

export const leaderboardService = {
  /**
   * Retrieves valid cached leaderboard data synchronously if fresh.
   */
  getCachedLeaderboard(params = {}) {
    const key = getCacheKey(params);
    const entry = memoryCache.get(key);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
      return entry.data;
    }
    return null;
  },

  /**
   * Retrieves valid cached summary stats synchronously if fresh.
   */
  getCachedStats() {
    const cachedStatsEntry = memoryCache.get('__stats__');
    if (cachedStatsEntry && Date.now() - cachedStatsEntry.timestamp < CACHE_TTL_MS) {
      return cachedStatsEntry.data;
    }
    // Fallback: check if base unfiltered leaderboard is in cache
    const baseEntry = memoryCache.get(getCacheKey({}));
    if (baseEntry && baseEntry.data?.stats) {
      return baseEntry.data.stats;
    }
    return null;
  },

  /**
   * Fetches lightweight aggregate statistics with memory cache support.
   */
  async getStats(options = {}) {
    const cached = memoryCache.get('__stats__');
    if (!options.forceRefresh && options.preferCache && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    const params = {};
    if (options.forceRefresh) {
      params.fresh = 'true';
    }

    const res = await api.get('/leaderboard/stats', { params });
    if (res.data && res.data.success) {
      memoryCache.set('__stats__', {
        timestamp: Date.now(),
        data: res.data.stats,
      });
      return res.data.stats;
    }
    return res.data?.stats || null;
  },

  /**
   * Fetches leaderboard data with memory cache support.
   */
  async getLeaderboard(params = {}, options = {}) {
    const key = getCacheKey(params);
    const cached = memoryCache.get(key);

    if (!options.forceRefresh && options.preferCache && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    const res = await api.get('/leaderboard', { params });
    if (res.data && res.data.success) {
      memoryCache.set(key, {
        timestamp: Date.now(),
        data: res.data,
      });
      if (res.data.stats) {
        memoryCache.set('__stats__', {
          timestamp: Date.now(),
          data: res.data.stats,
        });
      }
    }
    return res.data;
  },

  /**
   * Invalidate cached data
   */
  clearCache() {
    memoryCache.clear();
  },
};
