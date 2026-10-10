/**
 * Authoritative Coding Platform Registry for College DSA RankBoard (Client)
 * Defines all integrated platforms, weights, and configuration settings.
 */

export const PLATFORM_REGISTRY = [
  {
    key: 'leetcode',
    name: 'LeetCode',
    shortCode: 'LC',
    enabled: true,
    isScoring: true,
    weight: 0.40,
    scoringPercentage: '40%',
  },
  {
    key: 'gfg',
    name: 'GeeksforGeeks',
    shortCode: 'GFG',
    enabled: true,
    isScoring: true,
    weight: 0.30,
    scoringPercentage: '30%',
  },
  {
    key: 'hackerrank',
    name: 'HackerRank',
    shortCode: 'HR',
    enabled: true,
    isScoring: true,
    weight: 0.30,
    scoringPercentage: '30%',
  },
  {
    key: 'codeforces',
    name: 'Codeforces',
    shortCode: 'CF',
    enabled: true,
    isScoring: false,
    weight: 0.00,
    scoringPercentage: '0%',
  },
  {
    key: 'codechef',
    name: 'CodeChef',
    shortCode: 'CC',
    enabled: true,
    isScoring: false,
    weight: 0.00,
    scoringPercentage: '0%',
  },
];

export const TOTAL_CONFIGURED_PLATFORMS = PLATFORM_REGISTRY.filter((p) => p.enabled).length;

export const getPlatformByKey = (key) => {
  const norm = (key || '').toLowerCase();
  return PLATFORM_REGISTRY.find((p) => p.key === norm) || null;
};
