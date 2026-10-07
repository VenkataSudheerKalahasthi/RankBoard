const { getAllStudents } = require('../../supabase/supabaseRepository');
const { SCORING_WEIGHTS } = require('../scoring/scoringConfig');

// In-memory cache for aggregated insights
let cachedInsights = null;
let lastGeneratedAt = null;
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes cache

/**
 * Normalizes branch name to canonical representation
 */
const normalizeBranch = (dept) => {
  if (!dept) return 'Other';
  const d = dept.trim().toLowerCase();

  if (
    d === 'csds' ||
    d.includes('computer science and data science') ||
    d.includes('computer science & data science') ||
    d.includes('cs & ds') ||
    d.includes('cs and ds') ||
    d.includes('cs & data science') ||
    d.includes('cs and data science')
  ) {
    return 'Computer Science and Data Science';
  }

  if (
    d === 'artificial intelligence and data science' ||
    d === 'artificial intelligence & data science' ||
    d === 'ai & ds' ||
    d === 'ai and ds' ||
    d === 'aids' ||
    d.includes('artificial intelligence and data science') ||
    d.includes('artificial intelligence & data science') ||
    d.includes('ai & data science') ||
    d.includes('ai and data science')
  ) {
    return 'Artificial Intelligence and Data Science';
  }

  if (
    d === 'aiml' ||
    d === 'ai & ml' ||
    d === 'ai and ml' ||
    d === 'ai/ml' ||
    d.includes('machine learning') ||
    d.includes('artificial intelligence & ml') ||
    d.includes('artificial intelligence and ml') ||
    d.includes('artificial intelligence & machine learning') ||
    d.includes('artificial intelligence and machine learning')
  ) {
    return 'Artificial Intelligence & ML';
  }

  if (d === 'iot' || d.includes('internet of things')) {
    return 'Internet of Things';
  }

  if (d === 'ai' || d === 'artificial intelligence') {
    return 'Artificial Intelligence';
  }

  if (
    d === 'cse' ||
    d.includes('computer science and engineering') ||
    d.includes('computer science & engineering') ||
    d.includes('computer science') ||
    d.includes('comp sci')
  ) {
    return 'Computer Science and Engineering';
  }

  if (d === 'it' || d === 'information technology' || d.includes('infotech')) {
    return 'Information Technology';
  }

  if (d === 'ece' || d.includes('electronics and communication') || d.includes('electronics & communication')) {
    return 'Electronics & Communication';
  }

  if (d === 'eee' || d.includes('electrical and electronics') || d.includes('electrical & electronics')) {
    return 'Electrical & Electronics';
  }

  if (d === 'me' || d === 'mech' || d.includes('mechanical')) {
    return 'Mechanical Engineering';
  }

  if (d === 'civil' || d.includes('civil engineering')) {
    return 'Civil Engineering';
  }

  if (d === 'csbs' || d.includes('business systems') || d.includes('cs & bs') || d.includes('cs and bs')) {
    return 'Computer Science and Business Systems';
  }

  if (d === 'csit' || d.includes('cs and it') || d.includes('cs & it')) {
    return 'Computer Science and Information Technology';
  }

  if (d === 'prime') {
    return 'Prime';
  }

  return dept.trim();
};

/**
 * Generates comprehensive AI insights from real Supabase database records
 * @param {Object} options - { forceRefresh: boolean }
 * @returns {Promise<Object>}
 */
