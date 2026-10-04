const axios = require('axios');

async function inspectRating(handle) {
  const url = `https://www.codechef.com/users/${encodeURIComponent(handle)}`;
  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    timeout: 12000,
  });

  const html = res.data;
  const ratingOccurrences = [];
  let pos = 0;
  while ((pos = html.indexOf('rating', pos)) !== -1) {
    ratingOccurrences.push(html.substring(Math.max(0, pos - 30), Math.min(html.length, pos + 80)));
    pos += 6;
    if (ratingOccurrences.length >= 10) break;
  }
  console.log(`Rating snippets for ${handle}:`);
  ratingOccurrences.forEach((s, idx) => console.log(`[${idx}]`, s.replace(/\s+/g, ' ')));
}

inspectRating('gennady.korotkevich');
