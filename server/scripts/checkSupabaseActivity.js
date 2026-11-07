require('dotenv').config();
const { getSupabase } = require('../src/supabase/supabaseClient');

async function check() {
  const supabase = getSupabase();
  console.log('Testing Supabase Connection...');
  const r1 = await supabase.from('student_activity_snapshots').select('count', { count: 'exact', head: true });
  console.log('student_activity_snapshots count:', r1.count, 'error:', r1.error ? r1.error.message : 'NONE');
  
  const r2 = await supabase.from('activity_anomalies').select('count', { count: 'exact', head: true });
  console.log('activity_anomalies count:', r2.count, 'error:', r2.error ? r2.error.message : 'NONE');

  const r3 = await supabase.from('students').select('count', { count: 'exact', head: true });
  console.log('students count:', r3.count, 'error:', r3.error ? r3.error.message : 'NONE');

  const { data: students, error } = await supabase.from('students').select('id, name, platforms, platform_stats').limit(3);
  if (students) {
    console.log('Sample students count:', students.length);
    students.forEach(s => {
      console.log(`Student: ${s.name}, platforms:`, Object.keys(s.platforms || {}));
      console.log(`Stats keys:`, Object.keys(s.platform_stats || {}));
    });
  }
}

check().catch(console.error);