const generateAiInsights = async ({ forceRefresh = false } = {}) => {
  const now = Date.now();
  if (!forceRefresh && cachedInsights && lastGeneratedAt && now - lastGeneratedAt < CACHE_TTL_MS) {
    return {
      ...cachedInsights,
      cached: true,
    };
  }

  console.log('[AI Insights] Computing fresh analytics from live database...');

  const allStudents = await getAllStudents();
  const totalCohortSize = allStudents.length;
  const activeStudents = allStudents.filter((s) => s.accountStatus !== 'DISABLED');
  const disabledStudents = allStudents.filter((s) => s.accountStatus === 'DISABLED');
  const activeCount = activeStudents.length;

  const rankedStudents = activeStudents
    .filter((s) => s.rank !== null && s.rank !== undefined && Number(s.rank) > 0)
    .sort((a, b) => Number(a.rank) - Number(b.rank));
  const rankedCount = rankedStudents.length;
  const unrankedCount = activeCount - rankedCount;

  // 1. Overall Score Aggregations
  let totalScoreSum = 0;
  let highestScore = 0;
  let lowestScore = Infinity;
  let topStudent = null;

  rankedStudents.forEach((s) => {
    const score = Number(s.finalScore || 0);
    totalScoreSum += score;
    if (score > highestScore) {
      highestScore = score;
      topStudent = s;
    }
    if (score < lowestScore) {
      lowestScore = score;
    }
  });

  const avgOverallScore = rankedCount > 0 ? Math.round((totalScoreSum / rankedCount) * 100) / 100 : 0;
  if (lowestScore === Infinity) lowestScore = 0;

  // 2. Platform-by-Platform In-Depth Aggregation
  const platformKeys = ['leetcode', 'gfg', 'hackerrank', 'codeforces', 'codechef'];
  const platformDetails = {
    leetcode: {
      name: 'LeetCode',
      scoringWeight: SCORING_WEIGHTS.LEETCODE?.OVERALL || 0.40,
      isScoring: true,
      linkedCount: 0,
      missingCount: 0,
      successCount: 0,
      failedCount: 0,
      rateLimitedCount: 0,
      pendingCount: 0,
      totalSolved: 0,
      easySolved: 0,
      mediumSolved: 0,
      hardSolved: 0,
      failures: [],
    },
    gfg: {
      name: 'GeeksforGeeks',
      scoringWeight: SCORING_WEIGHTS.GFG?.OVERALL || 0.30,
      isScoring: true,
      linkedCount: 0,
      missingCount: 0,
      successCount: 0,
      failedCount: 0,
      rateLimitedCount: 0,
      pendingCount: 0,
      totalSolved: 0,
      schoolSolved: 0,
      basicSolved: 0,
      easySolved: 0,
      mediumSolved: 0,
      hardSolved: 0,
      avgCodingScore: 0,
      totalCodingScore: 0,
      failures: [],
    },
    hackerrank: {
      name: 'HackerRank',
      scoringWeight: SCORING_WEIGHTS.HACKERRANK?.OVERALL || 0.30,
      isScoring: true,
      linkedCount: 0,
      missingCount: 0,
      successCount: 0,
      failedCount: 0,
      rateLimitedCount: 0,
      pendingCount: 0,
      totalSolved: 0,
      totalBadges: 0,
      totalCertificates: 0,
      totalPoints: 0,
      failures: [],
    },
    codeforces: {
      name: 'Codeforces',
      scoringWeight: 0,
      isScoring: false,
      linkedCount: 0,
      missingCount: 0,
      successCount: 0,
      failedCount: 0,
      rateLimitedCount: 0,
      pendingCount: 0,
      totalSolved: 0,
      avgRating: 0,
      totalRating: 0,
      failures: [],
    },
    codechef: {
      name: 'CodeChef',
      scoringWeight: 0,
      isScoring: false,
      linkedCount: 0,
      missingCount: 0,
      successCount: 0,
      failedCount: 0,
      rateLimitedCount: 0,
      pendingCount: 0,
      totalSolved: 0,
      failures: [],
    },
  };

  let allPlatformsLinkedCount = 0;
  let totalProblemsSolvedCombined = 0;
  let latestSyncTimestamp = null;
  const syncErrors = [];
  const staleProfiles = [];

  const nowMs = Date.now();
  const STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 hours

  activeStudents.forEach((student) => {
    let linkedPlatformsForStudent = 0;
    const pProfiles = student.platforms || {};
    const pStats = student.platformStats || {};

    platformKeys.forEach((k) => {
      const p = pProfiles[k];
      const stats = pStats[k];
      const target = platformDetails[k];

      const hasLink = !!(p?.username || p?.profileUrl);
      if (hasLink) {
        target.linkedCount++;
        linkedPlatformsForStudent++;

        if (p?.lastFetchedAt) {
          const fetchMs = new Date(p.lastFetchedAt).getTime();
          if (!latestSyncTimestamp || fetchMs > new Date(latestSyncTimestamp).getTime()) {
            latestSyncTimestamp = p.lastFetchedAt;
          }
          if (nowMs - fetchMs > STALE_THRESHOLD_MS && p.status === 'SUCCESS') {
            staleProfiles.push({
              studentId: student.id,
              name: student.name,
              rollNumber: student.rollNumber,
              platform: k,
              platformName: target.name,
              lastFetchedAt: p.lastFetchedAt,
              status: p.status,
            });
          }
        }

        if (p?.status === 'SUCCESS') target.successCount++;
        else if (p?.status === 'FAILED') {
          target.failedCount++;
          const errorEntry = {
            studentId: student.id,
            name: student.name,
            rollNumber: student.rollNumber,
            platform: k,
            platformName: target.name,
            errorMessage: p.errorMessage || 'Unknown fetch failure',
            lastFetchedAt: p.lastFetchedAt,
          };
          target.failures.push(errorEntry);
          syncErrors.push(errorEntry);
        } else if (p?.status === 'RATE_LIMITED') {
          target.rateLimitedCount++;
          syncErrors.push({
            studentId: student.id,
            name: student.name,
            rollNumber: student.rollNumber,
            platform: k,
            platformName: target.name,
            errorMessage: p.errorMessage || 'Platform rate limited',
            lastFetchedAt: p.lastFetchedAt,
          });
        } else if (p?.status === 'PENDING') {
          target.pendingCount++;
        }

        // Aggregate solves
        if (stats && (stats.status === 'SUCCESS' || stats.totalSolved > 0)) {
          const solved = Number(stats.totalSolved || 0);
          target.totalSolved += solved;
          totalProblemsSolvedCombined += solved;

          if (k === 'leetcode') {
            target.easySolved += Number(stats.easySolved || 0);
            target.mediumSolved += Number(stats.mediumSolved || 0);
            target.hardSolved += Number(stats.hardSolved || 0);
          } else if (k === 'gfg') {
            target.schoolSolved += Number(stats.schoolSolved || 0);
            target.basicSolved += Number(stats.basicSolved || 0);
            target.easySolved += Number(stats.easySolved || 0);
            target.mediumSolved += Number(stats.mediumSolved || 0);
            target.hardSolved += Number(stats.hardSolved || 0);
            if (stats.rating) target.totalCodingScore += Number(stats.rating);
          } else if (k === 'hackerrank') {
            target.totalBadges += Number(stats.badges || 0);
            target.totalCertificates += Number(stats.certificates || 0);
            target.totalPoints += Number(stats.rating || 0);
          } else if (k === 'codeforces') {
            if (stats.rating) target.totalRating += Number(stats.rating);
          }
        }
      } else {
        target.missingCount++;
      }
    });

    if (linkedPlatformsForStudent === 5) {
      allPlatformsLinkedCount++;
    }
  });

  // Calculate platform averages and percentages
  platformKeys.forEach((k) => {
    const p = platformDetails[k];
    p.linkedPercent = activeCount > 0 ? Math.round((p.linkedCount / activeCount) * 100) : 0;
    p.missingCount = activeCount - p.linkedCount;
    p.avgSolvedPerLinked = p.linkedCount > 0 ? Math.round((p.totalSolved / p.linkedCount) * 10) / 10 : 0;
    p.shareOfTotalProblems = totalProblemsSolvedCombined > 0 ? Math.round((p.totalSolved / totalProblemsSolvedCombined) * 100) : 0;

    if (k === 'gfg') {
      p.avgCodingScore = p.linkedCount > 0 ? Math.round(p.totalCodingScore / p.linkedCount) : 0;
    }
    if (k === 'codeforces') {
      p.avgRating = p.linkedCount > 0 ? Math.round(p.totalRating / p.linkedCount) : 0;
    }
  });

  // 3. Score Distribution Bands
  const scoreDistribution = {
    'Elite Tier (80+)': 0,
    'Advanced Tier (60-79.9)': 0,
    'Intermediate Tier (40-59.9)': 0,
    'Developing Tier (20-39.9)': 0,
    'Beginner Tier (<20)': 0,
  };

  activeStudents.forEach((s) => {
    const score = Number(s.finalScore || 0);
    if (score >= 80) scoreDistribution['Elite Tier (80+)']++;
    else if (score >= 60) scoreDistribution['Advanced Tier (60-79.9)']++;
    else if (score >= 40) scoreDistribution['Intermediate Tier (40-59.9)']++;
    else if (score >= 20) scoreDistribution['Developing Tier (20-39.9)']++;
    else scoreDistribution['Beginner Tier (<20)']++;
  });

  // 4. Department / Branch Analytics
  const branchMap = {};
  activeStudents.forEach((student) => {
    const norm = normalizeBranch(student.department || 'Other');
    if (!branchMap[norm]) {
      branchMap[norm] = {
        name: norm,
        totalStudents: 0,
        rankedStudents: 0,
        totalScore: 0,
        topScore: 0,
        topStudent: null,
        totalSolved: 0,
        platforms: {
          leetcodeLinked: 0,
          gfgLinked: 0,
          hackerrankLinked: 0,
          codeforcesLinked: 0,
          codechefLinked: 0,
        },
      };
    }

    const b = branchMap[norm];
    b.totalStudents++;
    const score = Number(student.finalScore || 0);
    b.totalScore += score;

    if (student.rank && student.rank > 0) {
      b.rankedStudents++;
    }

    if (score > b.topScore) {
      b.topScore = score;
      b.topStudent = {
        id: student.id,
        name: student.name,
        rollNumber: student.rollNumber,
        rank: student.rank,
        score,
      };
    }

    // Solved counts in this department
    const stats = student.platformStats || {};
    const solved =
      (stats.leetcode?.totalSolved || 0) +
      (stats.gfg?.totalSolved || 0) +
      (stats.hackerrank?.totalSolved || 0) +
      (stats.codeforces?.totalSolved || 0) +
      (stats.codechef?.totalSolved || 0);
    b.totalSolved += solved;

    if (student.platforms?.leetcode?.username) b.platforms.leetcodeLinked++;
    if (student.platforms?.gfg?.username) b.platforms.gfgLinked++;
    if (student.platforms?.hackerrank?.username) b.platforms.hackerrankLinked++;
    if (student.platforms?.codeforces?.username) b.platforms.codeforcesLinked++;
    if (student.platforms?.codechef?.username) b.platforms.codechefLinked++;
  });

  const departmentAnalytics = Object.values(branchMap).map((b) => ({
    ...b,
    avgScore: b.totalStudents > 0 ? Math.round((b.totalScore / b.totalStudents) * 100) / 100 : 0,
  })).sort((a, b) => b.avgScore - a.avgScore);

  const leadingDepartment = departmentAnalytics.length > 0 ? departmentAnalytics[0].name : 'N/A';

  // 5. Academic Year Analytics
  const yearMap = {};
  [1, 2, 3, 4].forEach((yr) => {
    yearMap[yr] = {
      year: yr,
      label: `Year ${yr}`,
      totalStudents: 0,
      rankedStudents: 0,
      totalScore: 0,
      topScore: 0,
      topStudent: null,
      totalSolved: 0,
    };
  });

  activeStudents.forEach((student) => {
    const yr = Number(student.year) || 4;
    if (!yearMap[yr]) {
      yearMap[yr] = { year: yr, label: `Year ${yr}`, totalStudents: 0, rankedStudents: 0, totalScore: 0, topScore: 0, topStudent: null, totalSolved: 0 };
    }
    const target = yearMap[yr];
    target.totalStudents++;
    const score = Number(student.finalScore || 0);
    target.totalScore += score;
    if (student.rank && student.rank > 0) target.rankedStudents++;
    if (score > target.topScore) {
      target.topScore = score;
      target.topStudent = { id: student.id, name: student.name, rollNumber: student.rollNumber, rank: student.rank, score };
    }

    const stats = student.platformStats || {};
    target.totalSolved +=
      (stats.leetcode?.totalSolved || 0) +
      (stats.gfg?.totalSolved || 0) +
      (stats.hackerrank?.totalSolved || 0) +
      (stats.codeforces?.totalSolved || 0) +
      (stats.codechef?.totalSolved || 0);
  });

  const yearAnalytics = Object.values(yearMap).map((y) => ({
    ...y,
    avgScore: y.totalStudents > 0 ? Math.round((y.totalScore / y.totalStudents) * 100) / 100 : 0,
  })).filter((y) => y.totalStudents > 0);

  // 6. Incomplete Profiles & Anomaly Detection
  const incompleteProfiles = [];
  const anomalies = [];

  activeStudents.forEach((student) => {
    const missingItems = [];
    if (!student.name) missingItems.push('Name');
    if (!student.email) missingItems.push('Email');
    if (!student.rollNumber) missingItems.push('Roll Number');
    if (!student.department) missingItems.push('Department');

    const missingPlatforms = [];
    if (!student.platforms?.leetcode?.username) missingPlatforms.push('LeetCode');
    if (!student.platforms?.gfg?.username) missingPlatforms.push('GeeksforGeeks');
    if (!student.platforms?.hackerrank?.username) missingPlatforms.push('HackerRank');
    if (!student.platforms?.codeforces?.username) missingPlatforms.push('Codeforces');
    if (!student.platforms?.codechef?.username) missingPlatforms.push('CodeChef');

    if (missingItems.length > 0 || missingPlatforms.length > 0) {
      incompleteProfiles.push({
        id: student.id,
        name: student.name || 'Unnamed Student',
        rollNumber: student.rollNumber || 'Missing Roll Number',
        department: student.department || 'Missing Dept',
        year: student.year || 'Missing Year',
        missingAcademicFields: missingItems,
        missingPlatforms,
        totalMissing: missingItems.length + missingPlatforms.length,
      });
    }

    // Score Anomaly Checks
    const finalScore = Number(student.finalScore || 0);
    if (isNaN(finalScore) || finalScore < 0) {
      anomalies.push({
        severity: 'CRITICAL',
        type: 'INVALID_SCORE',
        studentId: student.id,
        studentName: student.name,
        rollNumber: student.rollNumber,
        description: `Student has an invalid or negative final score (${student.finalScore}).`,
      });
    }

    // Check if student has score > 0 but is unranked
    if (finalScore > 0 && (!student.rank || student.rank <= 0)) {
      anomalies.push({
        severity: 'WARNING',
        type: 'MISSING_RANK',
        studentId: student.id,
        studentName: student.name,
        rollNumber: student.rollNumber,
        description: `Student has score ${finalScore} but is missing a global rank. Ranking recalculation recommended.`,
      });
    }

    // Check for negative solved counts
    const stats = student.platformStats || {};
    platformKeys.forEach((k) => {
      const s = stats[k];
      if (s && s.totalSolved < 0) {
        anomalies.push({
          severity: 'CRITICAL',
          type: 'NEGATIVE_SOLVED',
          studentId: student.id,
          studentName: student.name,
          rollNumber: student.rollNumber,
          platform: k,
          description: `Negative problem solved count detected on ${k} (${s.totalSolved}).`,
        });
      }
    });
  });

  // 7. Top 10 Performers Snapshot
  const top10Performers = rankedStudents.slice(0, 10).map((s) => ({
    id: s.id,
    rank: s.rank,
    name: s.name,
    rollNumber: s.rollNumber,
    department: normalizeBranch(s.department || 'Other'),
    year: s.year,
    finalScore: Number(s.finalScore || 0),
    scores: {
      leetcodeScore: Number(s.scores?.leetcodeScore || 0),
      gfgScore: Number(s.scores?.gfgScore || 0),
      hackerrankScore: Number(s.scores?.hackerrankScore || 0),
      codeforcesScore: Number(s.scores?.codeforcesScore || 0),
      codechefScore: Number(s.scores?.codechefScore || 0),
    },
    solved: {
      leetcode: Number(s.platformStats?.leetcode?.totalSolved || 0),
      gfg: Number(s.platformStats?.gfg?.totalSolved || 0),
      hackerrank: Number(s.platformStats?.hackerrank?.totalSolved || 0),
      codeforces: Number(s.platformStats?.codeforces?.totalSolved || 0),
      codechef: Number(s.platformStats?.codechef?.totalSolved || 0),
      combined:
        Number(s.platformStats?.leetcode?.totalSolved || 0) +
        Number(s.platformStats?.gfg?.totalSolved || 0) +
        Number(s.platformStats?.hackerrank?.totalSolved || 0) +
        Number(s.platformStats?.codeforces?.totalSolved || 0) +
        Number(s.platformStats?.codechef?.totalSolved || 0),
    },
  }));

  // 8. Actionable AI Recommendations (Data-Grounded)
  const recommendations = [];

  // Recommendation A: HackerRank Platform Adoption
  const hrMissingCount = platformDetails.hackerrank.missingCount;
  if (hrMissingCount > 0) {
    recommendations.push({
      id: 'rec-hackerrank-adoption',
      priority: hrMissingCount > activeCount * 0.3 ? 'HIGH' : 'MEDIUM',
      category: 'SCORING_OPPORTUNITY',
      title: 'HackerRank Profile Linking Gap',
      description: `${hrMissingCount} out of ${activeCount} students (${Math.round((hrMissingCount / activeCount) * 100)}%) are currently missing a linked HackerRank profile. Because HackerRank contributes 30% to the overall college scoring formula, onboarding these students will immediately lift student composite scores and college standing.`,
      actionLabel: 'View Missing HackerRank Profiles',
      actionType: 'NAVIGATE_STUDENTS',
      filter: { missingPlatform: 'hackerrank' },
      affectedCount: hrMissingCount,
    });
  }

  // Recommendation B: Active Synchronization Failures
  const totalSyncFailures = syncErrors.length;
  if (totalSyncFailures > 0) {
    const failedPlatforms = [...new Set(syncErrors.map((e) => e.platformName))].join(', ');
    recommendations.push({
      id: 'rec-sync-failures',
      priority: 'HIGH',
      category: 'DATA_INTEGRITY',
      title: 'Resolve Active Platform Fetch Errors',
      description: `${totalSyncFailures} platform profile synchronization issues detected across ${failedPlatforms}. Verify usernames and trigger re-synchronization to ensure student leaderboards reflect their latest problem solves.`,
      actionLabel: 'Go to Synchronization Queue',
      actionType: 'NAVIGATE_SYNC',
      affectedCount: totalSyncFailures,
    });
  }

  // Recommendation C: Incomplete Academic Profiles
  const missingRollOrDept = incompleteProfiles.filter((p) => p.missingAcademicFields.length > 0);
  if (missingRollOrDept.length > 0) {
    recommendations.push({
      id: 'rec-academic-details',
      priority: 'MEDIUM',
      category: 'STUDENT_RECORDS',
      title: 'Complete Academic Identifiers',
      description: `${missingRollOrDept.length} students are missing essential academic identifiers (Roll Number or Department). Completing these records will enable accurate branch-wise ranking and placement reporting.`,
      actionLabel: 'Review Incomplete Students',
      actionType: 'NAVIGATE_STUDENTS',
      affectedCount: missingRollOrDept.length,
    });
  }

  // Recommendation D: Stale Data Refresh
  if (staleProfiles.length > 5) {
    recommendations.push({
      id: 'rec-stale-data',
      priority: 'LOW',
      category: 'DATA_FRESHNESS',
      title: 'Schedule Platform Sync for Stale Records',
      description: `${staleProfiles.length} student platform profiles have not synchronized within the past 48 hours. Running a batch sync will refresh coding statistics across all platforms.`,
      actionLabel: 'Trigger Bulk Sync',
      actionType: 'NAVIGATE_SYNC',
      affectedCount: staleProfiles.length,
    });
  }

  // Recommendation E: GFG Practice & Category Balance
  const gfgStats = platformDetails.gfg;
  if (gfgStats.linkedCount > 0 && gfgStats.totalSolved > 0) {
    const easyMedHardCount = gfgStats.easySolved + gfgStats.mediumSolved + gfgStats.hardSolved;
    const basicSchoolCount = gfgStats.schoolSolved + gfgStats.basicSolved;
    if (basicSchoolCount > easyMedHardCount * 1.5) {
      recommendations.push({
        id: 'rec-gfg-difficulty-progression',
        priority: 'INFO',
        category: 'PEDAGOGY',
        title: 'Encourage Intermediate & Hard GFG Problem Solving',
        description: `Students have solved ${basicSchoolCount} School & Basic problems vs ${easyMedHardCount} Easy, Medium & Hard problems on GeeksforGeeks. Because School and Basic problems contribute 0% to the official score, mentoring students to tackle Medium and Hard problems will significantly accelerate their score growth.`,
        actionLabel: 'View GFG Platform Insights',
        actionType: 'NAVIGATE_PLATFORMS',
        affectedCount: gfgStats.linkedCount,
      });
    }
  }

  // Fallback if everything is 100% clean
  if (recommendations.length === 0) {
    recommendations.push({
      id: 'rec-all-healthy',
      priority: 'INFO',
      category: 'HEALTH_CHECK',
      title: 'Platform System Fully Synchronized & Healthy',
      description: 'No actionable data anomalies or synchronization failures detected. All student profiles and coding platforms are healthy.',
      actionLabel: 'View Leaderboard',
      actionType: 'NAVIGATE_LEADERBOARD',
      affectedCount: 0,
    });
  }

  // 9. Structured Executive Narrative
  const executiveNarrative = `${totalCohortSize} students registered (${activeCount} active, ${rankedCount} ranked). The cohort has solved ${totalProblemsSolvedCombined.toLocaleString()} combined coding problems across platforms. Top platform score is ${highestScore} with an overall cohort average of ${avgOverallScore}. ${syncErrors.length > 0 ? `${syncErrors.length} synchronization issues require attention.` : 'Platform synchronization is running smoothly.'} ${hrMissingCount > 0 ? `${hrMissingCount} students have not yet linked HackerRank (30% scoring weight).` : ''}`;

  const finalInsightsPayload = {
    overview: {
      totalCohortSize,
      activeStudentCount: activeCount,
      disabledStudentCount: disabledStudents.length,
      rankedStudentCount: rankedCount,
      unrankedStudentCount: unrankedCount,
      allPlatformsLinkedCount,
      incompleteProfilesCount: incompleteProfiles.length,
      syncIssuesCount: syncErrors.length,
      totalProblemsSolvedCombined,
      highestOverallScore: highestScore,
      lowestOverallScore: lowestScore,
      avgOverallScore,
      leadingDepartment,
      leadingPlatform: 'LeetCode',
      lastSyncTime: latestSyncTimestamp,
      summaryNarrative: executiveNarrative,
    },
    performance: {
      avgScore: avgOverallScore,
      highestScore,
      lowestScore,
      topStudent: topStudent ? {
        id: topStudent.id,
        name: topStudent.name,
        rollNumber: topStudent.rollNumber,
        department: normalizeBranch(topStudent.department || 'Other'),
        score: highestScore,
        rank: topStudent.rank,
      } : null,
      top10Performers,
      scoreDistribution,
      historicalRankMovement: {
        isAvailable: false,
        message: 'Historical rank movement tracking is currently unavailable as point-in-time snapshots are not recorded.',
      },
      observations: [
        `Rank #1 is held by ${topStudent?.name || 'Student'} (${topStudent?.rollNumber || ''}) with a composite score of ${highestScore}.`,
        `Average active student composite score across the college is ${avgOverallScore}.`,
        `${scoreDistribution['Elite Tier (80+)'] + scoreDistribution['Advanced Tier (60-79.9)']} students have reached Advanced & Elite tiers (Score ≥ 60).`,
        `LeetCode accounts for ${platformDetails.leetcode.shareOfTotalProblems}% of all problems solved, followed by GFG with ${platformDetails.gfg.shareOfTotalProblems}%.`,
      ],
    },
    platforms: platformDetails,
    departments: departmentAnalytics,
    years: yearAnalytics,
    syncHealth: {
      healthScore: activeCount > 0 ? Math.round(((activeCount * platformKeys.length - syncErrors.length) / (activeCount * platformKeys.length)) * 100) : 100,
      totalTrackedLinks: activeCount * platformKeys.length,
      totalSyncErrors: syncErrors.length,
      syncErrorsList: syncErrors,
      staleProfilesCount: staleProfiles.length,
      staleProfilesList: staleProfiles.slice(0, 20),
      lastSynchronizedAt: latestSyncTimestamp,
    },
    incompleteProfiles: {
      totalCount: incompleteProfiles.length,
      studentsList: incompleteProfiles.slice(0, 30),
      missingHackerRankCount: hrMissingCount,
      missingGFGCount: platformDetails.gfg.missingCount,
      missingLeetCodeCount: platformDetails.leetcode.missingCount,
      missingCodeforcesCount: platformDetails.codeforces.missingCount,
      missingCodeChefCount: platformDetails.codechef.missingCount,
    },
    anomalies: {
      totalCount: anomalies.length,
      list: anomalies,
    },
    recommendations,
    metadata: {
      generatedAt: new Date().toISOString(),
      dataFreshness: 'LIVE_DATABASE',
      collegeId: allStudents[0]?.collegeId || 'COLLEGE_MAIN',
    },
  };

  cachedInsights = finalInsightsPayload;
  lastGeneratedAt = now;

  return {
    ...finalInsightsPayload,
    cached: false,
  };
};

/**
 * Invalidates the in-memory insights cache
 */
const invalidateInsightsCache = () => {
  cachedInsights = null;
  lastGeneratedAt = null;
  console.log('[AI Insights] Insights cache invalidated.');
};

module.exports = {
  generateAiInsights,
  invalidateInsightsCache,
  normalizeBranch,
};
