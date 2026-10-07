require('dotenv').config();
const { getSupabase } = require('../src/supabase/supabaseClient');

async function testSupabasePlatformCheck() {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('Supabase client not initialized');
    return;
  }

  console.log('Testing platform insert for hackerrank...');
  // Test with dummy student or first student
  const { data: students, error: sErr } = await supabase.from('students').select('id').limit(1);
  if (sErr || !students || students.length === 0) {
    console.error('Error getting student:', sErr);
    return;
  }

  const studentId = students[0].id;
  console.log('Using student id:', studentId);

  const { data, error } = await supabase
    .from('student_platform_profiles')
    .upsert({
      student_id: studentId,
      platform: 'hackerrank',
      profile_url: 'https://www.hackerrank.com/profile/test_user',
      username: 'test_user',
      status: 'NOT_CONNECTED',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'student_id,platform' });

  if (error) {
    console.log('Insert hackerrank profile error:', error);
  } else {
    console.log('Insert hackerrank profile success!');
    // Clean up test entry
    await supabase.from('student_platform_profiles').delete().eq('student_id', studentId).eq('platform', 'hackerrank');
  }

  const { data: statsData, error: statsErr } = await supabase
    .from('platform_statistics')
    .upsert({
      student_id: studentId,
      platform: 'hackerrank',
      total_solved: 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'student_id,platform' });

  if (statsErr) {
    console.log('Insert hackerrank stats error:', statsErr);
  } else {
    console.log('Insert hackerrank stats success!');
    // Clean up test stats
    await supabase.from('platform_statistics').delete().eq('student_id', studentId).eq('platform', 'hackerrank');
  }
}

testSupabasePlatformCheck();
