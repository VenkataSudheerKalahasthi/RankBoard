const { getSupabase } = require('../src/supabase/supabaseClient');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function pruneDuplicateSnapshots() {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('Supabase not initialized');
    process.exit(1);
  }

  console.log('===============================================================');
  console.log('🧹 DEDUPLICATING STUDENT ACTIVITY SNAPSHOTS');
  console.log('===============================================================\n');

  // 1. Get all students
  const { data: students, error: sErr } = await supabase.from('students').select('id, name');
  if (sErr) {
    console.error('Failed to get students:', sErr.message);
    return;
  }

  console.log(`Found ${students.length} students. Checking snapshots per student...\n`);

  let totalPruned = 0;
  let totalKept = 0;

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    
    // Fetch all snapshots for this student ordered by snapshot_timestamp DESC (newest first)
    // PostgREST pagination if over 1000
    let allRows = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: rows, error: rErr } = await supabase
        .from('student_activity_snapshots')
        .select('id, platform, activity_date, snapshot_timestamp')
        .eq('student_id', student.id)
        .order('snapshot_timestamp', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (rErr) {
        console.warn(`Error on student ${student.id}:`, rErr.message);
        break;
      }

      if (rows && rows.length > 0) {
        allRows = allRows.concat(rows);
        if (rows.length < pageSize) hasMore = false;
        else page++;
      } else {
        hasMore = false;
      }
    }

    if (allRows.length === 0) continue;

    const seen = new Set();
    const duplicateIds = [];

    for (const r of allRows) {
      const key = `${r.platform}|${r.activity_date}`;
      if (seen.has(key)) {
        duplicateIds.push(r.id);
      } else {
        seen.add(key);
      }
    }

    totalKept += seen.size;

    if (duplicateIds.length > 0) {
      // Delete in chunks of 200
      const CHUNK_SIZE = 200;
      for (let c = 0; c < duplicateIds.length; c += CHUNK_SIZE) {
        const chunk = duplicateIds.slice(c, c + CHUNK_SIZE);
        const { error: delErr } = await supabase
          .from('student_activity_snapshots')
          .delete()
          .in('id', chunk);

        if (delErr) {
          console.warn(`Delete chunk error for ${student.id}:`, delErr.message);
        } else {
          totalPruned += chunk.length;
        }
      }
    }

    if ((i + 1) % 10 === 0 || i === students.length - 1) {
      console.log(`[${i + 1}/${students.length}] Students processed | Total duplicates pruned so far: ${totalPruned} | Unique snapshots kept: ${totalKept}`);
    }

    await sleep(50);
  }

  console.log('\n===============================================================');
  console.log(`🎉 PRUNING COMPLETED!`);
  console.log(`   - Redundant Duplicates Removed: ${totalPruned}`);
  console.log(`   - Legitimate Historical Snapshots Kept: ${totalKept}`);
  console.log('===============================================================');
}

pruneDuplicateSnapshots().catch(console.error);
