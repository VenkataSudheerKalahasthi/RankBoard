const axios = require('axios');

async function testApiEndpoints(handle) {
  const baseDomains = [
    'https://practiceapi.geeksforgeeks.org/',
    'https://auth.geeksforgeeks.org/',
    'https://www.geeksforgeeks.org/',
    'https://api.geeksforgeeks.org/',
    'https://utilapi.geeksforgeeks.org/',
    'https://communityapi.geeksforgeeks.org/',
    'https://apiwrite.geeksforgeeks.org/',
  ];

  const pathTemplates = [
    'api-get/user-profile-info/?handle={handle}',
    'api-get/user-params-info/?handle={handle}',
    'api/v1/user/problems/submissions/?handle={handle}',
    'api/v1/rating/?handle={handle}',
    'api-get/user-profile/?handle={handle}',
    'api/v1/user/problems/submissions/{handle}/',
    'api/v1/rating/{handle}/',
    'api-get/user-profile-info/{handle}/',
    'api-get/user-profile-info/?user_handle={handle}',
    'api-get/user-profile-info/?username={handle}',
    'api/v1/user/stats/?handle={handle}',
  ];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': `https://www.geeksforgeeks.org/user/${handle}/`,
    'Origin': 'https://www.geeksforgeeks.org',
  };

  for (const base of baseDomains) {
    for (const template of pathTemplates) {
      const url = `${base}${template.replace('{handle}', encodeURIComponent(handle))}`;
      try {
        const res = await axios.get(url, { headers, timeout: 5000 });
        console.log(`\n🎉 [SUCCESS ${res.status}] ${url}`);
        console.log(JSON.stringify(res.data, null, 2).slice(0, 2000));
      } catch (err) {
        // console.log(`[FAIL ${err.response?.status || err.code}] ${url}`);
      }
    }
  }
}

testApiEndpoints('saipujeet');
