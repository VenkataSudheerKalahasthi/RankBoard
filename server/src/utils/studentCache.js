const fs = require('fs');
const path = require('path');
const { getAllStudents, getStudentById } = require('../supabase/supabaseRepository');
const { getSupabase } = require('../supabase/supabaseClient');

// In-memory cache storage
let cachedStudentsList = [];
let cachedStudentsMap = new Map();
let lastFetchTimestamp = 0;
let inFlightFetchPromise = null;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL (reduces Supabase Egress)

// Memoized ranked leaderboard cache
let memoizedRankedLeaderboard = null;
let memoizedLeaderboardStats = null;
let memoizedPodium = null;
let memoizedTimestamp = 0;

/**
 * Fetch all students with caching directly from Supabase.
 * Uses single-flight promise pattern to eliminate cache stampedes (thundering herd)
 * when multiple requests arrive simultaneously.
 */
const getAllStudentsCached = async ({ forceRefresh = false } = {}) => {
  const isCacheFresh = cachedStudentsList.length > 0 && Date.now() - lastFetchTimestamp < CACHE_TTL_MS;

  if (!forceRefresh && isCacheFresh) {
    return cachedStudentsList;
  }

  // If a database query is already in-flight, return the existing promise
  if (inFlightFetchPromise) {
    return inFlightFetchPromise;
  }

  inFlightFetchPromise = (async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        return cachedStudentsList;
      }

      const students = await getAllStudents();
      const newMap = new Map();

      (students || []).forEach((data) => {
        newMap.set(data.id, data);
        if (data.clerkUserId) newMap.set(data.clerkUserId, data);
        if (data.email) newMap.set(data.email.toLowerCase(), data);
        if (data.rollNumber) newMap.set(data.rollNumber.toLowerCase(), data);
      });

      cachedStudentsList = students || [];
      cachedStudentsMap = newMap;
      lastFetchTimestamp = Date.now();

      return cachedStudentsList;
    } catch (error) {
      console.error('[StudentCache Fetch Error]:', error.message);
      return cachedStudentsList;
    } finally {
      inFlightFetchPromise = null;
    }
  })();

  return inFlightFetchPromise;
};

/**
 * Returns the count of active registered students instantly without full recomputation
 */
const getActiveStudentsCount = async () => {
  const students = await getAllStudentsCached();
  return (students || []).filter((s) => s.accountStatus === 'ACTIVE').length;
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
 * Retrieves memoized ranked leaderboard if fresh
 */
const getMemoizedLeaderboard = () => {
  const isFresh = memoizedRankedLeaderboard && (Date.now() - memoizedTimestamp < CACHE_TTL_MS);
  if (isFresh) {
    return {
      rankedLeaderboard: memoizedRankedLeaderboard,
      podium: memoizedPodium,
      stats: memoizedLeaderboardStats,
    };
  }
  return null;
};

/**
 * Stores memoized ranked leaderboard for instant retrieval
 */
const setMemoizedLeaderboard = (rankedLeaderboard, podium, stats) => {
  memoizedRankedLeaderboard = rankedLeaderboard;
  memoizedPodium = podium;
  memoizedLeaderboardStats = stats;
  memoizedTimestamp = Date.now();
};

/**
 * Invalidate in-memory cache when updates or syncs happen
 */
const invalidateStudentCache = () => {
  lastFetchTimestamp = 0;
  cachedStudentsList = [];
  cachedStudentsMap.clear();
  memoizedRankedLeaderboard = null;
  memoizedPodium = null;
  memoizedLeaderboardStats = null;
  memoizedTimestamp = 0;
};

module.exports = {
  getAllStudentsCached,
  getActiveStudentsCount,
  getStudentByIdCached,
  getMemoizedLeaderboard,
  setMemoizedLeaderboard,
  invalidateStudentCache,
};
