const { getAllStudents } = require('../src/supabase/supabaseRepository');

async function checkSaipujeet() {
  const students = await getAllStudents();
  console.log(`Total students: ${students.length}`);
  const saipujeet = students.find(s => s.name?.toLowerCase().includes('saipujeet') || s.rollNumber?.toLowerCase().includes('saipujeet') || s.platforms?.gfg?.username?.toLowerCase().includes('saipujeet') || s.platforms?.gfg?.profileUrl?.toLowerCase().includes('saipujeet'));

  if (!saipujeet) {
    console.log('Saipujeet not found directly. Let us search students with GFG profile:');
    const gfgStudents = students.filter(s => s.platforms?.gfg?.username || s.platforms?.gfg?.profileUrl);
    console.log(`Found ${gfgStudents.length} students with GFG profile:`);
    gfgStudents.forEach(s => {
      console.log(`- ${s.name} (${s.rollNumber}) -> GFG: ${s.platforms?.gfg?.username || s.platforms?.gfg?.profileUrl}`);
      console.log(`  Stats:`, JSON.stringify(s.platformStats?.gfg));
      console.log(`  Scores:`, JSON.stringify(s.scores));
    });
  } else {
    console.log('Found Saipujeet:');
    console.log(JSON.stringify(saipujeet, null, 2));
  }
}

checkSaipujeet();
