const { getSupabase } = require('../../supabase/supabaseClient');
const { getAllStudents, updateStudent } = require('../../supabase/supabaseRepository');
const { invalidateStudentCache } = require('../../utils/studentCache');
const { config } = require('../../config/env');

/**
 * Recalculates dynamic rankings across all students in a college
 * 
 * @param {string} collegeId - College ID (defaults to config.COLLEGE_ID)
 * @returns {Promise<Object>} Summary of recalculated rankings
 */
const recalculateCollegeRankings = async (collegeId = config.COLLEGE_ID) => {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  // Fetch all active students for the college
  const allStudents = await getAllStudents({ accountStatus: 'ACTIVE', collegeId });

  if (!allStudents || allStudents.length === 0) {
    return {
      totalStudents: 0,
      updatedCount: 0,
      ranks: [],
    };
  }

  // Sort descending by finalScore
  // Deterministic tie-breaker: total problems solved combined, then alphabetical by name
  allStudents.sort((a, b) => {
    const scoreA = typeof a.finalScore === 'number' ? a.finalScore : 0;
    const scoreB = typeof b.finalScore === 'number' ? b.finalScore : 0;

    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }

    // Tie breaker 1: combined total problems solved across platforms
    const solvedA =
      (a.platformStats?.leetcode?.totalSolved || 0) +
      (a.platformStats?.gfg?.totalSolved || 0) +
      (a.platformStats?.hackerrank?.totalSolved || 0) +
      (a.platformStats?.codeforces?.totalSolved || 0) +
      (a.platformStats?.codechef?.totalSolved || 0);

    const solvedB =
      (b.platformStats?.leetcode?.totalSolved || 0) +
      (b.platformStats?.gfg?.totalSolved || 0) +
      (b.platformStats?.hackerrank?.totalSolved || 0) +
      (b.platformStats?.codeforces?.totalSolved || 0) +
      (b.platformStats?.codechef?.totalSolved || 0);

    if (solvedB !== solvedA) {
      return solvedB - solvedA;
    }

    // Tie breaker 2: name comparison
    const nameA = a.name || '';
    const nameB = b.name || '';
    return nameA.localeCompare(nameB);
  });

  const totalStudents = allStudents.length;
  let currentRank = 1;

  const rankedStudents = [];

  for (let index = 0; index < allStudents.length; index++) {
    const student = allStudents[index];
    const currentRank = index + 1;

    // Only update rank in database if rank actually changed
    if (student.rank !== currentRank) {
      await supabase
        .from('students')
        .update({
          rank: currentRank,
          updated_at: new Date().toISOString(),
        })
        .eq('id', student.id);
    }

    rankedStudents.push({
      id: student.id,
      clerkUserId: student.clerkUserId || student.id,
      name: student.name,
      rollNumber: student.rollNumber,
      department: student.department,
      year: student.year,
      finalScore: student.finalScore || 0,
      rank: currentRank,
    });
  }

  invalidateStudentCache();

  return {
    collegeId,
    totalStudents,
    updatedCount: rankedStudents.length,
    ranks: rankedStudents,
  };
};

module.exports = {
  recalculateCollegeRankings,
};
