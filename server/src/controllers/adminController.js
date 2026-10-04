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
const { logAudit, createAdminNotification } = require('../utils/auditLogger');
const {
  parseLeetCodeUrl,
  parseGFGUrl,
  parseCodeforcesUrl,
  parseCodeChefUrl,
  formatCanonicalUrl,
} = require('../utils/urlParsers');
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
// 2. DASHBOARD METRICS
// ==============================================================================

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

    let successfulSyncs = 0;
    let failedSyncs = 0;
    let pendingSyncs = 0;

    let totalProblemsSolved = 0;
    let totalLeetcodeSolved = 0;
    let totalGFGSolved = 0;
    let totalCodeforcesSolved = 0;
    let totalCodechefSolved = 0;

    const platformConnectedCounts = {
      leetcode: 0,
      gfg: 0,
      codeforces: 0,
      codechef: 0,
    };

    const departmentStats = {};
    const yearStats = {};

    let totalScoreSum = 0;
    let highestScore = 0;
    let topScorer = null;

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

      // Platform metrics
      const platforms = data.platforms || {};
      const stats = data.platformStats || {};

      ['leetcode', 'gfg', 'codeforces', 'codechef'].forEach((plat) => {
        const pConf = platforms[plat];
        if (pConf && (pConf.profileUrl || pConf.username)) {
          platformConnectedCounts[plat]++;
          if (pConf.status === 'SUCCESS') successfulSyncs++;
          else if (pConf.status === 'FAILED') failedSyncs++;
          else pendingSyncs++;
        }
      });

      const lcSolved = stats.leetcode?.totalSolved || 0;
      const gfgSolved = stats.gfg?.totalSolved || 0;
      const cfSolved = stats.codeforces?.totalSolved || 0;
      const ccSolved = stats.codechef?.totalSolved || 0;

      totalLeetcodeSolved += lcSolved;
      totalGFGSolved += gfgSolved;
      totalCodeforcesSolved += cfSolved;
      totalCodechefSolved += ccSolved;

      const studentSolved = lcSolved + gfgSolved + cfSolved + ccSolved;
      totalProblemsSolved += studentSolved;
      if (departmentStats[dept]) {
        departmentStats[dept].totalSolved += studentSolved;
      }
    });

    const averageScore = activeStudents > 0 ? Number((totalScoreSum / activeStudents).toFixed(2)) : 0;

    // Recent audits and notifications
    const recentAuditLogs = await getAuditLogsFromRepo(5);
    const notifications = await getNotificationsFromRepo(10);
    const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

    return res.json({
      success: true,
      stats: {
        students: {
          total: totalStudents,
          active: activeStudents,
          disabled: disabledStudents,
          profilesComplete,
          profilesIncomplete,
          withScores: studentsWithScores,
          withoutScores: studentsWithoutScores,
        },
        platforms: {
          connectedCounts: platformConnectedCounts,
          totalProblemsSolved,
          byPlatform: {
            leetcode: { totalSolved: totalLeetcodeSolved, connected: platformConnectedCounts.leetcode },
            gfg: { totalSolved: totalGFGSolved, connected: platformConnectedCounts.gfg },
            codeforces: { totalSolved: totalCodeforcesSolved, connected: platformConnectedCounts.codeforces },
            codechef: { totalSolved: totalCodechefSolved, connected: platformConnectedCounts.codechef },
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
        years: yearStats,
        recentActivity: recentAuditLogs,
        notifications: {
          unreadCount: unreadNotificationsCount,
          recent: notifications.slice(0, 5),
        },
      },
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
      syncStatus = 'ALL',
      sortField = 'finalScore',
      sortOrder = 'desc',
    } = req.query;

    const rawStudents = await getAllStudents();

    let filtered = rawStudents.filter((student) => {
      // Status filter
      if (status !== 'ALL' && student.accountStatus !== status) {
        return false;
      }

      // Department filter
      if (department !== 'ALL' && student.department !== department) {
        return false;
      }

      // Year filter
      if (year !== 'ALL' && String(student.year) !== String(year)) {
        return false;
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
        totalPages: Math.ceil(totalRecords / limitNum),
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
    const { id } = req.params;
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
        finalScore: 0,
      },
      platforms,
      platformStats: {
        leetcode: null,
        gfg: null,
        codeforces: null,
        codechef: null,
      },
      lastDataUpdatedAt: new Date().toISOString(),
    };

    const createdRecord = await upsertStudent(newStudent);

    // Auto-sync platforms in background if URLs provided
    const hasAnyHandle = lcHandle || gfgHandle || cfHandle || ccHandle;
    if (hasAnyHandle) {
      syncStudentPlatforms(docId).catch((err) => {
        console.warn(`[Auto-sync on create failed for ${docId}]:`, err.message);
      });
    }

    await logAudit({
      admin: req.admin,
      action: 'STUDENT_CREATED',
      target: `${name} (${rollNumber || normalizedEmail})`,
      targetId: docId,
      details: { email: normalizedEmail, rollNumber },
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
    const { id } = req.params;
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

    if (platformUrlsChanged) {
      updates.platforms = currentPlatforms;
    }

    const updatedRecord = await updateStudentInRepo(id, updates);

    // If status changed or rank affected, recalculate rankings
    if (accountStatus !== undefined) {
      await recalculateCollegeRankings(existingStudent.collegeId || 'COLLEGE_MAIN');
    }

    await logAudit({
      admin: req.admin,
      action: 'STUDENT_UPDATED',
      target: `${existingStudent.name} (${existingStudent.rollNumber || id})`,
      targetId: id,
      details: { updates },
      req,
    });

    return res.json({
      success: true,
      message: 'Student details updated successfully.',
      student: updatedRecord,
    });
  } catch (error) {
    next(error);
  }
};

const toggleStudentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
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
      action: status === 'DISABLED' ? 'STUDENT_DISABLED' : 'STUDENT_ENABLED',
      target: `${student.name} (${student.rollNumber || id})`,
      targetId: id,
      details: { previousStatus: student.accountStatus, newStatus: status },
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
    const { id } = req.params;
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
      action: 'STUDENT_DELETED',
      target: `${student.name} (${student.rollNumber || id})`,
      targetId: id,
      details: { deletedEmail: student.email, rollNumber: student.rollNumber },
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
    const { id } = req.params;
    const student = await getStudentByIdFromRepo(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: `Student not found with ID: ${id}`,
      });
    }

    const updated = await syncStudentPlatforms(id);

    await logAudit({
      admin: req.admin,
      action: 'STUDENT_SYNCHRONIZED',
      target: `${student.name} (${student.rollNumber || id})`,
      targetId: id,
      details: { finalScore: updated.finalScore, rank: updated.rank },
      req,
    });

    return res.json({
      success: true,
      message: `Platform statistics synchronized for ${student.name}.`,
      student: updated,
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
      return p.leetcode?.username || p.gfg?.username || p.codeforces?.username || p.codechef?.username;
    });

    const jobId = `sync_${Date.now()}`;
    activeSyncJob = {
      id: jobId,
      status: 'RUNNING',
      startedAt: new Date().toISOString(),
      total: studentsToSync.length,
      processed: 0,
      successful: 0,
      failed: 0,
      currentStudent: null,
      errors: [],
    };

    // Respond immediately, run in background
    res.json({
      success: true,
      message: `Started bulk synchronization for ${studentsToSync.length} students.`,
      jobId,
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
              await syncStudentPlatforms(st.id);
              activeSyncJob.successful++;
            } catch (err) {
              activeSyncJob.failed++;
              activeSyncJob.errors.push({ studentId: st.id, name: st.name, error: err.message });
            } finally {
              activeSyncJob.processed++;
            }
          })
        );
        await sleep(throttleMs);
      }

      await recalculateCollegeRankings('COLLEGE_MAIN');
      activeSyncJob.status = 'COMPLETED';
      activeSyncJob.completedAt = new Date().toISOString();
      activeSyncJob.currentStudent = null;

      await createAdminNotification({
        type: 'IMPORT_COMPLETE',
        title: 'Bulk Synchronization Completed',
        message: `Synchronized ${activeSyncJob.successful} students successfully. Failed: ${activeSyncJob.failed}.`,
        severity: activeSyncJob.failed > 0 ? 'WARNING' : 'SUCCESS',
      });
    })().catch((err) => {
      console.error('[Bulk Sync Background Error]:', err);
      if (activeSyncJob) {
        activeSyncJob.status = 'FAILED';
        activeSyncJob.error = err.message;
      }
    });
  } catch (error) {
    next(error);
  }
};

