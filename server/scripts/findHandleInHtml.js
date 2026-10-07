const fs = require('fs');

const html = fs.readFileSync('gfg_dump_saipujeet.html', 'utf8');

let pos = 0;
while ((pos = html.toLowerCase().indexOf('saipujeet', pos)) !== -1) {
  console.log(`\nMatch at position ${pos}:`);
  console.log(html.slice(Math.max(0, pos - 150), pos + 250));
  pos += 9;
}
