const fs = require('fs');
const axios = require('axios');

async function inspectChunks() {
  const html = fs.readFileSync('gfg_dump_saipujeet.html', 'utf8');
  const chunkMatches = [...html.matchAll(/src="([^"]+\.js)"/g)].map(m => m[1]);
  console.log('Found chunks:', chunkMatches);

  for (const chunk of chunkMatches) {
    const url = chunk.startsWith('http') ? chunk : `https://www.geeksforgeeks.org${chunk}`;
    try {
      const res = await axios.get(url);
      const text = res.data;
      // Search for any fetch / axios / api URLs in this chunk
      const apiCalls = [...text.matchAll(/["'](https?:\/\/[^"']+|(?:\/api\/[^"']+)|(?:\/api-v\d\/[^"']+))["']/g)].map(m => m[1]);
      if (apiCalls.length > 0) {
        console.log(`\n--- API URLs in ${chunk}:`);
        console.log([...new Set(apiCalls)].filter(u => !u.endsWith('.svg') && !u.endsWith('.png') && !u.endsWith('.jpg') && !u.includes('google')));
      }

      // Check for user/stats/practice/problems
      const queryMatches = [...text.matchAll(/([a-zA-Z0-9_\-\/]*?(?:problem|solved|stats|difficulty|submissions|coding_score|user_profile|user-profile|difficulty_wise_solved)[a-zA-Z0-9_\-\/]*?)/gi)].map(m => m[1]);
      if (queryMatches.length > 0) {
        const unique = [...new Set(queryMatches)].filter(q => q.length > 5);
        if (unique.length > 0) {
          console.log(`Keywords in ${chunk}:`, unique.slice(0, 10));
        }
      }
    } catch (e) {
      console.log('Error fetching chunk:', url, e.message);
    }
  }
}

inspectChunks();
