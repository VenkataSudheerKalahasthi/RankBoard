# Middleware Architecture & Execution Pipeline

## 1. Overview of the Middleware Pipeline

Every HTTP request routed through the Rankboard backend traverses a multi-tiered pipeline of global, router-level, and endpoint-specific middleware before reaching business logic controllers:

```mermaid
graph TD
    Request["Incoming HTTP Request"] --> Helmet["1. Helmet (Security Headers)"]
    Helmet --> CORS["2. CORS (Origin & Method Validation)"]
    CORS --> Morgan["3. Morgan (HTTP Request Logging)"]
    Morgan --> BodyParser["4. Body Parser (express.json / urlencoded, 10MB)"]
    BodyParser --> ApiLimiter["5. apiLimiter (Global Rate Limiter)"]

    ApiLimiter --> RouteRouter{"Route Target"}

    RouteRouter -->|Public Route (e.g. /leaderboard)| LeaderCtrl["Leaderboard Controller"]
    
    RouteRouter -->|Student Route (/student/*)| ClerkAuth["6. requireAuth (Clerk JWT Verification)"]
    ClerkAuth --> SyncCheck{"Sync Endpoint?"}
    SyncCheck -->|Yes (/platforms/sync)| SyncLimiter["7. syncLimiter (5m Rate Limit)"]
    SyncCheck -->|No| StudentVal["8. validateBody (Zod Schema)"]
    SyncLimiter --> StudentVal
    StudentVal --> StudentCtrl["Student Controller"]

    RouteRouter -->|Admin Route (/admin/*)| AdminAuth["6. requireAdmin (Clerk JWT + RBAC)"]
    AdminAuth --> AdminCtrl["Admin Controller"]

    RouteRouter -->|Image Upload (/showcase/profile-image)| MulterMw["6. Multer Memory Upload (5MB Cap)"]
    MulterMw --> ClerkAuthShowcase["7. requireAuth (Clerk JWT)"]
    ClerkAuthShowcase --> ShowcaseCtrl["Showcase Controller"]

    LeaderCtrl --> GlobalErr["Global Error Handler (errorHandler)"]
    StudentCtrl --> GlobalErr
    AdminCtrl --> GlobalErr
    ShowcaseCtrl --> GlobalErr
```

---

## 2. Comprehensive Middleware Catalog

