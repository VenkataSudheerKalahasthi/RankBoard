require('dotenv').config();
const { getSupabase } = require('../src/supabase/supabaseClient');

async function inspectSnapshots() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('student_activity_snapshots')
    .select('id, student_id, platform, snapshot_timestamp, activity_date, total_solved, easy_solved, medium_solved, hard_solved, status')
    .order('snapshot_timestamp', { ascending: false })
    .limit(10);
  
  console.log('Latest 10 snapshots:');
  console.log(JSON.stringify(data, null, 2));

  // Check distinct platforms
  const { data: platData } = await supabase
    .from('student_activity_snapshots')
    .select('platform')
    .limit(1000);
  const plats = new Set(platData?.map(p => p.platform));
  console.log('Platforms found in sample:', Array.from(plats));

  // Check date range of snapshots
  const { data: oldest } = await supabase
    .from('student_activity_snapshots')
    .select('activity_date, snapshot_timestamp')
    .order('snapshot_timestamp', { ascending: true })
    .limit(1);
  const { data: newest } = await supabase
    .from('student_activity_snapshots')
    .select('activity_date, snapshot_timestamp')
    .order('snapshot_timestamp', { ascending: false })
    .limit(1);
  console.log('Oldest snapshot:', oldest?.[0]);
  console.log('Newest snapshot:', newest?.[0]);
}

inspectSnapshots().catch(console.error);

