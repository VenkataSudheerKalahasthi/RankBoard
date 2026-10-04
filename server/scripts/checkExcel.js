const xlsx = require('xlsx');
const path = require('path');

const wb = xlsx.readFile(path.join(__dirname, '../../prime 1 links.xlsx'));
const ws = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(ws, { defval: '' });

console.log(`Total rows in prime 1 links.xlsx: ${data.length}`);
const sample = data.slice(0, 5);
console.log('Headers / Sample:', sample);

// Find Rupasri
const r = data.find(d => JSON.stringify(d).toLowerCase().includes('rupasri') || JSON.stringify(d).includes('23491A053O'));
console.log('Rupasri record:', r);
