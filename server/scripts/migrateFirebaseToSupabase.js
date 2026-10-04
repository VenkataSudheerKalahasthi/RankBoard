const fs = require('fs');
const path = require('path');
const { getSupabase } = require('../src/supabase/supabaseClient');
const { upsertStudent, upsertAdmin, insertAuditLog } = require('../src/supabase/supabaseRepository');
const {
  parseLeetCodeUrl,
  parseGFGUrl,
  parseCodeforcesUrl,
  parseCodeChefUrl,
  formatCanonicalUrl,
} = require('../src/utils/urlParsers');
const { evaluateStudentScores } = require('../src/services/scoring');
const { recalculateCollegeRankings } = require('../src/services/ranking/rankingEngine');

async function runMigration() {
  console.log('======================================================');
  console.log('🚀 FIREBASE/FIRESTORE -> SUPABASE POSTGRESQL MIGRATION');
  console.log('======================================================');

  const supabase = getSupabase();
  if (!supabase) {
    console.error('❌ Supabase client failed to initialize. Please verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }

  // 1. Load Backup Data & Sample Students
  const backupFilePath = path.join(__dirname, '../data/firestore_backup.json');
  const sampleFilePath = path.join(__dirname, '../data/students_sample.json');

  let backupData = { collections: {} };
  if (fs.existsSync(backupFilePath)) {
    try {
      backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));
      console.log('📂 Loaded Firestore backup file.');
    } catch (e) {
      console.warn('⚠️ Could not parse firestore_backup.json:', e.message);
    }
  }

  let sampleStudents = [];
  if (fs.existsSync(sampleFilePath)) {
    try {
      sampleStudents = JSON.parse(fs.readFileSync(sampleFilePath, 'utf8'));
      console.log(`📂 Loaded ${sampleStudents.length} student records from students_sample.json.`);
    } catch (e) {
      console.warn('⚠️ Could not parse students_sample.json:', e.message);
    }
  }

  // Combine students from backup and sample without losing or duplicating
  const studentMap = new Map();

  // First check backup students
  if (backupData.collections?.students && backupData.collections.students.length > 0) {
    backupData.collections.students.forEach((s) => {
      const email = (s.email || '').toLowerCase().trim();
      if (email) {
        studentMap.set(email, s);
      }
    });
  }

  // Merge sample students
  sampleStudents.forEach((s, idx) => {
    const email = (s.email || '').toLowerCase().trim();
    if (!email) return;

    if (!studentMap.has(email)) {
      const docId = `import_${Buffer.from(email).toString('hex').slice(0, 24)}`;
      const lcHandle = parseLeetCodeUrl(s.leetcodeUrl || '');
      const gfgHandle = parseGFGUrl(s.gfgUrl || '');
      const cfHandle = parseCodeforcesUrl(s.codeforcesUrl || '');
      const ccHandle = parseCodeChefUrl(s.codechefUrl || '');

      studentMap.set(email, {
        id: docId,
        clerkUserId: null,
        collegeId: 'COLLEGE_MAIN',
        name: s.name || `Student ${idx + 1}`,
        email,
        rollNumber: (s.rollNumber || '').trim(),
        department: s.department || 'PRIME',
        year: s.year || 4,
        accountStatus: 'ACTIVE',
        profileCompleted: !!(s.leetcodeUrl && s.gfgUrl && s.codechefUrl),
        platforms: {
          leetcode: {
            profileUrl: s.leetcodeUrl || (lcHandle ? formatCanonicalUrl('leetcode', lcHandle) : ''),
            username: lcHandle || '',
            status: lcHandle ? 'CONNECTED' : 'NOT_CONNECTED',
          },
          gfg: {
            profileUrl: s.gfgUrl || (gfgHandle ? formatCanonicalUrl('gfg', gfgHandle) : ''),
            username: gfgHandle || '',
            status: gfgHandle ? 'CONNECTED' : 'NOT_CONNECTED',
          },
          codeforces: {
            profileUrl: s.codeforcesUrl || (cfHandle ? formatCanonicalUrl('codeforces', cfHandle) : ''),
            username: cfHandle || '',
            status: cfHandle ? 'CONNECTED' : 'NOT_CONNECTED',
          },
          codechef: {
            profileUrl: s.codechefUrl || (ccHandle ? formatCanonicalUrl('codechef', ccHandle) : ''),
            username: ccHandle || '',
            status: ccHandle ? 'CONNECTED' : 'NOT_CONNECTED',
          },
        },
        platformStats: s.platformStats || {
          leetcode: null,
          gfg: null,
          codeforces: null,
          codechef: null,
        },
        scores: s.scores || {
          leetcodeScore: 0,
          gfgScore: 0,
          codeforcesScore: 0,
          codechefScore: 0,
          finalScore: s.finalScore || 0,
        },
        finalScore: s.finalScore || 0,
        rank: s.rank || null,
        lastDataUpdatedAt: s.lastDataUpdatedAt || new Date().toISOString(),
      });
    }
  });

  console.log(`\n--- 1. MIGRATING STUDENTS (${studentMap.size} unique records) ---`);
  let migratedStudentsCount = 0;
  for (const [email, student] of studentMap.entries()) {
    try {
      await upsertStudent(student);
      migratedStudentsCount++;
      if (migratedStudentsCount % 20 === 0 || migratedStudentsCount === studentMap.size) {
        console.log(`Migrated ${migratedStudentsCount}/${studentMap.size} students...`);
      }
    } catch (err) {
      console.error(`❌ Failed to migrate student (${email}):`, err.message);
    }
  }
  console.log(`✅ Total students successfully migrated to Supabase: ${migratedStudentsCount}`);

  // 2. Migrate Admins
  console.log('\n--- 2. MIGRATING ADMIN ACCOUNTS ---');
  const admins = backupData.collections?.admins || [
    {
      _docId: 'user_3K8PZqtbmG1XLF2eAlLqcrosHZU',
      userId: 'user_3K8PZqtbmG1XLF2eAlLqcrosHZU',
      email: 'venkatasudheerkalahasthi@gmail.com',
      name: 'Venkatasudheer Kalahasthi',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      photo: 'https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvb2F1dGhfZ29vZ2xlL2ltZ18zSzhQWnVNVkRvc1k1ejAySWFUZkZVSVp0VWsifQ',
      createdAt: '2026-10-03T07:19:04.642Z',
      lastLoginAt: '2026-10-03T07:59:21.134Z',
    },
  ];

  let migratedAdminsCount = 0;
  for (const admin of admins) {
    try {
      await upsertAdmin({
        id: admin._docId || admin.userId,
        userId: admin.userId || admin._docId,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        status: admin.status,
        photo: admin.photo,
        createdAt: admin.createdAt,
        lastLoginAt: admin.lastLoginAt,
      });
      migratedAdminsCount++;
      console.log(`Migrated admin: ${admin.name} (${admin.email})`);
    } catch (err) {
      console.error(`❌ Failed to migrate admin (${admin.email}):`, err.message);
    }
  }
  console.log(`✅ Total admins migrated: ${migratedAdminsCount}`);

  // 3. Migrate Audit Logs
  console.log('\n--- 3. MIGRATING AUDIT LOGS ---');
  const auditLogs = backupData.collections?.audit_logs || [];
  let migratedAuditLogsCount = 0;
  for (const log of auditLogs) {
    try {
      await insertAuditLog({
        adminId: log.adminId,
        adminEmail: log.adminEmail,
        adminName: log.adminName,
        action: log.action,
        target: log.target,
        targetId: log.targetId,
        details: log.details,
        ip: log.ip,
        userAgent: log.userAgent,
        timestamp: log.timestamp,
      });
      migratedAuditLogsCount++;
    } catch (err) {
      console.error(`❌ Failed to migrate audit log:`, err.message);
    }
  }
  console.log(`✅ Total audit logs migrated: ${migratedAuditLogsCount}`);

  // 4. Recalculate College Rankings
  console.log('\n--- 4. RECALCULATING RANKINGS IN SUPABASE ---');
  try {
    await recalculateCollegeRankings('COLLEGE_MAIN');
    console.log('✅ Rankings successfully calculated and stored.');
  } catch (err) {
    console.warn('⚠️ Ranking recalculation note:', err.message);
  }

  console.log('\n======================================================');
  console.log('🎉 MIGRATION COMPLETED SUCCESSFULLY!');
  console.log(`Students: ${migratedStudentsCount}`);
  console.log(`Admins: ${migratedAdminsCount}`);
  console.log(`Audit Logs: ${migratedAuditLogsCount}`);
  console.log('======================================================');
}

runMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