const getSyncStatus = async (req, res) => {
  return res.json({
    success: true,
    job: activeSyncJob || { status: 'IDLE' },
  });
};

const getSyncLogs = async (req, res) => {
  return res.json({
    success: true,
    logs: activeSyncJob ? activeSyncJob.errors : [],
  });
};

// ==============================================================================
// 5. BULK IMPORT & VALIDATION
// ==============================================================================

const validateImportData = async (req, res, next) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Request body must include a "rows" array containing student objects.',
      });
    }

    const existingStudents = await getAllStudents();
    const existingEmails = new Set(existingStudents.map((s) => (s.email || '').toLowerCase()));
    const existingRolls = new Set(existingStudents.map((s) => (s.rollNumber || '').toLowerCase()).filter(Boolean));

    const validatedRows = [];
    const summary = {
      total: rows.length,
      valid: 0,
      duplicates: 0,
      invalid: 0,
    };

    rows.forEach((r, idx) => {
      const email = (r.email || '').trim().toLowerCase();
      const name = (r.name || '').trim();
      const rollNumber = (r.rollNumber || r.roll_number || r.rollNo || '').trim();
      const department = (r.department || 'PRIME').trim();
      const year = parseInt(r.year, 10) || 4;

      const leetcodeInput = r.leetcodeUrl || r.leetcode || '';
      const gfgInput = r.gfgUrl || r.gfg || '';
      const codeforcesInput = r.codeforcesUrl || r.codeforces || '';
      const codechefInput = r.codechefUrl || r.codechef || '';

      const errors = [];
      if (!email) errors.push('Email is required.');
      if (!name) errors.push('Name is required.');

      const isDuplicateEmail = email && existingEmails.has(email);
      const isDuplicateRoll = rollNumber && existingRolls.has(rollNumber.toLowerCase());

      const lcHandle = parseLeetCodeUrl(leetcodeInput);
      const gfgHandle = parseGFGUrl(gfgInput);
      const cfHandle = parseCodeforcesUrl(codeforcesInput);
      const ccHandle = parseCodeChefUrl(codechefInput);

      const isValid = errors.length === 0 && !isDuplicateEmail;

      if (isDuplicateEmail) summary.duplicates++;
      else if (errors.length > 0) summary.invalid++;
      else summary.valid++;

      validatedRows.push({
        rowIndex: idx + 1,
        name,
        email,
        rollNumber,
        department,
        year,
        leetcodeHandle: lcHandle,
        gfgHandle,
        codeforcesHandle: cfHandle,
        codechefHandle: ccHandle,
        leetcodeUrl: lcHandle ? formatCanonicalUrl('leetcode', lcHandle) : leetcodeInput,
        gfgUrl: gfgHandle ? formatCanonicalUrl('gfg', gfgHandle) : gfgInput,
        codeforcesUrl: cfHandle ? formatCanonicalUrl('codeforces', cfHandle) : codeforcesInput,
        codechefUrl: ccHandle ? formatCanonicalUrl('codechef', ccHandle) : codechefInput,
        isDuplicate: isDuplicateEmail || isDuplicateRoll,
        duplicateReason: isDuplicateEmail ? 'Email already registered' : (isDuplicateRoll ? 'Roll number already exists' : null),
        isValid,
        errors,
      });
    });

    return res.json({
      success: true,
      summary,
      rows: validatedRows,
    });
  } catch (error) {
    next(error);
  }
};

