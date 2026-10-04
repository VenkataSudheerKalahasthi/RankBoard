const axios = require('axios');
const { parseGFGUrl } = require('../../utils/urlParsers');

/**
 * Fetches actual statistics from GeeksforGeeks public profile
 * Supports Next.js 14 RSC streams (self.__next_f.push), __NEXT_DATA__, and HTML fallback
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
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 15000,
      maxRedirects: 5,
    });

    const html = response.data;
    if (typeof html !== 'string' || html.includes('User does not exist') || html.includes('Page Not Found') || response.status === 404) {
      result.status = 'FAILED';
      result.errorMessage = `User "${username}" not found on GeeksforGeeks`;
      return result;
    }

    // 1. Check for Next.js 14 React Server Components (RSC) streams: self.__next_f.push
    const rscMatches = html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g);
    let rscPayload = '';
    for (const m of rscMatches) {
      try {
        rscPayload += JSON.parse(`"${m[1]}"`);
      } catch (e) {
        rscPayload += m[1];
      }
    }

    if (rscPayload) {
      // Find userInfo object or matching fields inside RSC payload
      const totalSolvedMatch = rscPayload.match(/"total_problems_solved"\s*:\s*([0-9]+)/i) ||
                               rscPayload.match(/"totalProblemsSolved"\s*:\s*([0-9]+)/i);
      if (totalSolvedMatch) result.totalSolved = parseInt(totalSolvedMatch[1], 10);

      const scoreMatch = rscPayload.match(/"score"\s*:\s*([0-9]+)/i) ||
                         rscPayload.match(/"coding_score"\s*:\s*([0-9]+)/i);
      if (scoreMatch) result.rating = parseInt(scoreMatch[1], 10);

      const streakMatch = rscPayload.match(/"pod_solved_longest_streak"\s*:\s*([0-9]+)/i);
      if (streakMatch) result.streak = parseInt(streakMatch[1], 10);

      const rankMatch = rscPayload.match(/"institute_rank"\s*:\s*([0-9]+)/i);
      if (rankMatch) {
        result.rawData = { ...(result.rawData || {}), instituteRank: parseInt(rankMatch[1], 10) };
      }

      // Check difficulty_wise_solved
      const easyMatch = rscPayload.match(/"easy"\s*:\s*([0-9]+)/i);
      const medMatch = rscPayload.match(/"medium"\s*:\s*([0-9]+)/i);
      const hardMatch = rscPayload.match(/"hard"\s*:\s*([0-9]+)/i);
      const schoolMatch = rscPayload.match(/"school"\s*:\s*([0-9]+)/i);
      const basicMatch = rscPayload.match(/"basic"\s*:\s*([0-9]+)/i);

      if (easyMatch) result.easySolved = parseInt(easyMatch[1], 10);
      if (medMatch) result.mediumSolved = parseInt(medMatch[1], 10);
      if (hardMatch) result.hardSolved = parseInt(hardMatch[1], 10);
      if (schoolMatch) result.schoolSolved = parseInt(schoolMatch[1], 10);
      if (basicMatch) result.basicSolved = parseInt(basicMatch[1], 10);

      if (result.totalSolved !== null || result.rating !== null) {
        result.status = 'SUCCESS';
        result.totalSolved = result.totalSolved ?? 0;
        return result;
      }
    }

    // 2. Check for Next.js legacy __NEXT_DATA__
    const jsonMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        const userInfo = parsed.props?.pageProps?.userInfo || parsed.props?.pageProps?.userProfile;
        if (userInfo) {
          result.totalSolved = userInfo.total_problems_solved ?? userInfo.totalProblemsSolved ?? null;
          result.rating = userInfo.score ?? userInfo.coding_score ?? null;
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
          result.totalSolved = result.totalSolved ?? 0;
          result.rawData = { instituteRank: userInfo.institute_rank };
          return result;
        }
      } catch (e) {}
    }

    // 3. HTML regex fallback
    const htmlScoreMatch = html.match(/Coding Score[\s\S]*?<div[^>]*class="[^"]*score[^"]*"[^>]*>([0-9]+)<\/div>/i) ||
                           html.match(/class="score_card_value"[^>]*>([0-9]+)<\/span>\s*<span>Coding Score/i) ||
                           html.match(/Coding Score:?\s*([0-9]+)/i);
    if (htmlScoreMatch && htmlScoreMatch[1]) {
      result.rating = parseInt(htmlScoreMatch[1], 10);
    }

    const htmlSolvedMatch = html.match(/Problems Solved[\s\S]*?<div[^>]*class="[^"]*score[^"]*"[^>]*>([0-9]+)<\/div>/i) ||
                            html.match(/class="score_card_value"[^>]*>([0-9]+)<\/span>\s*<span>Problems Solved/i) ||
                            html.match(/Total Problems Solved:?\s*([0-9]+)/i);
    if (htmlSolvedMatch && htmlSolvedMatch[1]) {
      result.totalSolved = parseInt(htmlSolvedMatch[1], 10);
    }

    if (result.totalSolved !== null || result.rating !== null) {
      result.status = 'SUCCESS';
      result.totalSolved = result.totalSolved ?? 0;
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
