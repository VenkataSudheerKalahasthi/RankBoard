const { getSupabase } = require('./supabaseClient');

/**
 * Transforms relational Supabase rows into the standard student object format expected by the app
 */
function formatStudentRow(studentRow, profiles = [], stats = [], score = null) {
  if (!studentRow) return null;

  const platformsObj = {
    leetcode: { profileUrl: '', username: '', status: 'NOT_CONNECTED', lastFetchedAt: null, errorMessage: null },
    gfg: { profileUrl: '', username: '', status: 'NOT_CONNECTED', lastFetchedAt: null, errorMessage: null },
    codeforces: { profileUrl: '', username: '', status: 'NOT_CONNECTED', lastFetchedAt: null, errorMessage: null },
    codechef: { profileUrl: '', username: '', status: 'NOT_CONNECTED', lastFetchedAt: null, errorMessage: null },
    hackerrank: { profileUrl: '', username: '', status: 'NOT_CONNECTED', lastFetchedAt: null, errorMessage: null },
  };

  profiles.forEach((p) => {
    if (platformsObj[p.platform]) {
      platformsObj[p.platform] = {
        profileUrl: p.profile_url || '',
        username: p.username || '',
        status: p.status || 'NOT_CONNECTED',
        lastFetchedAt: p.last_fetched_at || null,
        errorMessage: p.error_message || null,
      };
    }
  });

  const platformStatsObj = {
    leetcode: null,
    gfg: null,
    codeforces: null,
    codechef: null,
    hackerrank: null,
  };

  stats.forEach((s) => {
    if (s && s.platform) {
      platformStatsObj[s.platform] = {
        platform: s.platform,
        username: platformsObj[s.platform]?.username || '',
        status: 'SUCCESS',
        totalSolved: s.total_solved || 0,
        schoolSolved: s.school_solved !== undefined && s.school_solved !== null ? s.school_solved : (s.raw_stats?.schoolSolved ?? 0),
        basicSolved: s.basic_solved !== undefined && s.basic_solved !== null ? s.basic_solved : (s.raw_stats?.basicSolved ?? 0),
        easySolved: s.easy_solved !== undefined && s.easy_solved !== null ? s.easy_solved : (s.raw_stats?.easySolved ?? 0),
        mediumSolved: s.medium_solved !== undefined && s.medium_solved !== null ? s.medium_solved : (s.raw_stats?.mediumSolved ?? 0),
        hardSolved: s.hard_solved !== undefined && s.hard_solved !== null ? s.hard_solved : (s.raw_stats?.hardSolved ?? 0),
        rating: s.rating !== null ? Number(s.rating) : null,
        globalRank: s.global_rank !== null ? Number(s.global_rank) : null,
        ...(s.raw_stats && typeof s.raw_stats === 'object' ? s.raw_stats : {}),
      };
    }
  });

  const scoresObj = score
    ? {
        leetcodeScore: Number(score.leetcode_score || 0),
        gfgScore: Number(score.gfg_score || 0),
        codeforcesScore: Number(score.codeforces_score || 0),
        codechefScore: Number(score.codechef_score || 0),
        hackerrankScore: Number(score.hackerrank_score || 0),
        finalScore: Number(score.final_score || studentRow.final_score || 0),
        breakdown: score.breakdown || {},
      }
    : {
        leetcodeScore: 0,
        gfgScore: 0,
        codeforcesScore: 0,
        codechefScore: 0,
        hackerrankScore: 0,
        finalScore: Number(studentRow.final_score || 0),
        breakdown: {},
      };

  return {
    id: studentRow.id,
    clerkUserId: studentRow.clerk_user_id || (studentRow.id.startsWith('user_') ? studentRow.id : null),
    collegeId: studentRow.college_id || 'COLLEGE_MAIN',
    name: studentRow.name,
    email: studentRow.email,
    rollNumber: studentRow.roll_number || '',
    department: studentRow.department || '',
    year: studentRow.year || 4,
    profilePhoto: studentRow.profile_photo || '',
    role: studentRow.role || 'STUDENT',
    accountStatus: studentRow.account_status || 'ACTIVE',
    profileCompleted: !!studentRow.profile_completed,
    finalScore: Number(studentRow.final_score || 0),
    rank: studentRow.rank !== null ? Number(studentRow.rank) : null,
    showcaseSettings: studentRow.showcase_settings || { isPublic: true, bio: '' },
    lastDataUpdatedAt: studentRow.last_data_updated_at || null,
    createdAt: studentRow.created_at,
    updatedAt: studentRow.updated_at,
    platforms: platformsObj,
    platformStats: platformStatsObj,
    scores: scoresObj,
  };
}

