require('dotenv').config();
const { getSupabase } = require('../src/supabase/supabaseClient');

async function inspectStudentFields() {
  const supabase = getSupabase();
  const { data } = await supabase.from('students').select('id, name, created_at, account_status').limit(5);
  console.log('Sample student registration fields:');
  console.log(data);
}

inspectStudentFields().catch(console.error);

