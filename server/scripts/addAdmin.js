const { upsertAdmin, getAdminByEmail } = require('../src/supabase/supabaseRepository');

async function main() {
  const email = process.argv[2];
  const name = process.argv[3] || 'Administrator';
  const role = process.argv[4] || 'ADMIN'; // 'ADMIN' or 'SUPER_ADMIN'

  if (!email || !email.includes('@')) {
    console.log('Usage: node scripts/addAdmin.js <email> [name] [role]');
    console.log('Example: node scripts/addAdmin.js teacher@gmail.com "Prof. Sharma" ADMIN');
    process.exit(1);
  }

  const cleanEmail = email.toLowerCase().trim();
  console.log(`Adding administrator: ${cleanEmail} (${name}, ${role})...`);

  try {
    const existing = await getAdminByEmail(cleanEmail);
    const adminId = existing?.id || `admin_${Date.now()}`;

    const admin = await upsertAdmin({
      id: adminId,
      userId: adminId,
      email: cleanEmail,
      name,
      role,
      status: 'ACTIVE',
      lastLoginAt: new Date().toISOString(),
    });

    console.log('✅ Successfully added administrator to Supabase `admins` table:');
    console.log(JSON.stringify(admin, null, 2));
    console.log('\nTip: You can also add this email to `ADMIN_EMAILS` in server/.env for automatic Super Admin clearance:');
    console.log(`ADMIN_EMAILS=...,${cleanEmail}`);
  } catch (err) {
    console.error('❌ Failed to add administrator:', err.message);
  }
}

main();