const confirmImport = async (req, res, next) => {
  try {
    const { rows, fileName, autoSync = true } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No student rows provided for import.',
      });
    }

    let importedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const importedIds = [];

    for (const r of rows) {
      const email = (r.email || '').trim().toLowerCase();
      if (!email || !r.name) {
        skippedCount++;
        continue;
      }

      const docId = `import_${Buffer.from(email).toString('hex').slice(0, 24)}`;
      const lcHandle = parseLeetCodeUrl(r.leetcodeUrl || '');
      const gfgHandle = parseGFGUrl(r.gfgUrl || '');
      const cfHandle = parseCodeforcesUrl(r.codeforcesUrl || '');
      const ccHandle = parseCodeChefUrl(r.codechefUrl || '');

      const studentRecord = {
        id: docId,
        clerkUserId: null,
        collegeId: config.COLLEGE_ID,
        name: r.name.trim(),
        email,
        rollNumber: (r.rollNumber || '').trim(),
        department: r.department || 'PRIME',
        year: parseInt(r.year, 10) || 4,
        profilePhoto: '',
        role: 'STUDENT',
        accountStatus: 'ACTIVE',
        profileCompleted: !!(lcHandle && gfgHandle && ccHandle),
        finalScore: 0,
        rank: null,
        scores: {
          leetcodeScore: 0,
          gfgScore: 0,
          codeforcesScore: 0,
          codechefScore: 0,
          finalScore: 0,
        },
        platforms: {
          leetcode: {
            profileUrl: r.leetcodeUrl || (lcHandle ? formatCanonicalUrl('leetcode', lcHandle) : ''),
            username: lcHandle || '',
            status: lcHandle ? 'PENDING' : 'NOT_CONNECTED',
          },
          gfg: {
            profileUrl: r.gfgUrl || (gfgHandle ? formatCanonicalUrl('gfg', gfgHandle) : ''),
            username: gfgHandle || '',
            status: gfgHandle ? 'PENDING' : 'NOT_CONNECTED',
          },
          codeforces: {
            profileUrl: r.codeforcesUrl || (cfHandle ? formatCanonicalUrl('codeforces', cfHandle) : ''),
            username: cfHandle || '',
            status: cfHandle ? 'PENDING' : 'NOT_CONNECTED',
          },
          codechef: {
            profileUrl: r.codechefUrl || (ccHandle ? formatCanonicalUrl('codechef', ccHandle) : ''),
            username: ccHandle || '',
            status: ccHandle ? 'PENDING' : 'NOT_CONNECTED',
          },
        },
        platformStats: {
          leetcode: null,
          gfg: null,
          codeforces: null,
          codechef: null,
        },
        lastDataUpdatedAt: new Date().toISOString(),
      };

      try {
        await upsertStudent(studentRecord);
        importedCount++;
        importedIds.push(docId);
      } catch (err) {
        console.error(`[Import Row Error for ${email}]:`, err.message);
        failedCount++;
      }
    }

    // Insert import history
    await insertImportHistory({
      adminId: req.admin.userId,
      adminEmail: req.admin.email,
      fileName: fileName || 'bulk_import.xlsx',
      totalRows: rows.length,
      importedCount,
      skippedCount,
      failedCount,
      status: failedCount === 0 ? 'SUCCESS' : 'COMPLETED_WITH_ERRORS',
      details: { importedIdsCount: importedIds.length },
    });

    await recalculateCollegeRankings('COLLEGE_MAIN');

    await logAudit({
      admin: req.admin,
      action: 'BULK_IMPORT',
      target: fileName || 'Bulk Import File',
      details: { totalRows: rows.length, importedCount, skippedCount, failedCount },
      req,
    });

    // Trigger background sync if requested
    if (autoSync && importedIds.length > 0) {
      (async () => {
        for (const id of importedIds) {
          try {
            await syncStudentPlatforms(id);
          } catch (e) {
            // non-fatal
          }
        }
      })().catch(console.error);
    }

    return res.json({
      success: true,
      message: `Import completed: ${importedCount} imported, ${skippedCount} skipped, ${failedCount} failed.`,
      stats: { total: rows.length, importedCount, skippedCount, failedCount },
    });
  } catch (error) {
    next(error);
  }
};

