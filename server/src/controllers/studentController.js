const { getDb } = require('../firebase/firebaseAdmin');
const { config } = require('../config/env');

/**
 * Get current authenticated student profile with scores and platform stats
 */
const getMe = async (req, res, next) => {
  try {
    const db = getDb();
    const clerkUserId = req.auth.userId;

    const studentRef = db.collection('students').doc(clerkUserId);
    const docSnap = await studentRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found.',
      });
    }

    const student = docSnap.data();

    // Query total students count in college for dynamic rank display
    const totalStudentsSnap = await db
      .collection('students')
      .where('collegeId', '==', student.collegeId || config.COLLEGE_ID)
      .where('accountStatus', '==', 'ACTIVE')
      .count()
      .get();

    const totalStudents = totalStudentsSnap.data().count || 1;

    // Sanitize to remove internal scoring breakdown
    const { scores, ...sanitizedStudent } = student;

    return res.json({
      success: true,
      student: {
        id: docSnap.id,
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
    const db = getDb();
    const clerkUserId = req.auth.userId;
    const { name, rollNumber, department, year, profilePhoto } = req.body;

    const studentRef = db.collection('students').doc(clerkUserId);
    const docSnap = await studentRef.get();

    if (!docSnap.exists) {
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
      updatedAt: new Date().toISOString(),
    };

    await studentRef.update(updatePayload);

    const updatedSnap = await studentRef.get();
    const studentData = updatedSnap.data();
    const { scores, ...sanitizedData } = studentData;

    return res.json({
      success: true,
      message: 'Profile information updated successfully.',
      student: {
        id: updatedSnap.id,
        ...sanitizedData,
        overallScore: studentData.finalScore || 0,
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
    const db = getDb();
    const clerkUserId = req.auth.userId;

    const studentRef = db.collection('students').doc(clerkUserId);
    const docSnap = await studentRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({
        success: false,
        message: 'Student not found.',
      });
    }

    const student = docSnap.data();

    const totalStudentsSnap = await db
      .collection('students')
      .where('collegeId', '==', student.collegeId || config.COLLEGE_ID)
      .where('accountStatus', '==', 'ACTIVE')
      .count()
      .get();

    const totalStudents = totalStudentsSnap.data().count || 1;

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
    const db = getDb();
    const clerkUserId = req.auth.userId;

    const studentRef = db.collection('students').doc(clerkUserId);
    const docSnap = await studentRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({
        success: false,
        message: 'Student not found.',
      });
    }

    const student = docSnap.data();

    const totalStudentsSnap = await db
      .collection('students')
      .where('collegeId', '==', student.collegeId || config.COLLEGE_ID)
      .where('accountStatus', '==', 'ACTIVE')
      .count()
      .get();

    const totalStudents = totalStudentsSnap.data().count || 1;

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
