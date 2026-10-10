# Business Logic and Core Algorithms

## 1. Overview of Business Rules

DSA Rankboard implements five core algorithmic engines:
1. **Modular Platform Scoring Engine:** Applies institutional weights across coding platforms.
2. **Dynamic Ranking & Tie-Breaking Engine:** Computes official college-wide ranks with deterministic tie-breakers.
3. **Intelligent Platform Change Detection:** Prevents unnecessary database mutations by analyzing statistical diffs.
4. **Algorithmic Anomaly Detection Center:** Audits student rosters for duplicates, invalid URL patterns, and scoring discrepancies.
5. **AI Institutional Analytics & Heuristics:** Evaluates departmental coding velocity, placement risks, and talent outliers.

---

## 2. Modular Platform Scoring Engine

- **Source Files:** [`server/src/services/scoring/scoringConfig.js`](file:///d:/rankboard/server/src/services/scoring/scoringConfig.js) & [`server/src/services/scoring/scoringEngine.js`](file:///d:/rankboard/server/src/services/scoring/scoringEngine.js)
- **Business Purpose:** Normalizes raw problem counts from disparate platforms into a single unified academic score.

### A. Authoritative Platform Weight Allocations

| Platform | Institutional Weight | Scoring Role | Internal Difficulty Weights |
| :--- | :--- | :--- | :--- |
| **LeetCode** | **40% (0.40)** | Active Scoring | Easy: 30%, Medium: 40%, Hard: 30% |
| **GeeksforGeeks (GFG)** | **30% (0.30)** | Active Scoring | Easy: 30%, Medium: 40%, Hard: 30% (School & Basic: 0%) |
| **HackerRank** | **30% (0.30)** | Active Scoring | Problems: 1.0pt, Stars: 2.0pts, Badges: 5.0pts |
| **Codeforces** | **0% (0.00)** | Statistics Only | Problem counts and contest ratings tracked for display |
| **CodeChef** | **0% (0.00)** | Statistics Only | Problem counts tracked for display |

### B. Mathematical Formulas

#### 1. LeetCode Component:
$$\text{Score}_{\text{LC}} = (\text{Easy} \times 0.30) + (\text{Medium} \times 0.40) + (\text{Hard} \times 0.30)$$

#### 2. GeeksforGeeks Component:
$$\text{Score}_{\text{GFG}} = (\text{Easy} \times 0.30) + (\text{Medium} \times 0.40) + (\text{Hard} \times 0.30)$$
*Note: GFG School and Basic problems are displayed on student profiles but contribute 0% to the score.*

#### 3. HackerRank Component:
$$\text{Score}_{\text{HR}} = (\text{Solved} \times 1.0) + (\text{Stars} \times 2.0) + (\text{Badges} \times 5.0)$$

#### 4. Final Combined Institution Score:
$$\text{Final Score} = (\text{Score}_{\text{LC}} \times 0.40) + (\text{Score}_{\text{GFG}} \times 0.30) + (\text{Score}_{\text{HR}} \times 0.30)$$

All calculations are rounded to two decimal places:
```javascript
const finalScore = (leetcodeScore * 0.40) + (gfgScore * 0.30) + (hackerrankScore * 0.30);
return Math.round(finalScore * 100) / 100;
```

---

## 3. Dynamic College Ranking Engine

- **Source File:** [`server/src/services/ranking/rankingEngine.js`](file:///d:/rankboard/server/src/services/ranking/rankingEngine.js)
- **Business Purpose:** Computes integer ranks (1, 2, 3...) for all active students in a college without gaps.

### Deterministic Tie-Breaking Rules
When two or more students have the exact same `finalScore`, the engine resolves ties deterministically:
1. **Primary Key:** `finalScore DESC`
2. **Secondary Key (Tie-Breaker 1):** Combined total problems solved across all five platforms (`totalSolved DESC`):
   $$\text{Total Solved} = \text{LC}_{\text{solved}} + \text{GFG}_{\text{solved}} + \text{HR}_{\text{solved}} + \text{CF}_{\text{solved}} + \text{CC}_{\text{solved}}$$
3. **Tertiary Key (Tie-Breaker 2):** Student name in alphabetical order (`name ASC` via `localeCompare`).

### Database Optimization:
To minimize write traffic, the engine compares calculated ranks with current database values:
```javascript
for (let index = 0; index < allStudents.length; index++) {
  const currentRank = index + 1;
  if (student.rank !== currentRank) {
    await supabase.from('students').update({ rank: currentRank }).eq('id', student.id);
  }
}
```
If a student's position did not change, the update query is skipped. Once complete, `invalidateStudentCache()` is called.

---

## 4. Intelligent Platform Change Detection

- **Source File:** [`server/src/services/syncService.js`](file:///d:/rankboard/server/src/services/syncService.js#L51-L100)
- **Business Purpose:** External coding platform syncs run frequently (every 60-120 seconds). Most polls return identical problem counts. Writing identical records to PostgreSQL causes write amplification and unnecessary CDC WebSocket spam.
- **Algorithm:**
  1. Compares incoming stats against previously stored stats:
     - Core fields: `totalSolved`, `easySolved`, `mediumSolved`, `hardSolved`.
     - GFG fields: `schoolSolved`, `basicSolved`, `rating` (coding score).
     - Codeforces fields: `rating`.
  2. If any numerical field increased or decreased:
     - Constructs human-readable diff: `"LeetCode Easy: 140 → 142 (+2)"`.
     - Flags `hasChanged = true`.
  3. If `hasChanged === false` and `forceSync === false`:
     - Database update and leaderboard recalculation are bypassed.

---

## 5. Algorithmic Anomaly Detection Center

- **Source File:** [`server/src/controllers/adminController.js`](file:///d:/rankboard/server/src/controllers/adminController.js#L3010-L3235)
- **Business Purpose:** Scans the database for data corruption, fraudulent submissions, and statistical discrepancies.

### Detected Anomaly Categories:

| Category | Type | Severity | Description |
| :--- | :--- | :--- | :--- |
| **ACADEMIC_DATA** | `INVALID_ACADEMIC_YEAR` | Medium | Academic year value is outside the valid range (1–4). |
| **DUPLICATE_RECORD** | `DUPLICATE_EMAIL` | Critical | Two or more student records share the same email address. |
| **DUPLICATE_RECORD** | `DUPLICATE_ROLL_NUMBER` | High | Two or more student records share the same roll number. |
| **DUPLICATE_RECORD** | `DUPLICATE_HANDLE` | High | A coding platform handle (e.g., LeetCode `john_doe`) is linked to multiple student accounts. |
| **INVALID_URL** | `INVALID_PROFILE_URL` | High | Stored platform link does not match domain or format rules. |
| **SYNC_FAILURE** | `SYNC_FAILURE` | High/Med | External platform sync returned HTTP 404 (user not found) or failed scraper. |
| **MISSING_DATA** | `UNSYNCHRONIZED_PROFILE` | Low | Profile URL is linked, but platform stats have never been fetched. |
| **STATISTICS_INCONSISTENCY** | `DIFFICULTY_TOTAL_MISMATCH` | Medium | Sum of Easy + Medium + Hard exceeds the reported total solved count. |
| **SCORE_INCONSISTENCY** | `STORED_CALCULATED_MISMATCH` | Medium | Stored `final_score` differs by >0.05 from rule-calculated score. |

---

## 6. AI Institutional Analytics and Heuristics

- **Source File:** [`server/src/services/ai/insightsService.js`](file:///d:/rankboard/server/src/services/ai/insightsService.js)
- **Business Purpose:** Aggregates campus-wide coding data to guide academic leadership and placement training.
- **Cache Strategy:** Results are cached in memory for 3 minutes (`CACHE_TTL_MS = 180000`) and refreshed via `/api/admin/insights/refresh`.

### Key Analytical Heuristics:
1. **Branch Name Canonicalization (`normalizeBranch`):** Maps diverse department variations (e.g., `'CSDS'`, `'CS & DS'`, `'Computer Science & Data Science'`) into standardized academic departments.
2. **Department Performance Velocity:** Computes mean overall scores, median problems solved, and percentage of active coders per department.
3. **Placement Risk Detection:** Identifies 3rd and 4th-year students with low problem counts (<50 total solved) or inactive platform streaks.
4. **High-Potential Coding Outliers:** Identifies students in the top 10% across multiple platforms simultaneously, highlighting candidates for competitive programming representation.
5. **Platform Weakness Analysis:** Determines which platforms show low adoption across the institution (e.g., low Codeforces engagement) to recommend targeted campus workshops.
