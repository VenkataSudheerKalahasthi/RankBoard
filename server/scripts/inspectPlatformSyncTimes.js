require('dotenv').config();
const { getAllStudents } = require('../src/supabase/supabaseRepository');

async function inspectPlatformSyncTimes() {
  const students = await getAllStudents();
  console.log('Total students:', students.length);
  
  const platformSyncTimes = {};
  const platformHealth = {
    leetcode: { success: 0, failed: 0, notConnected: 0, lastSynced: null },
    gfg: { success: 0, failed: 0, notConnected: 0, lastSynced: null },
    hackerrank: { success: 0, failed: 0, notConnected: 0, lastSynced: null },
    codeforces: { success: 0, failed: 0, notConnected: 0, lastSynced: null },
    codechef: { success: 0, failed: 0, notConnected: 0, lastSynced: null },
  };

  students.forEach(s => {
    const plats = s.platforms || {};
    for (const [pKey, pVal] of Object.entries(plats)) {
      if (platformHealth[pKey]) {
        if (!pVal.username) {
          platformHealth[pKey].notConnected++;
        } else if (pVal.status === 'SUCCESS') {
          platformHealth[pKey].success++;
          if (pVal.lastFetchedAt) {
            if (!platformHealth[pKey].lastSynced || new Date(pVal.lastFetchedAt) > new Date(platformHealth[pKey].lastSynced)) {
              platformHealth[pKey].lastSynced = pVal.lastFetchedAt;
            }
          }
        } else if (pVal.status === 'FAILED') {
          platformHealth[pKey].failed++;
        }
      }
    }
  });

  console.log('Platform Health & Last Synced:');
  console.log(JSON.stringify(platformHealth, null, 2));
}

inspectPlatformSyncTimes().catch(console.error);

