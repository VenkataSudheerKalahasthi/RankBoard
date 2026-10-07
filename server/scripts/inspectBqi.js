const axios = require('axios');

async function inspectBqi() {
  const username = 'bqi343';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json',
  };

  const endpoints = [
    `https://www.hackerrank.com/rest/hackers/${username}/badges`,
    `https://www.hackerrank.com/rest/hackers/${username}/scores_elo`,
    `https://www.hackerrank.com/rest/hackers/${username}/recent_challenges?limit=10`,
    `https://www.hackerrank.com/community/v1/test_results/hacker_certificate?username=${username}`,
  ];

  for (const ep of endpoints) {
    try {
      const res = await axios.get(ep, { headers, timeout: 8000 });
      console.log(`\nEndpoint: ${ep}`);
      console.log(JSON.stringify(res.data, null, 2).slice(0, 500));
    } catch (e) {
      console.log(`\nEndpoint: ${ep} -> Error: ${e.message}`);
    }
  }
}

inspectBqi();
