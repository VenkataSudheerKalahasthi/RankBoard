const { getAllStudents } = require('../src/supabase/supabaseRepository');
const axios = require('axios');

async function testAllDatabaseHandles() {
  const students = await getAllStudents();
  const gfgStudents = students.filter(s => s.platforms?.gfg?.username || s.platforms?.gfg?.profileUrl);
  console.log(`Testing ${gfgStudents.length} GFG students from database...\n`);

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*',
    'Origin': 'https://www.geeksforgeeks.org',
  };

  for (const s of gfgStudents.slice(0, 15)) {
    const handle = s.platforms?.gfg?.username;
    console.log(`\n========================================`);
    console.log(`Student: ${s.name} (${s.rollNumber}) -> Handle: ${handle}`);
    console.log(`Currently in DB: School=${s.platformStats?.gfg?.schoolSolved}, Basic=${s.platformStats?.gfg?.basicSolved}, Easy=${s.platformStats?.gfg?.easySolved}, Medium=${s.platformStats?.gfg?.mediumSolved}, Hard=${s.platformStats?.gfg?.hardSolved}, Total=${s.platformStats?.gfg?.totalSolved}`);

    try {
      // 1. Fetch submissions API
      const subRes = await axios.post('https://practiceapi.geeksforgeeks.org/api/v1/user/problems/submissions/', {
        handle,
        requestType: '',
        year: '',
        month: ''
      }, { headers, timeout: 8000 });

      const result = subRes.data?.result || {};
      const school = Object.keys(result.School || result.school || {}).length;
      const basic = Object.keys(result.Basic || result.basic || {}).length;
      const easy = Object.keys(result.Easy || result.easy || {}).length;
      const medium = Object.keys(result.Medium || result.medium || {}).length;
      const hard = Object.keys(result.Hard || result.hard || {}).length;
      const total = school + basic + easy + medium + hard;

      console.log(`API Extracted: School=${school}, Basic=${basic}, Easy=${easy}, Medium=${medium}, Hard=${hard}, Total=${total} (count: ${subRes.data.count})`);

      // 2. Fetch profile page for coding score & streak
      const pageRes = await axios.get(`https://www.geeksforgeeks.org/user/${encodeURIComponent(handle)}/`, {
        headers: { 'User-Agent': headers['User-Agent'] },
        timeout: 8000
      });
      const html = pageRes.data;
      let score = null;
      let streak = null;
      let instituteRank = null;
      const rscMatches = html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g);
      let rscPayload = '';
      for (const m of rscMatches) {
        try { rscPayload += JSON.parse(`"${m[1]}"`); } catch(e) { rscPayload += m[1]; }
      }
      const scoreMatch = rscPayload.match(/"score"\s*:\s*([0-9]+)/i);
      if (scoreMatch) score = parseInt(scoreMatch[1], 10);
      const streakMatch = rscPayload.match(/"pod_solved_longest_streak"\s*:\s*([0-9]+)/i);
      if (streakMatch) streak = parseInt(streakMatch[1], 10);
      const rankMatch = rscPayload.match(/"institute_rank"\s*:\s*([0-9]+)/i);
      if (rankMatch) instituteRank = parseInt(rankMatch[1], 10);

      console.log(`Profile Metadata: Score=${score}, Streak=${streak}, InstituteRank=${instituteRank}`);
    } catch (err) {
      console.log(`Fetch error:`, err.response?.status, err.response?.data?.message || err.message);
    }
  }
}

testAllDatabaseHandles();
