# API Reference: Complete Backend REST Specification

This document provides a verified REST API reference for the College DSA Rankboard backend (`rankboard-server`). Every endpoint listed below has been verified against the route registrations and controllers in [`server/src/routes/`](file:///d:/rankboard/server/src/routes/) and [`server/src/controllers/`](file:///d:/rankboard/server/src/controllers/).

---

## 1. System & Health Endpoints

### `GET /`
- **File Location:** [`server/src/app.js`](file:///d:/rankboard/server/src/app.js#L50)
- **Purpose:** Root API index and basic service discovery.
- **Auth / Role:** Public (None).
- **Response `200 OK`:**
  ```json
  {
    "name": "College DSA Rankboard API",
    "version": "1.0.0",
    "description": "Backend services for College DSA Rankboard powered by Clerk & Supabase PostgreSQL.",
    "health": "/api/health",
    "leaderboard": "/api/leaderboard"
  }
  ```

### `GET /api/health`
- **File Location:** [`server/src/routes/index.js`](file:///d:/rankboard/server/src/routes/index.js#L9)
- **Purpose:** Liveness heartbeat for load balancers and deployment monitors.
- **Auth / Role:** Public (None).
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "service": "DSA Rankboard API",
    "timestamp": "2026-10-10T07:05:00.000Z"
  }
  ```

---

## 2. Public Leaderboard Endpoints

### `GET /api/leaderboard`
- **File Location:** [`server/src/routes/leaderboardRoutes.js`](file:///d:/rankboard/server/src/routes/leaderboardRoutes.js#L6)
- **Controller:** [`server/src/controllers/leaderboardController.js`](file:///d:/rankboard/server/src/controllers/leaderboardController.js#L8)
- **Purpose:** Retrieves public college rankings, podium top 3 finishers, and aggregate statistics.
- **Auth / Role:** Public (None).
- **Query Parameters:**
  - `collegeId` *(optional, string)*: Target college identifier (defaults to `COLLEGE_MAIN`).
  - `department` *(optional, string)*: Filter by department (e.g. `Computer Science and Engineering`).
  - `year` *(optional, integer)*: Filter by academic year (`1`, `2`, `3`, `4`).
  - `search` *(optional, string)*: Filter by student name or roll number.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "stats": {
      "totalRegisteredStudents": 95,
      "totalProblemsSolved": 18450,
      "codingPlatforms": 5,
      "lastUpdated": "2026-10-10T06:55:00.000Z"
    },
    "platforms": [
      { "key": "leetcode", "name": "LeetCode", "weight": 0.40, "status": "ACTIVE" },
      { "key": "gfg", "name": "GeeksforGeeks", "weight": 0.30, "status": "ACTIVE" },
      { "key": "hackerrank", "name": "HackerRank", "weight": 0.30, "status": "ACTIVE" },
      { "key": "codeforces", "name": "Codeforces", "weight": 0.00, "status": "ACTIVE" },
      { "key": "codechef", "name": "CodeChef", "weight": 0.00, "status": "ACTIVE" }
    ],
    "podium": [
      {
        "id": "user_2aBcDeFg...",
        "name": "Jane Doe",
        "rollNumber": "21A91A0501",
        "department": "Computer Science and Engineering",
        "year": 4,
        "finalScore": 485.20,
        "rank": 1,
        "profilePhoto": "https://res.cloudinary.com/.../student_jane.jpg"
      }
    ],
    "leaderboard": [ ... ]
  }
  ```

---

## 3. Student Portal Endpoints (`/api/student/*`)

*All `/api/student/*` routes require header `Authorization: Bearer <ClerkSessionJWT>`.*

### `GET /api/student/me` (and `GET /api/student/profile`)
- **File Location:** [`server/src/routes/studentRoutes.js`](file:///d:/rankboard/server/src/routes/studentRoutes.js#L15)
- **Controller:** [`server/src/controllers/studentController.js`](file:///d:/rankboard/server/src/controllers/studentController.js#L8)
- **Purpose:** Retrieves authenticated student profile, connected platforms, and overall score.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "student": {
      "id": "user_2xYz987...",
      "clerkUserId": "user_2xYz987...",
      "name": "Alex Smith",
      "email": "alex.smith@college.edu",
      "rollNumber": "21A91A0512",
      "department": "Computer Science and Engineering",
      "year": 4,
      "profilePhoto": "https://...",
      "overallScore": 340.50,
      "rank": 4,
      "profileCompleted": true,
      "totalCollegeStudents": 95,
      "platforms": {
        "leetcode": { "profileUrl": "https://leetcode.com/u/alex_lc/", "username": "alex_lc", "status": "SUCCESS" }
      },
      "platformStats": {
        "leetcode": { "totalSolved": 312, "easySolved": 140, "mediumSolved": 150, "hardSolved": 22 }
      }
    }
  }
  ```

### `PUT /api/student/profile`
- **File Location:** [`server/src/routes/studentRoutes.js`](file:///d:/rankboard/server/src/routes/studentRoutes.js#L17)
- **Controller:** [`server/src/controllers/studentController.js`](file:///d:/rankboard/server/src/controllers/studentController.js#L47)
- **Purpose:** Updates student academic metadata. Validates roll number uniqueness against other students.
- **Validation (Zod):** `name` (min 2 chars), `rollNumber` (string), `department` (string), `year` (int 1-4).
- **Request Body:**
  ```json
  {
    "name": "Alex Smith",
    "rollNumber": "21A91A0512",
    "department": "Computer Science and Engineering",
    "year": 4
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Student profile updated successfully.",
    "student": { ... }
  }
  ```
- **Errors:** `400 Bad Request` if roll number is already used by another student.

### `GET /api/student/platforms`
- **File Location:** [`server/src/routes/studentRoutes.js`](file:///d:/rankboard/server/src/routes/studentRoutes.js#L20)
- **Controller:** [`server/src/controllers/platformController.js`](file:///d:/rankboard/server/src/controllers/platformController.js#L14)
- **Purpose:** Retrieves student's platform configuration and synchronization timestamps.

### `POST /api/student/platforms/sync`
- **File Location:** [`server/src/routes/studentRoutes.js`](file:///d:/rankboard/server/src/routes/studentRoutes.js#L21)
- **Controller:** [`server/src/controllers/platformController.js`](file:///d:/rankboard/server/src/controllers/platformController.js#L46)
- **Rate Limit:** 30 requests per 5 minutes (`syncLimiter`).
- **Purpose:** Saves platform URLs and triggers immediate live statistics fetch.
- **Request Body:**
  ```json
  {
    "leetcodeUrl": "https://leetcode.com/u/alex_lc/",
    "gfgUrl": "https://www.geeksforgeeks.org/user/alex_gfg/",
    "hackerrankUrl": "https://www.hackerrank.com/profile/alex_hr",
    "codeforcesUrl": "https://codeforces.com/profile/alex_cf",
    "codechefUrl": "https://www.codechef.com/users/alex_cc"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Platform profiles synchronized successfully.",
    "student": { ... },
    "detectedChanges": ["LeetCode Total Solved: 310 → 312 (+2)"]
  }
  ```

### `GET /api/student/score`
- **Purpose:** Granular breakdown of student's platform scoring contributions.

### `GET /api/student/rank`
- **Purpose:** Returns current class rank, department rank, and percentile.

---

## 4. Achievement Showcase Endpoints (`/api/showcase/*`)

### `GET /api/showcase/:studentId`
- **File Location:** [`server/src/routes/showcaseRoutes.js`](file:///d:/rankboard/server/src/routes/showcaseRoutes.js#L25)
- **Auth / Role:** Public (None).
- **Purpose:** Returns sanitized metrics for shareable student achievement cards.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "showcase": {
      "studentId": "user_2xYz987...",
      "name": "Alex Smith",
      "department": "Computer Science and Engineering",
      "year": 4,
      "rank": 4,
      "totalStudents": 95,
      "finalScore": 340.50,
      "totalProblemsSolved": 580,
      "profilePhoto": "https://res.cloudinary.com/...",
      "platformBreakdown": {
        "leetcode": { "solved": 312, "rating": 1640 },
        "gfg": { "solved": 150, "codingScore": 420 },
        "hackerrank": { "solved": 80, "stars": 5 },
        "codeforces": { "solved": 25, "rating": 1210 },
        "codechef": { "solved": 13 }
      }
    }
  }
  ```

### `POST /api/showcase/profile-image`
- **File Location:** [`server/src/routes/showcaseRoutes.js`](file:///d:/rankboard/server/src/routes/showcaseRoutes.js#L35)
- **Auth / Role:** `requireAuth` (Student).
- **Content-Type:** `multipart/form-data`.
- **Form Field:** `image` (JPEG, PNG, WEBP, max 5MB).
- **Purpose:** Uploads student profile image to Cloudinary CDN with automatic face-detection cropping.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Profile image uploaded successfully.",
    "photoUrl": "https://res.cloudinary.com/.../student_user_2xYz987_17100000.jpg"
  }
  ```

### `PUT /api/showcase/settings`
- **Purpose:** Updates showcase privacy toggle and bio text.

---

## 5. Admin Management Endpoints (`/api/admin/*`)

*All `/api/admin/*` endpoints strictly require `Authorization: Bearer <ClerkJWT>` and verified Administrator role (`requireAdmin`).*

### A. Auth & Dashboard
- `GET /api/admin/auth/me`: Verifies administrator clearance and returns `{ success: true, admin: { role: 'SUPER_ADMIN', ... } }`.
- `GET /api/admin/dashboard/stats`: Aggregates active student counts, platform connection counts, and branch distributions.

### B. Student Management
- `GET /api/admin/students`: Paginated list of students. Query params: `page`, `limit`, `search`, `department`, `year`, `status`, `sortBy`.
- `POST /api/admin/students`: Manually create a new student record.
- `GET /api/admin/students/:studentId`: Retrieve full student dossier including raw platform JSONs and adjustment history.
- `PUT /api/admin/students/:studentId`: Update student details and platform URLs.
- `PATCH /api/admin/students/:studentId/status`: Toggle student status between `ACTIVE` and `DISABLED`.
- `DELETE /api/admin/students/:studentId`: Delete student. Query param `permanent=true` deletes from Supabase; otherwise sets status to `DISABLED`.

### C. Synchronization Center
- `POST /api/admin/sync/student/:studentId`: Force immediate synchronization of a single student.
- `POST /api/admin/sync/all`: Trigger asynchronous synchronization across all active students on campus.
- `GET /api/admin/sync/status`: Inspect running worker state, queue size, and cooldown status.
- `GET /api/admin/sync/logs`: Retrieve recent synchronization results and detected diffs.

### D. Bulk Ingestion Suite

#### Mode A: Full Student Roster Ingestion
- `POST /api/admin/import/validate`: Pre-validates 10-column Excel rows.
  - Body: `{ records: [ { name, email, rollNumber, branch, year, leetcodeUrl, ... } ] }`.
  - Returns: `{ validRecords, invalidRecords, duplicateEmails, duplicateRollNumbers }`.
- `POST /api/admin/import/confirm`: Commits validated student records to Supabase in batches.
- `GET /api/admin/import/template`: Downloads the canonical 10-column sample Excel template.
- `GET /api/admin/import/history`: Retrieves previous import logs.

#### Mode B: Targeted Bulk Platform URL Updates
- `POST /api/admin/import/bulk-platform-urls/validate`: Pre-validates 2-column Excel sheets (`Email/RollNumber` + `Platform URL`).
- `POST /api/admin/import/bulk-platform-urls/confirm`: Confirms and writes platform URLs for matched students.
- `POST /api/admin/import/bulk-platform-urls/batch`: Processes chunked batches (batches of 200).
- `GET /api/admin/import/bulk-platform-urls/template/:platform`: Downloads platform-specific 2-column template.

### E. Leaderboard & Scoring Operations
- `GET /api/admin/leaderboard`: Admin view of leaderboard with internal raw scores.
- `POST /api/admin/leaderboard/recalculate`: Recalculates college ranks with tie-breaking rules.
- `GET /api/admin/scores`: Detailed scores overview with platform breakdown.
- `POST /api/admin/scores/recalculate/:studentId`: Recalculate score for a specific student.
- `POST /api/admin/scores/recalculate-all`: Recalculate scores for all active students.
- `POST /api/admin/scores/adjust/:studentId`: Manually override a student's score.
  - Body: `{ adjustedScore: 350.00, reason: "State coding competition bonus" }`.
  - Enforces mandatory audit log creation in `score_adjustments` and `audit_logs`.
- `GET /api/admin/scores/adjustments`: History of manual score modifications.

### F. Platform Health & Diagnostics
- `GET /api/admin/platforms/stats`: Success rates, rate-limit counts, and cooldown timers for all 5 platforms.
- `POST /api/admin/platforms/:platform/test`: Tests live handle connectivity against external platform APIs.

### G. Anomaly Detection & AI Insights
- `GET /api/admin/anomalies`: Scans the database and returns duplicate handles, invalid URL formats, and score mismatches.
- `POST /api/admin/anomalies/resolve`: Resolves or retries sync for flagged anomaly records.
- `GET /api/admin/insights`: Returns department performance heuristics and talent recommendations.
- `POST /api/admin/insights/refresh`: Invalidates in-memory AI cache and recalculates metrics.

### H. Audit Logs & Notifications
- `GET /api/admin/audit-logs`: Paginated administrative audit trails with search and filter capabilities.
- `GET /api/admin/notifications`: Fetches system notifications.
- `PATCH /api/admin/notifications/:id/read`: Marks an individual notification as read.
- `DELETE /api/admin/notifications`: Clears all notification alerts.

### I. Settings & System Health
- `GET /api/admin/settings`: Fetches active synchronization parameters and admin list.
- `PUT /api/admin/settings`: Updates `syncConcurrency`, `syncThrottleMs`, and `collegeDisplayName`.
- `GET /api/admin/system/health`: Verifies database connection, Clerk status, and memory metrics.
