const fs = require('fs');

const html = fs.readFileSync('gfg_dump_saipujeet.html', 'utf8');

console.log('HTML size:', html.length);

// 1. Look for Next.js script / RSC
const rscMatches = [...html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)];
console.log('RSC matches count:', rscMatches.length);

let combinedRsc = '';
for (const m of rscMatches) {
  try {
    combinedRsc += JSON.parse(`"${m[1]}"`);
  } catch (e) {
    combinedRsc += m[1];
  }
}
fs.writeFileSync('gfg_rsc_saipujeet.txt', combinedRsc);
console.log('Combined RSC length:', combinedRsc.length);

const searchTerms = ['school', 'basic', 'easy', 'medium', 'hard', 'School', 'Basic', 'Easy', 'Medium', 'Hard', 'total_problems_solved', 'totalProblemsSolved', 'score', 'pod_solved_longest_streak', 'institute_rank'];

for (const term of searchTerms) {
  let pos = 0;
  let count = 0;
  while ((pos = combinedRsc.indexOf(term, pos)) !== -1) {
    count++;
    if (count <= 10) {
      console.log(`[RSC] "${term}" @ ${pos}: ${JSON.stringify(combinedRsc.substring(Math.max(0, pos - 40), pos + 100))}`);
    }
    pos += term.length;
  }
  if (count === 0) {
    console.log(`[RSC] "${term}" NOT FOUND`);
  } else {
    console.log(`[RSC] Total matches for "${term}": ${count}`);
  }
}
