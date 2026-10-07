const fs = require('fs');
const path = require('path');
const { getAllStudents, getStudentById } = require('../supabase/supabaseRepository');
const { getSupabase } = require('../supabase/supabaseClient');

// In-memory cache storage
let cachedStudentsList = [];
let cachedStudentsMap = new Map();
let lastFetchTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

/**
 * Fetch all students with caching directly from Supabase
 */
const getAllStudentsCached = async ({ forceRefresh = false } = {}) => {
  const isCacheFresh = cachedStudentsList.length > 0 && Date.now() - lastFetchTimestamp < CACHE_TTL_MS;

  if (!forceRefresh && isCacheFresh) {
    return cachedStudentsList;
  }

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
