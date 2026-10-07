const axios = require('axios');
const fs = require('fs');

async function testSaipu3ane() {
  const handle = 'saipu3ane';
  const url = `https://www.geeksforgeeks.org/user/${handle}/`;
  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    timeout: 10000,
  });

  console.log('HTML status:', res.status, 'HTML length:', res.data.length);
  fs.writeFileSync('gfg_dump_saipu3ane.html', res.data);

  // Check RSC matches
  const rscMatches = [...res.data.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)];
  console.log('RSC matches count:', rscMatches.length);

  let combinedRsc = '';
  for (const m of rscMatches) {
    try {
      combinedRsc += JSON.parse(`"${m[1]}"`);
    } catch (e) {
      combinedRsc += m[1];
    }
  }
  fs.writeFileSync('gfg_rsc_saipu3ane.txt', combinedRsc);
  console.log('Combined RSC length:', combinedRsc.length);

  // Look for score, solved, problems, 26, 41, 32, 1, 100
  const keys = ['school', 'basic', 'easy', 'medium', 'hard', 'School', 'Basic', 'Easy', 'Medium', 'Hard', 'total_problems_solved', 'coding_score', 'totalProblemsSolved', 'score', 'pod_solved_longest_streak', 'institute_rank'];
  for (const k of keys) {
    let pos = 0;
    let count = 0;
    while ((pos = combinedRsc.indexOf(k, pos)) !== -1) {
      count++;
      if (count <= 5) {
        console.log(`[RSC] "${k}" @ ${pos}: ${JSON.stringify(combinedRsc.substring(Math.max(0, pos - 50), pos + 120))}`);
      }
      pos += k.length;
    }
    if (count > 0) {
      console.log(`[RSC] Total matches for "${k}": ${count}`);
    }
  }
}

testSaipu3ane();
