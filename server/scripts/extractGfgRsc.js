const axios = require('axios');

async function extractNextRSC(handle) {
  const url = `https://www.geeksforgeeks.org/user/${encodeURIComponent(handle)}/`;
  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    timeout: 12000,
  });

  const html = res.data;

  // Combine all self.__next_f.push strings
  const rscMatches = html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g);
  let combined = '';
  for (const m of rscMatches) {
    try {
      // unescape json string
      const unescaped = JSON.parse(`"${m[1]}"`);
      combined += unescaped;
    } catch (e) {
      combined += m[1];
    }
  }

  console.log(`Combined RSC payload length: ${combined.length}`);

  // Search for problems / score / total_problems_solved
  const jsonObjectMatches = combined.matchAll(/\{[^{}]*?"total_problems_solved"[^{}]*?\}/g);
  for (const jm of jsonObjectMatches) {
    console.log('Found object with total_problems_solved:', jm[0]);
  }

  // Let's search for "score" or "total" or "coding_score" or "rank"
  const patterns = [
    /total_problems_solved"?\s*:\s*([0-9]+)/i,
    /totalProblemsSolved"?\s*:\s*([0-9]+)/i,
    /score"?\s*:\s*([0-9]+)/i,
    /coding_score"?\s*:\s*([0-9]+)/i,
    /pod_solved_longest_streak"?\s*:\s*([0-9]+)/i,
    /institute_rank"?\s*:\s*([0-9]+)/i,
    /total_solved"?\s*:\s*([0-9]+)/i,
    /problems_solved"?\s*:\s*([0-9]+)/i,
    /solved"?\s*:\s*([0-9]+)/i,
  ];

  for (const p of patterns) {
    const m = combined.match(p);
    if (m) {
      console.log('Matched RSC pattern:', p, '=>', m[1]);
    }
  }

  // Let's print any snippet containing "tarunkumarkv0j4"
  const handleIdx = combined.indexOf('tarunkumarkv0j4');
  if (handleIdx !== -1) {
    console.log('--- Around handle ---');
    console.log(combined.substring(handleIdx, handleIdx + 1200));
    console.log('---------------------');
  }
}

extractNextRSC('tarunkumarkv0j4');
