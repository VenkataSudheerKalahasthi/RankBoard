const { config } = require('../config/env');
const { getAllStudentsCached } = require('../utils/studentCache');
const { getActivePlatformsCount, getPlatformRegistryWithStatus } = require('../config/platformRegistry');

/**
 * Public leaderboard endpoint returning sanitized college rankings for registered students
 */
const getLeaderboard = async (req, res, next) => {
  try {
    const collegeId = req.query.collegeId || config.COLLEGE_ID;
    const { department, year, search } = req.query;

    // Retrieve students using smart caching and quota fallback
    const rawStudents = await getAllStudentsCached();

    if (!rawStudents || rawStudents.length === 0) {
      return res.json({
        success: true,
        stats: {
          totalRegisteredStudents: 0,
          totalProblemsSolved: 0,
          codingPlatforms: getActivePlatformsCount(),
          lastUpdated: new Date().toISOString(),
        },
        platforms: getPlatformRegistryWithStatus(),
        podium: [],
        leaderboard: [],
      });
    }

    const allStudents = [];
    let totalProblemsSolved = 0;
    let latestUpdate = null;

    rawStudents.forEach((data) => {
      // Exclude disabled accounts
      if (data.accountStatus === 'DISABLED') {
        return;
      }

      // Filter by college if specified on both sides
      if (collegeId && data.collegeId && data.collegeId !== collegeId) {
        return;
      }

      const lcSolved = data.platformStats?.leetcode?.totalSolved || 0;
      const gfgSolved = data.platformStats?.gfg?.totalSolved || 0;
      const cfSolved = data.platformStats?.codeforces?.totalSolved || 0;
      const ccSolved = data.platformStats?.codechef?.totalSolved || 0;
      const hrSolved = data.platformStats?.hackerrank?.totalSolved || 0;
      const studentTotalSolved = lcSolved + gfgSolved + cfSolved + ccSolved + hrSolved;

      totalProblemsSolved += studentTotalSolved;

      if (data.lastDataUpdatedAt) {
        if (!latestUpdate || new Date(data.lastDataUpdatedAt) > new Date(latestUpdate)) {
          latestUpdate = data.lastDataUpdatedAt;
        }
      }

      allStudents.push({
        id: data.id,
        name: data.name || 'Anonymous Student',
        rollNumber: data.rollNumber || '—',
        department: data.department || 'General',
        year: data.year || 1,
        profilePhoto: data.profilePhoto || '',
        finalScore: data.finalScore || 0,
        overallScore: data.finalScore || 0,
        platforms: {
          leetcode: {
            problemsSolved: data.platformStats?.leetcode?.totalSolved ?? null,
            rating: data.platformStats?.leetcode?.rating ?? null,
            status: data.platforms?.leetcode?.status || 'NOT_CONNECTED',
          },
          gfg: {
            problemsSolved: data.platformStats?.gfg?.totalSolved ?? null,
            rating: data.platformStats?.gfg?.rating ?? null,
            status: data.platforms?.gfg?.status || 'NOT_CONNECTED',
          },
          codeforces: {
            problemsSolved: data.platformStats?.codeforces?.totalSolved ?? null,
            rating: data.platformStats?.codeforces?.rating ?? null,
            status: data.platforms?.codeforces?.status || 'NOT_CONNECTED',
          },
          codechef: {
            problemsSolved: data.platformStats?.codechef?.totalSolved ?? null,
            rating: data.platformStats?.codechef?.rating ?? null,
            status: data.platforms?.codechef?.status || 'NOT_CONNECTED',
          },
          hackerrank: {
            problemsSolved: data.platformStats?.hackerrank?.totalSolved ?? null,
            rating: data.platformStats?.hackerrank?.stars
              ? `${data.platformStats.hackerrank.stars}★`
              : (data.platformStats?.hackerrank?.badgesCount ? `${data.platformStats.hackerrank.badgesCount} badges` : null),
            status: data.platforms?.hackerrank?.status || 'NOT_CONNECTED',
          },
        },
      });
    });

    // Sort strictly by Overall Score descending, then total problems solved, then alphabetical
    allStudents.sort((a, b) => {
      const scoreA = typeof a.finalScore === 'number' ? a.finalScore : Number(a.finalScore) || 0;
      const scoreB = typeof b.finalScore === 'number' ? b.finalScore : Number(b.finalScore) || 0;

      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }

      const solvedA =
        (Number(a.platforms?.leetcode?.problemsSolved) || 0) +
        (Number(a.platforms?.gfg?.problemsSolved) || 0) +
        (Number(a.platforms?.codeforces?.problemsSolved) || 0) +
        (Number(a.platforms?.codechef?.problemsSolved) || 0) +
        (Number(a.platforms?.hackerrank?.problemsSolved) || 0);

      const solvedB =
        (Number(b.platforms?.leetcode?.problemsSolved) || 0) +
        (Number(b.platforms?.gfg?.problemsSolved) || 0) +
        (Number(b.platforms?.codeforces?.problemsSolved) || 0) +
        (Number(b.platforms?.codechef?.problemsSolved) || 0) +
        (Number(b.platforms?.hackerrank?.problemsSolved) || 0);

      if (solvedB !== solvedA) {
        return solvedB - solvedA;
      }

      return (a.name || '').localeCompare(b.name || '');
    });

    // Assign strictly sequential, true official College Rank positions: 1, 2, 3, 4, 5... N
    const rankedLeaderboard = allStudents.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));

    // Top 3 Podium (Always from the true top 3 college rankers)
    const podium = rankedLeaderboard.slice(0, 3).map((item, idx) => ({
      id: item.id,
      name: item.name,
      department: item.department,
      year: item.year,
      rank: idx + 1,
      finalScore: item.finalScore,
      profilePhoto: item.profilePhoto,
    }));

    // Apply filters (department, year, search) on the ranked leaderboard while PRESERVING actual rank
    let filteredLeaderboard = rankedLeaderboard;

    if (department && department !== 'ALL') {
      const targetDept = department.trim().toLowerCase();
      filteredLeaderboard = filteredLeaderboard.filter((s) => (s.department || '').trim().toLowerCase() === targetDept);
    }

    if (year && year !== 'ALL') {
      filteredLeaderboard = filteredLeaderboard.filter((s) => String(s.year) === String(year));
    }

    if (search && search.trim()) {
      const searchTerms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
      filteredLeaderboard = filteredLeaderboard.filter((s) => {
        const name = (s.name || '').toLowerCase();
        const roll = (s.rollNumber || '').toLowerCase();
        // Support partial substring matching across all typed keywords (e.g., 'k', 'ka', 'kala', 'sudheer')
        return searchTerms.every((term) => name.includes(term) || roll.includes(term));
      });
    }

    return res.json({
      success: true,
      stats: {
        totalRegisteredStudents: rankedLeaderboard.length,
        totalProblemsSolved,
        codingPlatforms: getActivePlatformsCount(),
        lastUpdated: latestUpdate || new Date().toISOString(),
      },
      platforms: getPlatformRegistryWithStatus(),
      podium,
      leaderboard: filteredLeaderboard,
    });
  } catch (error) {
    console.error('[Leaderboard Error]:', error);
    next(error);
  }
};

module.exports = {
  getLeaderboard,
};
