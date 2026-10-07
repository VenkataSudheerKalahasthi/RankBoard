require('dotenv').config();
const axios = require('axios');
const { config } = require('../src/config/env');

async function testSqlExec() {
  const sql = `
    ALTER TABLE public.student_platform_profiles DROP CONSTRAINT IF EXISTS student_platform_profiles_platform_check;
    ALTER TABLE public.student_platform_profiles ADD CONSTRAINT student_platform_profiles_platform_check 
      CHECK (platform IN ('leetcode', 'gfg', 'codeforces', 'codechef', 'hackerrank'));

    ALTER TABLE public.platform_statistics DROP CONSTRAINT IF EXISTS platform_statistics_platform_check;
    ALTER TABLE public.platform_statistics ADD CONSTRAINT platform_statistics_platform_check 
      CHECK (platform IN ('leetcode', 'gfg', 'codeforces', 'codechef', 'hackerrank'));

    ALTER TABLE public.scores ADD COLUMN IF NOT EXISTS hackerrank_score NUMERIC(10, 2) DEFAULT 0.00;
  `;

  try {
    const res = await axios.post(`${config.SUPABASE_URL}/rest/v1/rpc/exec_sql`, { query: sql }, {
      headers: {
        'apikey': config.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${config.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
    console.log('RPC result:', res.data);
  } catch (e) {
    console.log('RPC error:', e.response?.status, e.response?.data || e.message);
  }
}

testSqlExec();
