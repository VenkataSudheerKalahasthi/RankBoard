const axios = require('axios');

async function testRated(handle) {
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
    const ratingMatch = html.match(/class="rating-number">([0-9]+)<\/div>/i) ||
                        html.match(/<div[^>]*class="rating-number"[^>]*>([0-9]+)<\/div>/i);
    
    const starsMatch = html.match(/class="rating-star">\s*<span>([0-9★]+)<\/span>/i) ||
                       html.match(/class="rating-star"[^>]*>[\s\S]*?<span>([0-9★]+)<\/span>/i) ||
                       html.match(/([1-7])★/i);
    
    const solvedMatch = html.match(/Total Problems Solved:\s*([0-9]+)/i) ||
                        html.match(/<h3>Total Problems Solved:\s*([0-9]+)<\/h3>/i) ||
                        html.match(/<h5>Total Problems Solved:\s*([0-9]+)<\/h5>/i);

    const globalRankMatch = html.match(/Global Rank[\s\S]*?<a[^>]*>([0-9]+)<\/a>/i) ||
                            html.match(/Global Rank[\s\S]*?<strong>([0-9]+)<\/strong>/i);

    console.log(`User: ${handle}`);
    console.log(`Rating: ${ratingMatch ? ratingMatch[1] : null}`);
    console.log(`Stars: ${starsMatch ? starsMatch[1] : null}`);
    console.log(`Solved: ${solvedMatch ? solvedMatch[1] : null}`);
    console.log(`Global Rank: ${globalRankMatch ? globalRankMatch[1] : null}`);
  } catch (err) {
    console.error(err.message);
  }
}

(async () => {
  await testRated('gennady.korotkevich');
  await testRated('tarun_kumar5');
})();
