/**
 * URL Parsers and Username Extractors for Coding Platforms
 */

const PLATFORM_DOMAINS = {
  LEETCODE: ['leetcode.com', 'www.leetcode.com'],
  GFG: ['geeksforgeeks.org', 'www.geeksforgeeks.org', 'auth.geeksforgeeks.org', 'practice.geeksforgeeks.org'],
  CODEFORCES: ['codeforces.com', 'www.codeforces.com'],
  CODECHEF: ['codechef.com', 'www.codechef.com'],
  HACKERRANK: ['hackerrank.com', 'www.hackerrank.com'],
};

/**
 * Extracts username from HackerRank URL or handle
 */
const parseHackerRankUrl = (input) => {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      const isHostMatch = PLATFORM_DOMAINS.HACKERRANK.some((d) => url.hostname.includes(d));
      if (!isHostMatch) return null;

      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length === 0) return null;

      if (segments[0] === 'profile' && segments[1]) {
        return segments[1].replace(/[^a-zA-Z0-9_.-]/g, '');
      }
      return segments[0].replace(/[^a-zA-Z0-9_.-]/g, '');
    } catch {
      return null;
    }
  }

  const clean = trimmed.replace(/^@/, '');
  if (/^[a-zA-Z0-9_.-]{2,60}$/.test(clean)) {
    return clean;
  }
  return null;
};

/**
 * Extracts username from LeetCode URL or handle
 */
const parseLeetCodeUrl = (input) => {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      const isHostMatch = PLATFORM_DOMAINS.LEETCODE.some((d) => url.hostname.includes(d));
      if (!isHostMatch) return null;

      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length === 0) return null;

      if (segments[0] === 'u' && segments[1]) {
        return segments[1].replace(/[^a-zA-Z0-9_-]/g, '');
      }
      return segments[0].replace(/[^a-zA-Z0-9_-]/g, '');
    } catch {
      return null;
    }
  }

  const clean = trimmed.replace(/^@/, '');
  if (/^[a-zA-Z0-9_-]{2,50}$/.test(clean)) {
    return clean;
  }
  return null;
};

/**
 * Extracts username from GeeksforGeeks URL or handle
 */
const parseGFGUrl = (input) => {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      const isHostMatch = PLATFORM_DOMAINS.GFG.some((d) => url.hostname.includes(d));
      if (!isHostMatch) return null;

      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length >= 2 && (segments[0] === 'user' || segments[0] === 'profile')) {
        return segments[1].replace(/[^a-zA-Z0-9_.-]/g, '');
      }
      if (segments.length === 1) {
        return segments[0].replace(/[^a-zA-Z0-9_.-]/g, '');
      }
      return null;
    } catch {
      return null;
    }
  }

  const clean = trimmed.replace(/^@/, '');
  if (/^[a-zA-Z0-9_.-]{2,60}$/.test(clean)) {
    return clean;
  }
  return null;
};

/**
 * Extracts username from Codeforces URL or handle
 */
const parseCodeforcesUrl = (input) => {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      const isHostMatch = PLATFORM_DOMAINS.CODEFORCES.some((d) => url.hostname.includes(d));
      if (!isHostMatch) return null;

      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length >= 2 && segments[0] === 'profile') {
        return segments[1].replace(/[^a-zA-Z0-9_.-]/g, '');
      }
      if (segments.length === 1) {
        return segments[0].replace(/[^a-zA-Z0-9_.-]/g, '');
      }
      return null;
    } catch {
      return null;
    }
  }

  const clean = trimmed.replace(/^@/, '');
  if (/^[a-zA-Z0-9_.-]{2,50}$/.test(clean)) {
    return clean;
  }
  return null;
};

/**
 * Extracts username from CodeChef URL or handle
 */
const parseCodeChefUrl = (input) => {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      const isHostMatch = PLATFORM_DOMAINS.CODECHEF.some((d) => url.hostname.includes(d));
      if (!isHostMatch) return null;

      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length >= 2 && segments[0] === 'users') {
        return segments[1].replace(/[^a-zA-Z0-9_]/g, '');
      }
      if (segments.length === 1) {
        return segments[0].replace(/[^a-zA-Z0-9_]/g, '');
      }
      return null;
    } catch {
      return null;
    }
  }

  const clean = trimmed.replace(/^@/, '');
  if (/^[a-zA-Z0-9_]{2,50}$/.test(clean)) {
    return clean;
  }
  return null;
};

const formatCanonicalUrl = (platform, username) => {
  if (!username) return '';
  switch (platform.toLowerCase()) {
    case 'leetcode':
      return `https://leetcode.com/u/${username}/`;
    case 'gfg':
    case 'geeksforgeeks':
      return `https://www.geeksforgeeks.org/user/${username}/`;
    case 'codeforces':
      return `https://codeforces.com/profile/${username}`;
    case 'codechef':
      return `https://www.codechef.com/users/${username}`;
    case 'hackerrank':
      return `https://www.hackerrank.com/profile/${username}`;
    default:
      return '';
  }
};

module.exports = {
  parseLeetCodeUrl,
  parseGFGUrl,
  parseCodeforcesUrl,
  parseCodeChefUrl,
  parseHackerRankUrl,
  formatCanonicalUrl,
};
