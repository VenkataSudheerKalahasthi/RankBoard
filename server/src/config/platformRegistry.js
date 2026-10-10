/**
 * Authoritative Coding Platform Registry for College DSA RankBoard
 * Defines all configured platform integrations, scoring weights, and status checks.
 */

const { isCodeChefInCooldown } = require('../services/platforms/codechefService');
const { isGFGInCooldown } = require('../services/platforms/gfgService');

const PLATFORM_REGISTRY = [
  {
    key: 'leetcode',
    name: 'LeetCode',
    shortCode: 'LC',
    enabled: true,
    isScoring: true,
    weight: 0.40,
    scoringPercentage: '40%',
    status: 'ACTIVE',
  },
  {
    key: 'gfg',
    name: 'GeeksforGeeks',
    shortCode: 'GFG',
    enabled: true,
    isScoring: true,
    weight: 0.30,
    scoringPercentage: '30%',
    status: 'ACTIVE',
  },
  {
    key: 'hackerrank',
    name: 'HackerRank',
    shortCode: 'HR',
    enabled: true,
    isScoring: true,
    weight: 0.30,
    scoringPercentage: '30%',
    status: 'ACTIVE',
  },
  {
    key: 'codeforces',
    name: 'Codeforces',
    shortCode: 'CF',
    enabled: true,
    isScoring: false,
    weight: 0.00,
    scoringPercentage: '0%',
    status: 'ACTIVE',
  },
  {
    key: 'codechef',
    name: 'CodeChef',
    shortCode: 'CC',
    enabled: true,
    isScoring: false,
    weight: 0.00,
    scoringPercentage: '0%',
    status: 'ACTIVE',
  },
];

/**
 * Returns the count of enabled and configured coding platforms.
 * @returns {number}
 */
const getActivePlatformsCount = () => {
  return PLATFORM_REGISTRY.filter((p) => p.enabled).length;
};

/**
 * Returns platform config with live health / cooldown status.
 * @param {string} key 
 * @returns {Object|null}
 */
const getPlatformConfig = (key) => {
  const norm = (key || '').toLowerCase();
  const config = PLATFORM_REGISTRY.find((p) => p.key === norm);
  if (!config) return null;

  let liveStatus = 'ACTIVE';
  if (norm === 'codechef' && isCodeChefInCooldown()) {
    liveStatus = 'RATE_LIMITED';
  } else if (norm === 'gfg' && isGFGInCooldown()) {
    liveStatus = 'RATE_LIMITED';
  }

  return {
    ...config,
    liveStatus,
  };
};

/**
 * Returns full platform registry with live health status
 * @returns {Array<Object>}
 */
const getPlatformRegistryWithStatus = () => {
  return PLATFORM_REGISTRY.map((p) => getPlatformConfig(p.key));
};

module.exports = {
  PLATFORM_REGISTRY,
  getActivePlatformsCount,
  getPlatformConfig,
  getPlatformRegistryWithStatus,
};
