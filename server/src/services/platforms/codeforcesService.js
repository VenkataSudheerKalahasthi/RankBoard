const axios = require('axios');
const { parseCodeforcesUrl } = require('../../utils/urlParsers');

/**
 * Fetches actual statistics from official Codeforces REST API
 * @param {string} input - Codeforces profile URL or handle
 * @returns {Promise<Object>} Normalized statistics object
 */
const fetchCodeforcesProfile = async (input) => {
  const username = parseCodeforcesUrl(input);

  const result = {
    platform: 'codeforces',
    username: username || input,
    profileUrl: username ? `https://codeforces.com/profile/${username}` : input,
    totalSolved: null,
    easySolved: null,
    mediumSolved: null,
    hardSolved: null,
    rating: null,
    maxRating: null,
    rank: null,
    contests: null,
    status: 'PENDING',
    fetchedAt: new Date().toISOString(),
    errorMessage: null,
    rawData: null,
  };

  if (!username) {
    result.status = 'FAILED';
    result.errorMessage = 'Invalid Codeforces URL or handle format';
    return result;
  }

  console.log(`[Codeforces] Fetching profile: ${username}`);

  try {
    // 1. Fetch user general info (rating, maxRating, rank)
    const userInfoResponse = await axios.get(
      `https://codeforces.com/api/user.info?handles=${encodeURIComponent(username)}`,
      {
        headers: { 'User-Agent': 'College-DSA-Rankboard/1.0' },
        timeout: 10000,
      }
    );

    if (userInfoResponse.data.status !== 'OK' || !userInfoResponse.data.result?.[0]) {
      result.status = 'FAILED';
      result.errorMessage = `User "${username}" not found on Codeforces`;
      console.warn(`[Codeforces] User "${username}" not found.`);
      return result;
    }

    const userInfo = userInfoResponse.data.result[0];
    result.rating = userInfo.rating || null;
    result.maxRating = userInfo.maxRating || null;
    result.rank = userInfo.rank || null;

    // 2. Fetch user contest history
    let contestCount = 0;
    try {
      const ratingHistoryResponse = await axios.get(
        `https://codeforces.com/api/user.rating?handle=${encodeURIComponent(username)}`,
        { timeout: 8000 }
      );
      if (ratingHistoryResponse.data.status === 'OK' && Array.isArray(ratingHistoryResponse.data.result)) {
        contestCount = ratingHistoryResponse.data.result.length;
      }
    } catch (err) {
      console.warn(`[Codeforces Contest History Warning] user ${username}:`, err.message);
    }
    result.contests = contestCount;

    // 3. Fetch submissions for problem breakdown
    let totalSolved = 0;
    let easy = 0;
    let medium = 0;
    let hard = 0;
    try {
      const statusResponse = await axios.get(
        `https://codeforces.com/api/user.status?handle=${encodeURIComponent(username)}&from=1&count=5000`,
        { timeout: 10000 }
      );

      if (statusResponse.data.status === 'OK' && Array.isArray(statusResponse.data.result)) {
        const solvedProblems = new Map();

        statusResponse.data.result.forEach((sub) => {
          if (sub.verdict === 'OK' && sub.problem) {
            const problemKey = `${sub.problem.contestId}-${sub.problem.index}`;
            if (!solvedProblems.has(problemKey)) {
              solvedProblems.set(problemKey, sub.problem);
              const problemRating = sub.problem.rating || 0;
              if (problemRating > 0 && problemRating < 1200) {
                easy++;
              } else if (problemRating >= 1200 && problemRating < 1800) {
                medium++;
              } else if (problemRating >= 1800) {
                hard++;
              }
            }
          }
        });

        totalSolved = solvedProblems.size;
      }
    } catch (statusErr) {
      console.warn(`[Codeforces Submissions Warning] user ${username}:`, statusErr.message);
    }

    result.totalSolved = totalSolved;
    result.easySolved = easy;
    result.mediumSolved = medium;
    result.hardSolved = hard;
    result.status = 'SUCCESS';
    result.rawData = {
      rank: userInfo.rank ?? null,
      maxRating: userInfo.maxRating ?? null,
    };

    console.log(`[Codeforces] Parsed: Solved=${result.totalSolved} Easy=${result.easySolved} Medium=${result.mediumSolved} Hard=${result.hardSolved} Rating=${result.rating || 0}`);
    console.log(`[Codeforces] Validation passed`);

    return result;
  } catch (error) {
    console.error(`[Codeforces Fetch Error] user: ${username}:`, error.message);
    result.status = 'FAILED';
    result.errorMessage = error.message;
    return result;
  }
};

module.exports = {
  fetchCodeforcesProfile,
};
