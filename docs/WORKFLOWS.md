# End-to-End System Workflows

This document traces the complete execution lifecycle for the primary user journeys and administrative workflows implemented in DSA Rankboard.

---

## 1. Workflow 1: Student Self-Service Platform Linking & Synchronization

When a student links their coding handles (e.g., LeetCode, GFG, HackerRank) and triggers a synchronization:

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student (Browser)
    participant UI as StudentPlatforms.jsx
    participant Ctx as StudentContext.jsx
    participant Axios as Axios API Client
    participant AuthMw as requireAuth (Clerk)
    participant Limiter as syncLimiter (5m)
    participant Zod as validateBody (Zod)
    participant Ctrl as platformController.js
    participant Sync as syncService.js
    participant LC as LeetCode GraphQL
    participant GFG as GFG Submissions API
    participant Score as scoringEngine.js
    participant DB as Supabase PostgreSQL
    participant Rank as rankingEngine.js
    participant CDC as Supabase Realtime

    Student->>UI: Enters platform URLs and clicks "Save & Synchronize"
    UI->>Ctx: syncPlatforms({ leetcodeUrl, gfgUrl, hackerrankUrl })
    Ctx->>Axios: POST /api/student/platforms/sync
    Axios->>AuthMw: Headers Authorization: Bearer <ClerkJWT>
    
    AuthMw->>AuthMw: verifyToken() & binds req.student
    AuthMw->>Limiter: Pass through
    Limiter->>Limiter: Check 30 requests / 5 min window
    Limiter->>Zod: Pass through
    Zod->>Zod: Validate URL formats
    Zod->>Ctrl: Call saveAndSyncPlatforms()
    
    Ctrl->>Sync: syncStudentPlatforms(student, urls)
    
    par Parallel Scrapes
        Sync->>LC: fetchLeetCodeProfile(handle)
        Sync->>GFG: fetchGFGProfile(handle) via Queue
    end
    LC-->>Sync: Return problems solved (Easy, Medium, Hard)
    GFG-->>Sync: Return problems solved
    
    Sync->>Sync: detectPlatformStatChanges(prevStats, newStats)
    Sync->>Score: evaluateStudentScores(platformStats)
    Score-->>Sync: Return calculated finalScore (LC 40% + GFG 30% + HR 30%)
    
    Sync->>DB: Upsert `student_platform_profiles`, `platform_statistics`, `scores`, `students`
    DB-->>Sync: Mutation successful
    
    Sync->>Rank: recalculateCollegeRankings(collegeId)
    Rank->>DB: Sort all active students and update rank column
    
    DB->>CDC: Emit postgres_changes UPDATE event on `students` & `scores`
    
    Sync-->>Ctrl: Return updated student object & detectedChanges
    Ctrl-->>Axios: HTTP 200 { success: true, student, detectedChanges }
    Axios-->>Ctx: Update student state in React context
    Ctx-->>UI: Display success banner and updated score metrics
    
    CDC-->>Student: Push WebSocket update to all open leaderboard screens
```

---

## 2. Workflow 2: Admin Bulk Platform URL Batch Update (Mode B)

When an administrator uploads a 2-column Excel sheet (`Email/Roll Number` + `Platform URL`) to update student links in bulk:

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Administrator
    participant UI as BulkPlatformUrlUpdateTab.jsx
    participant Service as adminService.js
    participant AuthMw as requireAdmin
    participant Ctrl as adminController.js
    participant Validator as bulkPlatformUrlValidator.js
    participant Repo as supabaseRepository.js
    participant DB as Supabase PostgreSQL
    participant Audit as auditLogger.js

    Admin->>UI: Selects platform (e.g. "LeetCode") & drops Excel file
    UI->>UI: Parse Excel file in browser using XLSX (SheetJS)
    UI->>Service: POST /api/admin/import/bulk-platform-urls/validate { platform, rows }
    Service->>AuthMw: Authorization: Bearer <ClerkJWT>
    AuthMw->>AuthMw: Verify admin privileges in Supabase
    AuthMw->>Ctrl: validateBulkPlatformUrls()
    
    Ctrl->>Repo: getAllStudents()
    Repo->>DB: Fetch all students
    DB-->>Repo: Return current roster
    
    Ctrl->>Validator: Match rows against students by email or rollNumber
    Validator->>Validator: Validate domain and URL handle syntax
    Validator-->>Ctrl: Return validation summary (valid, invalid, conflicts, diffs)
    Ctrl-->>UI: Return preview data
    
    UI->>Admin: Displays interactive Diff Preview table (Old URL vs New URL)
    Admin->>UI: Clicks "Confirm & Apply Updates"
    
    loop Batch Execution (Chunks of 200 rows)
        UI->>Service: POST /api/admin/import/bulk-platform-urls/batch { platform, chunk }
        Service->>Ctrl: executeBulkPlatformUrlsBatch()
        Ctrl->>Repo: batchUpdateStudentPlatformProfiles(chunk)
        Repo->>DB: UPDATE student_platform_profiles & students.last_data_updated_at
        DB-->>Repo: Success
        Ctrl->>Audit: Log AUDIT_ACTIONS.BULK_PLATFORM_URL_UPDATE
        Audit->>DB: INSERT into `audit_logs`
        Ctrl-->>UI: Return batch progress (e.g. "Batch 1/3 complete")
        UI->>Admin: Update animated progress bar
    end
    
    UI->>Admin: Display success dialog & offer immediate background sync trigger
```

