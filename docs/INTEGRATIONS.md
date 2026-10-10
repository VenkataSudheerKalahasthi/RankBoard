# External Integrations and Third-Party Services

## 1. Integrations Topology

DSA Rankboard interfaces with seven external systems across competitive programming platforms, authentication infrastructure, and media CDNs:

```mermaid
graph TD
    Server["DSA Rankboard Backend (server/)"]

    subgraph AuthAndMedia["Core Infrastructure"]
        Clerk["Clerk Authentication API<br/>(JWT Claims & User Directory)"]
        Cloudinary["Cloudinary CDN<br/>(Profile Image Optimization)"]
    end

    subgraph CompetitivePlatforms["Coding Platform Ecosystem"]
        LC["LeetCode<br/>(Public GraphQL API)"]
        GFG["GeeksforGeeks<br/>(Practice API & Scraper Queue)"]
        HR["HackerRank<br/>(Public REST Endpoints)"]
        CF["Codeforces<br/>(Official REST API)"]
        CC["CodeChef<br/>(HTTP Scraper + Backoff Queue)"]
    end

    Server -->|Bearer Token Verification| Clerk
    Server -->|Multipart Image Stream| Cloudinary
    Server -->|POST https://leetcode.com/graphql| LC
    Server -->|POST /api/v1/user/problems/submissions/| GFG
    Server -->|GET /rest/hackers/:user/profile| HR
    Server -->|GET /api/user.info?handles=...| CF
    Server -->|GET /users/:handle (HTML Scraping)| CC
```

---

## 2. LeetCode Integration

