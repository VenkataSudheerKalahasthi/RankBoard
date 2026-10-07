const { getSupabase } = require('../src/supabase/supabaseClient');

async function checkStudentsGFG() {
  const supabase = getSupabase();
  const { data: students, error } = await supabase
    .from('students')
    .select('*')
    .limit(20);

  if (error) {
    console.error('Error fetching students:', error);
    return;
  }

  console.log(`Found ${students.length} students:`);
  for (const s of students) {
    console.log(`Student: ${s.name} (${s.roll_number || s.rollNumber})`);
    console.log(`  Keys:`, Object.keys(s));
    console.log(`  geeksforgeeks_url: ${s.geeksforgeeks_url || s.geeksforgeeksUrl}`);
    console.log(`  platforms:`, JSON.stringify(s.platforms, null, 2));
  }
}

checkStudentsGFG();
