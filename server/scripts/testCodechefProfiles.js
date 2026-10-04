const axios = require('axios');
const fs = require('fs');
const { fetchCodeChefProfile } = require('../src/services/platforms/codechefService');

async function testProfiles() {
  const students = JSON.parse(fs.readFileSync('./data/students_sample.json', 'utf8'));
  console.log(`Loaded ${students.length} students from sample.`);

  const samples = students.filter(s => s.codechefUrl).slice(0, 10);

  for (const s of samples) {
    console.log(`\nTesting ${s.name} (${s.codechefUrl}):`);
    try {
      const res = await fetchCodeChefProfile(s.codechefUrl);
      console.log('Result:', {
        username: res.username,
        status: res.status,
        totalSolved: res.totalSolved,
        rating: res.rating,
        stars: res.stars,
        globalRank: res.globalRank,
        error: res.errorMessage
      });
    } catch (e) {
      console.error('Exception:', e.message);
    }
    // sleep 1.5s between calls to prevent 429
    await new Promise(r => setTimeout(r, 1500));
  }
}

testProfiles();
