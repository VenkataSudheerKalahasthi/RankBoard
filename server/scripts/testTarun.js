const { fetchLeetCodeProfile } = require('../src/services/platforms/leetcodeService');
const { fetchGFGProfile } = require('../src/services/platforms/gfgService');
const { fetchCodeforcesProfile } = require('../src/services/platforms/codeforcesService');
const { fetchCodeChefProfile } = require('../src/services/platforms/codechefService');

async function testTarun() {
  console.log('--- Testing KOPPURAVURI TARUN KUMAR ---');
  
  console.log('\n[1] LeetCode: https://leetcode.com/u/Tarun_kumar55/');
  const lc = await fetchLeetCodeProfile('https://leetcode.com/u/Tarun_kumar55/');
  console.log(JSON.stringify(lc, null, 2));

  console.log('\n[2] GeeksforGeeks: https://www.geeksforgeeks.org/profile/tarunkumarkv0j4');
  const gfg = await fetchGFGProfile('https://www.geeksforgeeks.org/profile/tarunkumarkv0j4');
  console.log(JSON.stringify(gfg, null, 2));

  console.log('\n[3] CodeChef: https://www.codechef.com/users/tarun_kumar5');
  const cc = await fetchCodeChefProfile('https://www.codechef.com/users/tarun_kumar5');
  console.log(JSON.stringify(cc, null, 2));
}

testTarun();
