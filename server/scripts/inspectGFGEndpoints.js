const fs = require('fs');
const axios = require('axios');

const html = fs.readFileSync('gfg_dump_saipujeet.html', 'utf8');

const scriptSrcs = [...html.matchAll(/<script[^>]+src="([^">]+)"/g)].map(m => m[1]);
console.log('Script sources count:', scriptSrcs.length);
console.log('Script sources:', scriptSrcs);

async function checkScripts() {
  for (const src of scriptSrcs) {
    const fullUrl = src.startsWith('http') ? src : `https://www.geeksforgeeks.org${src}`;
    try {
      const res = await axios.get(fullUrl, { timeout: 8000 });
      const text = res.data;
      if (typeof text === 'string') {
        const matches = text.matchAll(/https?:\/\/[a-zA-Z0-9.-]+geeksforgeeks\.org\/[a-zA-Z0-9_\-\/]+/g);
        const apiEndpoints = new Set();
        for (const m of matches) {
          if (m[0].includes('api') || m[0].includes('user') || m[0].includes('profile') || m[0].includes('problem')) {
            apiEndpoints.add(m[0]);
          }
        }
        if (apiEndpoints.size > 0) {
          console.log(`Endpoints found in ${src}:`, Array.from(apiEndpoints));
        }

        // Also search for problem solved keys
        const keywords = ['school', 'basic', 'easy', 'medium', 'hard', 'total_problems_solved', 'totalProblemsSolved', 'solved_stats', 'difficulty'];
        for (const kw of keywords) {
          const idx = text.indexOf(kw);
          if (idx !== -1) {
            console.log(`Found "${kw}" in ${src} at ${idx}: ${text.slice(Math.max(0, idx - 40), idx + 80)}`);
          }
        }
      }
    } catch (e) {
      console.log('Error fetching script', fullUrl, e.message);
    }
  }
}

checkScripts();
