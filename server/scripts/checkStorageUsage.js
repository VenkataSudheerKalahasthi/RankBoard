const { getSupabase } = require('../src/supabase/supabaseClient');
const fs = require('fs');
const path = require('path');

async function checkStorage() {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('Supabase client not initialized.');
    return;
  }

  console.log('===============================================================');
  console.log('📊 DATABASE & DATA STORAGE USAGE REPORT');
  console.log('===============================================================\n');

  const tables = [
    'students',
    'student_platform_profiles',
    'platform_statistics',
    'scores',
    'student_activity_snapshots',
    'activity_anomalies',
    'audit_logs',
    'notifications',
    'admin_users',
    'colleges',
    'system_settings',
  ];

  let totalDataBytes = 0;
  const tableStats = [];

  for (const table of tables) {
    try {
      const { data, count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact' });

      if (error) {
        tableStats.push({
          table,
          rowCount: 'N/A / Error',
          jsonSize: 'N/A',
          notes: error.message,
        });
        continue;
      }

      const rowCount = count !== null ? count : (data ? data.length : 0);
      const jsonStr = JSON.stringify(data || []);
      const bytes = Buffer.byteLength(jsonStr, 'utf8');
      totalDataBytes += bytes;

      tableStats.push({
        table,
        rowCount,
        rawBytes: bytes,
        jsonSize: (bytes / 1024).toFixed(2) + ' KB',
      });
    } catch (err) {
      tableStats.push({
        table,
        rowCount: 'Error',
        jsonSize: 'Error',
        notes: err.message,
      });
    }
  }

  console.log('--- SUPABASE POSTGRESQL TABLES ---');
  console.table(
    tableStats.map((t) => ({
      'Table Name': t.table,
      'Row Count': t.rowCount,
      'Data Size (JSON)': t.jsonSize,
      Notes: t.notes || 'OK',
    }))
  );

  const totalKB = (totalDataBytes / 1024).toFixed(2);
  const totalMB = (totalDataBytes / (1024 * 1024)).toFixed(3);
  console.log(`\n📦 Total Raw Data Size Across All Tables: ${totalKB} KB (~${totalMB} MB)`);

  // Check local data directory
  const dataDir = path.join(__dirname, '../data');
  if (fs.existsSync(dataDir)) {
    console.log('\n--- LOCAL BACKUP / FALLBACK FILES (server/data) ---');
    const files = fs.readdirSync(dataDir);
    let localTotal = 0;
    const fileStats = files.map((file) => {
      const filePath = path.join(dataDir, file);
      const stat = fs.statSync(filePath);
      localTotal += stat.size;
      return {
        File: file,
        Size: (stat.size / 1024).toFixed(2) + ' KB',
      };
    });
    console.table(fileStats);
    console.log(`📁 Local Files Total: ${(localTotal / 1024).toFixed(2)} KB`);
  }

  console.log('\n===============================================================');
  console.log('💡 TIP FOR SUPABASE POSTGRES DISK STORAGE (TABLE + INDEX SIZE):');
  console.log('You can also view exact PostgreSQL disk block storage in:');
  console.log('1. Supabase Dashboard -> Project Settings -> Database / Usage');
  console.log('2. Or run this query in the Supabase SQL Editor:');
  console.log(`
SELECT 
    relname AS table_name,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
    pg_size_pretty(pg_relation_size(relid)) AS table_size,
    pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) AS index_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
  `);
  console.log('===============================================================');
}

checkStorage().catch(console.error);
