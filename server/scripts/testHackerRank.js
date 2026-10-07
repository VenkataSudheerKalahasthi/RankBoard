const axios = require('axios');

async function testHackerRank(username) {
  console.log(`Testing HackerRank for username: ${username}`);
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json',
  };

  try {
    const profileRes = await axios.get(`https://www.hackerrank.com/rest/hackers/${encodeURIComponent(username)}/profile`, { headers, timeout: 10000 });
    console.log('Profile model:', JSON.stringify(profileRes.data?.model, null, 2));
  } catch (e) {
    console.log('Profile error:', e.message, e.response?.status);
  }

  try {
    const badgesRes = await axios.get(`https://www.hackerrank.com/rest/hackers/${encodeURIComponent(username)}/badges`, { headers, timeout: 10000 });
    console.log('Badges models count:', badgesRes.data?.models?.length);
    console.log('Badges models:', JSON.stringify(badgesRes.data?.models, null, 2));
  } catch (e) {
    console.log('Badges error:', e.message, e.response?.status);
  }

  try {
    const scoresRes = await axios.get(`https://www.hackerrank.com/rest/hackers/${encodeURIComponent(username)}/scores_elo`, { headers, timeout: 10000 });
    console.log('Scores Elo models:', JSON.stringify(scoresRes.data, null, 2));
  } catch (e) {
    console.log('Scores error:', e.message, e.response?.status);
  }
}

testHackerRank('tourist');
