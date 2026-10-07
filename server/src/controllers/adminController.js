const { config } = require('../config/env');
const { fetchPlatformProfile } = require('../services/platforms');
const {
  evaluateStudentScores,
  calculateLeetCodeScore,
  calculateGFGScore,
  calculateCodeforcesScore,
  calculateCodeChefScore,
  calculateFinalScore,
} = require('../services/scoring');
const { SCORING_WEIGHTS } = require('../services/scoring/scoringConfig');
const { recalculateCollegeRankings } = require('../services/ranking/rankingEngine');
const { syncStudentPlatforms } = require('../services/syncService');
const { generateAiInsights, invalidateInsightsCache } = require('../services/ai/insightsService');
const { logAudit, createAdminNotification, AUDIT_ACTIONS } = require('../utils/auditLogger');
const {
  parseLeetCodeUrl,
  parseGFGUrl,
  parseCodeforcesUrl,
  parseCodeChefUrl,
  parseHackerRankUrl,
  formatCanonicalUrl,
} = require('../utils/urlParsers');
const XLSX = require('xlsx');
const {
  validateHeaders,
  validateStudentRows,
  REQUIRED_COLUMNS,
} = require('../utils/importValidator');
const {
  getAllStudents,
  getStudentById: getStudentByIdFromRepo,
  upsertStudent,
  updateStudent: updateStudentInRepo,
  deleteStudent: deleteStudentInRepo,
  upsertAdmin,
  getAllAdmins,
  getAuditLogs: getAuditLogsFromRepo,
  getNotifications: getNotificationsFromRepo,
  markNotificationRead: markNotificationReadInRepo,
  clearNotifications: clearNotificationsInRepo,
  insertImportHistory,
  getImportHistory: getImportHistoryFromRepo,
  insertScoreAdjustment,
  getScoreAdjustments: getScoreAdjustmentsFromRepo,
  getSystemSettings,
  updateSystemSettings: updateSystemSettingsInRepo,
} = require('../supabase/supabaseRepository');

// Global in-memory sync job tracking
let activeSyncJob = null;

// ==============================================================================
// 1. AUTHENTICATION & PROFILE
// ==============================================================================

const getAdminProfile = async (req, res, next) => {
  try {
    const admin = req.admin;

    // Update last login
    if (admin.userId) {
      await upsertAdmin({
        id: admin.userId,
        userId: admin.userId,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        status: 'ACTIVE',
        photo: admin.photo || '',
        lastLoginAt: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      admin: {
        userId: admin.userId,
        email: admin.email,
        name: admin.name,
        photo: admin.photo,
        role: admin.role,
        collegeId: config.COLLEGE_ID,
        collegeName: config.COLLEGE_NAME,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==============================================================================
// 2. DASHBOARD METRICS & PLATFORM HELPERS
// ==============================================================================

const PLATFORM_KEYS = ['leetcode', 'gfg', 'hackerrank', 'codeforces', 'codechef'];

const getStudentPlatformUrl = (student, platformKey) => {
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
    student[`${key}_profile`] ||
    (key === 'gfg' && (student.geeksforgeeksUrl || student.geeksforgeeks_url || student.gfgProfileUrl)) ||
    (key === 'hackerrank' && (student.hackerRankUrl || student.hackerRankProfileUrl)) ||
    (key === 'codeforces' && (student.codeForcesUrl || student.codeForcesProfileUrl)) ||
    (key === 'codechef' && (student.codeChefUrl || student.codeChefProfileUrl));

  const candidate = pObj?.profileUrl || directUrl || pObj?.username || '';
  return typeof candidate === 'string' ? candidate.trim() : '';
};

const isPlatformLinked = (student, platformKey) => {
  const url = getStudentPlatformUrl(student, platformKey);
  return url.length > 0;
};

const isPlatformMissing = (student, platformKey) => {
  return !isPlatformLinked(student, platformKey);
};

const areAllPlatformsLinked = (student) => {
  return PLATFORM_KEYS.every((p) => isPlatformLinked(student, p));
};

const isStudentIncomplete = (student) => {
  if (!student) return true;
  const isMissing = (val) => val === undefined || val === null || String(val).trim().length === 0;

  // Personal Info (Name, Email, Roll Number, Branch/Department, Year)
  if (isMissing(student.name)) return true;
  if (isMissing(student.email)) return true;
  if (isMissing(student.rollNumber || student.roll_number)) return true;
  if (isMissing(student.department || student.branch)) return true;
  if (isMissing(student.year) || student.year === 0 || student.year === '0') return true;

  // Platform Links (All 5 must be linked)
  for (const plat of PLATFORM_KEYS) {
    if (!isPlatformLinked(student, plat)) {
      return true;
    }
  }

  return false;
};

const getDashboardStats = async (req, res, next) => {
  try {
    const students = await getAllStudents();

    let totalStudents = 0;
    let activeStudents = 0;
    let disabledStudents = 0;
    let profilesComplete = 0;
    let profilesIncomplete = 0;
    let studentsWithScores = 0;
    let studentsWithoutScores = 0;

    let hackerRankAdded = 0;
    let hackerRankMissing = 0;

    let successfulSyncs = 0;
    let failedSyncs = 0;
    let pendingSyncs = 0;

    let totalProblemsSolved = 0;
    let totalLeetcodeSolved = 0;
    let totalGFGSolved = 0;
    let totalCodeforcesSolved = 0;
    let totalCodechefSolved = 0;
    let totalHackerrankSolved = 0;

    const platformConnectedCounts = {
      leetcode: 0,
      gfg: 0,
      codeforces: 0,
      codechef: 0,
      hackerrank: 0,
    };

    const departmentStats = {};
    const yearStats = {};

    let totalScoreSum = 0;
    let highestScore = 0;
    let topScorer = null;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    let recentlyAddedCount = 0;

    students.forEach((data) => {
      totalStudents++;

      if (data.accountStatus === 'DISABLED') {
        disabledStudents++;
      } else {
        activeStudents++;
      }

      if (data.profileCompleted) {
        profilesComplete++;
      } else {
        profilesIncomplete++;
      }

      const score = data.finalScore || 0;
      if (score > 0) {
        studentsWithScores++;
        totalScoreSum += score;
        if (score > highestScore) {
          highestScore = score;
          topScorer = {
            id: data.id,
            name: data.name,
            rollNumber: data.rollNumber,
            department: data.department,
            score,
            rank: data.rank || 1,
          };
        }
      } else {
        studentsWithoutScores++;
      }

      // Department aggregation
      const dept = data.department || 'Unknown';
      if (!departmentStats[dept]) {
        departmentStats[dept] = { total: 0, active: 0, totalScore: 0, totalSolved: 0 };
      }
      departmentStats[dept].total++;
      if (data.accountStatus !== 'DISABLED') departmentStats[dept].active++;
      departmentStats[dept].totalScore += score;

      // Year aggregation
      const yr = data.year ? `Year ${data.year}` : 'Unknown';
      if (!yearStats[yr]) {
        yearStats[yr] = { total: 0, active: 0, totalScore: 0 };
      }
      yearStats[yr].total++;
      if (data.accountStatus !== 'DISABLED') yearStats[yr].active++;
      yearStats[yr].totalScore += score;

      // Platform metrics using standard isPlatformLinked
      const platforms = data.platforms || {};
      const stats = data.platformStats || {};

      PLATFORM_KEYS.forEach((plat) => {
        if (isPlatformLinked(data, plat)) {
          platformConnectedCounts[plat]++;
        }
        const pConf = platforms[plat];
        if (pConf && (pConf.profileUrl || pConf.username)) {
          if (pConf.status === 'SUCCESS') successfulSyncs++;
          else if (pConf.status === 'FAILED') failedSyncs++;
          else pendingSyncs++;
        }
      });

      if (isPlatformLinked(data, 'hackerrank')) {
        hackerRankAdded++;
      } else {
        hackerRankMissing++;
      }

      const lcSolved = stats.leetcode?.totalSolved || 0;
      const gfgSolved = stats.gfg?.totalSolved || 0;
      const cfSolved = stats.codeforces?.totalSolved || 0;
      const ccSolved = stats.codechef?.totalSolved || 0;
      const hrSolved = stats.hackerrank?.totalSolved || 0;

      totalLeetcodeSolved += lcSolved;
      totalGFGSolved += gfgSolved;
      totalCodeforcesSolved += cfSolved;
      totalCodechefSolved += ccSolved;
      totalHackerrankSolved += hrSolved;

      const studentSolved = lcSolved + gfgSolved + cfSolved + ccSolved + hrSolved;
      totalProblemsSolved += studentSolved;
      if (departmentStats[dept]) {
        departmentStats[dept].totalSolved += studentSolved;
      }

      if (data.createdAt && new Date(data.createdAt) > sevenDaysAgo) {
        recentlyAddedCount++;
      }
    });

    const averageScore = activeStudents > 0 ? Number((totalScoreSum / activeStudents).toFixed(2)) : 0;

    // Recent audits and notifications
    const recentAuditLogs = await getAuditLogsFromRepo(5);
    const notifications = await getNotificationsFromRepo(10);
    const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

    // Sort all students by rank/finalScore for department distribution
    const sortedStudents = [...students].sort((a, b) => {
      const rankA = a.rank ?? Infinity;
      const rankB = b.rank ?? Infinity;
      if (rankA !== rankB) return rankA - rankB;
      return (b.finalScore || 0) - (a.finalScore || 0);
    });

    return res.json({
      success: true,
      stats: {
        students: {
          total: totalStudents,
          active: activeStudents,
          disabled: disabledStudents,
          profilesComplete,
          profilesIncomplete,
          hackerRankAdded,
          hackerRankMissing,
          recentlyAdded: recentlyAddedCount,
          withScores: studentsWithScores,
          withoutScores: studentsWithoutScores,
        },
        totalStudents,
        activeStudents,
        platformConnectedCounts,
        platforms: {
          connectedCounts: platformConnectedCounts,
          totalProblemsSolved,
          byPlatform: {
            leetcode: { totalSolved: totalLeetcodeSolved, connected: platformConnectedCounts.leetcode },
            gfg: { totalSolved: totalGFGSolved, connected: platformConnectedCounts.gfg },
            codeforces: { totalSolved: totalCodeforcesSolved, connected: platformConnectedCounts.codeforces },
            codechef: { totalSolved: totalCodechefSolved, connected: platformConnectedCounts.codechef },
            hackerrank: { totalSolved: totalHackerrankSolved, connected: platformConnectedCounts.hackerrank },
          },
        },
        syncHealth: {
          successfulSyncs,
          failedSyncs,
          pendingSyncs,
          lastSyncJob: activeSyncJob ? {
            status: activeSyncJob.status,
            progress: `${activeSyncJob.processed}/${activeSyncJob.total}`,
            startedAt: activeSyncJob.startedAt,
          } : null,
        },
        scores: {
          averageScore,
          highestScore,
          topScorer,
        },
        departments: departmentStats,
        departmentDistribution: Object.fromEntries(
          Object.entries(departmentStats).map(([k, v]) => [k, v.total])
        ),
        years: yearStats,
        allStudents: sortedStudents,
        recentActivity: recentAuditLogs,
        notifications: {
          unreadCount: unreadNotificationsCount,
          recent: notifications.slice(0, 5),
        },
      },
      recentAudits: recentAuditLogs,
    });
  } catch (error) {
    next(error);
  }
};

// ==============================================================================
// 3. STUDENT MANAGEMENT (CRUD + FILTERS)
// ==============================================================================

const getStudents = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 25,
      search = '',
      department = 'ALL',
      year = 'ALL',
      status = 'ALL',
      platform = 'ALL',
      profileStatus = 'ALL',
      platformMissing = 'ALL',
      platformLinked = 'ALL',
      syncStatus = 'ALL',
      sortBy = 'finalScore',
      sortOrder = 'desc',
    } = req.query;

    const rawStudents = await getAllStudents();

    let filtered = rawStudents.filter((student) => {
      // Status filter
      if (status !== 'ALL' && student.accountStatus !== status) {
        return false;
      }

      // Department filter
      if (department !== 'ALL' && (student.department || '').trim().toLowerCase() !== department.trim().toLowerCase()) {
        return false;
      }

      // Year filter
      if (year !== 'ALL' && String(student.year) !== String(year)) {
        return false;
      }

      // Profile Status filter (Complete, Incomplete, Fetch Failed, Recently Added, etc.)
      if (profileStatus === 'COMPLETE' && isStudentIncomplete(student)) {
        return false;
      }
      if (profileStatus === 'INCOMPLETE' && !isStudentIncomplete(student)) {
        return false;
      }
      if (profileStatus === 'HACKERRANK_MISSING' && !isPlatformMissing(student, 'hackerrank')) {
        return false;
      }
      if (profileStatus === 'HACKERRANK_ADDED' && !isPlatformLinked(student, 'hackerrank')) {
        return false;
      }
      if (profileStatus === 'FETCH_FAILED') {
        const pValues = Object.values(student.platforms || {});
        const hasFailed = pValues.some((p) => p?.status === 'FAILED');
        if (!hasFailed) return false;
      }
      if (profileStatus === 'RECENT') {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        if (!student.createdAt || new Date(student.createdAt) < sevenDaysAgo) return false;
      }

      // Platform Missing filter
      if (platformMissing && platformMissing !== 'ALL' && platformMissing !== 'DEFAULT') {
        if (!isPlatformMissing(student, platformMissing)) {
          return false;
        }
      }

      // Platform Linked filter
      if (platformLinked && platformLinked !== 'ALL') {
        if (platformLinked === 'ALL_LINKED') {
          if (!areAllPlatformsLinked(student)) {
            return false;
          }
        } else {
          if (!isPlatformLinked(student, platformLinked)) {
            return false;
          }
        }
      }

      // Search filter (name, email, roll number)
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesName = (student.name || '').toLowerCase().includes(q);
        const matchesEmail = (student.email || '').toLowerCase().includes(q);
        const matchesRoll = (student.rollNumber || '').toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesRoll) {
          return false;
        }
      }

      // Platform connected filter
      if (platform !== 'ALL') {
        const pKey = platform.toLowerCase();
        const pConf = student.platforms?.[pKey];
        if (!pConf || (!pConf.profileUrl && !pConf.username)) {
          return false;
        }
      }

      // Sync status filter
      if (syncStatus !== 'ALL') {
        const platforms = student.platforms || {};
        const statuses = Object.values(platforms).map((p) => p?.status);
        if (!statuses.includes(syncStatus)) {
          return false;
        }
      }

      return true;
    });

    // Sort
    const sortField = sortBy || 'finalScore';
    filtered.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (valA === undefined || valA === null) valA = sortOrder === 'asc' ? Infinity : -Infinity;
      if (valB === undefined || valB === null) valB = sortOrder === 'asc' ? Infinity : -Infinity;

      if (typeof valA === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });

    const totalRecords = filtered.length;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 25;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedStudents = filtered.slice(startIndex, startIndex + limitNum);

    return res.json({
      success: true,
      pagination: {
        totalRecords,
        totalCount: totalRecords,
        totalPages: Math.max(1, Math.ceil(totalRecords / limitNum)),
        page: pageNum,
        currentPage: pageNum,
        limit: limitNum,
      },
      students: paginatedStudents,
    });
  } catch (error) {
    next(error);
  }
};

