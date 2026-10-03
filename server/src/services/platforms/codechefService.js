const axios = require('axios');
const { parseCodeChefUrl } = require('../../utils/urlParsers');

/**
 * Fetches actual statistics from CodeChef public profile
 * @param {string} input - CodeChef profile URL or handle
 * @returns {Promise<Object>} Normalized statistics object
 */
const fetchCodeChefProfile = async (input) => {
  const username = parseCodeChefUrl(input);

  const result = {
    platform: 'codechef',
    username: username || input,
    profileUrl: username ? `https://www.codechef.com/users/${username}` : input,
    totalSolved: null,
    rating: null,
    stars: null,
    globalRank: null,
    contests: null,
    status: 'PENDING',
    fetchedAt: new Date().toISOString(),
    errorMessage: null,
    rawData: null,
  };

  if (!username) {
    result.status = 'FAILED';
    result.errorMessage = 'Invalid CodeChef URL or handle format';
    return result;
  }

  try {
    const response = await axios.get(`https://www.codechef.com/users/${encodeURIComponent(username)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 12000,
    });

    const html = response.data;
    if (typeof html !== 'string' || html.includes('User does not exist') || html.includes('Page Not Found') || response.status === 404) {
      result.status = 'FAILED';
      result.errorMessage = `User "${username}" not found on CodeChef`;
      return result;
    }

    // Rating: <div class="rating-number">1524</div>
    const ratingMatch = html.match(/class="rating-number">([0-9]+)<\/div>/i);
    if (ratingMatch && ratingMatch[1]) {
      result.rating = parseInt(ratingMatch[1], 10);
    }

    // Problems Solved: <h5>Total Problems Solved: 235</h5> or similar
    const solvedMatch = html.match(/Total Problems Solved:\s*([0-9]+)/i) ||
                        html.match(/Problems Solved:?\s*<[^>]+>\s*([0-9]+)/i) ||
                        html.match(/<h3>Total Problems Solved:\s*([0-9]+)<\/h3>/i);
    if (solvedMatch && solvedMatch[1]) {
      result.totalSolved = parseInt(solvedMatch[1], 10);
    }

    // Contests count
    const contestMatch = html.match(/Contests \(([0-9]+)\)/i) || html.match(/Contests:\s*([0-9]+)/i);
    if (contestMatch && contestMatch[1]) {
      result.contests = parseInt(contestMatch[1], 10);
    }

    // Stars
    const starsMatch = html.match(/class="rating-star">\s*<span>([0-9★]+)<\/span>/i);
    if (starsMatch && starsMatch[1]) {
      result.stars = starsMatch[1];
    }

    if (result.totalSolved !== null || result.rating !== null) {
      result.status = 'SUCCESS';
      result.rawData = { stars: result.stars };
    } else {
      result.status = 'FAILED';
      result.errorMessage = 'Could not parse CodeChef profile data from response';
    }

    return result;
  } catch (error) {
    console.error(`[CodeChef Fetch Error] user: ${username}:`, error.message);
    result.status = 'FAILED';
    result.errorMessage = error.message;
    return result;
  }
};

module.exports = {
  fetchCodeChefProfile,
};
