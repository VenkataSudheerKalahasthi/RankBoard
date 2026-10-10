const {
  parseLeetCodeUrl,
  parseGFGUrl,
  parseCodeforcesUrl,
  parseCodeChefUrl,
  parseHackerRankUrl,
  formatCanonicalUrl,
} = require('./urlParsers');

const ALLOWED_PLATFORMS = ['leetcode', 'gfg', 'hackerrank', 'codeforces', 'codechef'];

const PLATFORM_DISPLAY_NAMES = {
  leetcode: 'LeetCode',
  gfg: 'GeeksforGeeks',
  hackerrank: 'HackerRank',
  codeforces: 'Codeforces',
  codechef: 'CodeChef',
};

const IDENTIFIER_ALIASES = {
  email: ['email', 'mail', 'email address', 'emailaddress', 'email id', 'emailid', 'student email', 'student mail'],
  rollNumber: ['roll number', 'roll no', 'rollno', 'roll_number', 'rollnumber', 'roll', 'registration no', 'reg no', 'htno', 'hall ticket'],
};

const PLATFORM_URL_ALIASES = {
  leetcode: ['leetcode profile', 'leetcode url', 'leetcode link', 'leetcode handle', 'leetcode', 'leetcode profile url'],
  gfg: ['geeksforgeeks profile', 'geeksforgeeks url', 'gfg profile', 'gfg url', 'geeksforgeeks', 'gfg', 'geeks for geeks profile', 'geeks for geeks', 'gfg link'],
  hackerrank: ['hackerrank profile', 'hackerrank url', 'hackerrank link', 'hackerrank handle', 'hackerrank', 'hr profile', 'hr url', 'hr', 'hacker rank profile', 'hacker rank'],
  codeforces: ['codeforces profile', 'codeforces url', 'codeforces link', 'codeforces handle', 'codeforces', 'cf profile', 'cf url', 'cf', 'codeforces link'],
  codechef: ['codechef profile', 'codechef url', 'codechef link', 'codechef handle', 'codechef', 'cc profile', 'cc url', 'cc', 'codechef link'],
};

const normalizeStr = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/[_\-–—]/g, ' ')
    .replace(/\s+/g, ' ');
};

const parsePlatformUrl = (platform, url) => {
  if (!url || typeof url !== 'string') return null;
  const p = platform.toLowerCase();
  switch (p) {
    case 'leetcode':
      return parseLeetCodeUrl(url);
    case 'gfg':
    case 'geeksforgeeks':
      return parseGFGUrl(url);
    case 'hackerrank':
      return parseHackerRankUrl(url);
    case 'codeforces':
      return parseCodeforcesUrl(url);
    case 'codechef':
      return parseCodeChefUrl(url);
    default:
      return null;
  }
};

/**
 * Extracts the existing URL for a specific platform from a formatted student record
 */
const getExistingPlatformUrl = (student, platformKey) => {
  if (!student) return '';
  const key = (platformKey || '').toLowerCase().trim();

  let pObj = student.platforms?.[key];
  if (!pObj && key === 'gfg') pObj = student.platforms?.geeksforgeeks;
  if (!pObj && key === 'hackerrank') pObj = student.platforms?.hackerRank;
  if (!pObj && key === 'codeforces') pObj = student.platforms?.codeForces;
  if (!pObj && key === 'codechef') pObj = student.platforms?.codeChef;

  const directUrl =
    student[`${key}Url`] ||
    student[`${key}_url`] ||
    student[`${key}Profile`] ||
    (key === 'gfg' && (student.geeksforgeeksUrl || student.geeksforgeeks_url || student.gfgProfileUrl)) ||
    (key === 'hackerrank' && (student.hackerRankUrl || student.hackerRankProfileUrl)) ||
    (key === 'codeforces' && (student.codeForcesUrl || student.codeForcesProfileUrl)) ||
    (key === 'codechef' && (student.codeChefUrl || student.codeChefProfileUrl));

  const candidate = pObj?.profileUrl || directUrl || '';
  return typeof candidate === 'string' ? candidate.trim() : '';
};

/**
 * Validates header columns for Bulk Platform URL Update mode
 */
