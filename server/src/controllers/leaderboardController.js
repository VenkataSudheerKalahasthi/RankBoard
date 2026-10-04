const { config } = require('../config/env');
const { getAllStudentsCached } = require('../utils/studentCache');

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
          codingPlatforms: 4,
          lastUpdated: new Date().toISOString(),
        },
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

      // Filter by department if specified
      if (department && department !== 'ALL' && data.department !== department) {
        return;
      }

      // Filter by year if specified
      if (year && year !== 'ALL' && String(data.year) !== String(year)) {
        return;
      }

      // Filter by search query if provided
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesName = (data.name || '').toLowerCase().includes(q);
        const matchesRoll = (data.rollNumber || '').toLowerCase().includes(q);
        if (!matchesName && !matchesRoll) {
          return;
        }
      }

      const lcSolved = data.platformStats?.leetcode?.totalSolved || 0;
      const gfgSolved = data.platformStats?.gfg?.totalSolved || 0;
      const cfSolved = data.platformStats?.codeforces?.totalSolved || 0;
      const ccSolved = data.platformStats?.codechef?.totalSolved || 0;
      const studentTotalSolved = lcSolved + gfgSolved + cfSolved + ccSolved;

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
        rank: data.rank ?? null,
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
        },
      });
    });

    // Sort by rank ascending (students with rank null come at the end)
    allStudents.sort((a, b) => {
      const rankA = a.rank ?? 999999;
      const rankB = b.rank ?? 999999;
      if (rankA !== rankB) return rankA - rankB;
      return (b.finalScore || 0) - (a.finalScore || 0);
    });

    // Top 3 Podium
    const podium = allStudents.slice(0, 3).map((item, idx) => ({
      id: item.id,
      name: item.name,
      department: item.department,
      year: item.year,
      rank: item.rank || idx + 1,
      finalScore: item.finalScore,
      profilePhoto: item.profilePhoto,
    }));

    return res.json({
      success: true,
      stats: {
        totalRegisteredStudents: allStudents.length,
        totalProblemsSolved,
        codingPlatforms: 4,
        lastUpdated: latestUpdate || new Date().toISOString(),
      },
      podium,
      leaderboard: allStudents,
    });
  } catch (error) {
    console.error('[Leaderboard Error]:', error);
    next(error);
  }
};

module.exports = {
  getLeaderboard,
};
