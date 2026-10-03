# DSA Rankboard — Student Portal & College Leaderboard

A full-stack, college-oriented competitive programming ranking platform that fetches student statistics across **LeetCode**, **GeeksforGeeks**, **Codeforces**, and **CodeChef**, calculates platform-weighted scores, and dynamically determines college-wide rankings.

---

## 🚀 Technology Stack

- **Frontend:** React.js, Vite, Tailwind CSS, React Router DOM, Axios, Lucide React
- **Authentication:** Clerk (`@clerk/clerk-react` + `@clerk/backend`)
- **Backend:** Node.js, Express.js, Zod, Helmet, CORS, Express Rate Limit
- **Database:** Firebase Firestore (managed securely via `firebase-admin` on the backend only)
- **Architecture:** Monorepo with isolated `client/` and `server/`

---

## 📁 Repository Structure

```text
rankboard/
├── client/                     # React + Vite Frontend
│   ├── src/
│   │   ├── components/         # Reusable UI, layout, leaderboard, and student components
│   │   ├── context/            # StudentContext with Clerk auth token binding
│   │   ├── pages/              # Dashboard, Profile, Platforms, Score, Rank, Leaderboard, etc.
│   │   ├── services/           # Axios API client, studentService, leaderboardService
│   │   ├── App.jsx             # React Router and protected routes
│   │   ├── main.jsx            # ClerkProvider and application entry point
│   │   └── index.css           # Tailwind CSS styles and custom design system
│   ├── package.json
│   └── .env.example
├── server/                     # Node.js + Express Backend
│   ├── src/
│   │   ├── config/             # Environment validation (Zod) and configuration
│   │   ├── controllers/        # Student, Platform Sync, and Leaderboard controllers
│   │   ├── firebase/           # Firebase Admin SDK initialization
│   │   ├── middleware/         # Clerk auth verification, rate limiting, error handlers
│   │   ├── routes/             # REST API endpoints
│   │   ├── services/
│   │   │   ├── platforms/      # Isolated scrapers & API fetchers (LeetCode, GFG, CF, CC)
│   │   │   ├── scoring/        # Modular score calculation engine (40-30-20-10 weights)
│   │   │   ├── ranking/        # College-aware dynamic ranking engine with tie-breakers
│   │   │   └── syncService.js  # Orchestrates stats fetch, score computation, and rank updates
│   │   ├── validators/         # Zod schemas for student profile and coding platform URLs
│   │   ├── app.js              # Express app configuration
│   │   └── server.js           # Server entry point
│   ├── package.json
│   └── .env.example
├── .env.example                # Combined environment template
└── README.md
```

---

## 🛠️ Step-by-Step Setup Guide

Follow these steps to set up and run the application locally.

### Step 1 — Install Dependencies

Open your terminal in the root `rankboard` folder and install dependencies for both the frontend and backend:

```bash
# 1. Install backend dependencies
cd server
npm install

# 2. Install frontend dependencies
cd ../client
npm install

# Return to root directory
cd ..
```

---

### Step 2 — Create and Configure Clerk Authentication

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/) and sign up or log in.
2. Click **"Add application"** (or **"Create application"**).
3. Name your application (e.g., `DSA Rankboard`).
4. Select the authentication options you wish to enable (e.g., **Email**, **Google**, **GitHub**).
5. Click **"Create application"**.
6. On the Quickstart / API Keys page, copy:
   - **Publishable Key** (starts with `pk_test_...`)
   - **Secret Key** (starts with `sk_test_...`)
7. Create your `.env` files:
   - In `client/.env`:
     ```env
     VITE_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_CLERK_PUBLISHABLE_KEY
     VITE_API_URL=http://localhost:5000/api
     ```
   - In `server/.env`:
     ```env
     CLERK_SECRET_KEY=sk_test_YOUR_CLERK_SECRET_KEY
     ```

---

### Step 3 — Create and Configure Firebase Firestore