const getImportHistory = async (req, res, next) => {
  try {
    const history = await getImportHistoryFromRepo(20);
    return res.json({ success: true, history });
  } catch (error) {
    next(error);
  }
};

const getImportTemplate = (req, res) => {
  const sampleHeaders = [
    'name',
    'email',
    'rollNumber',
    'department',
    'year',
    'leetcodeUrl',
    'gfgUrl',
    'codeforcesUrl',
    'codechefUrl',
  ];
  const sampleData = [
    'MANNAM GNANAPRAKASH,prakashmannam8@gmail.com,23491A0543,PRIME,4,https://leetcode.com/u/prakash_mannam/,https://www.geeksforgeeks.org/profile/prakashm4lpu,,https://www.codechef.com/users/zeal_luck_67',
  ];
  const csvContent = [sampleHeaders.join(','), ...sampleData].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="student_import_template.csv"');
  return res.send(csvContent);
};

// ==============================================================================
// 6. LEADERBOARD & RANKINGS
// ==============================================================================

const getAdminLeaderboard = async (req, res, next) => {
  try {
    const { department = 'ALL', year = 'ALL', search = '' } = req.query;
    const allStudents = await getAllStudents();

    const filtered = allStudents.filter((s) => {
      if (s.accountStatus === 'DISABLED') return false;
      if (department !== 'ALL' && s.department !== department) return false;
      if (year !== 'ALL' && String(s.year) !== String(year)) return false;
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        const mName = (s.name || '').toLowerCase().includes(q);
        const mRoll = (s.rollNumber || '').toLowerCase().includes(q);
        if (!mName && !mRoll) return false;
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
      action: 'LEADERBOARD_RECALCULATED',
      target: 'COLLEGE_MAIN',
      details: { updatedStudentsCount: result.updatedCount },
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
// 7. PLATFORM HEALTH & ANALYTICS
// ==============================================================================

const getPlatformStats = async (req, res, next) => {
  try {
    const students = await getAllStudents();

    const stats = {
      leetcode: { connected: 0, totalSolved: 0, easy: 0, medium: 0, hard: 0, avgRating: 0 },
      gfg: { connected: 0, totalSolved: 0, school: 0, basic: 0, easy: 0, medium: 0, hard: 0 },
      codeforces: { connected: 0, totalSolved: 0, avgRating: 0 },
      codechef: { connected: 0, totalSolved: 0, avgRating: 0 },
    };

    students.forEach((s) => {
      const ps = s.platformStats || {};
      if (ps.leetcode) {
        stats.leetcode.connected++;
        stats.leetcode.totalSolved += ps.leetcode.totalSolved || 0;
        stats.leetcode.easy += ps.leetcode.easySolved || 0;
        stats.leetcode.medium += ps.leetcode.mediumSolved || 0;
        stats.leetcode.hard += ps.leetcode.hardSolved || 0;
      }
      if (ps.gfg) {
        stats.gfg.connected++;
        stats.gfg.totalSolved += ps.gfg.totalSolved || 0;
      }
      if (ps.codeforces) {
        stats.codeforces.connected++;
        stats.codeforces.totalSolved += ps.codeforces.totalSolved || 0;
      }
      if (ps.codechef) {
        stats.codechef.connected++;
        stats.codechef.totalSolved += ps.codechef.totalSolved || 0;
      }
    });

    return res.json({ success: true, stats });
  } catch (error) {
    next(error);
  }
};

const testPlatformConnectivity = async (req, res, next) => {
  try {
    const { platform, handle } = req.body;
    if (!platform || !handle) {
      return res.status(400).json({
        success: false,
        message: 'Platform and handle/URL are required.',
      });
    }

    const result = await fetchPlatformProfile(platform, handle);
    return res.json({ success: true, result });
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
      rank: s.rank,
      finalScore: s.finalScore || 0,
      scores: s.scores || {},
    }));

    return res.json({
      success: true,
      weights: SCORING_WEIGHTS,
      scores,
    });
  } catch (error) {
    next(error);
  }
};

const recalculateSingleScore = async (req, res, next) => {
  try {
    const { id } = req.params;
    const student = await getStudentByIdFromRepo(id);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const scoreResults = evaluateStudentScores(student.platformStats || {});
    await updateStudentInRepo(id, {
      scores: scoreResults,
      finalScore: scoreResults.finalScore,
    });

    await recalculateCollegeRankings('COLLEGE_MAIN');
    const updated = await getStudentByIdFromRepo(id);

    return res.json({ success: true, student: updated });
  } catch (error) {
    next(error);
  }
};

const recalculateAllScores = async (req, res, next) => {
  try {
    const students = await getAllStudents();

    for (const s of students) {
      const scoreResults = evaluateStudentScores(s.platformStats || {});
      await updateStudentInRepo(s.id, {
        scores: scoreResults,
        finalScore: scoreResults.finalScore,
      });
    }

    await recalculateCollegeRankings('COLLEGE_MAIN');

    await logAudit({
      admin: req.admin,
      action: 'ALL_SCORES_RECALCULATED',
      target: 'COLLEGE_MAIN',
      details: { totalStudents: students.length },
      req,
    });

    return res.json({
      success: true,
      message: `Recalculated scores for ${students.length} students.`,
    });
  } catch (error) {
    next(error);
  }
};

const adjustStudentScore = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { adjustedScore, reason } = req.body;

    if (adjustedScore === undefined || !reason) {
      return res.status(400).json({
        success: false,
        message: 'adjustedScore and reason are required.',
      });
    }

    const student = await getStudentByIdFromRepo(id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const previousScore = student.finalScore || 0;
    await updateStudentInRepo(id, { finalScore: Number(adjustedScore) });

    await insertScoreAdjustment({
      studentId: id,
      adminId: req.admin.userId,
      adminEmail: req.admin.email,
      previousScore,
      adjustedScore: Number(adjustedScore),
      reason,
    });

    await recalculateCollegeRankings('COLLEGE_MAIN');

    await logAudit({
      admin: req.admin,
      action: 'SCORE_MANUALLY_ADJUSTED',
      target: `${student.name} (${student.rollNumber || id})`,
      targetId: id,
      details: { previousScore, adjustedScore, reason },
      req,
    });

    return res.json({
      success: true,
      message: 'Student score adjusted successfully.',
      finalScore: Number(adjustedScore),
    });
  } catch (error) {
    next(error);
  }
};

