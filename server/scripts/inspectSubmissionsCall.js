const fs = require('fs');

const text = fs.readFileSync('chunk_7223.js', 'utf8');

const idx = text.indexOf('api/v1/user/problems/submissions');
if (idx !== -1) {
  console.log('--- problems/submissions context:');
  console.log(text.slice(Math.max(0, idx - 300), idx + 300));
}

// Let's also search for all other endpoints in chunk_7223
const allEndpoints = [...text.matchAll(/api[a-zA-Z0-9_\-\/\?&=]+/g)].map(m => m[0]);
console.log('All api paths:', [...new Set(allEndpoints)]);
