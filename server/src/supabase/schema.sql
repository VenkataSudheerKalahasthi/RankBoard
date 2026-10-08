-- ==============================================================================
-- DSA RANKBOARD — COMPLETE SUPABASE POSTGRESQL SCHEMA
-- ==============================================================================
-- Description: Production-ready relational schema for College DSA Rankboard.
-- Preserves all students, platform handles/URLs, statistics, scores, rankings,
-- admin accounts, audit logs, notifications, and settings.
-- ==============================================================================

-- 1. STUDENTS TABLE
CREATE TABLE IF NOT EXISTS public.students (
    id TEXT PRIMARY KEY,
    clerk_user_id TEXT UNIQUE,
    college_id TEXT NOT NULL DEFAULT 'COLLEGE_MAIN',
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    roll_number TEXT,
    department TEXT,
    year INTEGER,
    profile_photo TEXT,
    role TEXT DEFAULT 'STUDENT',
    account_status TEXT DEFAULT 'ACTIVE' CHECK (account_status IN ('ACTIVE', 'DISABLED')),
    profile_completed BOOLEAN DEFAULT FALSE,
    final_score NUMERIC(10, 2) DEFAULT 0.00,
    rank INTEGER,
    last_data_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. STUDENT PLATFORM PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.student_platform_profiles (
    id BIGSERIAL PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('leetcode', 'gfg', 'codeforces', 'codechef', 'hackerrank')),
    profile_url TEXT,
    username TEXT,
    status TEXT DEFAULT 'NOT_CONNECTED' CHECK (status IN ('CONNECTED', 'PENDING', 'SUCCESS', 'FAILED', 'NOT_CONNECTED')),
    error_message TEXT,
    last_fetched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_student_platform UNIQUE (student_id, platform)
);

-- 3. PLATFORM STATISTICS TABLE
CREATE TABLE IF NOT EXISTS public.platform_statistics (
    id BIGSERIAL PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('leetcode', 'gfg', 'codeforces', 'codechef', 'hackerrank')),
    total_solved INTEGER DEFAULT 0,
    easy_solved INTEGER DEFAULT 0,
    medium_solved INTEGER DEFAULT 0,
    hard_solved INTEGER DEFAULT 0,
    rating NUMERIC(10, 2),
    global_rank BIGINT,
    raw_stats JSONB DEFAULT '{}'::jsonb,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_student_platform_stats UNIQUE (student_id, platform)
);

