const axios = require('axios');

async function testGfg(handle) {
  try {
    const urls = [
      `https://www.geeksforgeeks.org/user/${encodeURIComponent(handle)}/`,
      `https://www.geeksforgeeks.org/profile/${encodeURIComponent(handle)}/`,
      `https://auth.geeksforgeeks.org/user/${encodeURIComponent(handle)}/practice/`,
    ];

    for (const u of urls) {
      console.log(`\nFetching: ${u}`);
      try {
        const res = await axios.get(u, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          timeout: 10000,
          maxRedirects: 5,
        });
        console.log(`Status: ${res.status}, Length: ${res.data.length}`);
        const html = res.data;
        const jsonMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[1]);
          console.log('NEXT_DATA keys:', Object.keys(parsed.props?.pageProps || {}));
          console.log('userInfo:', parsed.props?.pageProps?.userInfo);
          console.log('userProfile:', parsed.props?.pageProps?.userProfile);
          console.log('userData:', parsed.props?.pageProps?.userData);
        } else {
          console.log('No NEXT_DATA');
          // Find any occurrence of score or solved
          const idx = html.indexOf('score');
          console.log('Index of score:', idx);
        }
      } catch (e) {
        console.log('Fetch error:', e.message);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

testGfg('tarunkumarkv0j4');
