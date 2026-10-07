const fs = require('fs');

const text = fs.readFileSync('chunk_7223.js', 'utf8');

const matches = [...text.matchAll(/(.{0,100}api-get\/user-profile-info.{0,100})/g)];
for (const m of matches) {
  console.log('--- user-profile-info context:');
  console.log(m[1]);
}

const matches2 = [...text.matchAll(/(.{0,100}api-get\/user-params-info.{0,100})/g)];
for (const m of matches2) {
  console.log('--- user-params-info context:');
  console.log(m[1]);
}

const matches3 = [...text.matchAll(/(.{0,100}api\/v1\/user\/problems\/submissions.{0,100})/g)];
for (const m of matches3) {
  console.log('--- submissions context:');
  console.log(m[1]);
}
