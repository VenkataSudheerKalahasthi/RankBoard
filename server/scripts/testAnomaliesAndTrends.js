require('dotenv').config();
const { getAnomaliesList, scanCohortAnomalies } = require('../src/services/activity/anomalyDetectionService');
const { getOverallActivityTrends } = require('../src/services/activity/activityService');

async function testAnomaliesAndTrends() {
  console.log('\n=== Testing Anomalies ===');
  const anomList = await getAnomaliesList({ limit: 5 });
  console.log(`Total Anomalies: ${anomList.totalCount}`);
  anomList.anomalies.slice(0, 3).forEach(a => {
    console.log(`  Flagged: ${a.studentName} (${a.rollNumber}) on ${a.platform} - Date: ${a.activityDate}, Observed: ${a.observedCount}, Baseline: ${a.baselineCount}, Reason: ${a.detectionReason}, Status: ${a.reviewStatus}`);
  });

  console.log('\n=== Testing Activity Trends ===');
  const trends = await getOverallActivityTrends({ days: 7 });
  console.log(`Trends 7 days: Start: ${trends.startDate}, End: ${trends.endDate}, Total Solves: ${trends.totalPeriodSolves}`);
  console.log('Daily data points:');
  trends.dailyTrends.forEach(t => {
    console.log(`  Date: ${t.date} -> Total Solves: ${t.totalSolves}, Active Students: ${t.activeStudentsCount}, LC: ${t.leetcode}, GFG: ${t.gfg}, HR: ${t.hackerrank}`);
  });
}

testAnomaliesAndTrends().catch(console.error);

