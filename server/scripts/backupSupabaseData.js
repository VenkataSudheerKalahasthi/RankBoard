const fs = require('fs');
const path = require('path');
const { getSupabase } = require('../src/supabase/supabaseClient');

async function backupSupabase() {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('Supabase client not initialized');
    process.exit(1);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '../data/backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log('🔄 Starting Full Supabase Backup...');

  const tables = [
    'students',
    'student_platform_profiles',
    'platform_statistics',
    'scores',
    'activity_anomalies',
    'audit_logs',
    'system_settings',
  ];

  const backupData = {
    exportedAt: new Date().toISOString(),
    tables: {},
  };

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        console.warn(`⚠️ Warning fetching ${table}:`, error.message);
        backupData.tables[table] = [];
      } else {
        backupData.tables[table] = data || [];
        console.log(`✅ Backed up ${table}: ${data.length} records`);
      }
    } catch (e) {
      console.warn(`⚠️ Exception on ${table}:`, e.message);
    }
  }

  const backupFile = path.join(backupDir, `supabase_backup_${timestamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf8');

  const stats = fs.statSync(backupFile);
  console.log(`\n🎉 Backup completed successfully!`);
  console.log(`📁 File: ${backupFile}`);
  console.log(`📊 Size: ${(stats.size / 1024).toFixed(2)} KB`);
}

backupSupabase().catch(console.error);
