const xlsx = require('xlsx');
const path = require('path');
const axios = require('axios');
const { fetchCodeChefProfile } = require('../src/services/platforms/codechefService');

const wb = xlsx.readFile(path.join(__dirname, '../../prime 1 links.xlsx'));
const data = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });

const names = ['AKHILA', 'Manogna', 'Bhavana'];

async function testSome() {
  for (const n of names) {
    const row = data.find(d => JSON.stringify(d).toLowerCase().includes(n.toLowerCase()));
    console.log(`\nRow for ${n}:`, row);
    // Find CodeChef URL in row values
    const ccUrl = Object.values(row).find(v => typeof v === 'string' && v.includes('codechef.com'));
    console.log('CodeChef URL:', ccUrl);
    if (ccUrl) {
      const res = await fetchCodeChefProfile(ccUrl);
      console.log('Fetch result:', res);
    }
  }
}

testSome();
