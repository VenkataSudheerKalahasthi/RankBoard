const fs = require('fs');
const path = require('path');
const { parseCodeChefUrl } = require('../src/utils/urlParsers');

const samplePath = path.join(__dirname, '../data/students_sample.json');
const students = JSON.parse(fs.readFileSync(samplePath, 'utf8'));

console.log(`Total students in sample: ${students.length}`);

let withCodechef = 0;
let parsedHandles = [];
let unparsed = [];

for (const s of students) {
  const ccUrl = s.codechefUrl || s.codechef || '';
  if (ccUrl) {
    withCodechef++;
    const handle = parseCodeChefUrl(ccUrl);
    if (handle) {
      parsedHandles.push({ name: s.name, raw: ccUrl, handle });
    } else {
      unparsed.push({ name: s.name, raw: ccUrl });
    }
  }
}

console.log(`Students with CodeChef URL: ${withCodechef}`);
console.log(`Successfully parsed handles: ${parsedHandles.length}`);
console.log(`Failed to parse: ${unparsed.length}`);
if (unparsed.length > 0) {
  console.log('Unparsed examples:', unparsed);
}
console.log('\nSample parsed handles (first 10):');
console.log(parsedHandles.slice(0, 10));
