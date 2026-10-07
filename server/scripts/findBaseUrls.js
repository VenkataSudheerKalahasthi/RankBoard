const fs = require('fs');

const text = fs.readFileSync('chunk_7223.js', 'utf8');

const keys = ['AUTH_DJANGO_API_URL', 'GFG_PRACTICE_API_URL', 'PRACTICE_API_URL', 'DJANGO_API_URL'];
for (const k of keys) {
  let pos = 0;
  while ((pos = text.indexOf(k, pos)) !== -1) {
    console.log(`Key ${k} @ ${pos}: ${text.slice(Math.max(0, pos - 100), pos + 100)}`);
    pos += k.length;
  }
}
