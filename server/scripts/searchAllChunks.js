const fs = require('fs');
const axios = require('axios');

const html = fs.readFileSync('gfg_dump_saipujeet.html', 'utf8');
const chunkMatches = [...html.matchAll(/src="([^"]+\.js)"/g)].map(m => m[1]);

async function checkAllChunks() {
  for (const chunk of chunkMatches) {
    const url = chunk.startsWith('http') ? chunk : `https://www.geeksforgeeks.org${chunk}`;
    try {
      const res = await axios.get(url);
      const text = res.data;
      if (text.includes('problemSubmissionInfo') || text.includes('useLazyProblemSubmissionInfo') || text.includes('getUserInfo')) {
        console.log(`Found in ${chunk}:`);
        const matches = [...text.matchAll(/(.{0,100}(?:problemSubmissionInfo|useLazyProblemSubmissionInfo|useProblemSubmissionInfo).{0,100})/g)];
        for (const m of matches) {
          console.log('   ', m[1]);
        }
      }
    } catch(e) {}
  }
}

checkAllChunks();
