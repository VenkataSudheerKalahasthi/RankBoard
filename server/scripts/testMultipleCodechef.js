const axios = require('axios');

const testHandles = [
  'tarun_kumar5',
  'zeal_luck_67',
  'muralisai_sure',
  'shaikkhaleed',
  'prajyeshpilli',
  'ssk_7_gunji',
];

async function parseCodechef(handle) {
  try {
    const url = `https://www.codechef.com/users/${encodeURIComponent(handle)}`;
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 12000,
    });

    const html = res.data;
    if (typeof html !== 'string' || html.includes('User does not exist') || html.includes('Page Not Found') || res.status === 404) {
      return { handle, status: 'NOT_FOUND' };
    }

    let rating = null;
    let stars = null;
    let totalSolved = null;
    let globalRank = null;
    let countryRank = null;
    let contests = null;

    // 1. Rating
    const ratingMatch = html.match(/class="rating-number">([0-9]+)<\/div>/i) ||
                        html.match(/<div[^>]*class="rating-number"[^>]*>([0-9]+)<\/div>/i) ||
                        html.match(/rating-header[\s\S]*?<div[^>]*class="rating-number"[^>]*>([0-9]+)/i);
    if (ratingMatch) rating = parseInt(ratingMatch[1], 10);

    // 2. Stars
    const starsMatch = html.match(/class="rating-star">\s*<span>([0-9★]+)<\/span>/i) ||
                       html.match(/class="rating-star"[^>]*>[\s\S]*?<span>([0-9★]+)<\/span>/i) ||
                       html.match(/class="rating-star">[\s\S]*?([1-7])★/i) ||
                       html.match(/([1-7])★/i);
    if (starsMatch) stars = starsMatch[1];

    // 3. Total Problems Solved
    // Check multiple patterns:
    // <h3>Total Problems Solved: 246</h3>
    // <h5>Total Problems Solved: 246</h5>
    // Total Problems Solved: 246
    // Fully Solved (123)
    const solvedMatch = html.match(/Total Problems Solved:\s*([0-9]+)/i) ||
                        html.match(/<h3>Total Problems Solved:\s*([0-9]+)<\/h3>/i) ||
                        html.match(/<h5>Total Problems Solved:\s*([0-9]+)<\/h5>/i) ||
                        html.match(/Problems Solved:?\s*<[^>]+>\s*([0-9]+)/i) ||
                        html.match(/Total Problems Solved\s*<\/[^>]+>\s*<[^>]+>\s*([0-9]+)/i);
    if (solvedMatch) {
      totalSolved = parseInt(solvedMatch[1], 10);
    } else {
      // If "Total Problems Solved" text not present, count problems listed in solved section
      const problemsSectionMatch = html.match(/<section[^>]*class="[^"]*problems-solved[^"]*"[^>]*>([\s\S]*?)<\/section>/i);
      if (problemsSectionMatch) {
        const linksCount = (problemsSectionMatch[1].match(/<a\s+href="\/problems\//gi) || []).length;
        if (linksCount > 0) totalSolved = linksCount;
      }
    }

    // 4. Global Rank & Country Rank
    const globalRankMatch = html.match(/Global Rank[\s\S]*?<a[^>]*>([0-9]+)<\/a>/i) ||
                            html.match(/Global Rank[\s\S]*?<strong>([0-9]+)<\/strong>/i) ||
                            html.match(/global-rank[^>]*>([0-9]+)/i);
    if (globalRankMatch) globalRank = parseInt(globalRankMatch[1], 10);

    // 5. Contests
    const contestMatch = html.match(/Contests \(([0-9]+)\)/i) ||
                         html.match(/Contests:\s*([0-9]+)/i) ||
                         html.match(/<div[^>]*class="contest-participated-count"[^>]*>([0-9]+)/i);
    if (contestMatch) contests = parseInt(contestMatch[1], 10);

    return {
      handle,
      status: (totalSolved !== null || rating !== null) ? 'SUCCESS' : 'FAILED',
      totalSolved: totalSolved ?? 0,
      rating,
      stars,
      globalRank,
      contests,
    };
  } catch (err) {
    return { handle, status: 'ERROR', error: err.message };
  }
}

(async () => {
  for (const h of testHandles) {
    const res = await parseCodechef(h);
    console.log(JSON.stringify(res, null, 2));
  }
})();
