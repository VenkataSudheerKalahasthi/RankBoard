/**
 * Helper utilities for Coding Platform Handle and URL Normalization
 * and Cross-Account Global Duplicate Detection
 */

const {
  parseLeetCodeUrl,
  parseGFGUrl,
  parseCodeforcesUrl,
  parseCodeChefUrl,
  parseHackerRankUrl,
  formatCanonicalUrl,
} = require('./urlParsers');

/**
 * Standard supported platforms
 */
const SUPPORTED_PLATFORMS = ['leetcode', 'gfg', 'hackerrank', 'codeforces', 'codechef'];

const PLATFORM_LABELS = {
  leetcode: 'LeetCode',
  gfg: 'GeeksforGeeks',
  hackerrank: 'HackerRank',
  codeforces: 'Codeforces',
  codechef: 'CodeChef',
};

/**
 * Normalizes a platform handle according to platform case-sensitivity rules.
 * - LeetCode: Case-insensitive (case-preserving in UI, but unique case-insensitively)
 * - GeeksforGeeks: Case-insensitive
 * - HackerRank: Case-insensitive
 * - Codeforces: Case-insensitive for handle login/uniqueness
 * - CodeChef: Case-insensitive for handle login/uniqueness
 *
 * @param {string} platform - leetcode | gfg | hackerrank | codeforces | codechef
 * @param {string} rawInput - profile URL or raw username/handle
 * @returns {{ platform: string, username: string, canonicalUrl: string, normalizedKey: string } | null}
 */
const normalizePlatformIdentity = (platform, rawInput) => {
  if (!platform || !rawInput || typeof rawInput !== 'string') return null;

  const plat = platform.toLowerCase().trim();
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  let username = null;
  switch (plat) {
    case 'leetcode':
      username = parseLeetCodeUrl(trimmed);
      break;
    case 'gfg':
    case 'geeksforgeeks':
      username = parseGFGUrl(trimmed);
      break;
    case 'hackerrank':
      username = parseHackerRankUrl(trimmed);
      break;
    case 'codeforces':
      username = parseCodeforcesUrl(trimmed);
      break;
    case 'codechef':
      username = parseCodeChefUrl(trimmed);
      break;
    default:
      return null;
  }

  if (!username) return null;

  const normalizedKey = username.toLowerCase().trim();
  const canonicalUrl = formatCanonicalUrl(plat === 'geeksforgeeks' ? 'gfg' : plat, username);

  return {
    platform: plat === 'geeksforgeeks' ? 'gfg' : plat,
    username,
    canonicalUrl,
    normalizedKey,
  };
};

/**
 * Masks an email address for public/cross-student privacy protection.
 * e.g., "sudheer123@gmail.com" -> "s********@gmail.com"
 * e.g., "ab@domain.com" -> "a*@domain.com"
 * e.g., "a@domain.com" -> "*@domain.com"
 *
 * @param {string} email
 * @returns {string}
 */
const maskEmail = (email) => {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return '********@domain.com';
  }

  const [localPart, domainPart] = email.split('@');
  if (!localPart || localPart.length <= 1) {
    return `*@${domainPart}`;
  }

  const firstChar = localPart[0];
  const maskedLocal = firstChar + '*'.repeat(Math.max(1, localPart.length - 1));
  return `${maskedLocal}@${domainPart}`;
};

/**
 * Checks submitted platform profile links against active students in the database
 * to detect any cross-account duplicate platform identities.
 *
 * @param {Object} params
 * @param {string} params.currentStudentId - The ID of the student submitting links (to ignore their own existing links)
 * @param {string} [params.currentClerkUserId] - Optional clerk user ID of current student
 * @param {string} [params.currentEmail] - Optional current student's registered email
 * @param {Object} params.submittedLinks - { leetcodeUrl, gfgUrl, hackerrankUrl, codeforcesUrl, codechefUrl }
 * @param {Array<Object>} params.allActiveStudents - Array of all active student records with their platform profiles
 * @returns {{
 *   hasConflict: boolean,
 *   conflicts: Array<{
 *     platform: string,
 *     platformLabel: string,
 *     username: string,
 *     submittedUrl: string,
 *     existingOwnerId: string,
 *     existingOwnerName: string,
 *     existingOwnerMaskedEmail: string,
 *     isCurrentStudentSelf: boolean,
 *     message: string
 *   }>,
 *   validIdentities: Object
 * }}
 */
