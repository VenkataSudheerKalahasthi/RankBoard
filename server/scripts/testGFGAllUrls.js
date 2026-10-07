const axios = require('axios');

async function testGFGUrls(handle) {
  const urls = [
    `https://www.geeksforgeeks.org/user/${handle}/`,
    `https://www.geeksforgeeks.org/profile/${handle}/`,
    `https://www.geeksforgeeks.org/profile/${handle}?tab=activity`,
    `https://www.geeksforgeeks.org/profile/${handle}?tab=solved-problems`,
    `https://auth.geeksforgeeks.org/user/${handle}/`,
    `https://auth.geeksforgeeks.org/user/${handle}/practice/`,
    `https://practiceapi.geeksforgeeks.org/api/v1/user/problems/submissions/${handle}/`,
    `https://practiceapi.geeksforgeeks.org/api/v1/user/stats/${handle}/`,
    `https://practiceapi.geeksforgeeks.org/api/v1/problems/user/${handle}/solved/`,
    `https://www.geeksforgeeks.org/api/user/${handle}/stats`,
    `https://api.geeksforgeeks.org/api/v1/users/${handle}/`,
    `https://utilapi.geeksforgeeks.org/api/profile/${handle}`,
    `https://utilapi.geeksforgeeks.org/api/user/${handle}`,
    `https://gfgutil.geeksforgeeks.org/api/profile/${handle}`,
    `https://practiceapi.geeksforgeeks.org/api/v1/user/profile/${handle}/`,
    `https://practiceapi.geeksforgeeks.org/api/vr/user/profile/${handle}/`,
  ];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.geeksforgeeks.org/',
  };

  for (const url of urls) {
    try {
      const res = await axios.get(url, { headers, timeout: 8000 });
      console.log(`\n========================================`);
      console.log(`URL: ${url}`);
      console.log(`Status: ${res.status}, Type: ${typeof res.data}`);
      if (typeof res.data === 'object') {
        console.log(`JSON Content:`, JSON.stringify(res.data, null, 2).slice(0, 1500));
      } else if (typeof res.data === 'string') {
        console.log(`String Content Length: ${res.data.length}`);
        // search for 26, 41, 32, 1, 100 or basic, easy, medium, hard
        const matches = [];
        ['26', '41', '32', '100', 'Basic', 'Easy', 'Medium', 'Hard', 'School', 'basic', 'easy', 'medium', 'hard', 'school'].forEach(w => {
          const idx = res.data.indexOf(w);
          if (idx !== -1) {
            matches.push(`${w} @ ${idx}`);
          }
        });
        console.log(`Matches in string:`, matches.join(', '));
        if (matches.length > 0) {
          // print surrounding for some matches
          ['Basic', 'Easy', 'Medium', 'Hard', 'School', 'easy', 'medium', 'hard'].forEach(w => {
            const idx = res.data.indexOf(w);
            if (idx !== -1) {
              console.log(`--- Snippet around "${w}":`, res.data.slice(Math.max(0, idx - 60), idx + 100).replace(/\n/g, ' '));
            }
          });
        }
      }
    } catch (err) {
      console.log(`URL: ${url} -> ${err.response?.status || err.message}`);
    }
  }
}

testGFGUrls('saipujeet');
