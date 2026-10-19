const crypto = require('crypto');
const { config } = require('../config/env');
const {
  getStudentByIdCached,
  getAllStudentsCached,
  getActiveStudentsCount,
  invalidateStudentCache,
} = require('../utils/studentCache');
const { getStudentById, getStudentByRollNumber, updateStudent } = require('../supabase/supabaseRepository');

const getReceiptSecret = () => {
  return config.CLERK_SECRET_KEY || config.SUPABASE_SERVICE_ROLE_KEY || 'college-dsa-rankboard-sec';
};

const createRegistrationReceipt = (studentId) => {
  if (!studentId) return null;
  const payload = {
    sub: studentId,
    iat: Date.now(),
    exp: Date.now() + 180 * 24 * 60 * 60 * 1000, // 180 days validity
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', getReceiptSecret()).update(data).digest('base64url');
  return `${data}.${sig}`;
};

const verifyRegistrationReceipt = (receipt) => {
  if (!receipt || typeof receipt !== 'string' || !receipt.includes('.')) return null;
  const [data, sig] = receipt.split('.');
  if (!data || !sig) return null;
  const expectedSig = crypto.createHmac('sha256', getReceiptSecret()).update(data).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (!payload.sub || (payload.exp && Date.now() > payload.exp)) return null;
    return payload;
  } catch (e) {
    return null;
  }
};

const parseCookie = (cookieHeader, name) => {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
};

/**
 * Get current authenticated student profile with scores and platform stats
 */