1. Go to the [Firebase Console](https://console.firebase.google.com/) and click **"Add project"**.
2. Name your project (e.g., `dsa-rankboard`) and complete the creation steps (Google Analytics is optional).
3. In the left navigation menu, click **"Build"** → **"Firestore Database"**.
4. Click **"Create database"**, select a location (e.g., `nam5 (us-central)` or `asia-south1`), and start in **Production mode** (or Test mode).
5. Generate Firebase Admin credentials:
   - Click the ⚙️ **Gear icon** (Project Settings) next to Project Overview.
   - Go to the **"Service accounts"** tab.
   - Click **"Generate new private key"** and confirm. A `.json` file will download to your computer.
6. Open the downloaded JSON file and extract the following three values:
   - `project_id`
   - `client_email`
   - `private_key`
7. Add these to your `server/.env` file:
   ```env
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173
   COLLEGE_ID=COLLEGE_MAIN
   COLLEGE_NAME="Engineering College"

   # Clerk
   CLERK_SECRET_KEY=sk_test_YOUR_CLERK_SECRET_KEY

   # Firebase Admin SDK (Backend only)
   FIREBASE_PROJECT_ID=your-firebase-project-id
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-firebase-project-id.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
   ```

> ⚠️ **Note on `FIREBASE_PRIVATE_KEY`:** Ensure the private key is enclosed in quotes `"..."` and keeps the `\n` newline indicators. The server automatically normalizes escaped newlines.

---

### Step 4 — Start the Backend Server

In a terminal, start the Express backend:

```bash
cd server
npm run dev
```

The server will validate environment variables and start on `http://localhost:5000`. You should see:
```text
✓ Firebase Admin SDK initialized successfully with Firestore database.
✓ Server listening on http://localhost:5000
```

Verify backend health by opening `http://localhost:5000/api/health` in your browser.

---

### Step 5 — Start the Frontend Application

In another terminal, start the Vite development server:

```bash
cd client
npm run dev
```

The client will start on `http://localhost:5173`. Open it in your browser.

---

### Step 6 — Test Authentication (Register → Login → Logout)

1. Open `http://localhost:5173`.
2. Click **"Register as Student"** or **"Login"**.
3. Sign up with your email or Google OAuth via the Clerk modal.
4. Upon successful sign-in, you are automatically redirected to the **Student Dashboard** (`/student/dashboard`).
5. Test logging out using the avatar dropdown in the upper right corner to verify session termination.

---

### Step 7 — Test Firestore Persistence

1. When a student logs in, the backend's `clerkAuth` middleware automatically provisions a record in Firestore under `students/{clerkUserId}`.
2. Open the [Firebase Console](https://console.firebase.google.com/) → **Firestore Database**.
3. Confirm that a document exists in the `students` collection containing:
   - `clerkUserId`
   - `email`
   - `name`
   - `role: "STUDENT"`
   - `finalScore: 0`
   - `rank: null`

---

### Step 8 — Test Profile Synchronization & Ranking Flow

1. Go to **Student Profile** (`/student/profile`) or **Coding Platforms** (`/student/platforms`).
2. Enter your real public profile URLs:
   - **LeetCode:** `https://leetcode.com/u/your_username/`
   - **GeeksforGeeks:** `https://auth.geeksforgeeks.org/user/your_username/`
   - **Codeforces:** `https://codeforces.com/profile/your_username`
   - **CodeChef:** `https://www.codechef.com/users/your_username`
3. Click **"Save & Sync Statistics"**.
4. The backend will:
   - Validate URL formats using Zod.
   - Fetch actual problem counts and ratings via the platform services.
   - Calculate platform scores using the modular weighting engine:
     - LeetCode: **40%** (Easy 12%, Medium 16%, Hard 12%)
     - GeeksforGeeks: **30%**
     - Codeforces: **20%**
     - CodeChef: **10%**
   - Calculate the final composite score.
   - Update college rankings across all registered students.
5. Visit `/student/dashboard`, `/student/score`, and `/student/rank` to view your updated scores and percentile.
6. Visit `/leaderboard` (public, requires no login) to see your ranking on the college board.

---

## 🔒 Security & Architecture Highlights

- **Internal Scoring Privacy:** The composite scoring weights and internal evaluation formulas are processed exclusively on the backend. The student portal and public leaderboard expose only the single **Overall Score** and verified problem statistics, preventing reverse-engineering or biased platform gaming.
- **Zero Trust Authentication:** The backend never trusts student IDs or roles sent from the browser. It extracts the cryptographically verified `userId` directly from Clerk's session token.
- **Server-Only Database Credentials:** Firebase Admin SDK runs strictly on the Express backend. No database keys or secrets are exposed in the client bundle.
- **No Fake Stats:** If an external platform profile is unreachable or invalid, the system flags it as `FAILED` with retry capability rather than fabricating fake zeroes.
- **Dynamic Cohort Scaling:** The ranking engine calculates ranks across `N` dynamic students in the college without hardcoded student limits.
- **Modular Formulas:** Platform scoring algorithms are completely decoupled in `server/src/services/scoring/` so formulas can be adjusted independently at any time.

---

## 📄 License
MIT License. Built for collegiate competitive programming ecosystems.
