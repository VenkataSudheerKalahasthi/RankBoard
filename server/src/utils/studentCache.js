const fs = require('fs');
const path = require('path');
const { getAllStudents, getStudentById } = require('../supabase/supabaseRepository');
const { getSupabase } = require('../supabase/supabaseClient');

// In-memory cache storage
let cachedStudentsList = [];
let cachedStudentsMap = new Map();
let lastFetchTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

// Load fallback sample data if database is cold-starting or offline
const loadFallbackSampleStudents = () => {
  try {
    const sampleFilePath = path.join(__dirname, '../../data/students_sample.json');
    if (fs.existsSync(sampleFilePath)) {
      const rawData = fs.readFileSync(sampleFilePath, 'utf8');
      const sampleList = JSON.parse(rawData);
      return sampleList.map((s, idx) => ({
        id: `sample_${idx + 1}`,
        name: s.name || 'Sample Student',
        email: s.email || '',
        rollNumber: s.rollNumber || `23491A0${idx + 10}`,
        department: s.department || 'PRIME',
        year: s.year || 4,
        rank: idx + 1,
        finalScore: Math.max(100, 1000 - idx * 10),
        accountStatus: 'ACTIVE',
        platforms: {
          leetcode: { profileUrl: s.leetcodeUrl || '', status: s.leetcodeUrl ? 'CONNECTED' : 'NOT_CONNECTED' },
          gfg: { profileUrl: s.gfgUrl || '', status: s.gfgUrl ? 'CONNECTED' : 'NOT_CONNECTED' },
          codeforces: { profileUrl: s.codeforcesUrl || '', status: s.codeforcesUrl ? 'CONNECTED' : 'NOT_CONNECTED' },
          codechef: { profileUrl: s.codechefUrl || '', status: s.codechefUrl ? 'CONNECTED' : 'NOT_CONNECTED' },
        },
        platformStats: {
          leetcode: { totalSolved: Math.floor(Math.random() * 200) + 50, rating: 1500 },
          gfg: { totalSolved: Math.floor(Math.random() * 100) + 20, rating: null },
          codeforces: { totalSolved: Math.floor(Math.random() * 50), rating: 1200 },
          codechef: { totalSolved: Math.floor(Math.random() * 80), rating: 1400 },
        },
        lastDataUpdatedAt: new Date().toISOString(),
      }));
    }
  } catch (err) {
    console.warn('[StudentCache] Could not load sample fallback data:', err.message);
  }
  return [];
};

/**
 * Fetch all students with smart caching & graceful fallback
 */
const getAllStudentsCached = async ({ forceRefresh = false } = {}) => {
  const isCacheFresh = cachedStudentsList.length > 0 && Date.now() - lastFetchTimestamp < CACHE_TTL_MS;

  if (!forceRefresh && isCacheFresh) {
    return cachedStudentsList;
  }

  try {
    const supabase = getSupabase();
    if (!supabase) {
      if (cachedStudentsList.length > 0) return cachedStudentsList;
      return loadFallbackSampleStudents();
    }

    const students = await getAllStudents();
    const newMap = new Map();

    students.forEach((data) => {
      newMap.set(data.id, data);
      if (data.clerkUserId) newMap.set(data.clerkUserId, data);
      if (data.email) newMap.set(data.email.toLowerCase(), data);
    });

    cachedStudentsList = students;
    cachedStudentsMap = newMap;
    lastFetchTimestamp = Date.now();

    return cachedStudentsList;
  } catch (error) {
    console.error('[StudentCache Fetch Error]:', error.message);

    // Return cached data if available
    if (cachedStudentsList.length > 0) {
      return cachedStudentsList;
    }

    // Otherwise load fallback sample students so the application does not break
    const fallback = loadFallbackSampleStudents();
    cachedStudentsList = fallback;
    return cachedStudentsList;
  }
};

/**
 * Get student by ID with caching & fallback
 */
const getStudentByIdCached = async (studentId) => {
  if (!studentId) return null;

  if (cachedStudentsMap.has(studentId)) {
    return cachedStudentsMap.get(studentId);
  }

  try {
    const data = await getStudentById(studentId);
    if (data) {
      cachedStudentsMap.set(data.id, data);
      if (data.clerkUserId) cachedStudentsMap.set(data.clerkUserId, data);
      if (data.email) cachedStudentsMap.set(data.email.toLowerCase(), data);
      return data;
    }
    return null;
  } catch (error) {
    console.error('[StudentCache Single Fetch Error]:', error.message);
    return cachedStudentsMap.get(studentId) || null;
  }
};

/**
 * Invalidate in-memory cache when updates or syncs happen
 */
const invalidateStudentCache = () => {
  lastFetchTimestamp = 0;
  cachedStudentsList = [];
  cachedStudentsMap.clear();
};

module.exports = {
  getAllStudentsCached,
  getStudentByIdCached,
  invalidateStudentCache,
};
