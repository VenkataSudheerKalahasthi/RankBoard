-- ==============================================================================
-- DSA RANKBOARD — SCALABILITY & HIGH-CONCURRENCY PERFORMANCE INDEXES
-- ==============================================================================
-- Run this migration in the Supabase SQL Editor to maximize query throughput
-- for 5,000 to 25,000+ registered students and high concurrency.
-- ==============================================================================

-- 1. Composite index for active college rankings (index scan for leaderboard queries)
CREATE INDEX IF NOT EXISTS idx_students_college_status_score 
  ON public.students(college_id, account_status, final_score DESC, rank ASC);

-- 2. Lowercase functional index on students email for rapid case-insensitive lookup
CREATE INDEX IF NOT EXISTS idx_students_email_lower 
  ON public.students(LOWER(email));

-- 3. Case-insensitive roll number lookup index
CREATE INDEX IF NOT EXISTS idx_students_roll_number_lower 
  ON public.students(LOWER(roll_number));

-- 4. Fast composite index for daily snapshot lookups and deduplication
CREATE INDEX IF NOT EXISTS idx_snapshots_student_plat_date 
  ON public.student_activity_snapshots(student_id, platform, activity_date);

-- 5. Composite index on platform stats for fast single-platform joins
CREATE INDEX IF NOT EXISTS idx_platform_stats_student_platform 
  ON public.platform_statistics(student_id, platform);

-- 6. Composite index on platform profiles for fast single-platform joins
CREATE INDEX IF NOT EXISTS idx_platform_profiles_student_platform 
  ON public.student_platform_profiles(student_id, platform);