const getStudentById = async (req, res, next) => {
  try {
    const id = req.params.studentId || req.params.id;
    if (!id || id === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'Student ID is missing.',
      });
    }
    const student = await getStudentByIdFromRepo(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: `Student not found with ID: ${id}`,
      });
    }

    // Get audit logs & adjustments for this student
    const auditLogs = await getAuditLogsFromRepo(10);
    const studentAuditLogs = auditLogs.filter((a) => a.targetId === id);
    const scoreAdjustments = await getScoreAdjustmentsFromRepo(20, id);

    return res.json({
      success: true,
      student,
      auditHistory: studentAuditLogs,
      scoreAdjustments,
    });
  } catch (error) {
    next(error);
  }
};

const createStudent = async (req, res, next) => {
  try {
    const {
      name,
      email,
      rollNumber,
      department,
      year,
      leetcodeUrl,
      gfgUrl,
      codeforcesUrl,
      codechefUrl,
      hackerrankUrl,
      hackerRankUrl,
    } = req.body;

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required fields.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check email uniqueness
    const existing = await getStudentByIdFromRepo(normalizedEmail);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A student with email "${normalizedEmail}" already exists.`,
      });
    }

    // Parse handles
    const lcHandle = parseLeetCodeUrl(leetcodeUrl || '');
    const gfgHandle = parseGFGUrl(gfgUrl || '');
    const cfHandle = parseCodeforcesUrl(codeforcesUrl || '');
    const ccHandle = parseCodeChefUrl(codechefUrl || '');
    const hrUrlInput = hackerrankUrl || hackerRankUrl || '';
    const hrHandle = parseHackerRankUrl(hrUrlInput);

    const platforms = {
      leetcode: {
        profileUrl: lcHandle ? formatCanonicalUrl('leetcode', lcHandle) : '',
        username: lcHandle || '',
        status: lcHandle ? 'PENDING' : 'NOT_CONNECTED',
        lastFetchedAt: null,
        errorMessage: null,
      },
      gfg: {
        profileUrl: gfgHandle ? formatCanonicalUrl('gfg', gfgHandle) : '',
        username: gfgHandle || '',
        status: gfgHandle ? 'PENDING' : 'NOT_CONNECTED',
        lastFetchedAt: null,
        errorMessage: null,
      },
      codeforces: {
        profileUrl: cfHandle ? formatCanonicalUrl('codeforces', cfHandle) : '',
        username: cfHandle || '',
        status: cfHandle ? 'PENDING' : 'NOT_CONNECTED',
        lastFetchedAt: null,
        errorMessage: null,
      },
      codechef: {
        profileUrl: ccHandle ? formatCanonicalUrl('codechef', ccHandle) : '',
        username: ccHandle || '',
        status: ccHandle ? 'PENDING' : 'NOT_CONNECTED',
        lastFetchedAt: null,
        errorMessage: null,
      },
      hackerrank: {
        profileUrl: hrHandle ? formatCanonicalUrl('hackerrank', hrHandle) : '',
        username: hrHandle || '',
        status: hrHandle ? 'PENDING' : 'NOT_CONNECTED',
        lastFetchedAt: null,
        errorMessage: null,
      },
    };

    const docId = `student_${Buffer.from(normalizedEmail).toString('hex').slice(0, 24)}`;

    const newStudent = {
      id: docId,
      clerkUserId: null,
      collegeId: config.COLLEGE_ID,
      name: name.trim(),
      email: normalizedEmail,
      rollNumber: rollNumber ? rollNumber.trim() : '',
      department: department ? department.trim() : 'Computer Science and Engineering',
      year: year ? parseInt(year, 10) : 3,
      profilePhoto: '',
      role: 'STUDENT',
      accountStatus: 'ACTIVE',
      profileCompleted: !!(lcHandle && gfgHandle && cfHandle && ccHandle),
      finalScore: 0,
      rank: null,
      scores: {
        leetcodeScore: 0,
        gfgScore: 0,
        codeforcesScore: 0,
        codechefScore: 0,
        hackerrankScore: 0,
        finalScore: 0,
      },
      platforms,
      platformStats: {
        leetcode: null,
        gfg: null,
        codeforces: null,
        codechef: null,
        hackerrank: null,
      },
      lastDataUpdatedAt: new Date().toISOString(),
    };

    const createdRecord = await upsertStudent(newStudent);

    // Auto-sync platforms in background if URLs provided
    const hasAnyHandle = lcHandle || gfgHandle || cfHandle || ccHandle || hrHandle;
    if (hasAnyHandle) {
      syncStudentPlatforms(docId).catch((err) => {
        console.warn(`[Auto-sync on create failed for ${docId}]:`, err.message);
      });
    }

    await logAudit({
      admin: req.admin,
      action: AUDIT_ACTIONS.STUDENT_ADDED,
      target: `${name} (${rollNumber || normalizedEmail})`,
      targetId: docId,
      details: {
        studentId: docId,
        name,
        rollNumber: rollNumber || null,
        email: normalizedEmail,
        branch: department || 'CSE',
        year: year || 1,
        status: accountStatus || 'ACTIVE',
        platforms: {
          leetcode: lcHandle ? formatCanonicalUrl('leetcode', lcHandle) : null,
          gfg: gfgHandle ? formatCanonicalUrl('gfg', gfgHandle) : null,
          codeforces: cfHandle ? formatCanonicalUrl('codeforces', cfHandle) : null,
          codechef: ccHandle ? formatCanonicalUrl('codechef', ccHandle) : null,
          hackerrank: hrHandle ? formatCanonicalUrl('hackerrank', hrHandle) : null,
        },
      },
      req,
    });

    return res.status(201).json({
      success: true,
      message: 'Student record created successfully.',
      student: createdRecord,
    });
  } catch (error) {
    next(error);
  }
};

const updateStudent = async (req, res, next) => {
  try {
    const id = req.params.studentId || req.params.id;
    const {
      name,
      email,
      rollNumber,
      department,
      year,
      accountStatus,
      leetcodeUrl,
      gfgUrl,
      codeforcesUrl,
      codechefUrl,
      hackerrankUrl,
      hackerRankUrl,
      triggerSync = true,
    } = req.body;

    const existingStudent = await getStudentByIdFromRepo(id);
    if (!existingStudent) {
      return res.status(404).json({
        success: false,
        message: `Student not found with ID: ${id}`,
      });
    }

    const updates = {
      ...(name && { name: name.trim() }),
      ...(email && { email: email.trim().toLowerCase() }),
      ...(rollNumber !== undefined && { rollNumber: rollNumber.trim() }),
      ...(department !== undefined && { department: department.trim() }),
      ...(year !== undefined && { year: parseInt(year, 10) }),
      ...(accountStatus !== undefined && { accountStatus }),
    };

    const currentPlatforms = { ...(existingStudent.platforms || {}) };
    let platformUrlsChanged = false;

    if (leetcodeUrl !== undefined) {
      const handle = parseLeetCodeUrl(leetcodeUrl);
      currentPlatforms.leetcode = {
        profileUrl: leetcodeUrl ? formatCanonicalUrl('leetcode', handle) : '',
        username: handle || '',
        status: handle ? (currentPlatforms.leetcode?.status || 'PENDING') : 'NOT_CONNECTED',
        lastFetchedAt: currentPlatforms.leetcode?.lastFetchedAt || null,
        errorMessage: null,
      };
      platformUrlsChanged = true;
    }

    if (gfgUrl !== undefined) {
      const handle = parseGFGUrl(gfgUrl);
      currentPlatforms.gfg = {
        profileUrl: gfgUrl ? formatCanonicalUrl('gfg', handle) : '',
        username: handle || '',
        status: handle ? (currentPlatforms.gfg?.status || 'PENDING') : 'NOT_CONNECTED',
        lastFetchedAt: currentPlatforms.gfg?.lastFetchedAt || null,
        errorMessage: null,
      };
      platformUrlsChanged = true;
    }

    if (codeforcesUrl !== undefined) {
      const handle = parseCodeforcesUrl(codeforcesUrl);
      currentPlatforms.codeforces = {
        profileUrl: codeforcesUrl ? formatCanonicalUrl('codeforces', handle) : '',
        username: handle || '',
        status: handle ? (currentPlatforms.codeforces?.status || 'PENDING') : 'NOT_CONNECTED',
        lastFetchedAt: currentPlatforms.codeforces?.lastFetchedAt || null,
        errorMessage: null,
      };
      platformUrlsChanged = true;
    }

    if (codechefUrl !== undefined) {
      const handle = parseCodeChefUrl(codechefUrl);
      currentPlatforms.codechef = {
        profileUrl: codechefUrl ? formatCanonicalUrl('codechef', handle) : '',
        username: handle || '',
        status: handle ? (currentPlatforms.codechef?.status || 'PENDING') : 'NOT_CONNECTED',
        lastFetchedAt: currentPlatforms.codechef?.lastFetchedAt || null,
        errorMessage: null,
      };
      platformUrlsChanged = true;
    }

    const targetHrUrl = hackerrankUrl !== undefined ? hackerrankUrl : hackerRankUrl;
    if (targetHrUrl !== undefined) {
      const handle = parseHackerRankUrl(targetHrUrl);
      currentPlatforms.hackerrank = {
        profileUrl: targetHrUrl ? formatCanonicalUrl('hackerrank', handle) : '',
        username: handle || '',
        status: handle ? (currentPlatforms.hackerrank?.status || 'PENDING') : 'NOT_CONNECTED',
        lastFetchedAt: currentPlatforms.hackerrank?.lastFetchedAt || null,
        errorMessage: null,
      };
      platformUrlsChanged = true;
    }

    if (platformUrlsChanged) {
      updates.platforms = currentPlatforms;
    }

    await updateStudentInRepo(id, updates);

    let finalStudentRecord = null;

    // If platform URLs changed and auto-sync requested, fetch platform stats immediately
    if (platformUrlsChanged && triggerSync) {
      try {
        finalStudentRecord = await syncStudentPlatforms(id);
      } catch (syncErr) {
        console.warn(`[Immediate sync on update warning for ${id}]:`, syncErr.message);
        finalStudentRecord = await getStudentByIdFromRepo(id);
      }
    } else {
      if (accountStatus !== undefined) {
        await recalculateCollegeRankings(existingStudent.collegeId || 'COLLEGE_MAIN');
      }
      finalStudentRecord = await getStudentByIdFromRepo(id);
    }

    const beforeData = {
      name: existingStudent.name,
      email: existingStudent.email,
      rollNumber: existingStudent.rollNumber,
      department: existingStudent.department,
      year: existingStudent.year,
      accountStatus: existingStudent.accountStatus,
      platforms: {
        leetcode: existingStudent.platforms?.leetcode?.profileUrl || null,
        gfg: existingStudent.platforms?.gfg?.profileUrl || null,
        codeforces: existingStudent.platforms?.codeforces?.profileUrl || null,
        codechef: existingStudent.platforms?.codechef?.profileUrl || null,
        hackerrank: existingStudent.platforms?.hackerrank?.profileUrl || null,
      },
    };

    const afterData = {
      name: finalStudentRecord?.name || existingStudent.name,
      email: finalStudentRecord?.email || existingStudent.email,
      rollNumber: finalStudentRecord?.rollNumber || existingStudent.rollNumber,
      department: finalStudentRecord?.department || existingStudent.department,
      year: finalStudentRecord?.year || existingStudent.year,
      accountStatus: finalStudentRecord?.accountStatus || existingStudent.accountStatus,
      platforms: {
        leetcode: finalStudentRecord?.platforms?.leetcode?.profileUrl || currentPlatforms?.leetcode?.profileUrl || null,
        gfg: finalStudentRecord?.platforms?.gfg?.profileUrl || currentPlatforms?.gfg?.profileUrl || null,
        codeforces: finalStudentRecord?.platforms?.codeforces?.profileUrl || currentPlatforms?.codeforces?.profileUrl || null,
        codechef: finalStudentRecord?.platforms?.codechef?.profileUrl || currentPlatforms?.codechef?.profileUrl || null,
        hackerrank: finalStudentRecord?.platforms?.hackerrank?.profileUrl || currentPlatforms?.hackerrank?.profileUrl || null,
      },
    };

    const diff = {};
    if (beforeData.name !== afterData.name) diff.name = { before: beforeData.name, after: afterData.name };
    if (beforeData.email !== afterData.email) diff.email = { before: beforeData.email, after: afterData.email };
    if (beforeData.rollNumber !== afterData.rollNumber) diff.rollNumber = { before: beforeData.rollNumber, after: afterData.rollNumber };
    if (beforeData.department !== afterData.department) diff.department = { before: beforeData.department, after: afterData.department };
    if (beforeData.year !== afterData.year) diff.year = { before: beforeData.year, after: afterData.year };
    if (beforeData.accountStatus !== afterData.accountStatus) diff.accountStatus = { before: beforeData.accountStatus, after: afterData.accountStatus };
    ['leetcode', 'gfg', 'codeforces', 'codechef', 'hackerrank'].forEach((p) => {
      if (beforeData.platforms[p] !== afterData.platforms[p]) {
        diff[`platform_${p}`] = { before: beforeData.platforms[p] || 'Not linked', after: afterData.platforms[p] || 'Not linked' };
      }
    });

    await logAudit({
      admin: req.admin,
      action: AUDIT_ACTIONS.STUDENT_UPDATED,
      target: `${existingStudent.name} (${existingStudent.rollNumber || id})`,
      targetId: id,
      before: beforeData,
      after: afterData,
      details: {
        before: beforeData,
        after: afterData,
        diff,
        updates,
        platformUrlsChanged,
        previousScore: existingStudent.finalScore,
        newScore: finalStudentRecord?.finalScore,
        previousRank: existingStudent.rank,
        newRank: finalStudentRecord?.rank,
      },
      req,
    });

    return res.json({
      success: true,
      message: 'Student details updated and platform scoring refreshed.',
      student: finalStudentRecord,
    });
  } catch (error) {
    next(error);
  }
};

const toggleStudentStatus = async (req, res, next) => {
  try {
    const id = req.params.studentId || req.params.id;
    const { status } = req.body;

    if (!['ACTIVE', 'DISABLED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either ACTIVE or DISABLED.',
      });
    }

    const student = await getStudentByIdFromRepo(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: `Student not found with ID: ${id}`,
      });
    }

    await updateStudentInRepo(id, { accountStatus: status });
    await recalculateCollegeRankings(student.collegeId || 'COLLEGE_MAIN');

    await logAudit({
      admin: req.admin,
      action: status === 'DISABLED' ? AUDIT_ACTIONS.STUDENT_DISABLED : AUDIT_ACTIONS.STUDENT_ENABLED,
      target: `${student.name} (${student.rollNumber || id})`,
      targetId: id,
      reason: req.body?.reason || null,
      before: { accountStatus: student.accountStatus },
      after: { accountStatus: status },
      details: {
        previousStatus: student.accountStatus,
        newStatus: status,
        reason: req.body?.reason || null,
        rollNumber: student.rollNumber,
      },
      req,
    });

    return res.json({
      success: true,
      message: `Student account ${status.toLowerCase()} successfully.`,
      accountStatus: status,
    });
  } catch (error) {
    next(error);
  }
};

const deleteStudent = async (req, res, next) => {
  try {
    const id = req.params.studentId || req.params.id;
    const student = await getStudentByIdFromRepo(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: `Student not found with ID: ${id}`,
      });
    }

    await deleteStudentInRepo(id);
    await recalculateCollegeRankings(student.collegeId || 'COLLEGE_MAIN');

    await logAudit({
      admin: req.admin,
      action: AUDIT_ACTIONS.STUDENT_DELETED,
      target: `${student.name} (${student.rollNumber || id})`,
      targetId: id,
      details: { deletedEmail: student.email, rollNumber: student.rollNumber, studentId: id },
      req,
    });

    return res.json({
      success: true,
      message: `Student "${student.name}" was permanently removed.`,
    });
  } catch (error) {
    next(error);
  }
};

// ==============================================================================
// 4. SYNCHRONIZATION ENGINE
// ==============================================================================

const syncStudent = async (req, res, next) => {
  try {
    const id = req.params.studentId || req.params.id;
    const student = await getStudentByIdFromRepo(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: `Student not found with ID: ${id}`,
      });
    }

    const syncResult = await syncStudentPlatforms(id, null, { forceSync: true });
    const updated = syncResult.student || syncResult;

    await logAudit({
      admin: req.admin,
      action: AUDIT_ACTIONS.STATISTICS_REFRESHED,
      target: `${student.name} (${student.rollNumber || id})`,
      targetId: id,
      details: {
        studentId: id,
        studentName: student.name,
        rollNumber: student.rollNumber,
        previousScore: student.finalScore,
        newScore: updated.finalScore,
        previousRank: student.rank,
        newRank: updated.rank,
        changes: syncResult.detectedChanges || [],
        source: 'MANUAL_REFRESH',
        status: 'SUCCESS',
      },
      req,
    });

    return res.json({
      success: true,
      message: `Platform statistics synchronized for ${student.name}.`,
      student: updated,
      hasChanged: syncResult.hasChanged,
      detectedChanges: syncResult.detectedChanges || [],
    });
  } catch (error) {
    next(error);
  }
};

const syncAllStudents = async (req, res, next) => {
  try {
    if (activeSyncJob && activeSyncJob.status === 'RUNNING') {
      return res.status(409).json({
        success: false,
        message: 'A bulk synchronization job is already running.',
        job: activeSyncJob,
      });
    }

    const allStudents = await getAllStudents({ accountStatus: 'ACTIVE' });
    const studentsToSync = allStudents.filter((s) => {
      const p = s.platforms || {};
      return (
        p.leetcode?.username ||
        p.gfg?.username ||
        p.codeforces?.username ||
        p.codechef?.username ||
        p.hackerrank?.username ||
        p.leetcode?.profileUrl ||
        p.gfg?.profileUrl ||
        p.codeforces?.profileUrl ||
        p.codechef?.profileUrl ||
        p.hackerrank?.profileUrl
      );
    });

    const totalStudents = studentsToSync.length;
    const jobId = `sync_${Date.now()}`;
    const startedAt = new Date().toISOString();

    activeSyncJob = {
      id: jobId,
      status: 'RUNNING',
      startedAt,
      completedAt: null,
      total: totalStudents,
      totalStudents,
      processed: 0,
      processedStudents: 0,
      completed: 0,
      successful: 0,
      successfulStudents: 0,
      failed: 0,
      failedStudents: 0,
      progress: 0,
      currentStudent: null,
      errors: [],
    };

    // Log start of bulk sync audit
    await logAudit({
      admin: req.admin,
      action: AUDIT_ACTIONS.BULK_SYNCHRONIZATION_STARTED,
      target: `BULK_SYNC (${totalStudents} students)`,
      details: {
        jobId,
        totalStudents,
        startedAt,
        targetStudentCount: totalStudents,
        status: 'RUNNING',
      },
      req,
    });

    // Respond immediately, run in background
    res.json({
      success: true,
      message: `Started bulk synchronization for ${totalStudents} active students.`,
      jobId,
      job: activeSyncJob,
    });

    // Background executor
    (async () => {
      const batchSize = 5;
      const throttleMs = 350;
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

      for (let i = 0; i < studentsToSync.length; i += batchSize) {
        const batch = studentsToSync.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (st) => {
            activeSyncJob.currentStudent = st.name;
            try {
              await syncStudentPlatforms(st.id, null, { forceSync: true });
              activeSyncJob.successful++;
              activeSyncJob.successfulStudents++;
            } catch (err) {
              activeSyncJob.failed++;
              activeSyncJob.failedStudents++;
              activeSyncJob.errors.push({
                studentId: st.id,
                name: st.name,
                rollNumber: st.rollNumber,
                error: err.message,
              });
            } finally {
              activeSyncJob.processed++;
              activeSyncJob.processedStudents++;
              activeSyncJob.completed++;
              activeSyncJob.progress = totalStudents > 0
                ? Math.min(100, Math.round((activeSyncJob.processed / totalStudents) * 100))
                : 100;
            }
          })
        );
        await sleep(throttleMs);
      }

      await recalculateCollegeRankings('COLLEGE_MAIN');
      activeSyncJob.status = activeSyncJob.failed > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED';
      activeSyncJob.completedAt = new Date().toISOString();
      activeSyncJob.currentStudent = null;
      activeSyncJob.progress = 100;

      await createAdminNotification({
        type: 'IMPORT_COMPLETE',
        title: 'Bulk Synchronization Completed',
        message: `Synchronized ${activeSyncJob.successful} students successfully. Failed: ${activeSyncJob.failed}.`,
        severity: activeSyncJob.failed > 0 ? 'WARNING' : 'SUCCESS',
      });

      await logAudit({
        admin: req.admin,
        action: AUDIT_ACTIONS.BULK_SYNCHRONIZATION_COMPLETED,
        target: `BULK_SYNC (${totalStudents} students)`,
        details: {
          jobId,
          totalStudents,
          successful: activeSyncJob.successful,
          failed: activeSyncJob.failed,
          skipped: 0,
          durationMs: Date.now() - new Date(startedAt).getTime(),
          startedAt,
          completedAt: activeSyncJob.completedAt,
          status: activeSyncJob.failed > 0 ? 'COMPLETED_WITH_ERRORS' : 'SUCCESS',
          errors: activeSyncJob.errors.slice(0, 20),
        },
        req,
      });
    })().catch((err) => {
      console.error('[Bulk Sync Background Error]:', err);
      if (activeSyncJob) {
        activeSyncJob.status = 'FAILED';
        activeSyncJob.error = err.message;
        activeSyncJob.currentStudent = null;
      }
    });
  } catch (error) {
    next(error);
  }
};

const getSyncStatus = async (req, res, next) => {
  try {
    const allStudents = await getAllStudents({ accountStatus: 'ACTIVE' });
    const linkedStudents = allStudents.filter((s) => {
      const p = s.platforms || {};
      return (
        p.leetcode?.username ||
        p.gfg?.username ||
        p.codeforces?.username ||
        p.codechef?.username ||
        p.hackerrank?.username ||
        p.leetcode?.profileUrl ||
        p.gfg?.profileUrl ||
        p.codeforces?.profileUrl ||
        p.codechef?.profileUrl ||
        p.hackerrank?.profileUrl
      );
    });

    let currentJob = activeSyncJob;
    if (!currentJob) {
      let latestSyncTime = null;
      let totalErrors = 0;

      allStudents.forEach((s) => {
        if (s.lastDataUpdatedAt) {
          if (!latestSyncTime || new Date(s.lastDataUpdatedAt) > new Date(latestSyncTime)) {
            latestSyncTime = s.lastDataUpdatedAt;
          }
        }
        const p = s.platforms || {};
        ['leetcode', 'gfg', 'hackerrank', 'codeforces', 'codechef'].forEach((k) => {
          if (p[k]?.status === 'FAILED' || p[k]?.status === 'RATE_LIMITED') {
            totalErrors++;
          }
        });
      });

      if (latestSyncTime) {
        currentJob = {
          id: 'latest_db_sync',
          status: totalErrors > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
          startedAt: latestSyncTime,
          completedAt: latestSyncTime,
          total: linkedStudents.length,
          totalStudents: linkedStudents.length,
          processed: linkedStudents.length,
          processedStudents: linkedStudents.length,
          completed: linkedStudents.length,
          successful: Math.max(0, linkedStudents.length - totalErrors),
          successfulStudents: Math.max(0, linkedStudents.length - totalErrors),
          failed: totalErrors,
          failedStudents: totalErrors,
          progress: 100,
          currentStudent: null,
          errors: [],
        };
      } else {
        currentJob = {
          id: null,
          status: 'IDLE',
          startedAt: null,
          completedAt: null,
          total: linkedStudents.length,
          totalStudents: linkedStudents.length,
          processed: 0,
          processedStudents: 0,
          completed: 0,
          successful: 0,
          successfulStudents: 0,
          failed: 0,
          failedStudents: 0,
          progress: 0,
          currentStudent: null,
          errors: [],
        };
      }
    }

    return res.json({
      success: true,
      job: currentJob,
    });
  } catch (error) {
    next(error);
  }
};

const getSyncLogs = async (req, res, next) => {
  try {
    const allStudents = await getAllStudents();
    const telemetryLogs = [];
    const platformKeys = ['leetcode', 'gfg', 'hackerrank', 'codeforces', 'codechef'];

    allStudents.forEach((st) => {
      const platforms = st.platforms || {};
      const platformStats = st.platformStats || {};

      platformKeys.forEach((pKey) => {
        const pInfo = platforms[pKey];
        const statInfo = platformStats[pKey];

        const isLinked = !!(pInfo?.username || pInfo?.profileUrl);
        if (!isLinked && (!pInfo?.status || pInfo?.status === 'NOT_CONNECTED')) {
          return;
        }

        const logStatus = pInfo?.status || (isLinked ? 'PENDING' : 'NOT_CONNECTED');
        const lastFetched = pInfo?.lastFetchedAt || st.lastDataUpdatedAt || null;
        const errMsg = pInfo?.errorMessage || null;

        telemetryLogs.push({
          id: `${st.id}_${pKey}`,
          studentId: st.id,
          studentName: st.name,
          rollNumber: st.rollNumber || '—',
          department: st.department || '—',
          year: st.year || 4,
          platform: pKey,
          username: pInfo?.username || (pInfo?.profileUrl ? pInfo.profileUrl.split('/').filter(Boolean).pop() : '—'),
          profileUrl: pInfo?.profileUrl || '',
          status: logStatus,
          lastFetchedAt: lastFetched,
          errorMessage: errMsg,
          totalSolved: statInfo?.totalSolved || 0,
        });
      });
    });

    // Sort by lastFetchedAt descending (most recently synced first)
    telemetryLogs.sort((a, b) => {
      if (!a.lastFetchedAt && !b.lastFetchedAt) return 0;
      if (!a.lastFetchedAt) return 1;
      if (!b.lastFetchedAt) return -1;
      return new Date(b.lastFetchedAt) - new Date(a.lastFetchedAt);
    });

    return res.json({
      success: true,
      totalCount: telemetryLogs.length,
      logs: telemetryLogs,
      job: activeSyncJob || { status: 'IDLE' },
    });
  } catch (error) {
    next(error);
  }
};

// ==============================================================================
// 5. BULK IMPORT & VALIDATION
// ==============================================================================

const validateImportData = async (req, res, next) => {
  try {
    const rawRows = req.body.rows || req.body.records || [];
    const headers = req.body.headers || null;

    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Request body must include a "rows" or "records" array containing student rows.',
      });
    }

    // 1. Header validation if headers were explicitly sent
    if (headers && Array.isArray(headers) && headers.length > 0) {
      const headerCheck = validateHeaders(headers);
      if (!headerCheck.isValid) {
        return res.status(400).json({
          success: false,
          message: headerCheck.error,
        });
      }
    } else if (rawRows[0] && typeof rawRows[0] === 'object') {
      // Validate object keys against required columns
      const objectKeys = Object.keys(rawRows[0]);
      const headerCheck = validateHeaders(objectKeys);
      if (!headerCheck.isValid) {
        return res.status(400).json({
          success: false,
          message: headerCheck.error,
        });
      }
    }

    // 2. Fetch existing students from Supabase
    const existingStudents = await getAllStudents();

    // 3. Validate rows using importValidator
    const validationResult = validateStudentRows(rawRows, existingStudents);

    return res.json({
      success: true,
      summary: validationResult.summary,
      rows: validationResult.rows,
    });
  } catch (error) {
    next(error);
  }
};

const confirmImport = async (req, res, next) => {
  try {
    const { rows, fileName, autoSync = true, updateDuplicates = true } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No student rows provided for import.',
      });
    }

    const existingStudents = await getAllStudents();
    const validation = validateStudentRows(rows, existingStudents);

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const failedRows = [];
    const idsToSync = [];

    // Process rows
    for (const r of validation.rows) {
      if (!r.isValid || r.status === 'INVALID') {
        failedCount++;
        failedRows.push({
          rowNumber: r.rowNumber,
          name: r.name || '—',
          email: r.email || '—',
          rollNumber: r.rollNumber || '—',
          reason: (r.errors && r.errors.length > 0) ? r.errors.join('; ') : 'Invalid record structure',
        });
        continue;
      }

      const email = (r.email || '').trim().toLowerCase();
      const name = (r.name || '').trim();
      const rollNumber = (r.rollNumber || '').trim();
      const department = (r.branch || r.department || 'Computer Science and Engineering').trim();
      const year = r.year || 4;

      const lcHandle = r.leetcodeHandle || parseLeetCodeUrl(r.leetcodeUrl || '');
      const gfgHandle = r.gfgHandle || parseGFGUrl(r.gfgUrl || '');
      const hrHandle = r.hackerrankHandle || parseHackerRankUrl(r.hackerrankUrl || '');
      const cfHandle = r.codeforcesHandle || parseCodeforcesUrl(r.codeforcesUrl || '');
      const ccHandle = r.codechefHandle || parseCodeChefUrl(r.codechefUrl || '');

      const existingMatch = existingStudents.find(
        (s) => (s.email && s.email.toLowerCase() === email) || (s.rollNumber && rollNumber && s.rollNumber.toLowerCase() === rollNumber.toLowerCase())
      );

      if (existingMatch) {
        if (!updateDuplicates) {
          skippedCount++;
          continue;
        }

        // Merge existing platforms
        const currentPlatforms = { ...(existingMatch.platforms || {}) };

        if (r.leetcodeUrl || lcHandle) {
          currentPlatforms.leetcode = {
            profileUrl: lcHandle ? formatCanonicalUrl('leetcode', lcHandle) : r.leetcodeUrl,
            username: lcHandle || '',
            status: lcHandle ? (currentPlatforms.leetcode?.status || 'PENDING') : 'NOT_CONNECTED',
          };
        }
        if (r.gfgUrl || gfgHandle) {
          currentPlatforms.gfg = {
            profileUrl: gfgHandle ? formatCanonicalUrl('gfg', gfgHandle) : r.gfgUrl,
            username: gfgHandle || '',
            status: gfgHandle ? (currentPlatforms.gfg?.status || 'PENDING') : 'NOT_CONNECTED',
          };
        }
        if (r.hackerrankUrl || hrHandle) {
          currentPlatforms.hackerrank = {
            profileUrl: hrHandle ? formatCanonicalUrl('hackerrank', hrHandle) : r.hackerrankUrl,
            username: hrHandle || '',
            status: hrHandle ? (currentPlatforms.hackerrank?.status || 'PENDING') : 'NOT_CONNECTED',
          };
        }
        if (r.codeforcesUrl || cfHandle) {
          currentPlatforms.codeforces = {
            profileUrl: cfHandle ? formatCanonicalUrl('codeforces', cfHandle) : r.codeforcesUrl,
            username: cfHandle || '',
            status: cfHandle ? (currentPlatforms.codeforces?.status || 'PENDING') : 'NOT_CONNECTED',
          };
        }
        if (r.codechefUrl || ccHandle) {
          currentPlatforms.codechef = {
            profileUrl: ccHandle ? formatCanonicalUrl('codechef', ccHandle) : r.codechefUrl,
            username: ccHandle || '',
            status: ccHandle ? (currentPlatforms.codechef?.status || 'PENDING') : 'NOT_CONNECTED',
          };
        }

        try {
          await updateStudentInRepo(existingMatch.id, {
            ...(name && { name }),
            ...(rollNumber && { rollNumber }),
            ...(department && { department }),
            ...(year && { year }),
            platforms: currentPlatforms,
            lastDataUpdatedAt: new Date().toISOString(),
          });
          updatedCount++;
          idsToSync.push(existingMatch.id);
        } catch (updateErr) {
          console.error(`[Bulk Import Update Error for ${email}]:`, updateErr.message);
          failedCount++;
          failedRows.push({
            rowNumber: r.rowNumber,
            name: r.name,
            email: r.email,
            rollNumber: r.rollNumber,
            reason: `Database update failure: ${updateErr.message}`,
          });
        }
      } else {
        // Create new record
        const docId = `import_${Buffer.from(email).toString('hex').slice(0, 24)}`;
        const newRecord = {
          id: docId,
          clerkUserId: null,
          collegeId: config.COLLEGE_ID,
          name,
          email,
          rollNumber,
          department,
          year,
          profilePhoto: '',
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
          profileCompleted: !!(lcHandle && gfgHandle && hrHandle),
          finalScore: 0,
          rank: null,
          scores: {
            leetcodeScore: 0,
            gfgScore: 0,
            codeforcesScore: 0,
            codechefScore: 0,
            hackerrankScore: 0,
            finalScore: 0,
          },
          platforms: {
            leetcode: {
              profileUrl: lcHandle ? formatCanonicalUrl('leetcode', lcHandle) : r.leetcodeUrl || '',
              username: lcHandle || '',
              status: lcHandle ? 'PENDING' : 'NOT_CONNECTED',
            },
            gfg: {
              profileUrl: gfgHandle ? formatCanonicalUrl('gfg', gfgHandle) : r.gfgUrl || '',
              username: gfgHandle || '',
              status: gfgHandle ? 'PENDING' : 'NOT_CONNECTED',
            },
            hackerrank: {
              profileUrl: hrHandle ? formatCanonicalUrl('hackerrank', hrHandle) : r.hackerrankUrl || '',
              username: hrHandle || '',
              status: hrHandle ? 'PENDING' : 'NOT_CONNECTED',
            },
            codeforces: {
              profileUrl: cfHandle ? formatCanonicalUrl('codeforces', cfHandle) : r.codeforcesUrl || '',
              username: cfHandle || '',
              status: cfHandle ? 'PENDING' : 'NOT_CONNECTED',
            },
            codechef: {
              profileUrl: ccHandle ? formatCanonicalUrl('codechef', ccHandle) : r.codechefUrl || '',
              username: ccHandle || '',
              status: ccHandle ? 'PENDING' : 'NOT_CONNECTED',
            },
          },
          platformStats: {
            leetcode: null,
            gfg: null,
            hackerrank: null,
            codeforces: null,
            codechef: null,
          },
          lastDataUpdatedAt: new Date().toISOString(),
        };

        try {
          await upsertStudent(newRecord);
          createdCount++;
          idsToSync.push(docId);
        } catch (insertErr) {
          console.error(`[Bulk Import Insert Error for ${email}]:`, insertErr.message);
          failedCount++;
          failedRows.push({
            rowNumber: r.rowNumber,
            name: r.name,
            email: r.email,
            rollNumber: r.rollNumber,
            reason: `Database insert failure: ${insertErr.message}`,
          });
        }
      }
    }

    const totalImported = createdCount + updatedCount;
    const finalStatus =
      failedCount === 0
        ? 'SUCCESS'
        : totalImported > 0
        ? 'COMPLETED_WITH_ERRORS'
        : 'FAILED';

    // Insert import history audit in Supabase
    await insertImportHistory({
      adminId: req.admin.userId,
      adminEmail: req.admin.email,
      fileName: fileName || 'bulk_import.xlsx',
      totalRows: rows.length,
      importedCount: totalImported,
      skippedCount,
      failedCount,
      status: finalStatus,
      details: {
        createdCount,
        updatedCount,
        skippedCount,
        failedCount,
        failedRows,
      },
    });

    // Recalculate college rankings
    await recalculateCollegeRankings(config.COLLEGE_ID || 'COLLEGE_MAIN');

    await logAudit({
      admin: req.admin,
      action: AUDIT_ACTIONS.STUDENT_IMPORTED,
      target: fileName || 'bulk_import.xlsx',
      details: {
        importJobId: `import_${Date.now()}`,
        fileName: fileName || 'bulk_import.xlsx',
        totalRows: rows.length,
        createdCount,
        updatedCount,
        skippedCount,
        duplicateRowsCount: skippedCount,
        failedCount,
        failedRowsCount: failedRows.length,
        status: finalStatus,
      },
      req,
    });

    // Background controlled batch synchronization
    if (autoSync && idsToSync.length > 0) {
      (async () => {
        const batchSize = 3;
        for (let i = 0; i < idsToSync.length; i += batchSize) {
          const batch = idsToSync.slice(i, i + batchSize);
          await Promise.allSettled(
            batch.map(async (studentId) => {
              try {
                await syncStudentPlatforms(studentId);
              } catch (e) {
                console.warn(`[AutoSync on Import Warning for ${studentId}]:`, e.message);
              }
            })
          );
          // Small throttle between batches
          await new Promise((res) => setTimeout(res, 500));
        }
      })().catch(console.error);
    }

    return res.json({
      success: true,
      message: `Import processed: ${createdCount} created, ${updatedCount} updated, ${skippedCount} skipped, ${failedCount} failed.`,
      results: {
        totalRows: rows.length,
        importedCount: totalImported,
        createdCount,
        updatedCount,
        skippedCount,
        failedCount,
        failedRows,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getImportHistory = async (req, res, next) => {
  try {
    const history = await getImportHistoryFromRepo(50);
    return res.json({ success: true, history });
  } catch (error) {
    next(error);
  }
};

const getImportTemplate = (req, res) => {
  const headers = [
    'Name',
    'Email',
    'Roll Number',
    'Branch',
    'Year',
    'LeetCode Profile',
    'GeeksforGeeks Profile',
    'HackerRank Profile',
    'Codeforces Profile',
    'CodeChef Profile',
  ];

  const sampleRows = [
    [
      'Aarav Sharma',
      'aarav.sharma@college.edu',
      '21CS001',
      'CSE',
      4,
      'https://leetcode.com/u/aarav_coder/',
      'https://www.geeksforgeeks.org/user/aaravsharma21/',
      'https://www.hackerrank.com/profile/aarav_hr',
      'https://codeforces.com/profile/aarav_cf',
      'https://www.codechef.com/users/aarav_cc',
    ],
    [
      'Priya Patel',
      'priya.patel@college.edu',
      '21IT045',
      'IT',
      4,
      'https://leetcode.com/u/priya_p/',
      'https://www.geeksforgeeks.org/user/priyapatel/',
      'https://www.hackerrank.com/profile/priya_hr',
      '',
      '',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Students');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="student_import_template.xlsx"');
  return res.send(buffer);
};

// ==============================================================================
const normalizeLeaderboardBranch = (dept) => {
  if (!dept) return 'Other';
  const d = dept.trim().toLowerCase();
  if (d === 'csds' || d.includes('data science') || d.includes('cs & ds') || d.includes('cs and ds')) return 'CSDS';
  if (d === 'csbs' || d.includes('business systems') || d.includes('cs & bs') || d.includes('cs and bs')) return 'CSBS';
  if (d === 'csit' || d.includes('cs and it') || d.includes('cs & it')) return 'CSIT';
  if (d === 'vlsi') return 'VLSI';
  if (d === 'aiml' || d.includes('machine learning') || d.includes('ai & ml') || d.includes('ai and ml') || d.includes('ai/ml')) return 'AIML';
  if (d === 'iot' || d.includes('internet of things')) return 'IoT';
  if (d === 'ai' || d === 'artificial intelligence') return 'AI';
  if (d === 'cse' || d.includes('computer science and engineering') || d.includes('computer science & engineering') || d.includes('computer science') || d.includes('comp sci')) return 'Computer Science and Engineering';
  if (d === 'it' || d === 'information technology' || d.includes('infotech')) return 'Information Technology';
  if (d === 'ece' || d.includes('electronics and communication') || d.includes('electronics & communication')) return 'Electronics & Communication';
  if (d === 'eee' || d.includes('electrical and electronics') || d.includes('electrical & electronics')) return 'Electrical & Electronics';
  if (d === 'me' || d === 'mech' || d.includes('mechanical')) return 'Mechanical Engineering';
  if (d === 'civil' || d.includes('civil engineering')) return 'CIVIL';
  if (d === 'prime') return 'Prime';
  return dept.trim();
};

const matchesLeaderboardBranch = (studentDept, selectedBranch) => {
  if (!selectedBranch || selectedBranch === 'ALL') return true;
  if (!studentDept) return false;
  const normStudent = normalizeLeaderboardBranch(studentDept).toLowerCase();
  const normSelected = normalizeLeaderboardBranch(selectedBranch).toLowerCase();
  if (normStudent === normSelected) return true;
  const rawStudent = studentDept.trim().toLowerCase();
  const rawSelected = selectedBranch.trim().toLowerCase();
  return rawStudent === rawSelected || rawStudent.includes(rawSelected) || rawSelected.includes(rawStudent);
};

const getAdminLeaderboard = async (req, res, next) => {
  try {
    const { department = 'ALL', year = 'ALL', search = '' } = req.query;
    const allStudents = await getAllStudents();

    const filtered = allStudents.filter((s) => {
      if (s.accountStatus === 'DISABLED') return false;
      if (!matchesLeaderboardBranch(s.department, department)) return false;
      if (year !== 'ALL' && String(s.year) !== String(year)) return false;
      if (search && search.trim()) {
        const searchTerms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
        const mName = (s.name || '').toLowerCase();
        const mRoll = (s.rollNumber || '').toLowerCase();
        return searchTerms.every((term) => mName.includes(term) || mRoll.includes(term));
      }
      return true;
    });

    filtered.sort((a, b) => {
      const rankA = a.rank ?? 999999;
      const rankB = b.rank ?? 999999;
      if (rankA !== rankB) return rankA - rankB;
      return (b.finalScore || 0) - (a.finalScore || 0);
    });

    return res.json({
      success: true,
      totalCount: filtered.length,
      leaderboard: filtered,
    });
  } catch (error) {
    next(error);
  }
};

const recalculateLeaderboard = async (req, res, next) => {
  try {
    const result = await recalculateCollegeRankings('COLLEGE_MAIN');

    await logAudit({
      admin: req.admin,
      action: AUDIT_ACTIONS.LEADERBOARD_RECALCULATED,
      target: 'COLLEGE_MAIN',
      details: {
        totalRankedStudents: result.updatedCount,
        trigger: 'ADMIN_MANUAL_RECALCULATE',
        status: 'SUCCESS',
      },
      req,
    });

    return res.json({
      success: true,
      message: 'College rankings recalculated successfully.',
      result,
    });
  } catch (error) {
    next(error);
  }
};

// ==============================================================================
// 7. PLATFORM HEALTH & TELEMETRY
// ==============================================================================

const getPlatformStats = async (req, res, next) => {
  try {
    const students = await getAllStudents();

    const platforms = {
      leetcode: {
        key: 'leetcode',
        label: 'LeetCode',
        connected: 0,
        success: 0,
        failed: 0,
        pending: 0,
        notConnected: 0,
        totalSolved: 0,
        easySolved: 0,
        mediumSolved: 0,
        hardSolved: 0,
        lastSuccess: null,
        lastFailed: null,
        lastError: null,
        successRate: null,
        health: 'HEALTHY',
        isConfigured: true,
        sampleHandle: null,
      },
      gfg: {
        key: 'gfg',
        label: 'GeeksforGeeks',
        connected: 0,
        success: 0,
        failed: 0,
        pending: 0,
        notConnected: 0,
        totalSolved: 0,
        schoolSolved: 0,
        basicSolved: 0,
        easySolved: 0,
        mediumSolved: 0,
        hardSolved: 0,
        lastSuccess: null,
        lastFailed: null,
        lastError: null,
        successRate: null,
        health: 'HEALTHY',
        isConfigured: true,
        sampleHandle: null,
      },
      hackerrank: {
        key: 'hackerrank',
        label: 'HackerRank',
        connected: 0,
        success: 0,
        failed: 0,
        pending: 0,
        notConnected: 0,
        totalSolved: 0,
        badges: 0,
        certificates: 0,
        lastSuccess: null,
        lastFailed: null,
        lastError: null,
        successRate: null,
        health: 'HEALTHY',
        isConfigured: true,
        sampleHandle: null,
      },
      codeforces: {
        key: 'codeforces',
        label: 'Codeforces',
        connected: 0,
        success: 0,
        failed: 0,
        pending: 0,
        notConnected: 0,
        totalSolved: 0,
        lastSuccess: null,
        lastFailed: null,
        lastError: null,
        successRate: null,
        health: 'HEALTHY',
        isConfigured: true,
        sampleHandle: null,
      },
      codechef: {
        key: 'codechef',
        label: 'CodeChef',
        connected: 0,
        success: 0,
        failed: 0,
        pending: 0,
        notConnected: 0,
        totalSolved: 0,
        lastSuccess: null,
        lastFailed: null,
        lastError: null,
        successRate: null,
        health: 'HEALTHY',
        isConfigured: true,
        sampleHandle: null,
      },
    };

    students.forEach((s) => {
      const p = s.platforms || {};
      const ps = s.platformStats || {};

      ['leetcode', 'gfg', 'hackerrank', 'codeforces', 'codechef'].forEach((platKey) => {
        const platInfo = p[platKey];
        const statInfo = ps[platKey];
        const target = platforms[platKey];

        const hasUrlOrUsername = !!(platInfo?.username || platInfo?.profileUrl);
        if (hasUrlOrUsername) {
          target.connected++;
          if (!target.sampleHandle) {
            target.sampleHandle = platInfo.username || platInfo.profileUrl;
          }

          const status = platInfo?.status;
          if (status === 'SUCCESS') {
            target.success++;
            if (platInfo.lastFetchedAt) {
              if (!target.lastSuccess || new Date(platInfo.lastFetchedAt) > new Date(target.lastSuccess)) {
                target.lastSuccess = platInfo.lastFetchedAt;
              }
            }
          } else if (status === 'FAILED' || status === 'RATE_LIMITED') {
            target.failed++;
            if (platInfo.errorMessage) {
              target.lastError = platInfo.errorMessage;
            }
            if (platInfo.lastFetchedAt) {
              if (!target.lastFailed || new Date(platInfo.lastFetchedAt) > new Date(target.lastFailed)) {
                target.lastFailed = platInfo.lastFetchedAt;
              }
            }
          } else if (status === 'PENDING') {
            target.pending++;
          }
        } else {
          target.notConnected++;
        }

        // Platform-specific problem counts
        if (statInfo) {
          target.totalSolved += statInfo.totalSolved || 0;
          if (platKey === 'leetcode') {
            target.easySolved += statInfo.easySolved || 0;
            target.mediumSolved += statInfo.mediumSolved || 0;
            target.hardSolved += statInfo.hardSolved || 0;
          } else if (platKey === 'gfg') {
            target.schoolSolved += statInfo.schoolSolved || 0;
            target.basicSolved += statInfo.basicSolved || 0;
            target.easySolved += statInfo.easySolved || 0;
            target.mediumSolved += statInfo.mediumSolved || 0;
            target.hardSolved += statInfo.hardSolved || 0;
          } else if (platKey === 'hackerrank') {
            target.badges += statInfo.badgesCount || statInfo.badges || 0;
            target.certificates += statInfo.certificatesCount || statInfo.certificates || 0;
          }
        }
      });
    });

    // Compute successRate and health status per platform
    Object.keys(platforms).forEach((platKey) => {
      const target = platforms[platKey];
      const completed = target.success + target.failed;
      if (completed > 0) {
        target.successRate = Math.round((target.success / completed) * 100);
      } else if (target.connected > 0) {
        target.successRate = target.success > 0 ? 100 : null;
      } else {
        target.successRate = null;
      }

      if (target.connected === 0) {
        target.health = 'NOT_CONFIGURED';
      } else if (target.failed > 0 && target.success === 0) {
        target.health = 'FAILED';
      } else if (target.failed > 0) {
        target.health = 'WARNING';
      } else {
        target.health = 'HEALTHY';
      }
    });

    return res.json({
      success: true,
      platforms,
      stats: platforms,
    });
  } catch (error) {
    next(error);
  }
};

const testPlatformConnectivity = async (req, res, next) => {
  try {
    const { platform } = req.params;
    let { handle } = req.body;

    const normPlatform = (platform || '').toLowerCase();
    if (!['leetcode', 'gfg', 'hackerrank', 'codeforces', 'codechef'].includes(normPlatform)) {
      return res.status(400).json({
        success: false,
        message: `Unsupported coding platform: ${platform}`,
      });
    }

    // If handle is not provided, pick a real linked student's profile from the database
    if (!handle || !handle.trim()) {
      const students = await getAllStudents();
      const linkedStudent = students.find((s) => {
        const p = s.platforms?.[normPlatform];
        return p?.username || p?.profileUrl;
      });

      if (!linkedStudent) {
        return res.status(404).json({
          success: false,
          message: `No linked student profile available for testing on ${platform}.`,
        });
      }

      handle = linkedStudent.platforms[normPlatform].profileUrl || linkedStudent.platforms[normPlatform].username;
    }

    const startTime = Date.now();
    try {
      const stats = await fetchPlatformProfile(normPlatform, handle.trim());
      const durationMs = Date.now() - startTime;

      if (stats && stats.status === 'SUCCESS') {
        await logAudit({
          admin: req.admin,
          action: 'PLATFORM_TEST_SUCCESS',
          target: `${normPlatform.toUpperCase()} (${handle})`,
          details: { platform: normPlatform, handle, durationMs, stats },
          req,
        });

        return res.json({
          success: true,
          platform: normPlatform,
          handle,
          durationMs,
          stats,
          message: `${normPlatform.toUpperCase()} test completed successfully in ${durationMs}ms.`,
        });
      } else {
        const errorMsg = stats?.errorMessage || 'Platform scraper failed to extract profile data';
        await logAudit({
          admin: req.admin,
          action: 'PLATFORM_TEST_FAILED',
          target: `${normPlatform.toUpperCase()} (${handle})`,
          details: { platform: normPlatform, handle, durationMs, error: errorMsg },
          req,
        });

        return res.json({
          success: false,
          platform: normPlatform,
          handle,
          durationMs,
          error: errorMsg,
          message: `${normPlatform.toUpperCase()} test failed: ${errorMsg}`,
        });
      }
    } catch (fetchErr) {
      const durationMs = Date.now() - startTime;
      await logAudit({
        admin: req.admin,
        action: 'PLATFORM_TEST_ERROR',
        target: `${normPlatform.toUpperCase()} (${handle})`,
        details: { platform: normPlatform, handle, durationMs, error: fetchErr.message },
        req,
      });

      return res.json({
        success: false,
        platform: normPlatform,
        handle,
        durationMs,
        error: fetchErr.message,
        message: `${normPlatform.toUpperCase()} test failed: ${fetchErr.message}`,
      });
    }
  } catch (error) {
    next(error);
  }
};

// ==============================================================================
// 8. SCORING & ADJUSTMENTS
// ==============================================================================

const getScoresOverview = async (req, res, next) => {
  try {
    const students = await getAllStudents({ accountStatus: 'ACTIVE' });
    const scores = students.map((s) => ({
      id: s.id,
      name: s.name,
      rollNumber: s.rollNumber,
      department: s.department,
      year: s.year,
      rank: s.rank,
      finalScore: s.finalScore || 0,
      scores: s.scores || {},
      platformStats: s.platformStats || {},
      lastDataUpdatedAt: s.lastDataUpdatedAt,
    }));

    // Deterministic sort by rank and final score (same as Leaderboard)
    scores.sort((a, b) => {
      const rankA = a.rank ?? 999999;
      const rankB = b.rank ?? 999999;
      if (rankA !== rankB) return rankA - rankB;
      return (b.finalScore || 0) - (a.finalScore || 0);
    });

    return res.json({
      success: true,
      weights: SCORING_WEIGHTS,
      students: scores,
      scores,
      totalCount: scores.length,
    });
  } catch (error) {
    next(error);
  }
};

const recalculateSingleScore = async (req, res, next) => {
  try {
    const id = req.params.studentId || req.params.id;
    const student = await getStudentByIdFromRepo(id);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const scoreResults = evaluateStudentScores(student.platformStats || {});
    await updateStudentInRepo(id, {
      scores: scoreResults,
      finalScore: scoreResults.finalScore,
      lastDataUpdatedAt: new Date().toISOString(),
    });

    await recalculateCollegeRankings('COLLEGE_MAIN');
    const updated = await getStudentByIdFromRepo(id);

    await logAudit({
      admin: req.admin,
      action: AUDIT_ACTIONS.SCORE_RECALCULATED,
      target: `${student.name} (${student.rollNumber || id})`,
      targetId: id,
      details: {
        studentId: id,
        studentName: student.name,
        rollNumber: student.rollNumber,
        previousScore: student.finalScore,
        newScore: updated.finalScore,
        difference: Number(((updated.finalScore || 0) - (student.finalScore || 0)).toFixed(2)),
        formula: 'RankBoard Scoring Engine v2.0 (50% Problem Solving, 20% DSA, 20% Competitive, 10% Consistency)',
        trigger: 'ADMIN_MANUAL_RECALCULATE',
        status: 'SUCCESS',
      },
      req,
    });

    return res.json({ success: true, student: updated });
  } catch (error) {
    next(error);
  }
};

const recalculateAllScores = async (req, res, next) => {
  try {
    const students = await getAllStudents();
    let updatedCount = 0;
    let unchangedCount = 0;
    let errorCount = 0;

    for (const s of students) {
      try {
        const scoreResults = evaluateStudentScores(s.platformStats || {});
        const isChanged = Math.abs((s.finalScore || 0) - (scoreResults.finalScore || 0)) > 0.001;
        if (isChanged) {
          updatedCount++;
        } else {
          unchangedCount++;
        }

        await updateStudentInRepo(s.id, {
          scores: scoreResults,
          finalScore: scoreResults.finalScore,
          lastDataUpdatedAt: new Date().toISOString(),
        });
      } catch (err) {
        errorCount++;
        console.error(`Error recalculating score for ${s.name} (${s.id}):`, err.message);
      }
    }

    await recalculateCollegeRankings('COLLEGE_MAIN');

    await logAudit({
      admin: req.admin,
      action: AUDIT_ACTIONS.ALL_SCORES_RECALCULATED,
      target: `COLLEGE_MAIN (${students.length} students)`,
      details: {
        jobId: `recalc_${Date.now()}`,
        totalStudents: students.length,
        updatedCount,
        unchangedCount,
        errorCount,
        status: errorCount > 0 ? 'COMPLETED_WITH_ERRORS' : 'SUCCESS',
      },
      req,
    });

    return res.json({
      success: true,
      message: `Recalculated scores for ${students.length} students (${updatedCount} updated, ${unchangedCount} unchanged, ${errorCount} errors).`,
      processed: students.length,
      updated: updatedCount,
      unchanged: unchangedCount,
      errors: errorCount,
    });
  } catch (error) {
    next(error);
  }
};

const adjustStudentScore = async (req, res, next) => {
  try {
    const id = req.params.studentId || req.params.id;
    let { adjustment, adjustedScore, reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A mandatory justification reason is required for score adjustment.',
      });
    }

    const student = await getStudentByIdFromRepo(id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const previousScore = Number(student.finalScore || 0);
    let newScore;

    if (adjustedScore !== undefined && !isNaN(Number(adjustedScore))) {
      newScore = Number(adjustedScore);
      adjustment = Number((newScore - previousScore).toFixed(2));
    } else if (adjustment !== undefined && !isNaN(Number(adjustment))) {
      adjustment = Number(adjustment);
      newScore = Number((previousScore + adjustment).toFixed(2));
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either adjustment delta (+/- points) or adjustedScore is required.',
      });
    }

    await updateStudentInRepo(id, {
      finalScore: newScore,
      lastDataUpdatedAt: new Date().toISOString(),
    });

    await insertScoreAdjustment({
      studentId: id,
      adminId: req.admin?.userId || req.admin?.id || 'admin_user',
      adminEmail: req.admin?.email || 'admin@rankboard.edu',
      previousScore,
      adjustedScore: newScore,
      reason: reason.trim(),
    });

    await recalculateCollegeRankings('COLLEGE_MAIN');

    await logAudit({
      admin: req.admin,
      action: AUDIT_ACTIONS.MANUAL_SCORE_ADJUSTMENT,
      target: `${student.name} (${student.rollNumber || id})`,
      targetId: id,
      reason: reason.trim(),
      details: {
        studentId: id,
        studentName: student.name,
        rollNumber: student.rollNumber,
        previousScore,
        newScore,
        difference: adjustment,
        adjustment,
        reason: reason.trim(),
        status: 'SUCCESS',
      },
      req,
    });

    return res.json({
      success: true,
      message: `Score adjusted for ${student.name} from ${previousScore.toFixed(2)} to ${newScore.toFixed(2)} (${adjustment >= 0 ? '+' : ''}${adjustment.toFixed(2)} pts).`,
      finalScore: newScore,
      previousScore,
      adjustment,
    });
  } catch (error) {
    next(error);
  }
};

const getScoreAdjustments = async (req, res, next) => {
  try {
    const rawAdjustments = await getScoreAdjustmentsFromRepo(50);
    const students = await getAllStudents();
    const studentMap = {};
    students.forEach((s) => {
      studentMap[s.id] = s;
    });

    const adjustments = rawAdjustments.map((a) => {
      const student = studentMap[a.student_id || a.studentId];
      const prev = Number(a.previous_score ?? a.previousScore ?? 0);
      const nextScore = Number(a.adjusted_score ?? a.adjustedScore ?? 0);
      const delta = Number((nextScore - prev).toFixed(2));

      return {
        id: a.id,
        timestamp: a.created_at || a.createdAt || a.timestamp || new Date().toISOString(),
        studentId: a.student_id || a.studentId,
        studentName: student?.name || a.student_name || 'Unknown Student',
        rollNumber: student?.rollNumber || a.roll_number || '—',
        department: student?.department || a.department || '—',
        previousScore: prev.toFixed(2),
        newScore: nextScore.toFixed(2),
        adjustment: delta,
        reason: a.reason || 'Manual Adjustment',
        adminName: a.admin_name || a.adminName || 'Admin',
        adminEmail: a.admin_email || a.adminEmail || 'admin@rankboard.edu',
      };
    });

    return res.json({ success: true, adjustments });
  } catch (error) {
    next(error);
  }
};

// ==============================================================================
// 9. ANOMALY DETECTION & AI INSIGHTS
// ==============================================================================

const getAnomalies = async (req, res, next) => {
  try {
    const students = await getAllStudents();
    const anomalies = [];

    const handleMap = { leetcode: {}, gfg: {}, codeforces: {}, codechef: {}, hackerrank: {} };
    const emailMap = {};
    const rollMap = {};

    let totalPlatformLinksChecked = 0;
    let totalSyncRecordsChecked = 0;

    const validBranches = [
      'cse', 'it', 'aiml', 'iot', 'ai', 'ece', 'eee', 'me', 'mech', 'civil',
      'csds', 'csbs', 'csit', 'vlsi', 'prime', 'computer science',
      'information technology', 'artificial intelligence', 'data science',
    ];

    students.forEach((s) => {
      if (s.accountStatus === 'DISABLED') return;

      const p = s.platforms || {};
      const ps = s.platformStats || {};

      // 1. Missing Required Information
      if (!s.name || !s.name.trim()) {
        anomalies.push({
          id: `missing_name_${s.id}`,
          studentId: s.id,
          studentName: 'Unnamed Student',
          rollNumber: s.rollNumber || '—',
          email: s.email,
          category: 'MISSING_DATA',
          type: 'MISSING_NAME',
          severity: 'HIGH',
          title: 'Missing Student Name',
          description: `Student account ${s.email} has no registered student name.`,
          detectedAt: new Date().toISOString(),
        });
      }

      if (!s.rollNumber || !s.rollNumber.trim()) {
        anomalies.push({
          id: `missing_roll_${s.id}`,
          studentId: s.id,
          studentName: s.name,
          rollNumber: '—',
          email: s.email,
          category: 'MISSING_DATA',
          type: 'MISSING_ROLL_NUMBER',
          severity: 'HIGH',
          title: 'Missing Roll Number',
          description: `Student ${s.name} (${s.email}) has no associated roll number.`,
          detectedAt: new Date().toISOString(),
        });
      }

      if (!s.department || !s.department.trim()) {
        anomalies.push({
          id: `missing_dept_${s.id}`,
          studentId: s.id,
          studentName: s.name,
          rollNumber: s.rollNumber || '—',
          email: s.email,
          category: 'MISSING_DATA',
          type: 'MISSING_DEPARTMENT',
          severity: 'HIGH',
          title: 'Missing Department/Branch',
          description: `Student ${s.name} has not been assigned to an academic branch or department.`,
          detectedAt: new Date().toISOString(),
        });
      } else {
        const deptNorm = s.department.trim().toLowerCase();
        const isValidBranch = validBranches.some((b) => deptNorm.includes(b));
        if (!isValidBranch) {
          anomalies.push({
            id: `invalid_dept_${s.id}`,
            studentId: s.id,
            studentName: s.name,
            rollNumber: s.rollNumber || '—',
            email: s.email,
            category: 'INVALID_METADATA',
            type: 'INVALID_DEPARTMENT',
            severity: 'MEDIUM',
            title: 'Unrecognized Academic Branch',
            description: `Department "${s.department}" does not match recognized college curriculum codes.`,
            detectedAt: new Date().toISOString(),
          });
        }
      }

      if (!s.year || s.year < 1 || s.year > 5) {
        anomalies.push({
          id: `invalid_year_${s.id}`,
          studentId: s.id,
          studentName: s.name,
          rollNumber: s.rollNumber || '—',
          email: s.email,
          category: 'INVALID_METADATA',
          type: 'INVALID_YEAR',
          severity: 'LOW',
          title: 'Invalid Academic Year',
          description: `Year value "${s.year}" is outside expected academic range (1-4).`,
          detectedAt: new Date().toISOString(),
        });
      }

      // 2. Duplicate Student Detection (Email & Roll Number)
      if (s.email) {
        const normEmail = s.email.toLowerCase().trim();
        if (emailMap[normEmail]) {
          anomalies.push({
            id: `dup_email_${s.id}`,
            studentId: s.id,
            studentName: s.name,
            rollNumber: s.rollNumber || '—',
            email: s.email,
            category: 'DUPLICATE_RECORD',
            type: 'DUPLICATE_EMAIL',
            severity: 'CRITICAL',
            title: 'Duplicate Email Detected',
            description: `Email "${s.email}" is shared with student ${emailMap[normEmail].name} (${emailMap[normEmail].rollNumber}).`,
            detectedAt: new Date().toISOString(),
          });
        } else {
          emailMap[normEmail] = { id: s.id, name: s.name, rollNumber: s.rollNumber };
        }
      }

      if (s.rollNumber && s.rollNumber.trim()) {
        const normRoll = s.rollNumber.toUpperCase().trim();
        if (rollMap[normRoll]) {
          anomalies.push({
            id: `dup_roll_${s.id}`,
            studentId: s.id,
            studentName: s.name,
            rollNumber: s.rollNumber,
            email: s.email,
            category: 'DUPLICATE_RECORD',
            type: 'DUPLICATE_ROLL_NUMBER',
            severity: 'HIGH',
            title: 'Duplicate Roll Number Detected',
            description: `Roll number "${s.rollNumber}" is duplicated on ${rollMap[normRoll].name} (${rollMap[normRoll].email}).`,
            detectedAt: new Date().toISOString(),
          });
        } else {
          rollMap[normRoll] = { id: s.id, name: s.name, email: s.email };
        }
      }

      // 3. Platform-specific inspections across all 5 platforms
      const platformsList = ['leetcode', 'gfg', 'hackerrank', 'codeforces', 'codechef'];

      platformsList.forEach((plat) => {
        totalPlatformLinksChecked++;
        const platInfo = p[plat];
        const statInfo = ps[plat];

        if (platInfo?.lastFetchedAt) totalSyncRecordsChecked++;

        // Duplicate handle detection
        const u = platInfo?.username;
        if (u && u.trim()) {
          const lowerU = u.toLowerCase().trim();
          if (handleMap[plat][lowerU]) {
            anomalies.push({
              id: `dup_handle_${plat}_${s.id}`,
              studentId: s.id,
              studentName: s.name,
              rollNumber: s.rollNumber || '—',
              email: s.email,
              platform: plat,
              category: 'DUPLICATE_RECORD',
              type: 'DUPLICATE_HANDLE',
              severity: 'HIGH',
              title: `Duplicate ${plat.toUpperCase()} Handle`,
              description: `Shared ${plat.toUpperCase()} username "${u}" with ${handleMap[plat][lowerU].name} (${handleMap[plat][lowerU].rollNumber}).`,
              detectedAt: new Date().toISOString(),
            });
          } else {
            handleMap[plat][lowerU] = { id: s.id, name: s.name, rollNumber: s.rollNumber };
          }
        }

        // Invalid Platform URL Detection
        const rawUrl = platInfo?.profileUrl;
        if (rawUrl && typeof rawUrl === 'string' && rawUrl.trim().startsWith('http')) {
          let parsedHandle = null;
          if (plat === 'leetcode') parsedHandle = parseLeetCodeUrl(rawUrl);
          else if (plat === 'gfg') parsedHandle = parseGFGUrl(rawUrl);
          else if (plat === 'hackerrank') parsedHandle = parseHackerRankUrl(rawUrl);
          else if (plat === 'codeforces') parsedHandle = parseCodeforcesUrl(rawUrl);
          else if (plat === 'codechef') parsedHandle = parseCodeChefUrl(rawUrl);

          if (!parsedHandle) {
            anomalies.push({
              id: `invalid_url_${plat}_${s.id}`,
              studentId: s.id,
              studentName: s.name,
              rollNumber: s.rollNumber || '—',
              email: s.email,
              platform: plat,
              category: 'INVALID_URL',
              type: 'INVALID_PROFILE_URL',
              severity: 'HIGH',
              title: `Invalid ${plat.toUpperCase()} Profile URL`,
              description: `Stored URL "${rawUrl}" does not match standard ${plat.toUpperCase()} format or domain.`,
              detectedAt: new Date().toISOString(),
            });
          }
        }

        // Sync Failure Detection
        if (platInfo?.status === 'FAILED' || platInfo?.status === 'RATE_LIMITED') {
          anomalies.push({
            id: `sync_fail_${plat}_${s.id}`,
            studentId: s.id,
            studentName: s.name,
            rollNumber: s.rollNumber || '—',
            email: s.email,
            platform: plat,
            category: 'SYNC_FAILURE',
            type: 'SYNC_FAILURE',
            severity: plat === 'leetcode' || plat === 'gfg' || plat === 'hackerrank' ? 'HIGH' : 'MEDIUM',
            title: `${plat.toUpperCase()} Synchronization Failure`,
            description: platInfo.errorMessage || `Synchronization failed during last profile fetch.`,
            detectedAt: platInfo.lastFetchedAt || new Date().toISOString(),
          });
        }

        // Profile linked but missing statistics
        const hasLink = !!(platInfo?.username || platInfo?.profileUrl);
        if (hasLink && !statInfo && platInfo?.status === 'NOT_CONNECTED') {
          anomalies.push({
            id: `unfetched_${plat}_${s.id}`,
            studentId: s.id,
            studentName: s.name,
            rollNumber: s.rollNumber || '—',
            email: s.email,
            platform: plat,
            category: 'MISSING_DATA',
            type: 'UNSYNCHRONIZED_PROFILE',
            severity: 'LOW',
            title: `Unsynchronized ${plat.toUpperCase()} Profile`,
            description: `Profile URL is linked but platform statistics have never been retrieved.`,
            detectedAt: new Date().toISOString(),
          });
        }

        // Platform statistics consistency check (easy + med + hard > total)
        if (statInfo) {
          const easy = statInfo.easySolved || 0;
          const med = statInfo.mediumSolved || 0;
          const hard = statInfo.hardSolved || 0;
          const total = statInfo.totalSolved || 0;

          if (easy + med + hard > total && total > 0) {
            anomalies.push({
              id: `stat_inconsistency_${plat}_${s.id}`,
              studentId: s.id,
              studentName: s.name,
              rollNumber: s.rollNumber || '—',
              email: s.email,
              platform: plat,
              category: 'STATISTICS_INCONSISTENCY',
              type: 'DIFFICULTY_TOTAL_MISMATCH',
              severity: 'MEDIUM',
              title: `${plat.toUpperCase()} Difficulty Sum Exceeds Total`,
              description: `Sum of Easy (${easy}) + Medium (${med}) + Hard (${hard}) = ${easy + med + hard}, which exceeds reported total ${total}.`,
              detectedAt: new Date().toISOString(),
            });
          }
        }
      });

      // 4. Score Consistency Check
      const calculatedScores = evaluateStudentScores(ps);
      const storedFinal = s.finalScore || 0;
      const expectedFinal = calculatedScores.finalScore || 0;

      if (Math.abs(storedFinal - expectedFinal) > 0.05 && (storedFinal > 0 || expectedFinal > 0)) {
        anomalies.push({
          id: `score_inconsistency_${s.id}`,
          studentId: s.id,
          studentName: s.name,
          rollNumber: s.rollNumber || '—',
          email: s.email,
          category: 'SCORE_INCONSISTENCY',
          type: 'STORED_CALCULATED_SCORE_MISMATCH',
          severity: 'MEDIUM',
          title: 'Stored Score Differs from Calculated Score',
          description: `Stored overall score (${storedFinal.toFixed(2)}) differs from rule-calculated score (${expectedFinal.toFixed(2)}).`,
          detectedAt: new Date().toISOString(),
        });
      }
    });

    return res.json({
      success: true,
      anomalies,
      meta: {
        totalStudentsScanned: students.length,
        platformLinksChecked: totalPlatformLinksChecked,
        syncRecordsChecked: totalSyncRecordsChecked,
        anomaliesCount: anomalies.length,
        scannedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

const resolveAnomaly = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { studentId, action, platform } = req.body;

    if (action === 'RETRY_SYNC' && (studentId || id)) {
      const targetId = studentId || id;
      const syncResult = await syncStudentPlatforms(targetId, null, { forceSync: true });

      await logAudit({
        admin: req.admin || { name: 'Admin', email: 'admin@rankboard.edu' },
        action: 'ANOMALY_RESOLVED_SYNC',
        target: `Student ${targetId}`,
        targetId,
        details: { action, platform },
        req,
      });

      return res.json({
        success: true,
        message: 'Student synchronization executed successfully.',
        student: syncResult.student,
      });
    }

    return res.json({
      success: true,
      message: `Anomaly ${id || 'record'} acknowledged.`,
    });
  } catch (error) {
    next(error);
  }
};

const getAiInsights = async (req, res, next) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const insights = await generateAiInsights({ forceRefresh });
    return res.json({ success: true, insights });
  } catch (error) {
    next(error);
  }
};

const refreshAiInsights = async (req, res, next) => {
  try {
    invalidateInsightsCache();
    const insights = await generateAiInsights({ forceRefresh: true });
    return res.json({
      success: true,
      message: 'AI insights refreshed from live database.',
      insights,
    });
  } catch (error) {
    next(error);
  }
};

// ==============================================================================
// 10. AUDIT LOGS & NOTIFICATIONS
// ==============================================================================

const getAuditLogs = async (req, res, next) => {
  try {
    const { page, limit, search, action, target, actor, startDate, endDate, isExport, format } = req.query;
    const result = await getAuditLogsFromRepo({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      search: search || '',
      action: action || '',
      target: target || '',
      actor: actor || '',
      startDate: startDate || '',
      endDate: endDate || '',
    });

    if (isExport === 'true' || isExport === true) {
      await logAudit({
        admin: req.admin,
        action: AUDIT_ACTIONS.AUDIT_LOG_EXPORTED,
        target: `AUDIT_LOGS (${result.totalCount || result.logs?.length || 0} records)`,
        details: {
          exportFormat: format || 'CSV',
          filteredAction: action || 'ALL',
          searchQuery: search || null,
          totalExported: result.totalCount || result.logs?.length || 0,
        },
        req,
      });
    }

    return res.json({
      success: true,
      logs: result.logs || [],
      totalCount: result.totalCount || 0,
      totalPages: result.totalPages || 1,
      currentPage: result.currentPage || 1,
      limit: result.limit || 50,
    });
  } catch (error) {
    next(error);
  }
};

const getNotifications = async (req, res, next) => {
  try {
    const notifications = await getNotificationsFromRepo(30);
    const unreadCount = notifications.filter((n) => !n.read).length;
    return res.json({ success: true, unreadCount, notifications });
  } catch (error) {
    next(error);
  }
};

const markNotificationRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    await markNotificationReadInRepo(id);
    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    next(error);
  }
};

const clearNotifications = async (req, res, next) => {
  try {
    await clearNotificationsInRepo();
    return res.json({ success: true, message: 'All notifications cleared.' });
  } catch (error) {
    next(error);
  }
};

// ==============================================================================
// 11. SETTINGS & SYSTEM HEALTH
// ==============================================================================

const getSettings = async (req, res, next) => {
  try {
    const saved = await getSystemSettings();
    const admins = await getAllAdmins();

    return res.json({
      success: true,
      settings: {
        collegeId: config.COLLEGE_ID,
        collegeName: config.COLLEGE_NAME,
        syncBatchSize: saved.syncBatchSize || 5,
        syncThrottleMs: saved.syncThrottleMs || 350,
        enableAutoSyncOnImport: saved.enableAutoSyncOnImport !== false,
        scoringWeights: SCORING_WEIGHTS,
        systemHealth: {
          serverUptimeSeconds: Math.floor(process.uptime()),
          nodeVersion: process.version,
          supabaseConnected: true,
          clerkConfigured: !!config.CLERK_SECRET_KEY,
          environment: config.NODE_ENV,
        },
      },
      admins,
    });
  } catch (error) {
    next(error);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    const { syncBatchSize, syncThrottleMs, enableAutoSyncOnImport } = req.body;

    const payload = {
      ...(syncBatchSize !== undefined && { syncBatchSize: parseInt(syncBatchSize, 10) }),
      ...(syncThrottleMs !== undefined && { syncThrottleMs: parseInt(syncThrottleMs, 10) }),
      ...(enableAutoSyncOnImport !== undefined && { enableAutoSyncOnImport: !!enableAutoSyncOnImport }),
      updatedBy: req.admin?.email || 'admin@rankboard.edu',
    };

    const saved = await updateSystemSettingsInRepo(payload);

    await logAudit({
      admin: req.admin,
      action: AUDIT_ACTIONS.SETTINGS_CHANGED,
      target: 'SYSTEM_SETTINGS',
      details: payload,
      req,
    });

    return res.json({
      success: true,
      message: 'System settings updated successfully.',
      settings: saved,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminProfile,
  getDashboardStats,
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  toggleStudentStatus,
  deleteStudent,
  syncStudent,
  syncAllStudents,
  getSyncStatus,
  getSyncLogs,
  validateImportData,
  confirmImport,
  getImportHistory,
  getImportTemplate,
  getAdminLeaderboard,
  recalculateLeaderboard,
  getPlatformStats,
  testPlatformConnectivity,
  getScoresOverview,
  recalculateSingleScore,
  recalculateAllScores,
  adjustStudentScore,
  getScoreAdjustments,
  getAnomalies,
  resolveAnomaly,
  getAiInsights,
  refreshAiInsights,
  getAuditLogs,
  getNotifications,
  markNotificationRead,
  clearNotifications,
  getSettings,
  updateSettings,
};
