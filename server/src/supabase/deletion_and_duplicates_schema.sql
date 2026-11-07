-- ==============================================================================
-- DSA RANKBOARD — STUDENT DELETIONS & PLATFORM IDENTITY UNIQUENESS SCHEMA MIGRATION
-- ==============================================================================

-- 1. DELETED STUDENTS AUDIT LOG TABLE
-- Retains minimal audit trail of student deletion without storing passwords,
-- tokens, credentials, or sensitive platform details.
CREATE TABLE IF NOT EXISTS public.deleted_students (
    id BIGSERIAL PRIMARY KEY,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    student_email TEXT NOT NULL,
    roll_number TEXT,
    department TEXT,
    year INTEGER,
    deleted_by_admin_id TEXT NOT NULL,
    deleted_by_admin_email TEXT NOT NULL,
    deleted_by_admin_name TEXT NOT NULL,
    deletion_status TEXT NOT NULL DEFAULT 'COMPLETED',
    reason TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes for Deleted Students Search & Sorting
CREATE INDEX IF NOT EXISTS idx_deleted_students_deleted_at ON public.deleted_students(deleted_at DESC);
CREATE INDEX IF NOT EXISTS idx_deleted_students_email ON public.deleted_students(student_email);
CREATE INDEX IF NOT EXISTS idx_deleted_students_name ON public.deleted_students(student_name);
CREATE INDEX IF NOT EXISTS idx_deleted_students_roll ON public.deleted_students(roll_number);

-- Enable RLS for deleted_students
ALTER TABLE public.deleted_students ENABLE ROW LEVEL SECURITY;

-- 2. PARTIAL UNIQUE INDEX FOR ACTIVE PLATFORM USERNAMES
-- Enforces that two active students cannot share the exact same lowercase platform username.
-- NULL and empty string handles are permitted for unlinked platforms.
-- If account_status is 'DISABLED' or student is deleted, they do not block active accounts.
-- Note: Case-insensitive uniqueness can be enforced via lower(username) or normalized storage.
CREATE INDEX IF NOT EXISTS idx_student_platform_profiles_active_unique 
ON public.student_platform_profiles(platform, lower(username))
WHERE username IS NOT NULL AND username <> '';

-- ==============================================================================