const checkDuplicatePlatformIdentities = ({
  currentStudentId,
  currentClerkUserId = null,
  currentEmail = null,
  submittedLinks = {},
  allActiveStudents = [],
}) => {
  const normalizedCurrentId = currentStudentId ? String(currentStudentId).toLowerCase().trim() : null;
  const normalizedCurrentClerk = currentClerkUserId ? String(currentClerkUserId).toLowerCase().trim() : null;
  const normalizedCurrentEmail = currentEmail ? String(currentEmail).toLowerCase().trim() : null;

  // Build a lookup index of all active students' platform identities
  // Key: `${platform}:${normalizedKey}` -> { studentId, name, email, clerkUserId }
  const platformIndex = new Map();

  for (const student of allActiveStudents) {
    if (student.accountStatus === 'DISABLED') continue;

    const sId = student.id ? String(student.id) : null;
    const sClerk = student.clerkUserId ? String(student.clerkUserId) : null;
    const sEmail = student.email ? String(student.email).toLowerCase().trim() : null;
    const sName = student.name || 'Student';

    const platforms = student.platforms || {};
    for (const plat of SUPPORTED_PLATFORMS) {
      const platObj = platforms[plat];
      const username = platObj?.username;
      if (username && typeof username === 'string' && username.trim()) {
        const normKey = `${plat}:${username.toLowerCase().trim()}`;
        if (!platformIndex.has(normKey)) {
          platformIndex.set(normKey, {
            studentId: sId,
            clerkUserId: sClerk,
            email: sEmail,
            name: sName,
            username,
          });
        }
      }
    }
  }

  const conflicts = [];
  const validIdentities = {};

  const inputKeys = {
    leetcode: submittedLinks.leetcodeUrl !== undefined ? submittedLinks.leetcodeUrl : submittedLinks.leetcode,
    gfg: submittedLinks.gfgUrl !== undefined ? submittedLinks.gfgUrl : submittedLinks.gfg,
    hackerrank:
      submittedLinks.hackerrankUrl !== undefined
        ? submittedLinks.hackerrankUrl
        : (submittedLinks.hackerRankUrl !== undefined ? submittedLinks.hackerRankUrl : submittedLinks.hackerrank),
    codeforces: submittedLinks.codeforcesUrl !== undefined ? submittedLinks.codeforcesUrl : submittedLinks.codeforces,
    codechef: submittedLinks.codechefUrl !== undefined ? submittedLinks.codechefUrl : submittedLinks.codechef,
  };

  for (const [platform, rawUrl] of Object.entries(inputKeys)) {
    if (rawUrl === undefined || rawUrl === null || rawUrl === '') {
      continue;
    }

    const parsed = normalizePlatformIdentity(platform, rawUrl);
    if (!parsed) continue; // invalid format handled separately by URL format validators

    const indexKey = `${parsed.platform}:${parsed.normalizedKey}`;
    const existing = platformIndex.get(indexKey);

    if (existing) {
      // Check if the existing owner is the CURRENT authenticated student
      const isSameStudent =
        (normalizedCurrentId && existing.studentId && String(existing.studentId).toLowerCase().trim() === normalizedCurrentId) ||
        (normalizedCurrentClerk && existing.clerkUserId && String(existing.clerkUserId).toLowerCase().trim() === normalizedCurrentClerk) ||
        (normalizedCurrentEmail && existing.email && existing.email === normalizedCurrentEmail);

      if (isSameStudent) {
        // It's the same student's own handle, allowed!
        validIdentities[platform] = parsed;
      } else {
        // Duplicate owned by ANOTHER student!
        const maskedEmail = maskEmail(existing.email);
        const platformLabel = PLATFORM_LABELS[platform] || platform;

        conflicts.push({
          platform,
          platformLabel,
          username: parsed.username,
          submittedUrl: rawUrl,
          existingOwnerId: existing.studentId,
          existingOwnerName: existing.name,
          existingOwnerMaskedEmail: maskedEmail,
          isCurrentStudentSelf: false,
          message: `This ${platformLabel} profile is already registered with another account (${maskedEmail}).`,
        });
      }
    } else {
      validIdentities[platform] = parsed;
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
    validIdentities,
  };
};

module.exports = {
  SUPPORTED_PLATFORMS,
  PLATFORM_LABELS,
  normalizePlatformIdentity,
  maskEmail,
  checkDuplicatePlatformIdentities,
};

