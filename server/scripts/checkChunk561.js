const fs = require('fs');
const axios = require('axios');

async function check561() {
  const url = 'https://assets.geeksforgeeks.org/connect-prod/_next/static/chunks/561-a92d914534d945ff.js';
  const res = await axios.get(url);
  const text = res.data;
  const matches = [...text.matchAll(/([A-Z0-9_]+_URL\s*:\s*"[^"]+")/g)].map(m => m[1]);
  console.log('URLs in chunk 561:', matches);
}

check561();
