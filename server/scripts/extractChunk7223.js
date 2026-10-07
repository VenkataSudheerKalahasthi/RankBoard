const axios = require('axios');
const fs = require('fs');

async function checkSpecificChunk() {
  const url = 'https://assets.geeksforgeeks.org/connect-prod/_next/static/chunks/7223-ee45b4cb368f3c2e.js';
  const res = await axios.get(url);
  const text = res.data;
  fs.writeFileSync('chunk_7223.js', text);

  // search for user-profile, practiceapi, stats, submissions
  const patterns = [
    /https:\/\/practiceapi\.geeksforgeeks\.org\/[a-zA-Z0-9_\-\/\?&=]+/g,
    /https:\/\/auth\.geeksforgeeks\.org\/[a-zA-Z0-9_\-\/\?&=]+/g,
    /https:\/\/utilapi\.geeksforgeeks\.org\/[a-zA-Z0-9_\-\/\?&=]+/g,
    /api-get\/[a-zA-Z0-9_\-\/\?&=]+/g,
    /api\/[a-zA-Z0-9_\-\/\?&=]+/g,
  ];

  for (const pat of patterns) {
    const matches = [...text.matchAll(pat)].map(m => m[0]);
    console.log('Matches for', pat, ':', [...new Set(matches)]);
  }
}

checkSpecificChunk();
