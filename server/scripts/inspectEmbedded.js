const axios = require('axios');

async function inspectEmbedded(handle) {
  const url = `https://www.codechef.com/users/${encodeURIComponent(handle)}`;
  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    timeout: 12000,
  });

  const html = res.data;

  // Rating header
  const ratingHeaderIdx = html.indexOf('rating-header');
  console.log(`Rating header index: ${ratingHeaderIdx}`);
  if (ratingHeaderIdx !== -1) {
    console.log(html.substring(ratingHeaderIdx, ratingHeaderIdx + 300));
  }

  // rating-number
  const ratingNumIdx = html.indexOf('rating-number');
  console.log(`Rating number index: ${ratingNumIdx}`);
  if (ratingNumIdx !== -1) {
    console.log(html.substring(ratingNumIdx - 20, ratingNumIdx + 100));
  }

  // Check rating-ranks
  const ratingRanksIdx = html.indexOf('rating-ranks');
  console.log(`Rating ranks index: ${ratingRanksIdx}`);
  if (ratingRanksIdx !== -1) {
    console.log(html.substring(ratingRanksIdx, ratingRanksIdx + 400));
  }

  // Let's check date_versus_rating JSON
  const dvrMatch = html.match(/date_versus_rating\s*:\s*({[\s\S]*?})\s*,\s*contest_ratings/i) ||
                   html.match(/date_versus_rating\s*:\s*({[\s\S]*?})\s*,\s*"contest_ratings/i) ||
                   html.match(/"date_versus_rating"\s*:\s*({[\s\S]*?})\s*,\s*"contest_ratings"/i);
  if (dvrMatch) {
    try {
      const dvr = JSON.parse(dvrMatch[1]);
      const allRatings = dvr.all || [];
      if (allRatings.length > 0) {
        const lastRating = allRatings[allRatings.length - 1];
        console.log('Last contest rating from JSON:', lastRating);
      }
    } catch (e) {
      console.log('dvr parse error:', e.message);
    }
  }
}

(async () => {
  console.log('=== gennady.korotkevich ===');
  await inspectEmbedded('gennady.korotkevich');
  console.log('\n=== tarun_kumar5 ===');
  await inspectEmbedded('tarun_kumar5');
})();