const getMe = async (req, res, next) => {
  try {
    const studentId = req.student?.id || req.auth.userId;
    let student = req.student || (await getStudentByIdCached(studentId));

    if (!student) {
      student = await getStudentById(studentId);
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found.',
      });
    }

    const totalStudents = await getActiveStudentsCount();

    // Sanitize to remove internal scoring breakdown
    const { scores, ...sanitizedStudent } = student;
    const effectiveId = student.id || student.clerkUserId;
    const registrationReceipt = createRegistrationReceipt(effectiveId);

    if (registrationReceipt) {
      res.setHeader(
        'Set-Cookie',
        `rankboard_reg_receipt=${registrationReceipt}; Path=/; Max-Age=${180 * 24 * 60 * 60}; SameSite=Lax`
      );
    }

    return res.json({
      success: true,
      student: {
        id: effectiveId,
        ...sanitizedStudent,
        overallScore: student.finalScore || 0,
        totalCollegeStudents: totalStudents,
      },
      registrationReceipt,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update student academic profile information
 */
const updateProfile = async (req, res, next) => {
  try {
    const studentId = req.student?.id || req.auth.userId;
    const { name, rollNumber, department, year, profilePhoto } = req.body;

    const existingStudent = req.student || (await getStudentById(studentId));
    if (!existingStudent) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found.',
      });
    }

    if (profilePhoto && (profilePhoto.startsWith('data:') || profilePhoto.length > 2048)) {
      return res.status(400).json({
        success: false,
        message: 'Base64 image strings cannot be saved directly. Please use the /api/showcase/profile-image upload service.',
      });
    }

    if (rollNumber && rollNumber.trim()) {
      const trimmedRoll = rollNumber.trim();
      const existingWithRoll = await getStudentByRollNumber(trimmedRoll);
      if (
        existingWithRoll &&
        existingWithRoll.id !== existingStudent.id &&
        existingWithRoll.clerkUserId &&
        existingWithRoll.clerkUserId !== req.auth.userId
      ) {
        return res.status(400).json({
          success: false,
          message: `Roll number "${trimmedRoll}" is already registered to another student.`,
        });
      }
    }

    const effectiveRoll = rollNumber !== undefined ? (rollNumber ? rollNumber.trim() : '') : (existingStudent.rollNumber || '');
    const effectiveDept = department !== undefined ? (department ? department.trim() : '') : (existingStudent.department || '');
    const effectiveName = name !== undefined ? (name ? name.trim() : '') : (existingStudent.name || '');
    const connectedPlatforms = Object.values(existingStudent.platforms || {}).filter((p) => p && p.username).length;
    const profileCompleted = !!(effectiveRoll && effectiveDept && effectiveName && connectedPlatforms >= 1);

    const updatePayload = {
      ...(name && { name: name.trim() }),
      ...(rollNumber && { rollNumber: rollNumber.trim() }),
      ...(department && { department: department.trim() }),
      ...(year && { year: parseInt(year, 10) }),
      ...(profilePhoto !== undefined && { profilePhoto }),
      profileCompleted,
    };

    const updatedStudent = await updateStudent(existingStudent.id, updatePayload);
    invalidateStudentCache();

    const { scores, ...sanitizedData } = updatedStudent || {};

    return res.json({
      success: true,
      message: 'Profile information updated successfully.',
      student: {
        id: updatedStudent?.id || studentId,
        ...sanitizedData,
        overallScore: updatedStudent?.finalScore || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get student overall score and standing (internal weights and formulas hidden)
 */
const getStudentScore = async (req, res, next) => {
  try {
    const studentId = req.student?.id || req.auth.userId;
    let student = req.student || (await getStudentByIdCached(studentId));

    if (!student) {
      student = await getStudentById(studentId);
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found.',
      });
    }

    const totalStudents = await getActiveStudentsCount();

    return res.json({
      success: true,
      overallScore: student.finalScore || 0,
      finalScore: student.finalScore || 0,
      rank: student.rank || null,
      totalStudents,
      lastUpdated: student.lastDataUpdatedAt || null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current student dynamic ranking position
 */
const getStudentRank = async (req, res, next) => {
  try {
    const studentId = req.student?.id || req.auth.userId;
    let student = req.student || (await getStudentByIdCached(studentId));

    if (!student) {
      student = await getStudentById(studentId);
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found.',
      });
    }

    const totalStudents = await getActiveStudentsCount();

    return res.json({
      success: true,
      rank: student.rank || null,
      overallScore: student.finalScore || 0,
      finalScore: student.finalScore || 0,
      totalStudents,
      collegeId: student.collegeId || config.COLLEGE_ID,
      studentName: student.name,
      rollNumber: student.rollNumber,
      department: student.department,
      lastUpdated: student.lastDataUpdatedAt || null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify whether a visitor's registration receipt corresponds to a valid, active student
 * Public endpoint: does NOT expose any sensitive student data or personal identifiers
 */
const verifyRegistration = async (req, res, next) => {
  try {
    const cookieReceipt = parseCookie(req.headers.cookie, 'rankboard_reg_receipt');
    const receipt =
      req.headers['x-registration-receipt'] ||
      req.query?.receipt ||
      req.body?.receipt ||
      cookieReceipt;

    if (!receipt) {
      return res.json({ success: true, isRegistered: false });
    }

    const payload = verifyRegistrationReceipt(receipt);
    if (!payload || !payload.sub) {
      res.setHeader('Set-Cookie', 'rankboard_reg_receipt=; Path=/; Max-Age=0; SameSite=Lax');
      return res.json({ success: true, isRegistered: false });
    }

    // Check database as the authoritative source of truth
    let student = await getStudentByIdCached(payload.sub);
    if (!student) {
      student = await getStudentById(payload.sub);
    }

    if (!student || student.accountStatus !== 'ACTIVE') {
      res.setHeader('Set-Cookie', 'rankboard_reg_receipt=; Path=/; Max-Age=0; SameSite=Lax');
      return res.json({ success: true, isRegistered: false });
    }

    // Refresh cookie header so it stays active
    res.setHeader(
      'Set-Cookie',
      `rankboard_reg_receipt=${receipt}; Path=/; Max-Age=${180 * 24 * 60 * 60}; SameSite=Lax`
    );

    // Only return the registration boolean status - no sensitive fields exposed!
    return res.json({
      success: true,
      isRegistered: true,
    });
  } catch (error) {
    // If status verification fails, handle safely without falsely claiming registration succeeded
    return res.json({ success: true, isRegistered: false });
  }
};

module.exports = {
  getMe,
  updateProfile,
  getStudentScore,
  getStudentRank,
  verifyRegistration,
};
