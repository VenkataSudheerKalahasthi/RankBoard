const { getSupabase } = require('../src/supabase/supabaseClient');
const { getAllStudents } = require('../src/supabase/supabaseRepository');

async function check() {
  const allStudents = await getAllStudents();
  const names = ['Katteboyina Trisha', 'sudheer', 'MANNEPALLI SAI CHARAN', 'Penuvarthi Surya Teja'];
  const targets = allStudents.filter(s => names.includes(s.name));
  const supabase = getSupabase();

  for (const st of targets) {
    const { data: snaps } = await supabase
      .from('student_activity_snapshots')
      .select('*')
      .eq('student_id', st.id)
      .order('snapshot_timestamp', { ascending: true });
    console.log('\n--- Student:', st.name, '(', st.id, ') snaps count:', snaps.length);
    const distinctTotals = [...new Set(snaps.map(s => `${s.platform}:${s.total_solved}`))];
    console.log('Distinct totals in snaps:', distinctTotals);
    snaps.forEach(s => {
      console.log('  ', s.platform, s.activity_date, s.snapshot_timestamp, 'tot:', s.total_solved, 'E:', s.easy_solved, 'M:', s.medium_solved, 'H:', s.hard_solved);
    });
  }
}

check();
