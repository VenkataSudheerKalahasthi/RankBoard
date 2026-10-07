const axios = require('axios');

async function testAuthApi(handle) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': `https://www.geeksforgeeks.org/user/${handle}/`,
    'Origin': 'https://www.geeksforgeeks.org',
  };

  const tests = [
    {
      name: 'user-profile-info',
      method: 'GET',
      url: `https://authapi.geeksforgeeks.org/api-get/user-profile-info/?handle=${encodeURIComponent(handle)}&article_count=false&redirect=true`,
    },
    {
      name: 'user-profile-info-no-redirect',
      method: 'GET',
      url: `https://authapi.geeksforgeeks.org/api-get/user-profile-info/?handle=${encodeURIComponent(handle)}`,
    },
    {
      name: 'user-params-info',
      method: 'GET',
      url: `https://authapi.geeksforgeeks.org/api-get/user-params-info/?handle=${encodeURIComponent(handle)}&params=score,total_problems_solved,institute_rank,pod_solved_longest_streak`,
    },
    {
      name: 'rating-info',
      method: 'GET',
      url: `https://practiceapi.geeksforgeeks.org/api/v1/rating/${encodeURIComponent(handle)}/info/`,
    },
    {
      name: 'submissions-post',
      method: 'POST',
      url: `https://practiceapi.geeksforgeeks.org/api/v1/user/problems/submissions/`,
      data: { handle, requestType: '', year: '', month: '' }
    },
    {
      name: 'submissions-post-problems',
      method: 'POST',
      url: `https://practiceapi.geeksforgeeks.org/api/v1/user/problems/submissions/`,
      data: { handle }
    }
  ];

  for (const t of tests) {
    console.log(`\n-------------------------------------------`);
    console.log(`Testing ${t.name}: ${t.method} ${t.url}`);
    try {
      let res;
      if (t.method === 'POST') {
        res = await axios.post(t.url, t.data, { headers, timeout: 8000 });
      } else {
        res = await axios.get(t.url, { headers, timeout: 8000 });
      }
      console.log(`STATUS: ${res.status}`);
      console.log('RESPONSE DATA:', JSON.stringify(res.data, null, 2));
    } catch (err) {
      console.log(`ERROR: ${err.response?.status || err.message}`, err.response?.data || '');
    }
  }
}

testAuthApi('saipujeet');
