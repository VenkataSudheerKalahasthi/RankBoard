const fs = require('fs');
const axios = require('axios');

const html = fs.readFileSync('gfg_dump_saipujeet.html', 'utf8');
const chunkMatches = [...html.matchAll(/src="([^"]+\.js)"/g)].map(m => m[1]);

async function check() {
  for (const chunk of chunkMatches) {
    const url = chunk.startsWith('http') ? chunk : `https://www.geeksforgeeks.org${chunk}`;
    try {
      const res = await axios.get(url);
      const text = res.data;
      const matches = [...text.matchAll(/AUTH_DJANGO_API_URL\s*:\s*["'`]([^"'`]+)["'`]/g)];
      for (const m of matches) {
        console.log(`AUTH_DJANGO_API_URL in ${chunk} = ${m[1]}`);
      }
      const matches2 = [...text.matchAll(/GFG_PRACTICE_API_URL\s*:\s*["'`]([^"'`]+)["'`]/g)];
      for (const m of matches2) {
        console.log(`GFG_PRACTICE_API_URL in ${chunk} = ${m[1]}`);
      }
      // Also look for any env variables or URLs assigned
      const envMatches = [...text.matchAll(/(AUTH_DJANGO_API_URL\s*:[^,}]+)/g)];
      for (const m of envMatches) {
        console.log(`ENV match in ${chunk}: ${m[1]}`);
      }
    } catch (e) {}
  }
}

check();
