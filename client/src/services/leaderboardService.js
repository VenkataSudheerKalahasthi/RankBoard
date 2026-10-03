import api from './api';

export const leaderboardService = {
  async getLeaderboard(params = {}) {
    const res = await api.get('/leaderboard', { params });
    return res.data;
  },
};
