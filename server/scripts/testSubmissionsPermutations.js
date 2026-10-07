const axios = require('axios');
const qs = require('querystring');

async function testSubmissionsPermutations(handle) {
  const url = 'https://practiceapi.geeksforgeeks.org/api/v1/user/problems/submissions/';

  const bodies = [
    { handle, requestType: '', year: '', month: '' },
    { handle, requestType: 'problems' },
    { handle, requestType: 'problem' },
    { handle, requestType: 'all' },
    { handle },
    { userHandle: handle },
    { username: handle },
    { handle, year: 2026 },
    { handle, year: '2026' },
  ];

  const contentTypes = [
    'application/json',
    'application/x-www-form-urlencoded',
    'multipart/form-data'
  ];

  for (const ct of contentTypes) {
    for (const b of bodies) {
      try {
        let payload = b;
        const headers = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Content-Type': ct,
          'Accept': 'application/json, text/plain, */*',
          'Origin': 'https://www.geeksforgeeks.org',
          'Referer': `https://www.geeksforgeeks.org/user/${handle}/`,
        };

        if (ct === 'application/x-www-form-urlencoded') {
          payload = qs.stringify(b);
        }

        const res = await axios.post(url, payload, { headers, timeout: 6000 });
        console.log(`\n🎉 [SUCCESS ${res.status}] Content-Type: ${ct}, Body:`, JSON.stringify(b));
        console.log('Response:', JSON.stringify(res.data, null, 2).slice(0, 2000));
        return; // found it!
      } catch (err) {
        // console.log(`[FAIL ${err.response?.status}] CT: ${ct}, Body: ${JSON.stringify(b)} -> ${err.response?.data?.message || err.message}`);
      }
    }
  }
}

testSubmissionsPermutations('saipu3ane');
