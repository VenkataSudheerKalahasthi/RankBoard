const axios = require('axios');

async function testUser(username) {
  const graphqlQuery = {
    query: `
      query getUserProfile($username: String!) {
        matchedUser(username: $username) {
          username
          submitStatsGlobal {
            acSubmissionNum {
              difficulty
              count
            }
          }
          userCalendar {
            streak
            totalActiveDays
            submissionCalendar
          }
        }
        userContestRanking(username: $username) {
          attendedContestsCount
          rating
        }
        recentAcSubmissionList(username: $username, limit: 50) {
          id
          title
          titleSlug
          timestamp
        }
      }
    `,
    variables: { username },
  };

  const response = await axios.post('https://leetcode.com/graphql', graphqlQuery, {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0',
    },
    timeout: 10000,
  });

  const data = response.data?.data;
  console.log(`\nUser: ${username}`);
  console.log('Total AC submissions in recentAcSubmissionList:', data.recentAcSubmissionList?.length);
  if (data.recentAcSubmissionList?.length > 0) {
    const first = data.recentAcSubmissionList[0];
    const d = new Date(Number(first.timestamp) * 1000);
    console.log('Most recent solve:', first.title, 'at', d.toISOString(), 'IST:', d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
  }
}

async function run() {
  await testUser('Mallikharjuna_7');
  await testUser('Deepika_Aluri');
  await testUser('harivenkatacharan');
}

run().catch(console.error);
