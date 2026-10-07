const { getAllStudentsCached, invalidateStudentCache } = require('../utils/studentCache');
const { updateStudent, getStudentById } = require('../supabase/supabaseRepository');
const { config } = require('../config/env');
const cloudinaryService = require('../services/cloudinaryService');

/**
 * Computes live, canonical college rankings for all active students
 */
const getRankedStudentsMap = async (collegeId = config.COLLEGE_ID) => {
  const rawStudents = await getAllStudentsCached();
  if (!rawStudents || rawStudents.length === 0) {
    return { rankedStudents: [], totalRanked: 0 };
  }

  const activeStudents = rawStudents.filter((data) => {
    if (data.accountStatus === 'DISABLED') return false;
    if (collegeId && data.collegeId && data.collegeId !== collegeId) return false;
    return true;
  });

  // Sort strictly by final score descending, then total problems solved, then alphabetical
  activeStudents.sort((a, b) => {
    const scoreA = typeof a.finalScore === 'number' ? a.finalScore : Number(a.finalScore) || 0;
    const scoreB = typeof b.finalScore === 'number' ? b.finalScore : Number(b.finalScore) || 0;

    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }

    const solvedA =
      (Number(a.platformStats?.leetcode?.totalSolved) || 0) +
      (Number(a.platformStats?.gfg?.totalSolved) || 0) +
      (Number(a.platformStats?.codeforces?.totalSolved) || 0) +
      (Number(a.platformStats?.codechef?.totalSolved) || 0) +
      (Number(a.platformStats?.hackerrank?.totalSolved) || 0);

    const solvedB =
      (Number(b.platformStats?.leetcode?.totalSolved) || 0) +
      (Number(b.platformStats?.gfg?.totalSolved) || 0) +
      (Number(b.platformStats?.codeforces?.totalSolved) || 0) +
      (Number(b.platformStats?.codechef?.totalSolved) || 0) +
      (Number(b.platformStats?.hackerrank?.totalSolved) || 0);

    if (solvedB !== solvedA) {
      return solvedB - solvedA;
    }

    return (a.name || '').localeCompare(b.name || '');
  });

  const rankedStudents = activeStudents.map((student, idx) => ({
    ...student,
    rank: idx + 1,
  }));

  return {
    rankedStudents,
    totalRanked: rankedStudents.length,
  };
};

/**
 * Format sanitized showcase data for a student
 */
const formatShowcasePayload = (student, totalStudents) => {
  const stats = student.platformStats || {};
  const platforms = student.platforms || {};

  const lcSolved = stats.leetcode?.totalSolved || 0;
  const gfgSolved = stats.gfg?.totalSolved || 0;
  const hrSolved = stats.hackerrank?.totalSolved || 0;
  const cfSolved = stats.codeforces?.totalSolved || 0;
  const ccSolved = stats.codechef?.totalSolved || 0;
  const totalSolved = lcSolved + gfgSolved + hrSolved + cfSolved + ccSolved;

  return {
    studentId: student.id,
    name: student.name || 'Student',
    rollNumber: student.rollNumber || '',
    department: student.department || 'Computer Science and Engineering',
    year: student.year || 4,
    collegeName: config.COLLEGE_NAME || 'Engineering College',
    profilePhoto: student.profilePhoto || '',
    rank: student.rank || 1,
    totalStudents: totalStudents || 1,
    overallScore: Math.round(Number(student.finalScore || 0) * 100) / 100,
    totalSolved,
    lastDataUpdatedAt: student.lastDataUpdatedAt || null,
    isPublic: student.showcaseSettings?.isPublic ?? true,
    bio: student.showcaseSettings?.bio || '',
    platformStats: {
      leetcode: {
        totalSolved: stats.leetcode?.totalSolved ?? null,
        easySolved: stats.leetcode?.easySolved ?? null,
        mediumSolved: stats.leetcode?.mediumSolved ?? null,
        hardSolved: stats.leetcode?.hardSolved ?? null,
        rating: stats.leetcode?.rating ?? null,
        globalRank: stats.leetcode?.globalRank ?? null,
        status: platforms.leetcode?.status || 'NOT_CONNECTED',
        username: platforms.leetcode?.username || null,
      },
      gfg: {
        totalSolved: stats.gfg?.totalSolved ?? null,
        easySolved: stats.gfg?.easySolved ?? null,
        mediumSolved: stats.gfg?.mediumSolved ?? null,
        hardSolved: stats.gfg?.hardSolved ?? null,
        schoolSolved: stats.gfg?.schoolSolved ?? null,
        basicSolved: stats.gfg?.basicSolved ?? null,
        codingScore: stats.gfg?.codingScore ?? null,
        status: platforms.gfg?.status || 'NOT_CONNECTED',
        username: platforms.gfg?.username || null,
      },
      hackerrank: {
        totalSolved: stats.hackerrank?.totalSolved ?? null,
        stars: stats.hackerrank?.stars ?? null,
        badgesCount: stats.hackerrank?.badgesCount ?? null,
        certificatesCount: stats.hackerrank?.certificatesCount ?? null,
        status: platforms.hackerrank?.status || 'NOT_CONNECTED',
        username: platforms.hackerrank?.username || null,
      },
      codeforces: {
        totalSolved: stats.codeforces?.totalSolved ?? null,
        rating: stats.codeforces?.rating ?? null,
        rank: stats.codeforces?.rank ?? null,
        maxRating: stats.codeforces?.maxRating ?? null,
        status: platforms.codeforces?.status || 'NOT_CONNECTED',
        username: platforms.codeforces?.username || null,
      },
      codechef: {
        totalSolved: stats.codechef?.totalSolved ?? null,
        rating: stats.codechef?.rating ?? null,
        stars: stats.codechef?.stars ?? null,
        globalRank: stats.codechef?.globalRank ?? null,
        status: platforms.codechef?.status || 'NOT_CONNECTED',
        username: platforms.codechef?.username || null,
      },
    },
    platformProfiles: {
      leetcode: platforms.leetcode?.profileUrl || null,
      gfg: platforms.gfg?.profileUrl || null,
      hackerrank: platforms.hackerrank?.profileUrl || null,
      codeforces: platforms.codeforces?.profileUrl || null,
      codechef: platforms.codechef?.profileUrl || null,
    },
    verifiedAt: new Date().toISOString(),
  };
};