// Helper to retry Supabase queries on transient fetch/network errors
async function withSupabaseRetry(fn, maxRetries = 3, delayMs = 300) {
  let attempt = 0;
  while (true) {
    attempt++;
    try {
      const res = await fn();
      if (res && res.error) {
        const msg = res.error.message || '';
        const isTransient = msg.includes('fetch failed') || msg.includes('socket hang up') || msg.includes('ECONNRESET') || msg.includes('ETIMEDOUT');
        if (attempt < maxRetries && isTransient) {
          await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, attempt - 1)));
          continue;
        }
      }
      return res;
    } catch (err) {
      const msg = err.message || '';
      const isTransient = msg.includes('fetch failed') || msg.includes('socket hang up') || msg.includes('ECONNRESET') || msg.includes('ETIMEDOUT');
      if (attempt < maxRetries && isTransient) {
        await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, attempt - 1)));
        continue;
      }
      throw err;
    }
  }
}

// -----------------------------------------------------------------------------
// STUDENTS REPOSITORY
// -----------------------------------------------------------------------------

async function getAllStudents({ accountStatus = null, collegeId = null } = {}) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await withSupabaseRetry(async () => {
    let query = supabase
      .from('students')
      .select(`
        *,
        student_platform_profiles (*),
        platform_statistics (*),
        scores (*)
      `);

    if (accountStatus) {
      query = query.eq('account_status', accountStatus);
    }
    if (collegeId) {
      query = query.eq('college_id', collegeId);
    }
    return await query;
  });

  if (error) {
    console.error('[Supabase getAllStudents Error]:', error.message);
    throw error;
  }

  return (data || []).map((row) =>
    formatStudentRow(
      row,
      row.student_platform_profiles || [],
      row.platform_statistics || [],
      Array.isArray(row.scores) ? row.scores[0] : row.scores
    )
  );
}

async function getStudentById(idOrClerkIdOrEmail) {
  if (!idOrClerkIdOrEmail) return null;
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await withSupabaseRetry(async () => {
    let query = supabase
      .from('students')
      .select(`
        *,
        student_platform_profiles (*),
        platform_statistics (*),
        scores (*)
      `);

    if (idOrClerkIdOrEmail.includes('@')) {
      query = query.eq('email', idOrClerkIdOrEmail.toLowerCase().trim());
    } else if (idOrClerkIdOrEmail.startsWith('user_')) {
      query = query.or(`id.eq.${idOrClerkIdOrEmail},clerk_user_id.eq.${idOrClerkIdOrEmail}`);
    } else {
      query = query.eq('id', idOrClerkIdOrEmail);
    }

    return await query.maybeSingle();
  });

  if (error) {
    console.error('[Supabase getStudentById Error]:', error.message);
    return null;
  }

  if (!data) return null;

  return formatStudentRow(
    data,
    data.student_platform_profiles || [],
    data.platform_statistics || [],
    Array.isArray(data.scores) ? data.scores[0] : data.scores
  );
}

async function getStudentByRollNumber(rollNumber) {
  if (!rollNumber) return null;
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('students')
    .select(`
      *,
      student_platform_profiles (*),
      platform_statistics (*),
      scores (*)
    `)
    .ilike('roll_number', rollNumber.trim())
    .maybeSingle();

  if (error) {
    console.error('[Supabase getStudentByRollNumber Error]:', error.message);
    return null;
  }

  if (!data) return null;

  return formatStudentRow(
    data,
    data.student_platform_profiles || [],
    data.platform_statistics || [],
    Array.isArray(data.scores) ? data.scores[0] : data.scores
  );
}