### 1. `helmet` — Security Headers Middleware
- **File Location:** Configured in [`server/src/app.js`](file:///d:/rankboard/server/src/app.js#L13-L17).
- **Type:** Global application middleware.
- **Purpose:** Hardens the HTTP response by setting standard security headers (X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, X-XSS-Protection).
- **Configuration:** `helmet({ crossOriginResourcePolicy: false })`.
- **Why Required:** Mitigates common web vulnerabilities such as MIME sniffing, clickjacking, and cross-site scripting. `crossOriginResourcePolicy: false` is configured to ensure Cloudinary profile images and cross-origin achievement badge exports are not blocked by the browser.
- **Request Properties:** Reads standard HTTP headers. Does not modify `req`.
- **Response Behavior:** Injects standard security headers into `res`.
- **Security Implications:** Eliminates fundamental browser exploits out-of-the-box.

---

### 2. `cors` — Cross-Origin Resource Sharing
- **File Location:** Configured in [`server/src/app.js`](file:///d:/rankboard/server/src/app.js#L20-L32).
- **Type:** Global application middleware.
- **Purpose:** Controls cross-origin HTTP access between frontend SPAs (running on Vite ports 5173/5174) and the API server (port 5000).
- **Configuration:**
  - Allows `config.FRONTEND_URL` and all `http://localhost:*` local development ports.
  - `credentials: true`.
  - Methods allowed: `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`.
  - Allowed headers: `Content-Type`, `Authorization`.
- **Why Required:** Browsers enforce CORS policies. Without explicit origin handling, frontend Axios requests are rejected by client browsers.
- **Errors Produced:** Rejects requests with preflight CORS errors if an unapproved external domain makes unauthorized cross-origin requests.

---

### 3. `morgan` — HTTP Request Logger
- **File Location:** Configured in [`server/src/app.js`](file:///d:/rankboard/server/src/app.js#L34-L37).
- **Type:** Global application middleware.
- **Purpose:** Logs every incoming HTTP request method, URL, status code, response time, and payload size.
- **Configuration:** Uses format `'dev'` in development and `'combined'` in production. Automatically disabled during test suites (`NODE_ENV === 'test'`).
- **Why Required:** Provides operational visibility and debugging traces in stdout during runtime.

---

### 4. `express.json` / `express.urlencoded` — Request Body Parsers
- **File Location:** Configured in [`server/src/app.js`](file:///d:/rankboard/server/src/app.js#L39-L41).
- **Type:** Global application middleware.
- **Purpose:** Parses incoming request bodies with JSON or URL-encoded payloads into `req.body`.
- **Configuration:** Configured with a `10mb` limit (`limit: '10mb'`).
- **Why Required:** Standard Express defaults to a 100KB limit. Large Excel imports containing hundreds of student rows exceed 100KB and would trigger HTTP 413 "Payload Too Large" without this expanded ceiling.
- **Errors Produced:** HTTP 413 if the payload exceeds 10MB; HTTP 400 if malformed JSON is transmitted.

---

### 5. `apiLimiter` — General API Rate Limiter
- **File Location:** Defined in [`server/src/middleware/rateLimiter.js`](file:///d:/rankboard/server/src/middleware/rateLimiter.js#L4-L23), registered in [`server/src/app.js`](file:///d:/rankboard/server/src/app.js#L44).
- **Type:** Global route-level middleware (`/api/*`).
- **Purpose:** Protects the API against DDoS, scraping bots, and brute-force traffic.
- **Configuration:**
  - Window: 15 minutes (`15 * 60 * 1000` ms).
  - Maximum requests: 3,000 per window in production; 10,000 in development.
  - Skip rule: Requests from localhost (`127.0.0.1`, `::1`) or during `NODE_ENV === 'development'` are exempt.
- **Response on Limit Exceeded:** HTTP 429:
  ```json
  {
    "success": false,
    "message": "Too many requests from this IP, please try again after 15 minutes"
  }
  ```

---

### 6. `syncLimiter` — Platform Synchronization Rate Limiter
- **File Location:** Defined in [`server/src/middleware/rateLimiter.js`](file:///d:/rankboard/server/src/middleware/rateLimiter.js#L26-L35), registered in [`server/src/routes/studentRoutes.js`](file:///d:/rankboard/server/src/routes/studentRoutes.js#L21).
- **Type:** Endpoint-specific middleware on `POST /api/student/platforms/sync`.
- **Purpose:** Prevents individual students or scripts from bombarding external coding APIs (LeetCode, GFG, HackerRank) with repeated manual sync requests.
- **Configuration:**
  - Window: 5 minutes (`5 * 60 * 1000` ms).
  - Maximum requests: 30 requests per window.
- **Response on Limit Exceeded:** HTTP 429:
  ```json
  {
    "success": false,
    "message": "Too many platform refresh requests. Please wait a few minutes before synchronizing again."
  }
  ```

---

### 7. `requireAuth` — Clerk Authentication Guard
- **File Location:** Defined in [`server/src/middleware/clerkAuth.js`](file:///d:/rankboard/server/src/middleware/clerkAuth.js).
- **Type:** Router-level middleware on `/api/student/*` and endpoint-specific on authenticated showcase routes.
- **Purpose:** Validates the user's Clerk session token and binds the corresponding Supabase student record.
- **Execution Order:** Executes immediately before protected controllers or schema validation.
- **Request Properties Read:** `req.headers.authorization`.
- **Request Properties Modified:**
  - `req.auth`: Populated with `{ userId, email, name, photo }`.
  - `req.student`: Populated with the full student object from Supabase (or fallback default structure).
- **Lifecycle & Linking:**
  1. Parses `Bearer <token>` from the `Authorization` header.
  2. Calls `verifyToken(token, { secretKey: config.CLERK_SECRET_KEY })` from `@clerk/backend`.
  3. Queries Supabase by `userId` or `userEmail`.
  4. If a student record was pre-imported by an admin with the same email, it links the Clerk `clerkUserId` to the existing student row.
  5. If the student does not exist, automatically creates an initial student record in Supabase and triggers an admin notification.
- **Errors Produced:**
  - HTTP 401: "Authentication required. No Bearer token provided."
  - HTTP 401: "Invalid or expired session token."
  - HTTP 500: "Clerk secret key is not configured on the backend server."

---

### 8. `requireAdmin` — Administrator Authorization Guard
- **File Location:** Defined in [`server/src/middleware/adminAuth.js`](file:///d:/rankboard/server/src/middleware/adminAuth.js).
- **Type:** Router-level middleware on `/api/admin/*`.
- **Purpose:** Enforces strict server-side Role-Based Access Control (RBAC) to ensure only authorized administrators can access admin APIs.
- **Request Properties Modified:**
  - `req.auth`: `{ userId, email, name }`.
  - `req.admin`: `{ userId, email, name, photo, role: 'SUPER_ADMIN' | 'ADMIN' }`.
- **Verification Strategy (Strict 4-Step Chain):**
  1. *Environment Whitelist:* Checks if the verified user email is listed in `ADMIN_EMAILS` (grants `SUPER_ADMIN`).
  2. *Supabase `admins` Table:* Queries the `admins` table by `userId` or `email`. If found and `status !== 'DISABLED'`, grants `admin.role`.
  3. *Student Document Check:* Queries the `students` table. If the student record has `role === 'ADMIN'`, grants access.
  4. *First Admin Bootstrap:* If `getAdminsCount() === 0` (clean database deployment), the first authenticated user is automatically initialized and persisted as a `SUPER_ADMIN`.
- **Errors Produced:**
  - HTTP 401: If token is missing, expired, or invalid.
  - HTTP 403: "Access denied. You do not possess administrator privileges for this portal."

---

### 9. `validateBody` — Request Payload Validation
- **File Location:** Defined in [`server/src/middleware/validate.js`](file:///d:/rankboard/server/src/middleware/validate.js).
- **Type:** Route-level middleware factory taking a Zod schema (`validateBody(schema)`).
- **Purpose:** Enforces request body structure, types, and constraints before reaching controllers.
- **Request Properties Modified:** Replaces `req.body` with the parsed and stripped output from `schema.parseAsync(req.body)`.
- **Errors Produced:** HTTP 400 with a detailed field-level error list:
  ```json
  {
    "success": false,
    "message": "Validation error in request payload.",
    "errors": [
      { "field": "email", "message": "Invalid email address format" }
    ]
  }
  ```

---

### 10. Multer Memory Upload Middleware
- **File Location:** Configured in [`server/src/routes/showcaseRoutes.js`](file:///d:/rankboard/server/src/routes/showcaseRoutes.js#L8-L18).
- **Type:** Endpoint-specific middleware on `POST /api/showcase/profile-image`.
- **Purpose:** Handles multipart form-data image uploads without storing unverified files on local server disk.
- **Configuration:**
  - Storage: `multer.memoryStorage()` (in-memory buffer).
  - File Size Limit: 5 Megabytes (`5 * 1024 * 1024`).
  - File Filter: Strictly checks `file.mimetype.startsWith('image/')`.
- **Request Properties Modified:** Injects `req.file` containing `{ buffer, mimetype, size }`.
- **Errors Produced:** HTTP 400 or HTTP 500 if the file exceeds 5MB or has an invalid MIME type.

---

### 11. `notFoundHandler` — 404 Route Interceptor
- **File Location:** Defined in [`server/src/middleware/errorHandler.js`](file:///d:/rankboard/server/src/middleware/errorHandler.js#L1-L6), registered in [`server/src/app.js`](file:///d:/rankboard/server/src/app.js#L61).
- **Type:** Global final route middleware.
- **Purpose:** Catches any HTTP request that does not match any registered API route.
- **Response:** HTTP 404:
  ```json
  {
    "success": false,
    "message": "API endpoint not found: GET /api/nonexistent"
  }
  ```

---

### 12. `errorHandler` — Centralized Error Handling Middleware
- **File Location:** Defined in [`server/src/middleware/errorHandler.js`](file:///d:/rankboard/server/src/middleware/errorHandler.js#L8-L19), registered in [`server/src/app.js`](file:///d:/rankboard/server/src/app.js#L62).
- **Type:** Global error-handling middleware (`(err, req, res, next)`).
- **Purpose:** Catches unhandled exceptions thrown by async route handlers and formats a consistent JSON error response.
- **Response:**
  ```json
  {
    "success": false,
    "message": "An unexpected internal server error occurred",
    "stack": "..." // Only present when NODE_ENV === 'development'
  }
  ```

---

## 3. End-to-End Middleware Chains for Critical Routes

### Scenario 1: Public Leaderboard (`GET /api/leaderboard`)
1. `helmet` -> Sets security headers.
2. `cors` -> Validates client origin.
3. `morgan` -> Logs request timestamp and method.
4. `apiLimiter` -> Verifies client IP rate limit.
5. `leaderboardController.getLeaderboard` -> Reads in-memory student cache and returns rankings.

### Scenario 2: Student Sync Request (`POST /api/student/platforms/sync`)
1. `helmet` -> Sets security headers.
2. `cors` -> Validates client origin.
3. `morgan` -> Logs request.
4. `express.json` -> Parses JSON body (up to 10MB).
5. `apiLimiter` -> Checks general IP rate limit.
6. `requireAuth` -> Validates Clerk session token; links student record in Supabase.
7. `syncLimiter` -> Verifies 5-minute sync rate limit.
8. `validateBody(platformUrlsSchema)` -> Validates platform URLs via Zod.
9. `platformController.saveAndSyncPlatforms` -> Executes multi-platform sync.

### Scenario 3: Admin Bulk Ingestion (`POST /api/admin/import/confirm`)
1. `helmet` -> Sets security headers.
2. `cors` -> Validates origin.
3. `express.json` -> Parses large array of records (10MB limit).
4. `apiLimiter` -> Checks general IP rate limit.
5. `requireAdmin` -> Verifies Clerk JWT, checks Supabase `admins` table / `ADMIN_EMAILS`, and attaches `req.admin`.
6. `adminController.confirmImport` -> Inserts students, platforms, and scores in chunks of 100-200. Logs audit record.

### Scenario 4: Profile Image Upload (`POST /api/showcase/profile-image`)
1. `helmet` -> Sets security headers.
2. `cors` -> Validates origin.
3. `requireAuth` -> Validates student Clerk JWT.
4. `upload.single('image')` -> Multer parses multipart stream into `req.file.buffer` (capped at 5MB).
5. `showcaseController.uploadProfileImage` -> Streams buffer to Cloudinary CDN with face detection cropping.
