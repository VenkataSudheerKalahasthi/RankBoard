const axios = require('axios');

async function testFetch(username) {
  try {
    const url = `https://www.codechef.com/users/${encodeURIComponent(username)}`;
    console.log(`Fetching: ${url}`);
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 15000,
    });

    const html = res.data;
    console.log('Status:', res.status, 'HTML length:', html.length);

    // Rating
    const ratingMatch = html.match(/class="rating-number">([0-9]+)<\/div>/i) ||
                        html.match(/<div[^>]*class="rating-number"[^>]*>([0-9]+)<\/div>/i);
    console.log('Rating match:', ratingMatch ? ratingMatch[1] : null);

    // Stars
    const starsMatch = html.match(/class="rating-star">\s*<span>([0-9★]+)<\/span>/i) ||
                       html.match(/([1-7])★/i);
    console.log('Stars match:', starsMatch ? starsMatch[1] : null);

    // Search for "Problems Solved" or "Total Problems Solved"
    const solvedPatterns = [
      /Total Problems Solved:\s*([0-9]+)/i,
      /Problems Solved:?\s*<[^>]+>\s*([0-9]+)/i,
      /<h3>Total Problems Solved:\s*([0-9]+)<\/h3>/i,
      /<h5>Total Problems Solved:\s*([0-9]+)<\/h5>/i,
      /Total Problems Solved\s*<\/[^>]+>\s*<[^>]+>\s*([0-9]+)/i,
      /problems-solved[\s\S]*?([0-9]+)/i,
      /practice-problems-section[\s\S]*?([0-9]+)/i,
    ];

    for (const p of solvedPatterns) {
      const m = html.match(p);
      if (m) {
        console.log('Pattern matched:', p, '=>', m[1]);
      }
    }

    // Search for 246 in HTML
    const idx = html.indexOf('246');
    console.log('Found "246" at index:', idx);
    if (idx !== -1) {
      console.log('--- Context around 246 ---');
      console.log(html.substring(Math.max(0, idx - 200), Math.min(html.length, idx + 200)));
      console.log('--------------------------');
    }

    // Let's print any section related to problems
    const solvedSectionIdx = html.indexOf('problems-solved');
    if (solvedSectionIdx !== -1) {
      console.log('--- Context around problems-solved ---');
      console.log(html.substring(solvedSectionIdx, solvedSectionIdx + 600));
      console.log('--------------------------------------');
    }

    const totalSolvedTextIdx = html.indexOf('Total Problems Solved');
    if (totalSolvedTextIdx !== -1) {
      console.log('--- Context around "Total Problems Solved" ---');
      console.log(html.substring(totalSolvedTextIdx - 50, totalSolvedTextIdx + 300));
      console.log('---------------------------------------------');
    }

    // Also check if CodeChef has any API endpoint or embedded JSON / script tags
    const scriptMatches = html.match(/var\s+user\s*=\s*({[\s\S]*?});/i) ||
                          html.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});/i);
    if (scriptMatches) {
      console.log('Found initial state / user json');
    }

    // Let's check Global Rank / Country Rank
    const globalRankMatch = html.match(/Global Rank[\s\S]*?<strong>([0-9]+)<\/strong>/i) ||
                            html.match(/Global Rank:\s*<[^>]+>([0-9]+)<\/[^>]+>/i);
    console.log('Global rank match:', globalRankMatch ? globalRankMatch[1] : null);

  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

testFetch('tarun_kumar5');