async function upsertStudent(studentData) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client not initialized');

  const studentId = studentData.id || studentData.clerkUserId || `student_${Date.now()}`;
  const clerkUserId = studentData.clerkUserId || (studentId.startsWith('user_') ? studentId : null);

  const studentPayload = {
    id: studentId,
    clerk_user_id: clerkUserId,
    college_id: studentData.collegeId || 'COLLEGE_MAIN',
    name: studentData.name || 'Student',
    email: (studentData.email || '').toLowerCase().trim(),
    roll_number: studentData.rollNumber ? studentData.rollNumber.trim() : null,
    department: studentData.department ? studentData.department.trim() : null,
    year: studentData.year ? parseInt(studentData.year, 10) : null,
    profile_photo: studentData.profilePhoto || null,
    role: studentData.role || 'STUDENT',
    account_status: studentData.accountStatus || 'ACTIVE',
    profile_completed: !!studentData.profileCompleted,
    final_score: studentData.finalScore !== undefined ? Number(studentData.finalScore) : 0,
    rank: studentData.rank !== undefined && studentData.rank !== null ? parseInt(studentData.rank, 10) : null,
    last_data_updated_at: studentData.lastDataUpdatedAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 1. Upsert student record
  const { error: studentErr } = await supabase
    .from('students')
    .upsert(studentPayload, { onConflict: 'id' });

  if (studentErr) {
    console.error('[Supabase upsertStudent Error]:', studentErr.message);
    throw studentErr;
  }

  // 2. Upsert platform profiles if present
  if (studentData.platforms) {
    const profileRows = [];
    for (const [platform, p] of Object.entries(studentData.platforms)) {
      if (['leetcode', 'gfg', 'codeforces', 'codechef', 'hackerrank'].includes(platform)) {
        profileRows.push({
          student_id: studentId,
          platform,
          profile_url: p?.profileUrl || null,
          username: p?.username || null,
          status: p?.status || 'NOT_CONNECTED',
          error_message: p?.errorMessage || null,
          last_fetched_at: p?.lastFetchedAt || null,
          updated_at: new Date().toISOString(),
        });
      }
    }

    if (profileRows.length > 0) {
      try {
        const { error: profileErr } = await supabase
          .from('student_platform_profiles')
          .upsert(profileRows, { onConflict: 'student_id,platform' });

        if (profileErr) {
          console.error('[Supabase upsert Platform Profiles Error]:', profileErr.message);
        }
      } catch (e) {
        console.error('[Supabase upsert Platform Profiles Exception]:', e.message);
      }
    }
  }

  // 3. Upsert platform statistics if present
  if (studentData.platformStats) {
    const statsRows = [];
    for (const [platform, s] of Object.entries(studentData.platformStats)) {
      if (['leetcode', 'gfg', 'codeforces', 'codechef', 'hackerrank'].includes(platform)) {
        if (s) {
          statsRows.push({
            student_id: studentId,
            platform,
            total_solved: s.totalSolved || 0,
            easy_solved: s.easySolved || 0,
            medium_solved: s.mediumSolved || 0,
            hard_solved: s.hardSolved || 0,
            rating: s.rating !== undefined && s.rating !== null ? Number(s.rating) : null,
            global_rank: s.globalRank !== undefined && s.globalRank !== null ? Number(s.globalRank) : null,
            raw_stats: s,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }
    }

    if (statsRows.length > 0) {
      try {
        const { error: statsErr } = await supabase
          .from('platform_statistics')
          .upsert(statsRows, { onConflict: 'student_id,platform' });

        if (statsErr) {
          console.error('[Supabase upsert Platform Stats Error]:', statsErr.message);
        }
      } catch (e) {
        console.error('[Supabase upsert Platform Stats Exception]:', e.message);
      }
    }
  }

  // 4. Upsert scores if present
  if (studentData.scores || studentData.finalScore !== undefined) {
    const s = studentData.scores || {};
    const scorePayload = {
      student_id: studentId,
      leetcode_score: Number(s.leetcodeScore || 0),
      gfg_score: Number(s.gfgScore || 0),
      codeforces_score: Number(s.codeforcesScore || 0),
      codechef_score: Number(s.codechefScore || 0),
      hackerrank_score: Number(s.hackerrankScore || 0),
      final_score: Number(studentData.finalScore !== undefined ? studentData.finalScore : (s.finalScore || 0)),
      breakdown: s.breakdown || s,
      updated_at: new Date().toISOString(),
    };

    try {
      const { error: scoreErr } = await supabase
        .from('scores')
        .upsert(scorePayload, { onConflict: 'student_id' });

      if (scoreErr) {
        console.error('[Supabase upsert Scores Error]:', scoreErr.message);
      }
    } catch (e) {
      console.error('[Supabase upsert Scores Exception]:', e.message);
    }
  }

  return getStudentById(studentId);
}

async function updateStudent(studentId, updates) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client not initialized');

  const payload = {
    updated_at: new Date().toISOString(),
  };

  if (updates.clerkUserId !== undefined) payload.clerk_user_id = updates.clerkUserId;
  if (updates.email !== undefined) payload.email = updates.email.toLowerCase().trim();
  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.rollNumber !== undefined) payload.roll_number = updates.rollNumber ? updates.rollNumber.trim() : null;
  if (updates.department !== undefined) payload.department = updates.department ? updates.department.trim() : null;
  if (updates.year !== undefined) payload.year = updates.year ? parseInt(updates.year, 10) : null;
  if (updates.profilePhoto !== undefined) payload.profile_photo = updates.profilePhoto;
  if (updates.role !== undefined) payload.role = updates.role;
  if (updates.collegeId !== undefined) payload.college_id = updates.collegeId;
  if (updates.accountStatus !== undefined) payload.account_status = updates.accountStatus;
  if (updates.finalScore !== undefined) payload.final_score = Number(updates.finalScore);
  if (updates.rank !== undefined) payload.rank = updates.rank !== null ? parseInt(updates.rank, 10) : null;
  if (updates.profileCompleted !== undefined) payload.profile_completed = !!updates.profileCompleted;
  if (updates.lastDataUpdatedAt !== undefined) payload.last_data_updated_at = updates.lastDataUpdatedAt;
  if (updates.showcaseSettings !== undefined) payload.showcase_settings = updates.showcaseSettings;

  let { error } = await withSupabaseRetry(async () => {
    return await supabase
      .from('students')
      .update(payload)
      .eq('id', studentId);
  });

  if (error && error.message && error.message.includes('showcase_settings')) {
    // If column doesn't exist yet in remote table, retry update without showcase_settings
    delete payload.showcase_settings;
    const retry = await withSupabaseRetry(async () => {
      return await supabase.from('students').update(payload).eq('id', studentId);
    });
    error = retry.error;
  }

  if (error) {
    console.error('[Supabase updateStudent Error]:', error.message);
    throw error;
  }

  // If platforms were updated
  if (updates.platforms) {
    for (const [platform, p] of Object.entries(updates.platforms)) {
      if (['leetcode', 'gfg', 'codeforces', 'codechef', 'hackerrank'].includes(platform)) {
        try {
          await supabase
            .from('student_platform_profiles')
            .upsert({
              student_id: studentId,
              platform,
              profile_url: p?.profileUrl || null,
              username: p?.username || null,
              status: p?.status || 'NOT_CONNECTED',
              error_message: p?.errorMessage || null,
              last_fetched_at: p?.lastFetchedAt || null,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'student_id,platform' });
        } catch (e) {
          console.error(`[Supabase upsert ${platform} Profile Exception]:`, e.message);
        }
      }
    }
  }

  // If platformStats were updated
  if (updates.platformStats) {
    for (const [platform, s] of Object.entries(updates.platformStats)) {
      if (['leetcode', 'gfg', 'codeforces', 'codechef', 'hackerrank'].includes(platform) && s) {
        try {
          await supabase
            .from('platform_statistics')
            .upsert({
              student_id: studentId,
              platform,
              total_solved: s.totalSolved || 0,
              easy_solved: s.easySolved || 0,
              medium_solved: s.mediumSolved || 0,
              hard_solved: s.hardSolved || 0,
              rating: s.rating !== undefined && s.rating !== null ? Number(s.rating) : null,
              global_rank: s.globalRank !== undefined && s.globalRank !== null ? Number(s.globalRank) : null,
              raw_stats: s,
              last_synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }, { onConflict: 'student_id,platform' });
        } catch (e) {
          console.error(`[Supabase upsert ${platform} Stats Exception]:`, e.message);
        }
      }
    }
  }

  // If scores were updated
  if (updates.scores) {
    const s = updates.scores;
    try {
      await supabase
        .from('scores')
        .upsert({
          student_id: studentId,
          leetcode_score: Number(s.leetcodeScore || 0),
          gfg_score: Number(s.gfgScore || 0),
          codeforces_score: Number(s.codeforcesScore || 0),
          codechef_score: Number(s.codechefScore || 0),
          hackerrank_score: Number(s.hackerrankScore || 0),
          final_score: Number(updates.finalScore !== undefined ? updates.finalScore : (s.finalScore || 0)),
          breakdown: s.breakdown || s,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'student_id' });
    } catch (e) {
      console.error('[Supabase upsert Scores Exception]:', e.message);
    }
  }

  return getStudentById(studentId);
}

async function deleteStudent(studentId) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client not initialized');

  const { error } = await supabase.from('students').delete().eq('id', studentId);
  if (error) {
    console.error('[Supabase deleteStudent Error]:', error.message);
    throw error;
  }
  return true;
}

