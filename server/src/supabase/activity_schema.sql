-- ==============================================================================
-- DSA RANKBOARD — STUDENT ACTIVITY MONITOR & ANOMALY DETECTION SCHEMA
-- ==============================================================================
-- Description: Historical problem solving snapshots, daily tracking,
-- and anomaly detection tables with full RLS, indexes, and Realtime replication.
-- Run this script in the Supabase SQL Editor.
-- ==============================================================================

-- 1. STUDENT ACTIVITY SNAPSHOTS TABLE
-- Stores historical observations of platform solve counts over time
CREATE TABLE IF NOT EXISTS public.student_activity_snapshots (
    id BIGSERIAL PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('leetcode', 'gfg', 'codeforces', 'codechef', 'hackerrank')),
    snapshot_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_solved INTEGER DEFAULT 0,
    easy_solved INTEGER DEFAULT 0,
    medium_solved INTEGER DEFAULT 0,
    hard_solved INTEGER DEFAULT 0,
    school_solved INTEGER DEFAULT 0,
    basic_solved INTEGER DEFAULT 0,
    rating NUMERIC(10, 2),
    status TEXT DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'RATE_LIMITED', 'FAILED', 'PENDING')),
    error_message TEXT,
    raw_stats JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_student_platform_snapshot UNIQUE (student_id, platform, snapshot_timestamp)
);

-- 2. ACTIVITY ANOMALIES TABLE
-- Stores detected unusual activity events for Admin review with evidence & audit trail
CREATE TABLE IF NOT EXISTS public.activity_anomalies (
    id BIGSERIAL PRIMARY KEY,
    anomaly_key TEXT NOT NULL UNIQUE,
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('leetcode', 'gfg', 'codeforces', 'codechef', 'hackerrank', 'all')),
    activity_date DATE NOT NULL,
    observed_count INTEGER NOT NULL DEFAULT 0,
    baseline_count NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    absolute_increase INTEGER NOT NULL DEFAULT 0,
    relative_increase_pct NUMERIC(10, 2),
    rule_triggered TEXT NOT NULL,
    detection_reason TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    difficulty_breakdown JSONB DEFAULT '{}'::jsonb,
    data_confidence TEXT DEFAULT 'HIGH' CHECK (data_confidence IN ('HIGH', 'MEDIUM', 'LOW', 'APPROXIMATE')),
    review_status TEXT DEFAULT 'NEEDS_REVIEW' CHECK (review_status IN ('NEEDS_REVIEW', 'REVIEWED', 'DISMISSED', 'NEEDS_FURTHER_INVESTIGATION')),
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_snapshots_student_platform_time 
    ON public.student_activity_snapshots(student_id, platform, snapshot_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_snapshots_activity_date 
    ON public.student_activity_snapshots(activity_date DESC);

CREATE INDEX IF NOT EXISTS idx_snapshots_student_date 
    ON public.student_activity_snapshots(student_id, activity_date DESC);

CREATE INDEX IF NOT EXISTS idx_anomalies_student_id 
    ON public.activity_anomalies(student_id);

CREATE INDEX IF NOT EXISTS idx_anomalies_date 
    ON public.activity_anomalies(activity_date DESC);

CREATE INDEX IF NOT EXISTS idx_anomalies_status 
    ON public.activity_anomalies(review_status);

CREATE INDEX IF NOT EXISTS idx_anomalies_platform 
    ON public.activity_anomalies(platform);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.student_activity_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_anomalies ENABLE ROW LEVEL SECURITY;

-- Public can read aggregated snapshots for active students
DROP POLICY IF EXISTS "Allow public read snapshots for active students" ON public.student_activity_snapshots;
CREATE POLICY "Allow public read snapshots for active students" ON public.student_activity_snapshots
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.students 
            WHERE public.students.id = public.student_activity_snapshots.student_id 
              AND public.students.account_status = 'ACTIVE'
        )
    );

-- Backend Service Role has full access
DROP POLICY IF EXISTS "Service role full access student_activity_snapshots" ON public.student_activity_snapshots;
CREATE POLICY "Service role full access student_activity_snapshots" ON public.student_activity_snapshots
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access activity_anomalies" ON public.activity_anomalies;
CREATE POLICY "Service role full access activity_anomalies" ON public.activity_anomalies
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ==============================================================================
-- SUPABASE REALTIME REPLICATION
-- ==============================================================================
DO $$
DECLARE
  t TEXT;
  target_tables TEXT[] := ARRAY['student_activity_snapshots', 'activity_anomalies'];
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