const getScoreAdjustments = async (req, res, next) => {
  try {
    const adjustments = await getScoreAdjustmentsFromRepo(50);
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
    const students = await getAllStudents({ accountStatus: 'ACTIVE' });
    const anomalies = [];

    const handleMap = { leetcode: {}, gfg: {}, codeforces: {}, codechef: {} };

    students.forEach((s) => {
      // 1. Missing Roll Number or Department
      if (!s.rollNumber || !s.department) {
        anomalies.push({
          id: `missing_meta_${s.id}`,
          type: 'MISSING_METADATA',
          severity: 'MEDIUM',
          studentId: s.id,
          studentName: s.name,
          rollNumber: s.rollNumber,
          description: 'Student is missing Roll Number or Department.',
        });
      }

      // 2. High Score but zero problems solved
      const totalSolved =
        (s.platformStats?.leetcode?.totalSolved || 0) +
        (s.platformStats?.gfg?.totalSolved || 0) +
        (s.platformStats?.codeforces?.totalSolved || 0) +
        (s.platformStats?.codechef?.totalSolved || 0);

      if ((s.finalScore || 0) > 50 && totalSolved === 0) {
        anomalies.push({
          id: `score_mismatch_${s.id}`,
          type: 'SCORE_STATS_MISMATCH',
          severity: 'HIGH',
          studentId: s.id,
          studentName: s.name,
          rollNumber: s.rollNumber,
          description: `High score (${s.finalScore}) recorded with 0 problems solved.`,
        });
      }

      // 3. Duplicate Handle Detection
      ['leetcode', 'gfg', 'codeforces', 'codechef'].forEach((plat) => {
        const u = s.platforms?.[plat]?.username;
        if (u) {
          const lowerU = u.toLowerCase();
          if (handleMap[plat][lowerU]) {
            anomalies.push({
              id: `dup_handle_${plat}_${s.id}`,
              type: 'DUPLICATE_HANDLE',
              severity: 'HIGH',
              studentId: s.id,
              studentName: s.name,
              rollNumber: s.rollNumber,
              description: `Shared ${plat} handle "${u}" with ${handleMap[plat][lowerU].name} (${handleMap[plat][lowerU].rollNumber}).`,
            });
          } else {
            handleMap[plat][lowerU] = { id: s.id, name: s.name, rollNumber: s.rollNumber };
          }
        }
      });
    });

    return res.json({ success: true, anomalies });
  } catch (error) {
    next(error);
  }
};