const validateBulkPlatformUrlHeaders = (headers, selectedPlatform) => {
  if (!Array.isArray(headers) || headers.length === 0) {
    return {
      isValid: false,
      error: 'Spreadsheet contains no header row.',
    };
  }

  const pKey = (selectedPlatform || '').toLowerCase().trim();
  if (!ALLOWED_PLATFORMS.includes(pKey)) {
    return {
      isValid: false,
      error: `Invalid platform: "${selectedPlatform}". Supported platforms: ${ALLOWED_PLATFORMS.join(', ')}`,
    };
  }

  const normHeaders = headers.map((h) => normalizeStr(String(h)));

  // 1. Detect Identifier Column (Email or Roll Number)
  let identifierType = null;
  let identifierIndex = -1;
  let identifierHeader = '';

  for (let i = 0; i < normHeaders.length; i++) {
    const h = normHeaders[i];
    if (IDENTIFIER_ALIASES.email.includes(h)) {
      identifierType = 'email';
      identifierIndex = i;
      identifierHeader = headers[i];
      break;
    }
  }

  // If no email column found, check for roll number
  if (identifierIndex === -1) {
    for (let i = 0; i < normHeaders.length; i++) {
      const h = normHeaders[i];
      if (IDENTIFIER_ALIASES.rollNumber.includes(h)) {
        identifierType = 'rollNumber';
        identifierIndex = i;
        identifierHeader = headers[i];
        break;
      }
    }
  }

  if (identifierIndex === -1) {
    return {
      isValid: false,
      error: 'Missing required identifier column. Please provide an "Email" or "Roll Number" column.',
    };
  }

  // 2. Detect Platform URL Column
  const targetAliases = PLATFORM_URL_ALIASES[pKey] || [];
  let urlIndex = -1;
  let urlHeader = '';

  for (let i = 0; i < normHeaders.length; i++) {
    const h = normHeaders[i];
    if (targetAliases.includes(h) || h === pKey || h.includes(pKey)) {
      urlIndex = i;
      urlHeader = headers[i];
      break;
    }
  }

  if (urlIndex === -1) {
    const pName = PLATFORM_DISPLAY_NAMES[pKey] || pKey;
    return {
      isValid: false,
      error: `Missing required column for ${pName}. Accepted column headers include: "${pName} URL", "${pName} Profile", or "${pName}".`,
    };
  }

  return {
    isValid: true,
    mapping: {
      identifierType,
      identifierIndex,
      identifierHeader,
      urlIndex,
      urlHeader,
      platform: pKey,
      platformName: PLATFORM_DISPLAY_NAMES[pKey] || pKey,
    },
  };
};

/**
 * Validates rows for Bulk Platform URL Update mode
 * 
 * @param {Array<Object>} rows - Array of parsed row objects or tuples
 * @param {string} platform - The selected platform (e.g. 'hackerrank')
 * @param {Array<Object>} existingStudents - All students in DB
 * @param {string} [identifierType='auto'] - 'email', 'rollNumber', or 'auto'
 */
