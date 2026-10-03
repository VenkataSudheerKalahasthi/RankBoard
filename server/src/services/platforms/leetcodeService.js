const axios = require('axios');
const { parseLeetCodeUrl } = require('../../utils/urlParsers');

/**
 * Fetches actual statistics from LeetCode public GraphQL API
 * @param {string} input - LeetCode profile URL or handle
 * @returns {Promise<Object>} Normalized statistics object
 */
const fetchLeetCodeProfile = async (input) => {
  const username = parseLeetCodeUrl(input);

  const result = {
    platform: 'leetcode',
    username: username || input,
    profileUrl: username ? `https://leetcode.com/u/${username}/` : input,
    totalSolved: null,
    easySolved: null,
    mediumSolved: null,
    hardSolved: null,
    rating: null,
    contests: null,
    streak: null,
    status: 'PENDING',
    fetchedAt: new Date().toISOString(),
    errorMessage: null,
    rawData: null,
  };

  if (!username) {
    result.status = 'FAILED';
    result.errorMessage = 'Invalid LeetCode URL or handle format';
    return result;
  }

  try {
    const graphqlQuery = {
      query: `
        query getUserProfile($username: String!) {
          matchedUser(username: $username) {
            username
            submitStatsGlobal {
              acSubmissionNum {
                difficulty
                count
              }
            }
            profile {
              ranking
              reputation
            }
            userCalendar {
              streak
              totalActiveDays
            }
          }
          userContestRanking(username: $username) {
            attendedContestsCount
            rating
            globalRanking
            topPercentage
          }
        }
      `,
      variables: { username },
    };

    const response = await axios.post('https://leetcode.com/graphql', graphqlQuery, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': `https://leetcode.com/${username}/`,
      },
      timeout: 10000,
    });

    const data = response.data?.data;
    if (!data || !data.matchedUser) {
      result.status = 'FAILED';
      result.errorMessage = `User "${username}" not found on LeetCode`;
      return result;
    }

    const matchedUser = data.matchedUser;
    const acSubmissions = matchedUser.submitStatsGlobal?.acSubmissionNum || [];

    let total = 0;
    let easy = 0;
    let medium = 0;
    let hard = 0;

    acSubmissions.forEach((item) => {
      if (item.difficulty === 'All') total = item.count;
      else if (item.difficulty === 'Easy') easy = item.count;
      else if (item.difficulty === 'Medium') medium = item.count;
      else if (item.difficulty === 'Hard') hard = item.count;
    });

    const contestRanking = data.userContestRanking;

    result.totalSolved = total;
    result.easySolved = easy;
    result.mediumSolved = medium;
    result.hardSolved = hard;
    result.rating = contestRanking?.rating ? Math.round(contestRanking.rating) : null;
    result.contests = contestRanking?.attendedContestsCount ?? null;
    result.streak = matchedUser.userCalendar?.streak ?? null;
    result.status = 'SUCCESS';
    result.rawData = { ranking: matchedUser.profile?.ranking };

    return result;
  } catch (error) {
    console.error(`[LeetCode Fetch Error] user: ${username}:`, error.message);
    result.status = 'FAILED';
    result.errorMessage = error.message;
    return result;
  }
};

module.exports = {
  fetchLeetCodeProfile,
};
