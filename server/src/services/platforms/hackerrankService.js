const axios = require('axios');
const { parseHackerRankUrl } = require('../../utils/urlParsers');

/**
 * Fetches real statistics from HackerRank public API endpoints
 * @param {string} input - HackerRank profile URL or handle
 * @returns {Promise<Object>} Normalized statistics object
 */
const fetchHackerRankProfile = async (input) => {
  const username = parseHackerRankUrl(input);

  const result = {
    platform: 'hackerrank',
    username: username || input,
    profileUrl: username ? `https://www.hackerrank.com/profile/${username}` : input,
    totalSolved: null,
    easySolved: 0,
    mediumSolved: 0,
    hardSolved: 0,
    rating: null,
    badges: 0,
    stars: 0,
    certificates: 0,
    status: 'PENDING',
    fetchedAt: new Date().toISOString(),
    errorMessage: null,
    rawData: null,
  };

  if (!username) {
    result.status = 'INVALID_URL';
    result.errorMessage = 'Invalid HackerRank URL or handle format';
    return result;
  }

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json',
  };

  try {
    // 1. Fetch user badges and problems solved
    let badgesModels = [];
    let isFound = false;

    try {
      const badgesRes = await axios.get(
        `https://www.hackerrank.com/rest/hackers/${encodeURIComponent(username)}/badges`,
        { headers, timeout: 10000 }
      );

      if (badgesRes.status === 200 && badgesRes.data) {
        isFound = true;
        badgesModels = Array.isArray(badgesRes.data.models) ? badgesRes.data.models : [];
      }
    } catch (badgeErr) {
      if (badgeErr.response?.status === 404) {
        // Will check scores_elo below to confirm 404
      } else if (badgeErr.response?.status === 429) {
        result.status = 'RATE_LIMITED';
        result.errorMessage = 'HackerRank API rate limit exceeded';
        return result;
      } else {
        console.warn(`[HackerRank Badges Warning] user ${username}:`, badgeErr.message);
      }
    }

    // 2. Fetch track scores / contest ratings
    let scoresList = [];
    try {
      const scoresRes = await axios.get(
        `https://www.hackerrank.com/rest/hackers/${encodeURIComponent(username)}/scores_elo`,
        { headers, timeout: 10000 }
      );
      if (scoresRes.status === 200 && Array.isArray(scoresRes.data)) {
        isFound = true;
        scoresList = scoresRes.data;
      }
    } catch (scoreErr) {
      if (scoreErr.response?.status === 404 && !isFound) {
        // confirmed not found
      } else if (scoreErr.response?.status === 429) {
        result.status = 'RATE_LIMITED';
        result.errorMessage = 'HackerRank API rate limit exceeded';
        return result;
      }
    }

    if (!isFound) {
      result.status = 'NOT_FOUND';
      result.errorMessage = `User "${username}" not found on HackerRank`;
      return result;
    }

    // 3. Fetch certifications
    let certificatesCount = 0;
    try {
      const certRes = await axios.get(
        `https://www.hackerrank.com/community/v1/test_results/hacker_certificate?username=${encodeURIComponent(username)}`,
        { headers, timeout: 8000 }
      );
      if (certRes.status === 200 && Array.isArray(certRes.data?.data)) {
        certificatesCount = certRes.data.data.filter((c) => c.attributes?.status === 'test_passed').length;
      }
    } catch (certErr) {
      // Non-fatal, keep 0
    }

    // Calculate aggregated statistics
    let totalSolved = 0;
    let totalStars = 0;
    let totalPoints = 0;

    const badgesSummary = [];
    badgesModels.forEach((b) => {
      const solved = Number(b.solved || 0);
      const stars = Number(b.stars || 0);
      const points = Number(b.current_points || b.total_points || 0);

      totalSolved += solved;
      totalStars += stars;
      totalPoints += points;

      badgesSummary.push({
        badgeName: b.badge_name || b.badge_type || 'General',
        stars,
        solved,
        points,
        hackerRank: b.hacker_rank || null,
      });
    });

    result.totalSolved = totalSolved;
    result.stars = totalStars;
    result.badges = badgesModels.length;
    result.certificates = certificatesCount;
    result.rating = totalPoints > 0 ? totalPoints : (totalStars > 0 ? totalStars : null);
    result.status = 'SUCCESS';
    result.rawData = {
      badges: badgesSummary,
      certificatesCount,
      tracksTracked: scoresList.length,
    };

    return result;
  } catch (error) {
    console.error(`[HackerRank Fetch Error] user: ${username}:`, error.message);
    result.status = 'FAILED';
    result.errorMessage = error.message;
    return result;
  }
};

module.exports = {
  fetchHackerRankProfile,
};