- **File Location:** [`server/src/services/platforms/leetcodeService.js`](file:///d:/rankboard/server/src/services/platforms/leetcodeService.js)
- **Primary Mechanism:** Public GraphQL endpoint (`https://leetcode.com/graphql`).
- **HTTP Client:** Axios with custom `User-Agent` and `Referer` headers.
- **Authentication:** Unauthenticated public query.
- **GraphQL Operations:**
  - Query: `getUserProfile($username: String!)`
  - Fetches: `submitStatsGlobal.acSubmissionNum` (Easy, Medium, Hard, All), `profile.ranking`, `userCalendar.streak`, `userContestRanking.rating`.
- **Error Handling & Edge Cases:**
  - If `data.matchedUser` is null, returns `status = 'FAILED'` with `"User not found on LeetCode"`.
  - Timeout: 10,000ms.
- **Data Stored:**
  - Easy, Medium, Hard problem counts.
  - Contest rating and ranking.
  - Active streak days.
- **Operational Status:** Live, verified against production LeetCode infrastructure.

---

## 3. GeeksforGeeks (GFG) Integration

- **File Location:** [`server/src/services/platforms/gfgService.js`](file:///d:/rankboard/server/src/services/platforms/gfgService.js)
- **Primary Mechanism:** Dual-source extraction:
  1. Authoritative Submissions API: `POST https://practiceapi.geeksforgeeks.org/api/v1/user/problems/submissions/`
  2. Fallback Profile Scraper: `GET https://www.geeksforgeeks.org/user/:username/`
- **Rate-Limiting & Cooldown Protection:**
  - **Sequential Request Queue:** Employs an in-memory queue (`gfgRequestQueue`) and in-flight deduplication map (`gfgInFlightRequests`).
  - **Throttling Delay:** Enforces `GFG_MIN_REQUEST_DELAY_MS` (default 1,200ms) between consecutive requests.
  - **Cooldown on 429/Timeout:** If GFG returns HTTP 429 or times out, activates an automatic 60-second cooldown (`triggerGFGCooldown`). While in cooldown, requests resolve immediately with `status = 'RATE_LIMITED'`.
- **Data Stored:**
  - Problem counts across all five tiers: School, Basic, Easy, Medium, Hard.
  - GFG Coding Score (`rating`).
- **Scoring Guard:** In [`scoringEngine.js`](file:///d:/rankboard/server/src/services/scoring/scoringEngine.js), School and Basic problem counts are strictly excluded from score calculations (0% weight).
- **Operational Status:** Live, verified with edge-case regression suites.

---

## 4. HackerRank Integration

- **File Location:** [`server/src/services/platforms/hackerrankService.js`](file:///d:/rankboard/server/src/services/platforms/hackerrankService.js)
- **Primary Mechanism:** Public REST API endpoints:
  - User verification: `GET https://www.hackerrank.com/rest/hackers/:username/profile`
  - Badges & Stars: `GET https://www.hackerrank.com/rest/hackers/:username/badges`
  - Contest Scores: `GET https://www.hackerrank.com/rest/hackers/:username/scores_elo`
- **Authentication:** Unauthenticated public requests with browser-mimicking headers.
- **Error Handling:** Returns `status = 'INVALID_URL'` if the handle cannot be parsed; handles HTTP 429 rate limits.
- **Data Stored:**
  - Total solved count, badges, stars, rating.
- **Operational Status:** Live, verified.

---

## 5. Codeforces Integration

- **File Location:** [`server/src/services/platforms/codeforcesService.js`](file:///d:/rankboard/server/src/services/platforms/codeforcesService.js)
- **Primary Mechanism:** Official Codeforces REST API v2:
  - User Info: `GET https://codeforces.com/api/user.info?handles=:username`
  - Submissions / Solved Count: `GET https://codeforces.com/api/user.status?handle=:username&from=1&count=1000`
- **Deduplication Logic:** Problems can have multiple accepted verdicts. The service filters submissions with `verdict === 'OK'` and deduplicates by `contestId + index` to compute true unique solved problems.
- **Data Stored:**
  - Unique solved count, current contest rating, max rating, competitive rank title (e.g. "Candidate Master").
- **Scoring Role:** Tracked and displayed on student profiles; contributes 0% to the ranking score.
- **Operational Status:** Live, verified.

---

## 6. CodeChef Integration

- **File Location:** [`server/src/services/platforms/codechefService.js`](file:///d:/rankboard/server/src/services/platforms/codechefService.js)
- **Primary Mechanism:** HTML Web Scraper: `GET https://www.codechef.com/users/:username`
- **Anti-Scraping Defenses & Resiliency Engine:**
  - **User-Agent Rotation:** Cycles across modern Windows/macOS Chrome and Safari user-agent strings.
  - **In-Memory Sequential Queue:** Enforces strict serial processing with minimum delay (`CODECHEF_MIN_REQUEST_DELAY_MS = 2500ms`).
  - **Exponential Backoff:** On HTTP 429 or Cloudflare challenges, initializes backoff at 30 seconds (`INITIAL_BACKOFF_MS`) and doubles up to 300 seconds (`MAX_BACKOFF_MS`).
  - **Telemetry Tracker:** Records request metrics (`codechefMetrics`) inspecting total requests, successes, rate-limit hits, and cache hits.
- **Data Stored:**
  - Total problems solved, global rank, star rating.
- **Scoring Role:** Statistics-only (0% score weight).
- **Operational Status:** Live, verified.

---

## 7. Clerk Authentication Service

- **SDKs:** `@clerk/clerk-react` on frontends; `@clerk/backend` on backend.
- **Configuration Keys:**
  - `CLERK_PUBLISHABLE_KEY` (client & admin).
  - `CLERK_SECRET_KEY` (backend server).
- **Responsibilities:**
  - Handles user registration, Google OAuth, email verification, password resets, and session cookie generation.
  - Generates signed JWTs that are sent in the `Authorization: Bearer` header.
  - Backend verifies JWT signatures locally using Clerk public keys, minimizing external network calls.
- **Operational Status:** Live, verified.

---

## 8. Cloudinary Image CDN Integration

- **File Location:** [`server/src/services/cloudinaryService.js`](file:///d:/rankboard/server/src/services/cloudinaryService.js)
- **SDK:** `cloudinary` npm package (v2.11.0).
- **Configuration Variables:**
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
- **Transformation Pipeline:**
  - Destination Folder: `rankboard/profiles`
  - Geometry: `500x500` square.
  - Crop Mode: `fill` with `gravity: 'face'` (automatically centers on the student's face).
  - Format & Quality: `fetch_format: 'auto'`, `quality: 'auto'` (serves modern WebP/AVIF where supported).
- **Graceful Fallback:** If Cloudinary credentials are not configured in `.env`, the service automatically encodes profile images as base64 Data URIs (`data:image/jpeg;base64,...`) and stores them directly in the database.
- **Operational Status:** Live, verified.
