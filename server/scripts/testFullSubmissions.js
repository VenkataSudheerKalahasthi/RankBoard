const axios = require('axios');

async function testFullSubmissions(handle) {
  const url = 'https://practiceapi.geeksforgeeks.org/api/v1/user/problems/submissions/';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*',
    'Origin': 'https://www.geeksforgeeks.org',
    'Referer': `https://www.geeksforgeeks.org/user/${handle}/`,
  };

  const res = await axios.post(url, { handle, requestType: '', year: '', month: '' }, { headers });
  console.log('Status:', res.status);
  console.log('Message:', res.data.message);
  console.log('Count:', res.data.count);
  console.log('Result Keys:', Object.keys(res.data.result || {}));

  const result = res.data.result || {};
  let totalCount = 0;
  for (const [category, problems] of Object.entries(result)) {
    const pCount = Object.keys(problems || {}).length;
    console.log(`Category "${category}": ${pCount} problems`);
    totalCount += pCount;
  }
  console.log(`Total Problems across categories: ${totalCount}`);
}

testFullSubmissions('saipu3ane');
