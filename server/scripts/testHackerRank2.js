const axios = require('axios');

async function testHackerRankUsers() {
  const users = ['bqi343', 'gennady_korotkevich', 'praveen', 'harshitha'];
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/html',
  };

  for (const u of users) {
    console.log(`\n================= Testing ${u} =================`);
    try {
      const profileRes = await axios.get(`https://www.hackerrank.com/rest/hackers/${encodeURIComponent(u)}/profile`, { headers, timeout: 10000 });
      console.log('Profile model exists:', !!profileRes.data?.model);
      if (profileRes.data?.model) {
        const m = profileRes.data.model;
        console.log({
          username: m.username,
          name: m.name,
          country: m.country,
          created_at: m.created_at,
          level: m.level,
        });
      }
    } catch (e) {
      console.log('Profile error:', e.message, e.response?.status);
    }

    try {
      const badgesRes = await axios.get(`https://www.hackerrank.com/rest/hackers/${encodeURIComponent(u)}/badges`, { headers, timeout: 10000 });
      const badges = badgesRes.data?.models || [];
      console.log('Badges count:', badges.length);
      badges.forEach(b => {
        console.log(`Badge: ${b.badge_name}, Stars: ${b.stars}, Solved: ${b.solved}, Total: ${b.total_challenges}`);
      });
    } catch (e) {
      console.log('Badges error:', e.message, e.response?.status);
    }
  }
}

testHackerRankUsers();
