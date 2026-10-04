const axios = require('axios');
const { fetchCodeChefProfile } = require('../src/services/platforms/codechefService');

async function testRupa() {
  const res = await fetchCodeChefProfile('https://www.codechef.com/users/rupasrikotha');
  console.log('Result for rupasrikotha:', res);
}

testRupa();
