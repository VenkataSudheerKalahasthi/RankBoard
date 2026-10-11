const axios = require('axios');

async function test() {
  const query = {
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
        recentAcSubmissionList(username: $username, limit: 50) {
          id
          title
          titleSlug
          timestamp
        }
      }
    `,
    variables: { username: 'Mallikharjuna_7' }
  };
  const res = await axios.post('https://leetcode.com/graphql', query, {
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' }
  });
  const data = res.data.data;
  console.log('Username:', data.matchedUser?.username);
  console.log('Total Solved:', data.matchedUser?.submitStatsGlobal?.acSubmissionNum);
  console.log('Recent AC Submissions count:', data.recentAcSubmissionList?.length);
  if (data.recentAcSubmissionList) {
    data.recentAcSubmissionList.slice(0, 15).forEach(sub => {
      const d = new Date(Number(sub.timestamp) * 1000);
      console.log(sub.title, 'at', d.toISOString(), 'IST:', d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    });
  }
  const calendarStr = data.matchedUser?.userCalendar?.submissionCalendar;
  if (calendarStr) {
    const calendar = JSON.parse(calendarStr);
    const sorted = Object.entries(calendar).sort((a,b) => Number(b[0]) - Number(a[0])).slice(0, 10);
    console.log('Recent submission calendar days:');
    sorted.forEach(([ts, count]) => {
      const d = new Date(Number(ts) * 1000);
      console.log(d.toISOString(), 'IST:', d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), 'submissions:', count);
    });
  }
}

test().catch(err => console.error(err.message));
