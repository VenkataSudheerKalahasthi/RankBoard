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
   * Fetches leaderboard data with memory cache support.
   */
  async getLeaderboard(params = {}, options = {}) {
    const key = getCacheKey(params);
    const cached = memoryCache.get(key);

    if (options.preferCache && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    const res = await api.get('/leaderboard', { params });
    if (res.data && res.data.success) {
      memoryCache.set(key, {
        timestamp: Date.now(),
        data: res.data,
      });
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