const resolveAnomaly = async (req, res, next) => {
  try {
    const { id } = req.params;
    return res.json({ success: true, message: `Anomaly ${id} marked as resolved.` });
  } catch (error) {
    next(error);
  }
};

const getAiInsights = async (req, res, next) => {
  try {
    const students = await getAllStudents({ accountStatus: 'ACTIVE' });
    const total = students.length;

    const insights = [
      {
        type: 'STRENGTH',
        title: 'Strong LeetCode Adoption',
        description: `${students.filter((s) => s.platforms?.leetcode?.status === 'SUCCESS').length} out of ${total} students actively solve LeetCode problems.`,
      },
      {
        type: 'OPPORTUNITY',
        title: 'Competitive Programming Growth',
        description: 'Codeforces participation can be boosted to enhance overall algorithmic speed.',
      },
      {
        type: 'COHORT_PERFORMANCE',
        title: 'PRIME Cohort Leading',
        description: 'PRIME students hold top rankboard positions with strong problem counts across LeetCode & GFG.',
      },
    ];

    return res.json({ success: true, insights });
  } catch (error) {
    next(error);
  }
};

// ==============================================================================
// 10. AUDIT LOGS & NOTIFICATIONS
// ==============================================================================

const getAuditLogs = async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;
    const logs = await getAuditLogsFromRepo(parseInt(limit, 10) || 50);
    return res.json({ success: true, logs });
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
      updatedBy: req.admin.email,
    };

    const saved = await updateSystemSettingsInRepo(payload);

    await logAudit({
      admin: req.admin,
      action: 'SETTINGS_CHANGED',
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
  getAuditLogs,
  getNotifications,
  markNotificationRead,
  clearNotifications,
  getSettings,
  updateSettings,
};
