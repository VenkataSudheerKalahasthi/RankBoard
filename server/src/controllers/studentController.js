const { config } = require('../config/env');
const { getStudentByIdCached, getAllStudentsCached, invalidateStudentCache } = require('../utils/studentCache');
const { getStudentById, getStudentByRollNumber, updateStudent } = require('../supabase/supabaseRepository');

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

    const allStudents = await getAllStudentsCached();
    const totalStudents = allStudents.filter((s) => s.accountStatus === 'ACTIVE').length || 1;

    // Sanitize to remove internal scoring breakdown
    const { scores, ...sanitizedStudent } = student;

    return res.json({
      success: true,
      student: {
        id: student.id || clerkUserId,
        ...sanitizedStudent,
        overallScore: student.finalScore || 0,
        totalCollegeStudents: totalStudents,
      },
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

    const allStudents = await getAllStudentsCached();
    const totalStudents = allStudents.filter((s) => s.accountStatus === 'ACTIVE').length || 1;

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

    const allStudents = await getAllStudentsCached();
    const totalStudents = allStudents.filter((s) => s.accountStatus === 'ACTIVE').length || 1;

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

module.exports = {
  getMe,
  updateProfile,
  getStudentScore,
  getStudentRank,
};