-- 4. SCORES TABLE
CREATE TABLE IF NOT EXISTS public.scores (
    id BIGSERIAL PRIMARY KEY,
    student_id TEXT NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
    leetcode_score NUMERIC(10, 2) DEFAULT 0.00,
    gfg_score NUMERIC(10, 2) DEFAULT 0.00,
    codeforces_score NUMERIC(10, 2) DEFAULT 0.00,
    codechef_score NUMERIC(10, 2) DEFAULT 0.00,
    hackerrank_score NUMERIC(10, 2) DEFAULT 0.00,
    final_score NUMERIC(10, 2) DEFAULT 0.00,
    breakdown JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ADMINS TABLE
CREATE TABLE IF NOT EXISTS public.admins (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'ADMIN' CHECK (role IN ('SUPER_ADMIN', 'ADMIN')),
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED')),
    photo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    admin_id TEXT NOT NULL,
    admin_email TEXT NOT NULL,
    admin_name TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    target_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip TEXT,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ADMIN NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id BIGSERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_id TEXT,
    severity TEXT DEFAULT 'INFO' CHECK (severity IN ('INFO', 'WARNING', 'ERROR', 'SUCCESS')),
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. IMPORT HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.import_history (
    id BIGSERIAL PRIMARY KEY,
    admin_id TEXT,
    admin_email TEXT,
    file_name TEXT,
    total_rows INTEGER DEFAULT 0,
    imported_count INTEGER DEFAULT 0,
    skipped_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    status TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. SCORE ADJUSTMENTS TABLE
CREATE TABLE IF NOT EXISTS public.score_adjustments (
    id BIGSERIAL PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    admin_id TEXT NOT NULL,
    admin_email TEXT NOT NULL,
    previous_score NUMERIC(10, 2),
    adjusted_score NUMERIC(10, 2),
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. SYSTEM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.system_settings (
    id TEXT PRIMARY KEY DEFAULT 'config',
    college_identifier TEXT DEFAULT 'COLLEGE_MAIN',
    college_display_name TEXT DEFAULT 'Engineering College',
    sync_concurrency INTEGER DEFAULT 5,
    sync_batch_size INTEGER DEFAULT 5,
    sync_throttle_ms INTEGER DEFAULT 350,
    auto_sync_after_import BOOLEAN DEFAULT FALSE,
    enable_auto_sync_on_import BOOLEAN DEFAULT FALSE,
    scoring_weights JSONB DEFAULT '{
      "LEETCODE": { "OVERALL": 0.40, "EASY": 0.30, "MEDIUM": 0.40, "HARD": 0.30 },
      "GFG": { "OVERALL": 0.30 },
      "HACKERRANK": { "OVERALL": 0.30 },
      "CODEFORCES": { "OVERALL": 0.00 },
      "CODECHEF": { "OVERALL": 0.00 }
    }'::jsonb,
    updated_by TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE & EFFICIENCY
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_students_final_score_rank ON public.students(final_score DESC, rank ASC);
CREATE INDEX IF NOT EXISTS idx_students_college_dept_year ON public.students(college_id, department, year);
CREATE INDEX IF NOT EXISTS idx_students_email ON public.students(email);
CREATE INDEX IF NOT EXISTS idx_students_clerk_user_id ON public.students(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_students_roll_number ON public.students(roll_number);
CREATE INDEX IF NOT EXISTS idx_students_account_status ON public.students(account_status);

CREATE INDEX IF NOT EXISTS idx_platform_profiles_student_id ON public.student_platform_profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_platform_stats_student_id ON public.platform_statistics(student_id);
CREATE INDEX IF NOT EXISTS idx_scores_student_id ON public.scores(student_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON public.admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread ON public.admin_notifications(read) WHERE read = FALSE;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES (IDEMPOTENT)
-- ==============================================================================
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_platform_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 1. Public Read Policies
DROP POLICY IF EXISTS "Allow public read active students" ON public.students;
CREATE POLICY "Allow public read active students" ON public.students
    FOR SELECT USING (account_status = 'ACTIVE');

DROP POLICY IF EXISTS "Allow public read platform profiles" ON public.student_platform_profiles;
CREATE POLICY "Allow public read platform profiles" ON public.student_platform_profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read platform statistics" ON public.platform_statistics;
CREATE POLICY "Allow public read platform statistics" ON public.platform_statistics
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read scores" ON public.scores;
CREATE POLICY "Allow public read scores" ON public.scores
    FOR SELECT USING (true);

-- 2. Service Role Full Access Policies (used by backend)
DROP POLICY IF EXISTS "Service role full access students" ON public.students;
CREATE POLICY "Service role full access students" ON public.students
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access profiles" ON public.student_platform_profiles;
CREATE POLICY "Service role full access profiles" ON public.student_platform_profiles
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access stats" ON public.platform_statistics;
CREATE POLICY "Service role full access stats" ON public.platform_statistics
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access scores" ON public.scores;
CREATE POLICY "Service role full access scores" ON public.scores
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access admins" ON public.admins;
CREATE POLICY "Service role full access admins" ON public.admins
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access audit_logs" ON public.audit_logs;
CREATE POLICY "Service role full access audit_logs" ON public.audit_logs
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access notifications" ON public.admin_notifications;
CREATE POLICY "Service role full access notifications" ON public.admin_notifications
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access import_history" ON public.import_history;
CREATE POLICY "Service role full access import_history" ON public.import_history
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access score_adjustments" ON public.score_adjustments;
CREATE POLICY "Service role full access score_adjustments" ON public.score_adjustments
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access system_settings" ON public.system_settings;
CREATE POLICY "Service role full access system_settings" ON public.system_settings
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ==============================================================================
-- ENABLE SUPABASE REALTIME REPLICATION (SAFE & IDEMPOTENT)
-- ==============================================================================
DO $$
DECLARE
  t TEXT;
  target_tables TEXT[] := ARRAY[
    'students',
    'scores',
    'platform_statistics',
    'admin_notifications',
    'audit_logs',
    'system_settings'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH t IN ARRAY target_tables LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', t);
      END IF;
    END LOOP;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ==============================================================================
-- TABLE PRIVILEGES & PERMISSIONS
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

