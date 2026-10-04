# DSA Rankboard — Student Portal & College Leaderboard

A full-stack, college-oriented competitive programming ranking platform that fetches student statistics across **LeetCode**, **GeeksforGeeks**, **Codeforces**, and **CodeChef**, calculates platform-weighted scores, and dynamically determines college-wide rankings.

---

## 🚀 Technology Stack

- **Student Frontend:** React.js, Vite, Tailwind CSS, React Router DOM, Axios, Lucide React (`client/`)
- **Admin Frontend:** React.js, Vite, Tailwind CSS, Lucide React, XLSX (`admin/`)
- **Authentication:** Clerk (`@clerk/clerk-react` + `@clerk/backend`)
- **Backend:** Node.js, Express.js, Zod, Helmet, CORS, Express Rate Limit (`server/`)
- **Database:** Supabase PostgreSQL (managed securely via `@supabase/supabase-js` on the backend only with RLS)
- **Realtime:** Supabase Realtime subscriptions on `students`, `scores`, and `admin_notifications`

---

## 📁 Repository Structure

```text
rankboard/
├── client/                     # Student Portal (React + Vite)
│   ├── src/
│   │   ├── components/         # UI, layout, leaderboard, and student components
│   │   ├── context/            # StudentContext with Clerk auth token binding
│   │   ├── pages/              # Dashboard, Profile, Platforms, Score, Rank, Leaderboard, etc.
│   │   ├── services/           # Axios API client, studentService, leaderboardService, supabase
│   │   ├── App.jsx             # React Router and protected routes
│   │   ├── main.jsx            # ClerkProvider and application entry point
│   │   └── index.css           # Tailwind CSS styles and custom design system
│   ├── package.json
│   └── .env.example
├── admin/                      # Admin Portal (React + Vite)
│   ├── src/
│   │   ├── components/         # Admin UI, tables, modals, cards
│   │   ├── context/            # AdminContext, NotificationContext
│   │   ├── pages/              # Dashboard, Students, Leaderboard, Bulk Import, Scoring, Settings, etc.
│   │   ├── services/           # Axios adminService, supabase realtime
│   │   └── App.jsx             # Admin router and authorization guards
│   ├── package.json
│   └── .env.example
├── server/                     # Node.js + Express Backend
│   ├── src/
│   │   ├── config/             # Environment validation and configuration
│   │   ├── controllers/        # Student, Admin, Platform Sync, and Leaderboard controllers
│   │   ├── supabase/           # Supabase client, schema.sql, and relational repository
│   │   ├── middleware/         # Clerk auth verification, admin authorization, rate limiting
│   │   ├── routes/             # REST API endpoints (/api/students, /api/admin, /api/leaderboard)
│   │   ├── services/
│   │   │   ├── platforms/      # Isolated scrapers & API fetchers (LeetCode, GFG, CF, CC)
│   │   │   ├── scoring/        # Modular score calculation engine (40-30-20-10 weights)
│   │   │   ├── ranking/        # College-aware dynamic ranking engine with tie-breakers
│   │   │   └── syncService.js  # Orchestrates stats fetch, score computation, and rank updates
│   │   ├── utils/              # Student cache, URL parsers, audit logger
│   │   ├── validators/         # Schemas for student profile and coding platform URLs
│   │   ├── app.js              # Express app configuration
│   │   └── server.js           # Server entry point
│   ├── scripts/
│   │   ├── migrateFirebaseToSupabase.js  # Idempotent migration runner
│   │   ├── inspectSupabase.js            # Data integrity and audit check
│   │   ├── bulkImportStudents.js         # Excel/CSV student batch importer
│   │   └── refreshAllStudents.js         # Live platform statistics synchronizer
│   ├── data/                   # Backups, sample student dataset (95 students)
│   ├── package.json
│   └── .env.example
└── README.md
```

---

## 🛠️ Step-by-Step Setup Guide

### Step 1 — Install Dependencies

Open your terminal in the root `rankboard` folder and install dependencies:

```bash
npm run install:all
```

---

### Step 2 — Configure Clerk Authentication

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/) and copy your **Publishable Key** and **Secret Key**.
2. Configure keys in `client/.env`, `admin/.env`, and `server/.env`.

---

### Step 3 — Configure Supabase PostgreSQL

1. Create a project on [Supabase](https://supabase.com/).
2. Open the **SQL Editor** in your Supabase Dashboard and run the schema script located at:
   `server/src/supabase/schema.sql`
3. Retrieve your project URL, anon key, and service role key:
   - Go to **Project Settings** → **API**.
   - Copy **Project URL**, **anon public key**, and **service_role secret key**.
4. Configure in `server/.env`:
   ```env
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173
   COLLEGE_ID=COLLEGE_MAIN
   COLLEGE_NAME="Engineering College"

   CLERK_SECRET_KEY=sk_test_...

   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   SUPABASE_ANON_KEY=your_anon_key
   ```
5. In `client/.env` and `admin/.env`:
   ```env
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
   VITE_API_BASE_URL=/api
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

---

### Step 4 — Run the Idempotent Migration

Run the migration script to populate Supabase with existing students, admins, and audit logs:

```bash
cd server
npm run migrate:supabase
```

Verify data integrity:

```bash
npm run inspect:supabase
```

---

### Step 5 — Run the Application

From the root directory:

```bash
npm run dev
```

- **Student Portal:** `http://localhost:5173`
- **Admin Portal:** `http://localhost:5174`
- **Backend API:** `http://localhost:5000`
