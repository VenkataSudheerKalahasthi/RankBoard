const { fetchLeetCodeProfile } = require('./leetcodeService');
const { fetchGFGProfile } = require('./gfgService');
const { fetchCodeforcesProfile } = require('./codeforcesService');
const { fetchCodeChefProfile } = require('./codechefService');

const fetchPlatformProfile = async (platform, urlOrHandle) => {
  const norm = (platform || '').toLowerCase();

  switch (norm) {
    case 'leetcode':
      return await fetchLeetCodeProfile(urlOrHandle);
    case 'gfg':
    case 'geeksforgeeks':
      return await fetchGFGProfile(urlOrHandle);
    case 'codeforces':
      return await fetchCodeforcesProfile(urlOrHandle);
    case 'codechef':
      return await fetchCodeChefProfile(urlOrHandle);
    default:
      throw new Error(`Unsupported coding platform: ${platform}`);
  }
};

module.exports = {
  fetchPlatformProfile,
  fetchLeetCodeProfile,
  fetchGFGProfile,
  fetchCodeforcesProfile,
  fetchCodeChefProfile,
};
