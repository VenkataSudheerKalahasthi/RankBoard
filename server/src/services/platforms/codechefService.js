const axios = require('axios');
const { parseCodeChefUrl } = require('../../utils/urlParsers');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetches actual statistics from CodeChef public profile with rate-limit retries
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

  const maxAttempts = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await axios.get(`https://www.codechef.com/users/${encodeURIComponent(username)}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        },
        timeout: 15000,
      });

      const html = response.data;

      // Check for Cloudflare challenge / rate-limit interception
      if (typeof html === 'string' && (html.includes('Just a moment...') || html.includes('challenges.cloudflare.com') || html.includes('_cf_chl_opt'))) {
        throw new Error('CodeChef Cloudflare rate-limit challenge triggered (429)');
      }

      if (
        typeof html !== 'string' ||
        html.includes('User does not exist') ||
        html.includes('Page Not Found') ||
        response.status === 404 ||
        (html.includes('<meta property="og:url" content="https://www.codechef.com/"') && !html.includes('user-details-container')) ||
        (html.includes('<title>\n        CodeChef - Learn and Practice Coding with Problems') && !html.includes('user-details-container'))
      ) {
        result.status = 'FAILED';
        result.errorMessage = `User "${username}" not found on CodeChef`;
        return result;
      }

      const isProfilePage =
        html.includes('user-details-container') ||
        html.includes('user-profile') ||
        html.includes('/users/') ||
        html.includes('rating-number') ||
        html.includes('problems-solved');

      if (!isProfilePage) {
        result.status = 'FAILED';
        result.errorMessage = `User "${username}" not found or profile is private`;
        return result;
      }

      // 1. Total Problems Solved
      const solvedMatch = html.match(/Total Problems Solved:\s*([0-9]+)/i) ||
                          html.match(/<h3>Total Problems Solved:\s*([0-9]+)<\/h3>/i) ||
                          html.match(/<h5>Total Problems Solved:\s*([0-9]+)<\/h5>/i) ||
                          html.match(/Problems Solved:?\s*<[^>]+>\s*([0-9]+)/i) ||
                          html.match(/Total Problems Solved\s*<\/[^>]+>\s*<[^>]+>\s*([0-9]+)/i);
      if (solvedMatch && solvedMatch[1]) {
        result.totalSolved = parseInt(solvedMatch[1], 10);
      } else {
        const problemsSectionMatch = html.match(/<section[^>]*class="[^"]*problems-solved[^"]*"[^>]*>([\s\S]*?)<\/section>/i);
        if (problemsSectionMatch) {
          const linksCount = (problemsSectionMatch[1].match(/<a\s+href="\/problems\//gi) || []).length;
          result.totalSolved = linksCount;
        } else {
          result.totalSolved = 0;
        }
      }

      // 2. Contest Rating
      const ratingMatch = html.match(/class="rating-number">[\s\n\r]*([0-9]+)/i) ||
                          html.match(/<div[^>]*class="rating-number"[^>]*>[\s\n\r]*([0-9]+)/i) ||
                          html.match(/rating-header[\s\S]*?class="rating-number">[\s\n\r]*([0-9]+)/i);
      if (ratingMatch && ratingMatch[1]) {
        result.rating = parseInt(ratingMatch[1], 10);
      } else {
        const dvrMatch = html.match(/date_versus_rating\s*:\s*({[\s\S]*?})\s*,\s*["']?contest_ratings/i) ||
                         html.match(/"date_versus_rating"\s*:\s*({[\s\S]*?})\s*,\s*"contest_ratings"/i);
        if (dvrMatch) {
          try {
            const dvr = JSON.parse(dvrMatch[1]);
            const allRatings = dvr.all || [];
            if (allRatings.length > 0) {
              const last = allRatings[allRatings.length - 1];
              if (last && last.rating) result.rating = parseInt(last.rating, 10);
            }
          } catch (e) {}
        }
      }

      // 3. Stars rating
      const starsDivMatch = html.match(/<div[^>]*class="rating-star"[^>]*>([\s\S]*?)<\/div>/i);
      if (starsDivMatch) {
        const starCount = (starsDivMatch[1].match(/&#9733;|★/g) || []).length;
        if (starCount > 0) {
          result.stars = `${starCount}★`;
        }
      }
      if (!result.stars) {
        const starsMatch = html.match(/class="rating-star">\s*<span>([0-9★]+)<\/span>/i) ||
                           html.match(/([1-7])★/i);
        if (starsMatch && starsMatch[1]) {
          result.stars = starsMatch[1].includes('★') ? starsMatch[1] : `${starsMatch[1]}★`;
        }
      }

      // 4. Global Rank
      const globalRankMatch = html.match(/Global Rank[\s\S]*?<a[^>]*>[\s\n\r]*<strong>[\s\n\r]*([0-9]+)[\s\n\r]*<\/strong>[\s\n\r]*<\/a>/i) ||
                              html.match(/Global Rank[\s\S]*?<strong>[\s\n\r]*([0-9]+)[\s\n\r]*<\/strong>/i) ||
                              html.match(/rating-ranks[\s\S]*?Global Rank[\s\S]*?([0-9]+)/i) ||
                              html.match(/<a href="\/ratings\/all">[\s\n\r]*<strong>[\s\n\r]*([0-9]+)/i);
      if (globalRankMatch && globalRankMatch[1]) {
        result.globalRank = parseInt(globalRankMatch[1], 10);
      }

      // 5. Contests
      const contestMatch = html.match(/Contests \(([0-9]+)\)/i) ||
                           html.match(/Contests:\s*([0-9]+)/i) ||
                           html.match(/contest-participated-count"[^>]*>([0-9]+)/i);
      if (contestMatch && contestMatch[1]) {
        result.contests = parseInt(contestMatch[1], 10);
      }

      result.status = 'SUCCESS';
      result.totalSolved = result.totalSolved ?? 0;
      result.rawData = {
        stars: result.stars,
        globalRank: result.globalRank,
      };
      return result;
    } catch (error) {
      lastError = error;
      if (error.response?.status === 429 || error.message?.includes('429')) {
        // Rate limit backoff
        await sleep(attempt * 2000);
      } else if (attempt < maxAttempts) {
        await sleep(1000);
      }
    }
  }

  console.error(`[CodeChef Fetch Error] user: ${username}:`, lastError?.message);
  result.status = 'FAILED';
  result.errorMessage = lastError?.message || 'Failed to fetch CodeChef profile';
  return result;
};

module.exports = {
  fetchCodeChefProfile,
};
