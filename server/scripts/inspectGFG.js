const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function test() {
  const username = 'venkatasudheerkalahasthi';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };

  try {
    // 1. Fetch practice submissions or profile APIs
    // GFG known endpoints:
    // https://practiceapi.geeksforgeeks.org/api/v1/user/problems/submissions/
    // https://www.geeksforgeeks.org/api/practice/user/stats/
    // https://api.geeksforgeeks.org/profile/
    const endpoints = [
      `https://www.geeksforgeeks.org/user/${username}/`,
      `https://www.geeksforgeeks.org/profile/${username}?tab=activity`,
      `https://practiceapi.geeksforgeeks.org/api/v1/user/problems/submissions/${username}/`,
      `https://practiceapi.geeksforgeeks.org/api/v1/user/stats/${username}/`,
      `https://practiceapi.geeksforgeeks.org/api/v1/users/${username}/`,
      `https://www.geeksforgeeks.org/api/user/${username}/stats`,
      `https://api.geeksforgeeks.org/api/v1/users/${username}/`,
      `https://practiceapi.geeksforgeeks.org/api/v1/problems/user/${username}/solved/`,
    ];

    for (const url of endpoints) {
      try {
        const res = await axios.get(url, { headers, timeout: 5000 });
        console.log(`[SUCCESS] ${url} -> status: ${res.status}, type: ${typeof res.data}`);
        if (typeof res.data === 'object') {
          console.log('JSON Data:', JSON.stringify(res.data).slice(0, 500));
        } else if (typeof res.data === 'string') {
          console.log('HTML Length:', res.data.length);
          // Look for any interesting keywords
          const keys = ['school', 'basic', 'easy', 'medium', 'hard', 'School', 'Basic', 'Easy', 'Medium', 'Hard', 'solved', 'Problems'];
          for (const k of keys) {
            const idx = res.data.indexOf(k);
            if (idx !== -1) {
              console.log(`Found "${k}" at ${idx}:`, res.data.slice(Math.max(0, idx - 40), idx + 80).replace(/\n/g, ' '));
            }
          }
        }
      } catch (err) {
        console.log(`[FAIL] ${url} -> ${err.response?.status || err.message}`);
      }
    }
  } catch (e) {
    console.error(e);
  }
}

test();
