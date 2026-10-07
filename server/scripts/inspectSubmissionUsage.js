const fs = require('fs');

const text = fs.readFileSync('chunk_7223.js', 'utf8');

const matches = [...text.matchAll(/(.{0,100}problemSubmissionInfo.{0,100})/g)];
for (const m of matches) {
  console.log('--- problemSubmissionInfo match:');
  console.log(m[1]);
}

const matches2 = [...text.matchAll(/(.{0,100}useProblemSubmissionInfo.{0,100})/g)];
for (const m of matches2) {
  console.log('--- useProblemSubmissionInfo match:');
  console.log(m[1]);
}