// -----------------------------------------------------------------------------
// ADMINS REPOSITORY
// -----------------------------------------------------------------------------

async function getAdminById(userId) {
  if (!userId) return null;
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('admins')
    .select('*')
    .or(`id.eq.${userId},user_id.eq.${userId}`)
    .maybeSingle();

  if (error) {
    console.error('[Supabase getAdminById Error]:', error.message);
    return null;
  }
  return data;
}

async function getAdminByEmail(email) {
  if (!email) return null;
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('admins')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  if (error) {
    console.error('[Supabase getAdminByEmail Error]:', error.message);
    return null;
  }
  return data;
}

async function getAdminsCount() {
  const supabase = getSupabase();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from('admins')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('[Supabase getAdminsCount Error]:', error.message);
    return 0;
  }
  return count || 0;
}

async function getAllAdmins() {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase.from('admins').select('*');
  if (error) {
    console.error('[Supabase getAllAdmins Error]:', error.message);
    return [];
  }
  return data || [];
}

async function upsertAdmin(adminData) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client not initialized');

  const payload = {
    id: adminData.userId || adminData.id,
    user_id: adminData.userId || adminData.id,
    email: (adminData.email || '').toLowerCase().trim(),
    name: adminData.name || 'Administrator',
    role: adminData.role || 'ADMIN',
    status: adminData.status || 'ACTIVE',
    photo: adminData.photo || null,
    last_login_at: adminData.lastLoginAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('admins')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('[Supabase upsertAdmin Error]:', error.message);
    throw error;
  }
  return data;
}

