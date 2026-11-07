require('dotenv').config();
const { getSupabase } = require('../src/supabase/supabaseClient');

async function inspectHemalatha() {
  const supabase = getSupabase();
  
  // Find Hemalatha in students table
  const { data: students, error: sErr } = await supabase
    .from('students')
    .select('*')
    .ilike('name', '%hema%');
  
  console.log('Students matching Hema:');
  students.forEach(s => {
    console.log(`ID: ${s.id}, Name: ${s.name}, Roll: ${s.roll_number || s.rollNumber}`);
    console.log('Platforms:', s.platforms);
    console.log('Platform Stats GFG:', s.platform_stats?.gfg || s.platformStats?.gfg);
  });

  if (students.length > 0) {
    const student = students[0];
    // Check all snapshots for this student for today and yesterday
    const { data: snaps, error: snapErr } = await supabase
      .from('student_activity_snapshots')
      .select('*')
      .eq('student_id', student.id)
      .eq('platform', 'gfg')
      .order('snapshot_timestamp', { ascending: false })
      .limit(10);
    
    console.log('\nGFG Snapshots for ' + student.name + ':');
    snaps.forEach(snap => {
      console.log(`ID: ${snap.id}, Timestamp: ${snap.snapshot_timestamp}, Date: ${snap.activity_date}, Total: ${snap.total_solved}, Easy: ${snap.easy_solved}, Med: ${snap.medium_solved}, Hard: ${snap.hard_solved}, School: ${snap.school_solved}, Basic: ${snap.basic_solved}`);
      if (snap.raw_stats) {
        console.log('  raw_stats info:', {
          username: snap.raw_stats.username,
          recentSubmissionsLength: snap.raw_stats.recentSubmissions?.length,
          recentSample: snap.raw_stats.recentSubmissions?.slice(0, 3),
        });
      }
    });

    // Also check activity_anomalies for Hemalatha
    const { data: anomalies } = await supabase
      .from('activity_anomalies')
      .select('*')
      .eq('student_id', student.id);
    
    console.log('\nAnomalies for ' + student.name + ':');
    console.log(anomalies);
  }
}

inspectHemalatha().catch(console.error);
