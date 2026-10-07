const axios = require('axios');
const fs = require('fs');

async function test() {
  const username = 'venkatasudheerkalahasthi';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };

  const res = await axios.get(`https://www.geeksforgeeks.org/user/${username}/`, { headers });
  const html = res.data;
  
  // Find all JS chunk scripts
  const jsUrls = [...html.matchAll(/src=\"(https:\/\/static\.geeksforgeeks\.org\/[^\"]+\.js|[^\"]+\/_next\/static\/chunks\/[^\"]+\.js)\"/g)].map(m => m[1]);
  console.log('JS Chunks found:', jsUrls.length);

  for (const jsUrl of jsUrls.slice(0, 10)) {
    const fullUrl = jsUrl.startsWith('http') ? jsUrl : `https://www.geeksforgeeks.org${jsUrl}`;
    try {
      const jsRes = await axios.get(fullUrl, { headers });
      const apis = [...jsRes.data.matchAll(/https?:\/\/[a-zA-Z0-9\.\-\/]+api[a-zA-Z0-9\.\-\/_]+/g)].map(m => m[0]);
      if (apis.length > 0) {
        console.log(`APIs in ${jsUrl.split('/').pop()}:`, [...new Set(apis)]);
      }
      const endpoints = [...jsRes.data.matchAll(/\"\/api\/[^\"]+\"/g)].map(m => m[0]);
      if (endpoints.length > 0) {
        console.log(`Endpoints in ${jsUrl.split('/').pop()}:`, [...new Set(endpoints)]);
      }
    } catch (e) {}
  }
}
test();
