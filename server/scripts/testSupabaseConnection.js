const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

async function testConnection() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  console.log('Testing Supabase Connection:');
  console.log('URL:', url);
  console.log('Key length:', key ? key.length : 0);
  console.log('Key prefix:', key ? key.substring(0, 15) : 'none');

  try {
    const supabase = createClient(url, key);
    const { data, error } = await supabase.from('students').select('*').limit(1);
    if (error) {
      console.error('Supabase Query Error:', error);
    } else {
      console.log('✅ Supabase Query Success! Data:', data);
    }
  } catch (err) {
    console.error('Catch Error:', err);
  }
}

testConnection();