---

## 3. Workflow 3: Background Polling Scheduler & Leaderboard Recalculation

The automated near-real-time worker that continuously polls external coding platforms:

```mermaid
sequenceDiagram
    autonumber
    participant Ticker as setInterval (Every 3s)
    participant Scheduler as schedulerService.js
    participant Settings as settingsService.js
    participant Repo as supabaseRepository.js
    participant Sync as syncService.js
    participant DB as Supabase PostgreSQL
    participant Ranking as rankingEngine.js
    participant CDC as Supabase Realtime

    Ticker->>Scheduler: executeSyncTick()
    Scheduler->>Repo: getAllStudents({ accountStatus: 'ACTIVE' })
    Repo-->>Scheduler: Return all active students
    
    Scheduler->>Scheduler: Filter students where isStudentDueForSync() === true
    alt No Students Due
        Scheduler-->>Ticker: Return (Idle tick)
    else Students Due for Sync
        Scheduler->>Settings: getSystemSettings() (reads concurrency & throttle)
        
        loop Chunked Batches (Concurrency: 5, Throttle: 350ms)
            Scheduler->>Sync: syncStudentPlatforms(student, null, { forceSync: false })
            Sync->>Sync: Fetch stats & detectPlatformStatChanges()
            alt Changes Detected
                Sync->>DB: Write updated stats & scores
                Sync-->>Scheduler: { hasChanged: true }
            else No Change
                Sync-->>Scheduler: { hasChanged: false }
            end
        end
        
        alt Any Student's Stats Changed in Batch
            Scheduler->>Ranking: recalculateCollegeRankings(collegeId)
            Ranking->>DB: Update rank numbers for changed positions
            DB->>CDC: Stream PostgreSQL row update to Supabase Realtime
            CDC-->>Scheduler: WebSocket pushes changes to connected browsers
        end
    end
```

---

## 4. Workflow 4: Public Shareable Achievement Badge Export

When a student or recruiter views a student's public showcase card and exports it as an image:

```mermaid
sequenceDiagram
    autonumber
    actor User as Student / Recruiter
    participant Browser as Browser Window
    participant Showcase as PublicShowcase.jsx
    participant ExportComp as AchievementExportCard.jsx
    participant ExportUtil as exportAchievementCard.js
    participant Html2Image as html-to-image (toPng)
    participant Dom as DOM Tree

    User->>Showcase: Visits /showcase/:studentId
    Showcase->>Showcase: Fetches public showcase data from /api/showcase/:studentId
    User->>Showcase: Clicks "Download Achievement Badge"
    
    Showcase->>ExportUtil: exportAchievementCard(exportFrameElement, { filename })
    ExportUtil->>Browser: await document.fonts.ready
    ExportUtil->>Dom: Scan all <img> tags and ensure naturalWidth > 0
    ExportUtil->>Browser: requestAnimationFrame tick for style reflow
    
    ExportUtil->>ExportComp: Render hidden export frame with fixed width (Desktop: 872px, Mobile: 472px)
    ExportUtil->>Html2Image: toPng(exportFrameElement, { pixelRatio: 2.5, backgroundColor: '#ffffff' })
    Html2Image-->>ExportUtil: Return high-resolution PNG Data URL
    
    ExportUtil->>Dom: Create temporary anchor element `<a download="rankboard_achievement_..." href="data:image/png...">`
    ExportUtil->>Dom: Trigger simulated `.click()`
    Dom-->>User: Browser downloads sharp, unclipped PNG image
```

---

## 5. Workflow 5: Audited Manual Score Adjustment

When an administrator awards or deducts points (e.g., hackathon achievements, conduct penalties):

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Administrator
    participant UI as Scores.jsx
    participant Service as adminService.js
    participant AuthMw as requireAdmin
    participant Ctrl as adminController.js
    participant DB as Supabase PostgreSQL
    participant Rank as rankingEngine.js
    participant Audit as auditLogger.js

    Admin->>UI: Clicks "Adjust Score" on a student, enters adjusted score & reason
    UI->>Service: POST /api/admin/scores/adjust/:studentId { adjustedScore, reason }
    Service->>AuthMw: Authorization: Bearer <ClerkJWT>
    AuthMw->>Ctrl: adjustStudentScore()
    
    Ctrl->>DB: Query current student score
    DB-->>Ctrl: previous_score: 300.00
    
    Ctrl->>DB: UPDATE `scores` SET final_score = 350.00, leetcode_score = ...
    Ctrl->>DB: UPDATE `students` SET final_score = 350.00
    Ctrl->>DB: INSERT into `score_adjustments` (student_id, admin_id, prev, adjusted, reason)
    
    Ctrl->>Audit: logAudit(action: 'MANUAL_SCORE_ADJUSTMENT', details: { reason })
    Audit->>DB: INSERT into `audit_logs`
    
    Ctrl->>Rank: recalculateCollegeRankings()
    Rank->>DB: Recompute ranks across college
    
    Ctrl-->>UI: HTTP 200 { success: true, message: "Score adjusted and leaderboard updated." }
    UI->>Admin: Display success toast and update live table
```
