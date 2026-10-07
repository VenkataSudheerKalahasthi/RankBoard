const fs = require('fs');
const path = require('path');

const html = fs.readFileSync('gfg_dump_saipujeet.html', 'utf8');
const chunkMatches = [...html.matchAll(/src="([^"]+\.js)"/g)].map(m => m[1]);

async function findConfig() {
  const axios = require('axios');
  for (const chunk of chunkMatches) {
    const url = chunk.startsWith('http') ? chunk : `https://www.geeksforgeeks.org${chunk}`;
    try {
      const res = await axios.get(url);
      const text = res.data;
      if (text.includes('AUTH_DJANGO_API_URL')) {
        const matches = [...text.matchAll(/(.{0,100}AUTH_DJANGO_API_URL.{0,100})/g)];
        console.log(`Found in ${chunk}:`);
        for (const m of matches) {
          console.log(m[1]);
        }
      }
    } catch(e){}
  }
}

findConfig();
