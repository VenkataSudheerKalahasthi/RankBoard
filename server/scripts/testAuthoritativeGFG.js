const axios = require('axios');

async function fetchGFGAuthoritative(username) {
  const profileUrl = `https://www.geeksforgeeks.org/user/${encodeURIComponent(username)}/`;
  const now = new Date().toISOString();

  const result = {
    platform: 'gfg',
    username,
    profileUrl,
    totalSolved: 0,
    schoolSolved: 0,
    basicSolved: 0,
    easySolved: 0,
    mediumSolved: 0,
    hardSolved: 0,
    rating: null,
    contests: null,
    streak: null,
    globalRank: null,
    status: 'PENDING',
    fetchedAt: now,
    errorMessage: null,
    rawData: null,
  };

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Origin': 'https://www.geeksforgeeks.org',
    'Referer': profileUrl,
  };

  let submissionsSuccess = false;
  let profilePageSuccess = false;

  // 1. Authoritative Submissions API
  try {
    const subRes = await axios.post(
      'https://practiceapi.geeksforgeeks.org/api/v1/user/problems/submissions/',
      { handle: username, requestType: '', year: '', month: '' },
      { headers: { ...headers, 'Content-Type': 'application/json' }, timeout: 10000 }
    );

    if (subRes.data && (subRes.data.status === 'success' || subRes.status === 200)) {
      const resData = subRes.data;
      if (resData.result && typeof resData.result === 'object') {
        const categories = resData.result;
        result.schoolSolved = Object.keys(categories.School || categories.school || {}).length;
        result.basicSolved = Object.keys(categories.Basic || categories.basic || {}).length;
        result.easySolved = Object.keys(categories.Easy || categories.easy || {}).length;
        result.mediumSolved = Object.keys(categories.Medium || categories.medium || {}).length;
        result.hardSolved = Object.keys(categories.Hard || categories.hard || {}).length;
        
        const sumCategories = result.schoolSolved + result.basicSolved + result.easySolved + result.mediumSolved + result.hardSolved;
        result.totalSolved = typeof resData.count === 'number' ? Math.max(resData.count, sumCategories) : sumCategories;
        submissionsSuccess = true;
      }
    }
  } catch (subErr) {
    console.log(`[Submissions API Warning] ${username}:`, subErr.response?.status || subErr.message);
  }

  // 2. Profile Page (Coding score, Streak, Institute Rank)
  try {
    const pageRes = await axios.get(profileUrl, {
      headers: {
        'User-Agent': headers['User-Agent'],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 10000,
    });

    const html = pageRes.data;
    if (typeof html === 'string' && !html.includes('User does not exist') && !html.includes('Page Not Found') && pageRes.status === 200) {
      profilePageSuccess = true;

      // Extract from RSC stream payload
      const rscMatches = html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g);
      let rscPayload = '';
      for (const m of rscMatches) {
        try { rscPayload += JSON.parse(`"${m[1]}"`); } catch (e) { rscPayload += m[1]; }
      }

      if (rscPayload) {
        const scoreMatch = rscPayload.match(/"score"\s*:\s*([0-9]+)/i) || rscPayload.match(/"coding_score"\s*:\s*([0-9]+)/i);
        if (scoreMatch) result.rating = parseInt(scoreMatch[1], 10);

        const streakMatch = rscPayload.match(/"pod_solved_longest_streak"\s*:\s*([0-9]+)/i);
        if (streakMatch) result.streak = parseInt(streakMatch[1], 10);

        const rankMatch = rscPayload.match(/"institute_rank"\s*:\s*([0-9]+)/i);
        if (rankMatch) {
          result.rawData = { ...(result.rawData || {}), instituteRank: parseInt(rankMatch[1], 10) };
        }

        const totalSolvedMatch = rscPayload.match(/"total_problems_solved"\s*:\s*([0-9]+)/i) || rscPayload.match(/"totalProblemsSolved"\s*:\s*([0-9]+)/i);
        if (totalSolvedMatch && !submissionsSuccess) {
          result.totalSolved = parseInt(totalSolvedMatch[1], 10);
        }
      }

      // Legacy fallback regexes for HTML
      if (result.rating === null) {
        const htmlScoreMatch = html.match(/Coding Score[\s\S]*?<div[^>]*class="[^"]*score[^"]*"[^>]*>([0-9]+)<\/div>/i) ||
                               html.match(/class="score_card_value"[^>]*>([0-9]+)<\/span>\s*<span>Coding Score/i) ||
                               html.match(/Coding Score:?\s*([0-9]+)/i);
        if (htmlScoreMatch && htmlScoreMatch[1]) result.rating = parseInt(htmlScoreMatch[1], 10);
      }
    }
  } catch (pageErr) {
    console.log(`[Profile Page Warning] ${username}:`, pageErr.response?.status || pageErr.message);
  }

  // 3. Optional Rating / Contest API
  try {
    const ratingRes = await axios.get(`https://practiceapi.geeksforgeeks.org/api/v1/rating/${encodeURIComponent(username)}/info/`, {
      headers,
      timeout: 5000,
    });
    if (ratingRes.data && typeof ratingRes.data === 'object') {
      const gRank = ratingRes.data.user_global_rank;
      if (gRank && gRank !== '-' && !isNaN(Number(gRank))) {
        result.globalRank = parseInt(gRank, 10);
      }
      const contestData = ratingRes.data.user_contest_data;
      if (contestData && typeof contestData.no_of_participated_contest === 'number') {
        result.contests = contestData.no_of_participated_contest;
      }
    }
  } catch (ratingErr) {
    // Non-blocking
  }

  // Final validation and status assignment
  if (submissionsSuccess || profilePageSuccess) {
    result.status = 'SUCCESS';
    result.errorMessage = null;
  } else {
    result.status = 'FAILED';
    result.errorMessage = `User "${username}" not found on GeeksforGeeks`;
  }

  return result;
}

async function runTests() {
  console.log('--- Testing Saipujeet (saipu3ane) ---');
  const r1 = await fetchGFGAuthoritative('saipu3ane');
  console.log(JSON.stringify(r1, null, 2));

  console.log('\n--- Testing non-existent user ---');
  const r2 = await fetchGFGAuthoritative('invalid_user_9999999_xyz');
  console.log(JSON.stringify(r2, null, 2));
}

runTests();