const validateBulkPlatformUrlRows = (rows, platform, existingStudents = [], identifierType = 'auto') => {
  const pKey = (platform || '').toLowerCase().trim();
  if (!ALLOWED_PLATFORMS.includes(pKey)) {
    throw new Error(`Unsupported platform: "${platform}". Must be one of: ${ALLOWED_PLATFORMS.join(', ')}`);
  }

  // Index existing students by email and roll number
  // Also track duplicate/ambiguous entries in the DB
  const emailMap = new Map();
  const rollMap = new Map();
  const ambiguousEmails = new Set();
  const ambiguousRolls = new Set();

  existingStudents.forEach((student) => {
    if (student.email) {
      const eNorm = student.email.toLowerCase().trim();
      if (emailMap.has(eNorm)) {
        ambiguousEmails.add(eNorm);
      } else {
        emailMap.set(eNorm, student);
      }
    }
    if (student.rollNumber) {
      const rNorm = student.rollNumber.toLowerCase().trim();
      if (rollMap.has(rNorm)) {
        ambiguousRolls.add(rNorm);
      } else {
        rollMap.set(rNorm, student);
      }
    }
  });

  const fileIdentifiers = new Set();
  const validatedRows = [];

  const summary = {
    totalRows: 0,
    validRows: 0,
    matchedExisting: 0,
    readyToUpdate: 0,
    replacements: 0,
    unchanged: 0,
    invalidUrls: 0,
    studentsNotFound: 0,
    missingValues: 0,
    duplicatesInFile: 0,
    ambiguousMatches: 0,
    failedRows: 0,
  };

  rows.forEach((r, idx) => {
    const rowNumber = r.rowNumber || r.rowIndex || idx + 1;

    // Extract identifier and URL from object
    let rawIdentifier = '';
    let rawUrl = '';

    if (r.identifier !== undefined) {
      rawIdentifier = String(r.identifier || '').trim();
    } else if (r.email !== undefined && r.email !== '') {
      rawIdentifier = String(r.email || '').trim();
    } else if (r.rollNumber !== undefined && r.rollNumber !== '') {
      rawIdentifier = String(r.rollNumber || '').trim();
    } else if (r.mail !== undefined) {
      rawIdentifier = String(r.mail || '').trim();
    } else if (r.rollNo !== undefined) {
      rawIdentifier = String(r.rollNo || '').trim();
    }

    if (r.url !== undefined) {
      rawUrl = String(r.url || '').trim();
    } else if (r.profileUrl !== undefined) {
      rawUrl = String(r.profileUrl || '').trim();
    } else if (r[`${pKey}Url`] !== undefined) {
      rawUrl = String(r[`${pKey}Url`] || '').trim();
    } else if (r[pKey] !== undefined) {
      rawUrl = String(r[pKey] || '').trim();
    } else {
      // Check alias keys
      const aliases = PLATFORM_URL_ALIASES[pKey] || [];
      for (const a of aliases) {
        if (r[a] !== undefined) {
          rawUrl = String(r[a] || '').trim();
          break;
        }
      }
    }

    // Skip completely empty rows
    if (!rawIdentifier && !rawUrl) {
      return;
    }

    summary.totalRows++;

    const errors = [];
    const warnings = [];
    let status = 'READY_TO_UPDATE'; // 'READY_TO_UPDATE' | 'REPLACEMENT' | 'UNCHANGED' | 'STUDENT_NOT_FOUND' | 'INVALID_URL' | 'MISSING_REQUIRED_VALUE' | 'AMBIGUOUS_MATCH' | 'DUPLICATE_IN_FILE'
    let changeType = 'NONE'; // 'NEW_LINK' | 'REPLACEMENT' | 'IDENTICAL' | 'NONE'

    // 1. Check Missing Identifier
    if (!rawIdentifier) {
      errors.push('Missing student identifier (Email or Roll Number)');
      status = 'MISSING_REQUIRED_VALUE';
      summary.missingValues++;
      summary.failedRows++;

      validatedRows.push({
        rowNumber,
        identifier: '—',
        submittedUrl: rawUrl || '—',
        platform: pKey,
        status,
        changeType,
        isValid: false,
        student: null,
        errors,
        warnings,
        reason: errors.join('; '),
      });
      return;
    }

    // Check In-File Duplicate
    const idKey = rawIdentifier.toLowerCase();
    if (fileIdentifiers.has(idKey)) {
      errors.push(`Duplicate identifier "${rawIdentifier}" within uploaded file`);
      status = 'DUPLICATE_IN_FILE';
      summary.duplicatesInFile++;
      summary.failedRows++;

      validatedRows.push({
        rowNumber,
        identifier: rawIdentifier,
        submittedUrl: rawUrl || '—',
        platform: pKey,
        status,
        changeType,
        isValid: false,
        student: null,
        errors,
        warnings,
        reason: errors.join('; '),
      });
      return;
    }
    fileIdentifiers.add(idKey);

    // 2. Check Missing URL
    if (!rawUrl) {
      errors.push(`Missing platform URL for ${PLATFORM_DISPLAY_NAMES[pKey] || pKey}`);
      status = 'MISSING_REQUIRED_VALUE';
      summary.missingValues++;
      summary.failedRows++;

      validatedRows.push({
        rowNumber,
        identifier: rawIdentifier,
        submittedUrl: '—',
        platform: pKey,
        status,
        changeType,
        isValid: false,
        student: null,
        errors,
        warnings,
        reason: errors.join('; '),
      });
      return;
    }

    // 3. Match Existing Student (Safely & Unambiguously)
    const isEmail = rawIdentifier.includes('@');
    let matchedStudent = null;
    let isAmbiguous = false;

    if (identifierType === 'email' || (identifierType === 'auto' && isEmail)) {
      if (ambiguousEmails.has(idKey)) {
        isAmbiguous = true;
      } else {
        matchedStudent = emailMap.get(idKey) || null;
      }
    } else if (identifierType === 'rollNumber' || (identifierType === 'auto' && !isEmail)) {
      if (ambiguousRolls.has(idKey)) {
        isAmbiguous = true;
      } else {
        matchedStudent = rollMap.get(idKey) || null;
      }
    } else {
      // Try email first, then roll number
      if (emailMap.has(idKey)) {
        matchedStudent = emailMap.get(idKey);
      } else if (rollMap.has(idKey)) {
        matchedStudent = rollMap.get(idKey);
      }
    }

    if (isAmbiguous) {
      errors.push(`Ambiguous match: Multiple student records in database share identifier "${rawIdentifier}"`);
      status = 'AMBIGUOUS_MATCH';
      summary.ambiguousMatches++;
      summary.failedRows++;

      validatedRows.push({
        rowNumber,
        identifier: rawIdentifier,
        submittedUrl: rawUrl,
        platform: pKey,
        status,
        changeType,
        isValid: false,
        student: null,
        errors,
        warnings,
        reason: errors.join('; '),
      });
      return;
    }

    if (!matchedStudent) {
      errors.push(`Student not found: No existing record matches "${rawIdentifier}"`);
      status = 'STUDENT_NOT_FOUND';
      summary.studentsNotFound++;
      summary.failedRows++;

      validatedRows.push({
        rowNumber,
        identifier: rawIdentifier,
        submittedUrl: rawUrl,
        platform: pKey,
        status,
        changeType,
        isValid: false,
        student: null,
        errors,
        warnings,
        reason: errors.join('; '),
      });
      return;
    }

    summary.matchedExisting++;

    // 4. Validate the Selected Platform URL
    const parsedHandle = parsePlatformUrl(pKey, rawUrl);
    if (!parsedHandle) {
      errors.push(`Invalid URL: "${rawUrl}" is not a valid ${PLATFORM_DISPLAY_NAMES[pKey] || pKey} profile URL or handle`);
      status = 'INVALID_URL';
      summary.invalidUrls++;
      summary.failedRows++;

      validatedRows.push({
        rowNumber,
        identifier: rawIdentifier,
        submittedUrl: rawUrl,
        platform: pKey,
        status,
        changeType,
        isValid: false,
        student: {
          id: matchedStudent.id,
          name: matchedStudent.name,
          email: matchedStudent.email,
          rollNumber: matchedStudent.rollNumber,
          department: matchedStudent.department,
        },
        errors,
        warnings,
        reason: errors.join('; '),
      });
      return;
    }

    // 5. Compare with Existing Platform URL
    const canonicalNewUrl = formatCanonicalUrl(pKey, parsedHandle);
    const existingUrl = getExistingPlatformUrl(matchedStudent, pKey);
    const existingHandle = parsePlatformUrl(pKey, existingUrl);

    if (!existingUrl || !existingHandle) {
      status = 'READY_TO_UPDATE';
      changeType = 'NEW_LINK';
      summary.readyToUpdate++;
      summary.validRows++;
    } else if (existingHandle.toLowerCase() === parsedHandle.toLowerCase()) {
      status = 'UNCHANGED';
      changeType = 'IDENTICAL';
      summary.unchanged++;
      summary.validRows++;
      warnings.push(`Identical profile: Student already has this ${PLATFORM_DISPLAY_NAMES[pKey] || pKey} handle (@${existingHandle})`);
    } else {
      status = 'REPLACEMENT';
      changeType = 'REPLACEMENT';
      summary.readyToUpdate++;
      summary.replacements++;
      summary.validRows++;
      warnings.push(`Will replace existing profile (@${existingHandle}) with new profile (@${parsedHandle})`);
    }

    validatedRows.push({
      rowNumber,
      identifier: rawIdentifier,
      submittedUrl: rawUrl,
      canonicalUrl: canonicalNewUrl,
      handle: parsedHandle,
      platform: pKey,
      status,
      changeType,
      isReplacement: changeType === 'REPLACEMENT',
      isUnchanged: changeType === 'IDENTICAL',
      isValid: true,
      studentId: matchedStudent.id,
      student: {
        id: matchedStudent.id,
        name: matchedStudent.name,
        email: matchedStudent.email,
        rollNumber: matchedStudent.rollNumber,
        department: matchedStudent.department,
        year: matchedStudent.year,
      },
      existingUrl: existingUrl || null,
      existingHandle: existingHandle || null,
      newUrl: canonicalNewUrl,
      newHandle: parsedHandle,
      errors: [],
      warnings,
      reason: warnings.join('; ') || 'Ready to update',
    });
  });

  return {
    platform: pKey,
    platformName: PLATFORM_DISPLAY_NAMES[pKey] || pKey,
    summary,
    rows: validatedRows,
  };
};

module.exports = {
  ALLOWED_PLATFORMS,
  PLATFORM_DISPLAY_NAMES,
  IDENTIFIER_ALIASES,
  PLATFORM_URL_ALIASES,
  validateBulkPlatformUrlHeaders,
  validateBulkPlatformUrlRows,
  parsePlatformUrl,
  getExistingPlatformUrl,
};