// -----------------------------------------------------------------------------
// AUDIT LOGS REPOSITORY
// -----------------------------------------------------------------------------

async function insertAuditLog(logEntry) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const payload = {
    admin_id: logEntry.adminId || 'SYSTEM',
    admin_email: logEntry.adminEmail || 'admin@college.edu',
    admin_name: logEntry.adminName || 'Administrator',
    action: logEntry.action || 'ADMIN_ACTION',
    target: logEntry.target || 'SYSTEM',
    target_id: logEntry.targetId || null,
    details: logEntry.details || {},
    ip: logEntry.ip || '127.0.0.1',
    user_agent: logEntry.userAgent || 'Internal',
    timestamp: logEntry.timestamp || new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('audit_logs')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('[Supabase insertAuditLog Error]:', error.message);
    return null;
  }
  return data;
}

async function getAuditLogs(options = 50) {
  const supabase = getSupabase();
  if (!supabase) {
    if (typeof options === 'number') return [];
    return { logs: [], totalCount: 0, totalPages: 0, currentPage: 1, limit: 50 };
  }

  const isNumericLimit = typeof options === 'number';
  const opts = isNumericLimit ? { limit: options } : (options || {});

  const {
    page = 1,
    limit = 50,
    search = '',
    action = '',
    target = '',
    actor = '',
    startDate = '',
    endDate = '',
  } = opts;

  const parsedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 50, 500));
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const from = (parsedPage - 1) * parsedLimit;
  const to = from + parsedLimit - 1;

  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' });

  if (action && action !== 'ALL') {
    query = query.eq('action', action);
  }

  if (actor && actor.trim()) {
    const act = actor.trim();
    query = query.or(`admin_email.ilike.%${act}%,admin_name.ilike.%${act}%`);
  }

  if (target && target.trim()) {
    query = query.ilike('target', `%${target.trim()}%`);
  }

  if (search && search.trim()) {
    const s = search.trim();
    query = query.or(`action.ilike.%${s}%,target.ilike.%${s}%,admin_name.ilike.%${s}%,admin_email.ilike.%${s}%,target_id.ilike.%${s}%`);
  }

  if (startDate) {
    try {
      const startIso = new Date(startDate).toISOString();
      query = query.gte('timestamp', startIso);
    } catch (e) {
      console.warn('[getAuditLogs startDate parse warning]:', e.message);
    }
  }

  if (endDate) {
    try {
      const endIso = new Date(endDate).toISOString();
      query = query.lte('timestamp', endIso);
    } catch (e) {
      console.warn('[getAuditLogs endDate parse warning]:', e.message);
    }
  }

  query = query.order('timestamp', { ascending: false }).range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error('[Supabase getAuditLogs Error]:', error.message);
    if (isNumericLimit) return [];
    return { logs: [], totalCount: 0, totalPages: 0, currentPage: parsedPage, limit: parsedLimit };
  }

  const logs = (data || []).map((row) => ({
    id: String(row.id),
    adminId: row.admin_id,
    adminEmail: row.admin_email,
    adminName: row.admin_name,
    action: row.action,
    target: row.target,
    targetId: row.target_id,
    details: row.details,
    ip: row.ip,
    userAgent: row.user_agent,
    timestamp: row.timestamp,
    status: row.details?.status || 'SUCCESS',
    reason: row.details?.reason || null,
    before: row.details?.before || row.details?.before_data || null,
    after: row.details?.after || row.details?.after_data || null,
  }));

  if (isNumericLimit) {
    return logs;
  }

  return {
    logs,
    totalCount: count || 0,
    totalPages: Math.ceil((count || 0) / parsedLimit),
    currentPage: parsedPage,
    limit: parsedLimit,
  };
}