/**
 * Public endpoint: Retrieve sanitized showcase for a student
 * GET /api/showcase/:studentId
 */
const getPublicShowcase = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Student ID is required.' });
    }

    const { rankedStudents, totalRanked } = await getRankedStudentsMap();

    // Match by ID, clerkUserId, or rollNumber (case-insensitive)
    const targetId = studentId.trim().toLowerCase();
    const student = rankedStudents.find(
      (s) =>
        s.id.toLowerCase() === targetId ||
        (s.clerkUserId && s.clerkUserId.toLowerCase() === targetId) ||
        (s.rollNumber && s.rollNumber.toLowerCase() === targetId)
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student achievement showcase not found.',
      });
    }

    // Check privacy setting
    const isPublic = student.showcaseSettings?.isPublic ?? true;
    if (!isPublic) {
      return res.json({
        success: true,
        isPublic: false,
        name: student.name,
        message: 'This achievement showcase is currently private.',
      });
    }

    const showcaseData = formatShowcasePayload(student, totalRanked);

    return res.json({
      success: true,
      showcase: showcaseData,
    });
  } catch (error) {
    console.error('[Public Showcase Error]:', error);
    next(error);
  }
};

/**
 * Authenticated endpoint: Get current student's showcase preview & settings
 * GET /api/showcase/me/preview
 */
const getMyShowcase = async (req, res, next) => {
  try {
    const currentStudent = req.student;
    if (!currentStudent) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { rankedStudents, totalRanked } = await getRankedStudentsMap();
    const student = rankedStudents.find((s) => s.id === currentStudent.id) || currentStudent;

    const showcaseData = formatShowcasePayload(student, totalRanked);

    return res.json({
      success: true,
      showcase: showcaseData,
    });
  } catch (error) {
    console.error('[My Showcase Error]:', error);
    next(error);
  }
};

/**
 * Authenticated endpoint: Upload profile image via Cloudinary
 * POST /api/showcase/profile-image
 */
const uploadProfileImage = async (req, res, next) => {
  try {
    const student = req.student;
    if (!student) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded.' });
    }

    // Validate mime type
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validMimes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Supported formats: JPEG, PNG, WEBP, GIF.',
      });
    }

    // Upload via Cloudinary service
    const uploadResult = await cloudinaryService.uploadProfileImage(
      req.file.buffer,
      req.file.mimetype,
      student.id
    );

    // Save Cloudinary URL in Supabase database
    const updated = await updateStudent(student.id, {
      profilePhoto: uploadResult.url,
    });

    // Invalidate student cache
    invalidateStudentCache();

    return res.json({
      success: true,
      message: 'Profile image updated successfully!',
      profilePhoto: uploadResult.url,
      publicId: uploadResult.publicId,
    });
  } catch (error) {
    console.error('[Profile Image Upload Error]:', error);
    next(error);
  }
};

/**
 * Authenticated endpoint: Update showcase privacy settings & bio
 * PUT /api/showcase/settings
 */
const updateShowcaseSettings = async (req, res, next) => {
  try {
    const student = req.student;
    if (!student) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { isPublic = true, bio = '' } = req.body;

    const showcaseSettings = {
      isPublic: Boolean(isPublic),
      bio: typeof bio === 'string' ? bio.slice(0, 300) : '',
      updatedAt: new Date().toISOString(),
    };

    // Save in Supabase
    await updateStudent(student.id, {
      showcaseSettings,
    });

    invalidateStudentCache();

    return res.json({
      success: true,
      message: 'Showcase settings updated successfully.',
      showcaseSettings,
    });
  } catch (error) {
    console.error('[Showcase Settings Error]:', error);
    next(error);
  }
};

module.exports = {
  getPublicShowcase,
  getMyShowcase,
  uploadProfileImage,
  updateShowcaseSettings,
};
