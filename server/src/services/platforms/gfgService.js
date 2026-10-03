const axios = require('axios');
const { parseGFGUrl } = require('../../utils/urlParsers');

/**
 * Fetches actual statistics from GeeksforGeeks public profile
 * @param {string} input - GFG profile URL or handle
 * @returns {Promise<Object>} Normalized statistics object
 */
const fetchGFGProfile = async (input) => {
  const username = parseGFGUrl(input);

  const result = {
    platform: 'gfg',
    username: username || input,
    profileUrl: username ? `https://www.geeksforgeeks.org/user/${username}/` : input,
    totalSolved: null,
    easySolved: null,
    mediumSolved: null,
    hardSolved: null,
    schoolSolved: null,
    basicSolved: null,
    rating: null, // coding score in GFG
    contests: null,
    streak: null,
    status: 'PENDING',
    fetchedAt: new Date().toISOString(),
    errorMessage: null,
    rawData: null,
  };

  if (!username) {
    result.status = 'FAILED';
    result.errorMessage = 'Invalid GeeksforGeeks URL or handle format';
    return result;
  }

  try {
    const response = await axios.get(`https://www.geeksforgeeks.org/user/${encodeURIComponent(username)}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 12000,
    });

    const html = response.data;
    if (typeof html !== 'string' || html.includes('User does not exist') || html.includes('Page Not Found') || response.status === 404) {
      result.status = 'FAILED';
      result.errorMessage = `User "${username}" not found on GeeksforGeeks`;
      return result;
    }

    // Check for Next.js hydration payload
    const jsonMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        const userInfo = parsed.props?.pageProps?.userInfo;
        if (userInfo) {
          result.totalSolved = userInfo.total_problems_solved ?? null;
          result.rating = userInfo.score ?? null;
          result.streak = userInfo.pod_solved_longest_streak ?? null;
          result.contests = userInfo.contest_rating_count ?? null;

          if (userInfo.difficulty_wise_solved) {
            const diff = userInfo.difficulty_wise_solved;
            result.schoolSolved = diff.school ?? 0;
            result.basicSolved = diff.basic ?? 0;
            result.easySolved = (diff.easy ?? 0) + (diff.basic ?? 0) + (diff.school ?? 0);
            result.mediumSolved = diff.medium ?? 0;
            result.hardSolved = diff.hard ?? 0;
          }

          result.status = 'SUCCESS';
          result.rawData = { rank: userInfo.institute_rank };
          return result;
        }
      } catch (e) {
        // Fallback to HTML pattern matches
      }
    }

    // HTML regex fallback
    const scoreMatch = html.match(/Coding Score[\s\S]*?<div[^>]*class="[^"]*score[^"]*"[^>]*>([0-9]+)<\/div>/i) ||
                       html.match(/class="score_card_value"[^>]*>([0-9]+)<\/span>\s*<span>Coding Score/i) ||
                       html.match(/Coding Score:?\s*([0-9]+)/i);
    if (scoreMatch && scoreMatch[1]) {
      result.rating = parseInt(scoreMatch[1], 10);
    }

    const solvedMatch = html.match(/Problems Solved[\s\S]*?<div[^>]*class="[^"]*score[^"]*"[^>]*>([0-9]+)<\/div>/i) ||
                        html.match(/class="score_card_value"[^>]*>([0-9]+)<\/span>\s*<span>Problems Solved/i) ||
                        html.match(/Total Problems Solved:?\s*([0-9]+)/i);
    if (solvedMatch && solvedMatch[1]) {
      result.totalSolved = parseInt(solvedMatch[1], 10);
    }

    const easyMatch = html.match(/Easy\s*\(([0-9]+)\)/i);
    const medMatch = html.match(/Medium\s*\(([0-9]+)\)/i);
    const hardMatch = html.match(/Hard\s*\(([0-9]+)\)/i);

    if (easyMatch && easyMatch[1]) result.easySolved = parseInt(easyMatch[1], 10);
    if (medMatch && medMatch[1]) result.mediumSolved = parseInt(medMatch[1], 10);
    if (hardMatch && hardMatch[1]) result.hardSolved = parseInt(hardMatch[1], 10);

    if (result.totalSolved !== null || result.rating !== null) {
      result.status = 'SUCCESS';
    } else {
      result.status = 'FAILED';
      result.errorMessage = 'Could not parse GeeksforGeeks profile data from response';
    }

    return result;
  } catch (error) {
    console.error(`[GFG Fetch Error] user: ${username}:`, error.message);
    result.status = 'FAILED';
    result.errorMessage = error.message;
    return result;
  }
};

module.exports = {
  fetchGFGProfile,
};
