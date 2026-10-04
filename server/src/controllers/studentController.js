const { config } = require('../config/env');
const { getStudentByIdCached, getAllStudentsCached, invalidateStudentCache } = require('../utils/studentCache');
const { getStudentById, updateStudent } = require('../supabase/supabaseRepository');

/**
 * Get current authenticated student profile with scores and platform stats
 */
const getMe = async (req, res, next) => {
  try {
    const clerkUserId = req.auth.userId;
    let student = req.student || (await getStudentByIdCached(clerkUserId));

    if (!student) {
      student = await getStudentById(clerkUserId);
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
    const clerkUserId = req.auth.userId;
    const { name, rollNumber, department, year, profilePhoto } = req.body;

    const existingStudent = await getStudentById(clerkUserId);
    if (!existingStudent) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found.',
      });
    }

    const updatePayload = {
      ...(name && { name: name.trim() }),
      ...(rollNumber && { rollNumber: rollNumber.trim() }),
      ...(department && { department: department.trim() }),
      ...(year && { year: parseInt(year, 10) }),
      ...(profilePhoto !== undefined && { profilePhoto }),
    };

    const updatedStudent = await updateStudent(existingStudent.id, updatePayload);
    invalidateStudentCache();

    const { scores, ...sanitizedData } = updatedStudent || {};

    return res.json({
      success: true,
      message: 'Profile information updated successfully.',
      student: {
        id: updatedStudent?.id || clerkUserId,
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
    const clerkUserId = req.auth.userId;
    let student = req.student || (await getStudentByIdCached(clerkUserId));

    if (!student) {
      student = await getStudentById(clerkUserId);
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
    const clerkUserId = req.auth.userId;
    let student = req.student || (await getStudentByIdCached(clerkUserId));

    if (!student) {
      student = await getStudentById(clerkUserId);
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
