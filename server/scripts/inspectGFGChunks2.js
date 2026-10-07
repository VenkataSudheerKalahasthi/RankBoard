const axios = require('axios');

async function test() {
  const username = 'venkatasudheerkalahasthi';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };

  const res = await axios.get(`https://www.geeksforgeeks.org/user/${username}/`, { headers });
  const html = res.data;
  
  const jsUrls = [...html.matchAll(/src=\"([^\"]+\/_next\/static\/chunks\/[^\"]+\.js)\"/g)].map(m => m[1]);
  console.log('JS Chunks:', jsUrls.length);

  for (const jsUrl of jsUrls) {
    const fullUrl = jsUrl.startsWith('http') ? jsUrl : `https://www.geeksforgeeks.org${jsUrl}`;
    try {
      const jsRes = await axios.get(fullUrl, { headers });
      const text = jsRes.data;
      if (text.includes('difficulty') || text.includes('user_solved') || text.includes('solved') || text.includes('SCHOOL')) {
        const matches = [...text.matchAll(/(https?:\/\/[^\s\"\'\`]+|\/api\/[^\s\"\'\`]+)/g)].map(m => m[0]);
        const interesting = matches.filter(u => u.includes('problem') || u.includes('user') || u.includes('practice') || u.includes('stats'));
        if (interesting.length > 0) {
          console.log(`Chunk ${jsUrl.split('/').pop()}:`, interesting);
        }
      }
    } catch (e) {}
  }
}
test();
