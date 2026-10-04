const { syncStudentPlatforms } = require('../src/services/syncService');

async function syncTarun() {
  console.log('Synchronizing Tarun Kumar in Firestore...');
  const result = await syncStudentPlatforms('import_746172756e6b756d61726b6f');
  console.log('Result:');
  console.log('Name:', result.name);
  console.log('Score:', result.finalScore);
  console.log('Rank:', result.rank);
  console.log('LeetCode Solved:', result.platformStats?.leetcode?.totalSolved);
  console.log('GFG Solved:', result.platformStats?.gfg?.totalSolved, 'Score:', result.platformStats?.gfg?.rating);
  console.log('CodeChef Solved:', result.platformStats?.codechef?.totalSolved, 'Rating:', result.platformStats?.codechef?.rating, 'Status:', result.platforms?.codechef?.status);
}

syncTarun().catch(console.error);