// -----------------------------------------------------------------------------
// NOTIFICATIONS REPOSITORY
// -----------------------------------------------------------------------------

async function insertNotification(notification) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const payload = {
    type: notification.type || 'SYSTEM_ALERT',
    title: notification.title || 'Notification',
    message: notification.message || '',
    target_id: notification.targetId || null,
    severity: notification.severity || 'INFO',
    read: false,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('admin_notifications')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('[Supabase insertNotification Error]:', error.message);
    return null;
  }
  return data;
}

async function getNotifications(limit = 30) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('admin_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Supabase getNotifications Error]:', error.message);
    return [];
  }

  return (data || []).map((row) => ({
    id: String(row.id),
    type: row.type,
    title: row.title,
    message: row.message,
    targetId: row.target_id,
    severity: row.severity,
    read: !!row.read,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));
}

async function markNotificationRead(id) {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from('admin_notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[Supabase markNotificationRead Error]:', error.message);
    return false;
  }
  return true;
}

async function clearNotifications() {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase.from('admin_notifications').delete().neq('id', 0);
  if (error) {
    console.error('[Supabase clearNotifications Error]:', error.message);
    return false;
  }
  return true;
}

// -----------------------------------------------------------------------------
// IMPORT HISTORY & SCORE ADJUSTMENTS
// -----------------------------------------------------------------------------

async function insertImportHistory(historyData) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const payload = {
    admin_id: historyData.adminId || null,
    admin_email: historyData.adminEmail || null,
    file_name: historyData.fileName || 'bulk_import.xlsx',
    total_rows: historyData.totalRows || 0,
    imported_count: historyData.importedCount || 0,
    skipped_count: historyData.skippedCount || 0,
    failed_count: historyData.failedCount || 0,
    status: historyData.status || 'COMPLETED',
    details: historyData.details || {},
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('import_history')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('[Supabase insertImportHistory Error]:', error.message);
    return null;
  }
  return data;
}

