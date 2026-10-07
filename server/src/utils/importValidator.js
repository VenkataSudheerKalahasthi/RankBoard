const {
  parseLeetCodeUrl,
  parseGFGUrl,
  parseCodeforcesUrl,
  parseCodeChefUrl,
  parseHackerRankUrl,
  formatCanonicalUrl,
} = require('./urlParsers');

/**
 * The 10 Official Required Column Definitions & Order
 */
const REQUIRED_COLUMNS = [
  {
    key: 'name',
    header: 'Name',
    aliases: ['name', 'student name', 'studentname', 'full name', 'fullname'],
    required: true,
  },
  {
    key: 'email',
    header: 'Email',
    aliases: ['email', 'mail', 'email address', 'emailaddress', 'email id', 'emailid', 'student email'],
    required: true,
  },
  {
    key: 'rollNumber',
    header: 'Roll Number',
    aliases: ['roll number', 'roll no', 'rollno', 'roll_number', 'rollnumber', 'roll', 'registration no', 'reg no'],
    required: true,
  },
  {
    key: 'branch',
    header: 'Branch',
    aliases: ['branch', 'department', 'dept', 'stream'],
    required: true,
  },
  {
    key: 'year',
    header: 'Year',
    aliases: ['year', 'class year', 'academic year', 'batch year'],
    required: true,
  },
  {
    key: 'leetcodeUrl',
    header: 'LeetCode Profile',
    aliases: ['leetcode profile', 'leetcode', 'leetcode url', 'leetcode link', 'leetcode handle', 'leetcodeurl'],
    required: false,
  },
  {
    key: 'gfgUrl',
    header: 'GeeksforGeeks Profile',
    aliases: ['geeksforgeeks profile', 'geeksforgeeks', 'gfg profile', 'gfg', 'gfg url', 'gfgurl', 'geeksforgeeks url', 'geeks for geeks profile', 'geeks for geeks'],
    required: false,
  },
  {
    key: 'hackerrankUrl',
    header: 'HackerRank Profile',
    aliases: ['hackerrank profile', 'hackerrank', 'hr profile', 'hr', 'hackerrank url', 'hackerrankurl', 'hackerrank link', 'hacker rank profile', 'hacker rank'],
    required: false,
  },
  {
    key: 'codeforcesUrl',
    header: 'Codeforces Profile',
    aliases: ['codeforces profile', 'codeforces', 'cf profile', 'cf', 'codeforces url', 'codeforcesurl', 'codeforces link'],
    required: false,
  },
  {
    key: 'codechefUrl',
    header: 'CodeChef Profile',
    aliases: ['codechef profile', 'codechef', 'cc profile', 'cc', 'codechef url', 'codechefurl', 'codechef link'],
    required: false,
  },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Normalizes a header string for alias matching
 */
const normalizeHeader = (header) => {
  if (!header || typeof header !== 'string') return '';
  return header
    .toLowerCase()
    .trim()
    .replace(/[_\-–—]/g, ' ')
    .replace(/\s+/g, ' ');
};

/**
 * Validates the headers of an uploaded spreadsheet
 * 
 * @param {Array<string>} headers - Headers found in the spreadsheet
 * @returns {{ isValid: boolean, error?: string, mapping?: Object }}
 */
const validateHeaders = (headers) => {
  if (!Array.isArray(headers) || headers.length === 0) {
    return {
      isValid: false,
      error: 'The spreadsheet contains no header row.',
    };
  }

  // Check for duplicate columns in the file
  const seenHeaders = new Set();
  for (const h of headers) {
    const norm = normalizeHeader(h);
    if (!norm) continue;
    if (seenHeaders.has(norm)) {
      return {
        isValid: false,
        error: `Duplicate column found: "${h}"`,
      };
    }
    seenHeaders.add(norm);
  }

  const mapping = {};
  const mappedIndices = new Set();

  for (const col of REQUIRED_COLUMNS) {
    let matchedHeader = null;
    let matchedIndex = -1;

    for (let i = 0; i < headers.length; i++) {
      const rawHeader = headers[i];
      const norm = normalizeHeader(rawHeader);

      if (norm === normalizeHeader(col.header) || col.aliases.includes(norm)) {
        matchedHeader = rawHeader;
        matchedIndex = i;
        break;
      }
    }

    if (matchedIndex === -1) {
      return {
        isValid: false,
        error: `Invalid Excel format. Missing column: ${col.header}`,
      };
    }

    mapping[col.key] = {
      header: matchedHeader,
      index: matchedIndex,
      canonicalHeader: col.header,
    };
    mappedIndices.add(matchedIndex);
  }

  return {
    isValid: true,
    mapping,
  };
};

/**
 * Validates parsed student rows against rules and existing database records
 * 
 * @param {Array<Object>} rows - Array of student records
 * @param {Array<Object>} existingStudents - Array of currently stored students in Supabase
 * @returns {Object} Validation summary and detailed row results
 */
const validateStudentRows = (rows, existingStudents = []) => {
  const existingEmails = new Map();
  const existingRolls = new Map();

  existingStudents.forEach((s) => {
    if (s.email) {
      existingEmails.set(s.email.toLowerCase().trim(), s);
    }
    if (s.rollNumber) {
      existingRolls.set(s.rollNumber.toLowerCase().trim(), s);
    }
  });

  const fileEmails = new Set();
  const fileRolls = new Set();

  const validatedRows = [];
  const summary = {
    totalRows: 0,
    validRows: 0,
    duplicateRows: 0,
    invalidRows: 0,
    newStudents: 0,
    existingStudents: 0,
  };

  rows.forEach((r, idx) => {
    const rowNumber = r.rowNumber || r.rowIndex || idx + 1;

    // Check if row is completely empty
    const rawValues = [
      r.name,
      r.email,
      r.rollNumber || r.roll_number || r.rollNo,
      r.branch || r.department,
      r.year,
      r.leetcodeUrl || r['LeetCode Profile'] || r.leetcode,
      r.gfgUrl || r['GeeksforGeeks Profile'] || r.gfg,
      r.hackerrankUrl || r['HackerRank Profile'] || r.hackerrank,
      r.codeforcesUrl || r['Codeforces Profile'] || r.codeforces,
      r.codechefUrl || r['CodeChef Profile'] || r.codechef,
    ];

    const isCompletelyEmpty = rawValues.every(
      (v) => v === undefined || v === null || String(v).trim() === ''
    );

    if (isCompletelyEmpty) {
      return; // Skip completely empty rows
    }

    summary.totalRows++;

    const name = (r.name || r['Name'] || '').trim();
    const email = (r.email || r['Email'] || '').trim().toLowerCase();
    const rollNumber = (r.rollNumber || r['Roll Number'] || r.roll_number || r.rollNo || '').trim();
    const branch = (r.branch || r['Branch'] || r.department || r['Department'] || '').trim();
    
    let year = parseInt(r.year !== undefined ? r.year : r['Year'], 10);
    if (isNaN(year)) {
      year = null;
    }

    const leetcodeInput = (r.leetcodeUrl || r['LeetCode Profile'] || r.leetcode || '').trim();
    const gfgInput = (r.gfgUrl || r['GeeksforGeeks Profile'] || r.gfg || '').trim();
    const hrInput = (r.hackerrankUrl || r['HackerRank Profile'] || r.hackerrank || r.hackerRankUrl || '').trim();
    const codeforcesInput = (r.codeforcesUrl || r['Codeforces Profile'] || r.codeforces || '').trim();
    const codechefInput = (r.codechefUrl || r['CodeChef Profile'] || r.codechef || '').trim();

    const errors = [];
    const warnings = [];

    // 1. Required fields
    if (!name) {
      errors.push('Missing Name');
    }
    if (!email) {
      errors.push('Missing Email');
    } else if (!EMAIL_REGEX.test(email)) {
      errors.push('Invalid Email format');
    }
    if (!rollNumber) {
      errors.push('Missing Roll Number');
    }
    if (!branch) {
      errors.push('Missing Branch');
    }
    if (year === null || year < 1 || year > 6) {
      errors.push('Invalid Year (must be 1-4)');
    }

    // 2. File-level duplicates
    if (email) {
      if (fileEmails.has(email)) {
        errors.push(`Duplicate email "${email}" in file`);
      } else {
        fileEmails.add(email);
      }
    }
    if (rollNumber) {
      const rollKey = rollNumber.toLowerCase();
      if (fileRolls.has(rollKey)) {
        errors.push(`Duplicate roll number "${rollNumber}" in file`);
      } else {
        fileRolls.add(rollKey);
      }
    }

    // 3. Platform URL parsing and validation
    let lcHandle = null;
    if (leetcodeInput) {
      lcHandle = parseLeetCodeUrl(leetcodeInput);
      if (!lcHandle) {
        errors.push('Invalid LeetCode Profile URL');
      }
    }

    let gfgHandle = null;
    if (gfgInput) {
      gfgHandle = parseGFGUrl(gfgInput);
      if (!gfgHandle) {
        errors.push('Invalid GeeksforGeeks Profile URL');
      }
    }

    let hrHandle = null;
    if (hrInput) {
      hrHandle = parseHackerRankUrl(hrInput);
      if (!hrHandle) {
        errors.push('Invalid HackerRank Profile URL');
      }
    }

    let cfHandle = null;
    if (codeforcesInput) {
      cfHandle = parseCodeforcesUrl(codeforcesInput);
      if (!cfHandle) {
        errors.push('Invalid Codeforces Profile URL');
      }
    }

    let ccHandle = null;
    if (codechefInput) {
      ccHandle = parseCodeChefUrl(codechefInput);
      if (!ccHandle) {
        errors.push('Invalid CodeChef Profile URL');
      }
    }

    // 4. DB Duplicate Detection
    const existingByEmail = email ? existingEmails.get(email) : null;
    const existingByRoll = rollNumber ? existingRolls.get(rollNumber.toLowerCase()) : null;
    const isDuplicate = !!(existingByEmail || existingByRoll);
    let duplicateReason = null;

    if (existingByEmail) {
      duplicateReason = `Existing student with email "${email}"`;
    } else if (existingByRoll) {
      duplicateReason = `Existing student with roll number "${rollNumber}"`;
    }

    const isValid = errors.length === 0;
    let status = 'VALID';

    if (!isValid) {
      status = 'INVALID';
      summary.invalidRows++;
    } else if (isDuplicate) {
      status = 'DUPLICATE';
      summary.duplicateRows++;
      summary.existingStudents++;
    } else {
      status = 'VALID';
      summary.validRows++;
      summary.newStudents++;
    }

    validatedRows.push({
      rowNumber,
      rowIndex: rowNumber,
      name,
      email,
      rollNumber,
      branch,
      department: branch,
      year: year || 4,
      leetcodeHandle: lcHandle,
      gfgHandle,
      hackerrankHandle: hrHandle,
      codeforcesHandle: cfHandle,
      codechefHandle: ccHandle,
      leetcodeUrl: lcHandle ? formatCanonicalUrl('leetcode', lcHandle) : leetcodeInput,
      gfgUrl: gfgHandle ? formatCanonicalUrl('gfg', gfgHandle) : gfgInput,
      hackerrankUrl: hrHandle ? formatCanonicalUrl('hackerrank', hrHandle) : hrInput,
      codeforcesUrl: cfHandle ? formatCanonicalUrl('codeforces', cfHandle) : codeforcesInput,
      codechefUrl: ccHandle ? formatCanonicalUrl('codechef', ccHandle) : codechefInput,
      isDuplicate,
      existingStudentId: existingByEmail?.id || existingByRoll?.id || null,
      duplicateReason,
      status,
      isValid,
      errors,
      warnings,
    });
  });

  return {
    summary,
    rows: validatedRows,
  };
};

module.exports = {
  REQUIRED_COLUMNS,
  validateHeaders,
  validateStudentRows,
  normalizeHeader,
};
