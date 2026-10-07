const axios = require('axios');

async function testNonexistent() {
  try {
    const res = await axios.get('https://www.hackerrank.com/rest/hackers/nonexistent_random_user_999999/badges', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json',
      },
      timeout: 8000,
    });
    console.log('Result:', res.status, res.data);
  } catch (e) {
    console.log('Caught error status:', e.response?.status, 'Message:', e.message);
  }
}

testNonexistent();