async function getImportHistory(limit = 20) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('import_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Supabase getImportHistory Error]:', error.message);
    return [];
  }

  return (data || []).map((row) => ({
    id: String(row.id),
    adminId: row.admin_id,
    adminEmail: row.admin_email,
    fileName: row.file_name,
    totalRows: row.total_rows,
    importedCount: row.imported_count,
    skippedCount: row.skipped_count,
    failedCount: row.failed_count,
    status: row.status,
    details: row.details,
    createdAt: row.created_at,
  }));
}

async function insertScoreAdjustment(adjData) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const payload = {
    student_id: adjData.studentId,
    admin_id: adjData.adminId,
    admin_email: adjData.adminEmail,
    previous_score: adjData.previousScore !== undefined ? Number(adjData.previousScore) : null,
    adjusted_score: adjData.adjustedScore !== undefined ? Number(adjData.adjustedScore) : null,
    reason: adjData.reason || '',
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('score_adjustments')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('[Supabase insertScoreAdjustment Error]:', error.message);
    return null;
  }
  return data;
}

async function getScoreAdjustments(limit = 50, studentId = null) {
  const supabase = getSupabase();
  if (!supabase) return [];

  let query = supabase
    .from('score_adjustments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (studentId) {
    query = query.eq('student_id', studentId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[Supabase getScoreAdjustments Error]:', error.message);
    return [];
  }

  return (data || []).map((row) => ({
    id: String(row.id),
    studentId: row.student_id,
    adminId: row.admin_id,
    adminEmail: row.admin_email,
    previousScore: row.previous_score !== null ? Number(row.previous_score) : null,
    adjustedScore: row.adjusted_score !== null ? Number(row.adjusted_score) : null,
    reason: row.reason,
    createdAt: row.created_at,
  }));
}

// -----------------------------------------------------------------------------
// SYSTEM SETTINGS REPOSITORY
// -----------------------------------------------------------------------------

async function getSystemSettings() {
  const supabase = getSupabase();
  if (!supabase) return {};

  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .eq('id', 'config')
    .maybeSingle();

  if (error) {
    console.error('[Supabase getSystemSettings Error]:', error.message);
    return {};
  }

  if (!data) return {};

  return {
    syncBatchSize: data.sync_batch_size,
    syncThrottleMs: data.sync_throttle_ms,
    enableAutoSyncOnImport: data.enable_auto_sync_on_import,
    scoringWeights: data.scoring_weights,
    updatedBy: data.updated_by,
    updatedAt: data.updated_at,
  };
}

async function updateSystemSettings(payload) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const dbPayload = {
    id: 'config',
    ...(payload.syncBatchSize !== undefined && { sync_batch_size: parseInt(payload.syncBatchSize, 10) }),
    ...(payload.syncThrottleMs !== undefined && { sync_throttle_ms: parseInt(payload.syncThrottleMs, 10) }),
    ...(payload.enableAutoSyncOnImport !== undefined && { enable_auto_sync_on_import: !!payload.enableAutoSyncOnImport }),
    ...(payload.scoringWeights !== undefined && { scoring_weights: payload.scoringWeights }),
    updated_by: payload.updatedBy || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('system_settings')
    .upsert(dbPayload, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('[Supabase updateSystemSettings Error]:', error.message);
    throw error;
  }
  return data;
}

module.exports = {
  getAllStudents,
  getStudentById,
  getStudentByRollNumber,
  upsertStudent,
  updateStudent,
  deleteStudent,
  getAdminById,
  getAdminByEmail,
  getAdminsCount,
  getAllAdmins,
  upsertAdmin,
  insertAuditLog,
  getAuditLogs,
  insertNotification,
  getNotifications,
  markNotificationRead,
  clearNotifications,
  insertImportHistory,
  getImportHistory,
  insertScoreAdjustment,
  getScoreAdjustments,
  getSystemSettings,
  updateSystemSettings,
};
