const fs = require('fs');
const path = require('path');
const { getSupabase } = require('./supabaseClient');
const { getKolkataDateString, getKolkataTodayString } = require('../utils/timezoneUtils');

const DATA_DIR = path.join(__dirname, '../../data');
const SNAPSHOTS_FILE = path.join(DATA_DIR, 'activity_snapshots.json');
const ANOMALIES_FILE = path.join(DATA_DIR, 'activity_anomalies.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {}
}

// Memory caches / fallback store helpers
function readLocalJson(filePath, defaultVal = []) {
  try {
    if (!fs.existsSync(filePath)) return defaultVal;
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    return defaultVal;
  }
}

function writeLocalJson(filePath, data) {
  try {
    const tempPath = `${filePath}.tmp_${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
  } catch (e) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.warn(`[Local Fallback Warning] Failed to write ${filePath}:`, err.message);
    }
  }
}

let isSupabaseSnapshotsTableAvailable = null; // null = untested, true/false
let isSupabaseAnomaliesTableAvailable = null;

/**
 * Inserts a verified student activity snapshot
 * @param {Object} snapshot
 * @returns {Promise<Object>}
 */
async function insertActivitySnapshot(snapshot) {
  const supabase = getSupabase();
  const timestamp = snapshot.snapshotTimestamp || new Date().toISOString();
  const activityDate = snapshot.activityDate || getKolkataDateString(timestamp) || getKolkataTodayString();

  const record = {
    student_id: snapshot.studentId,
    platform: snapshot.platform.toLowerCase(),
    snapshot_timestamp: timestamp,
    activity_date: activityDate,
    total_solved: Number(snapshot.totalSolved || 0),
    easy_solved: Number(snapshot.easySolved || 0),
    medium_solved: Number(snapshot.mediumSolved || 0),
    hard_solved: Number(snapshot.hardSolved || 0),
    school_solved: Number(snapshot.schoolSolved || 0),
    basic_solved: Number(snapshot.basicSolved || 0),
    rating: snapshot.rating !== undefined && snapshot.rating !== null ? Number(snapshot.rating) : null,
    status: snapshot.status || 'SUCCESS',
    error_message: snapshot.errorMessage || null,
    raw_stats: snapshot.rawStats || {},
  };

  // 1. Try Supabase first if available
  if (supabase && isSupabaseSnapshotsTableAvailable !== false) {
    try {
      const { data, error } = await supabase
        .from('student_activity_snapshots')
        .insert(record)
        .select()
        .single();

      if (!error) {
        isSupabaseSnapshotsTableAvailable = true;
        return {
          id: data.id,
          studentId: data.student_id,
          platform: data.platform,
          snapshotTimestamp: data.snapshot_timestamp,
          activityDate: data.activity_date,
          totalSolved: data.total_solved,
          easySolved: data.easy_solved,
          mediumSolved: data.medium_solved,
          hardSolved: data.hard_solved,
          schoolSolved: data.school_solved,
          basicSolved: data.basic_solved,
          rating: data.rating,
          status: data.status,
          rawStats: data.raw_stats,
        };
      }

      if (error.code === 'PGRST205') {
        // Table not created in Supabase yet
        isSupabaseSnapshotsTableAvailable = false;
        console.info('[Activity Tracking Notice]: Supabase table "student_activity_snapshots" not found. Persisting in local fallback store.');
      } else if (error.code === '23505') {
        // Duplicate snapshot timestamp; ignore or return existing
        return { ...record, duplicate: true };
      } else {
        console.warn('[Activity Snapshot Supabase Error]:', error.message);
      }
    } catch (e) {
      console.warn('[Activity Snapshot Exception]:', e.message);
    }
  }

  // 2. Persistent fallback storage
  const localList = readLocalJson(SNAPSHOTS_FILE, []);
  // Deduplicate exact same student, platform and timestamp
  const exists = localList.some(
    (item) =>
      item.studentId === record.student_id &&
      item.platform === record.platform &&
      item.snapshotTimestamp === record.snapshot_timestamp
  );

  const fallbackRecord = {
    id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    studentId: record.student_id,
    platform: record.platform,
    snapshotTimestamp: record.snapshot_timestamp,
    activityDate: record.activity_date,
    totalSolved: record.total_solved,
    easySolved: record.easy_solved,
    mediumSolved: record.medium_solved,
    hardSolved: record.hard_solved,
    schoolSolved: record.school_solved,
    basicSolved: record.basic_solved,
    rating: record.rating,
    status: record.status,
    errorMessage: record.error_message,
    rawStats: record.raw_stats,
    createdAt: new Date().toISOString(),
  };

  if (!exists) {
    localList.push(fallbackRecord);
    writeLocalJson(SNAPSHOTS_FILE, localList);
  }

  return fallbackRecord;
}

/**
 * Gets snapshots for a specific student, optionally filtered by platform and date range
 */
async function getActivitySnapshots({ studentId, platform = null, startDate = null, endDate = null, limit = 500 }) {
  const supabase = getSupabase();

  if (supabase && isSupabaseSnapshotsTableAvailable !== false) {
    try {
      let query = supabase
        .from('student_activity_snapshots')
        .select('*')
        .order('snapshot_timestamp', { ascending: true });

      if (studentId) query = query.eq('student_id', studentId);
      if (platform) query = query.eq('platform', platform.toLowerCase());
      if (startDate) query = query.gte('activity_date', startDate);
      if (endDate) query = query.lte('activity_date', endDate);
      if (limit) query = query.limit(limit);

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        isSupabaseSnapshotsTableAvailable = true;
        return data.map((d) => ({
          id: d.id,
          studentId: d.student_id,
          platform: d.platform,
          snapshotTimestamp: d.snapshot_timestamp,
          activityDate: d.activity_date,
          totalSolved: d.total_solved,
          easySolved: d.easy_solved,
          mediumSolved: d.medium_solved,
          hardSolved: d.hard_solved,
          schoolSolved: d.school_solved,
          basicSolved: d.basic_solved,
          rating: d.rating,
          status: d.status,
          errorMessage: d.error_message,
          rawStats: d.raw_stats,
        }));
      }

      if (error?.code === 'PGRST205') {
        isSupabaseSnapshotsTableAvailable = false;
      }
    } catch (e) {
      console.warn('[getActivitySnapshots Supabase warning]:', e.message);
    }
  }

  // Fallback store
  const localList = readLocalJson(SNAPSHOTS_FILE, []);
  let filtered = localList;
  if (studentId) filtered = filtered.filter((s) => s.studentId === studentId);
  if (platform) filtered = filtered.filter((s) => s.platform === platform.toLowerCase());
  if (startDate) filtered = filtered.filter((s) => s.activityDate >= startDate);
  if (endDate) filtered = filtered.filter((s) => s.activityDate <= endDate);

  filtered.sort((a, b) => new Date(a.snapshotTimestamp) - new Date(b.snapshotTimestamp));
  if (limit) filtered = filtered.slice(-limit);

  return filtered;
}

/**
 * Returns all snapshots across all students in a date range
 */
async function getAllSnapshotsInDateRange(startDate, endDate) {
  const supabase = getSupabase();

  if (supabase && isSupabaseSnapshotsTableAvailable !== false) {
    try {
      let allRecords = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('student_activity_snapshots')
          .select('*')
          .order('snapshot_timestamp', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (startDate) query = query.gte('activity_date', startDate);
        if (endDate) query = query.lte('activity_date', endDate);

        const { data, error } = await query;
        if (error) {
          if (error.code === 'PGRST205') {
            isSupabaseSnapshotsTableAvailable = false;
          } else {
            console.warn('[getAllSnapshotsInDateRange Supabase warning]:', error.message);
          }
          break;
        }

        if (data && Array.isArray(data) && data.length > 0) {
          allRecords = allRecords.concat(data);
          if (data.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      if (allRecords.length > 0 || isSupabaseSnapshotsTableAvailable !== false) {
        if (allRecords.length > 0) isSupabaseSnapshotsTableAvailable = true;
        return allRecords.map((d) => ({
          id: d.id,
          studentId: d.student_id,
          platform: d.platform,
          snapshotTimestamp: d.snapshot_timestamp,
          activityDate: d.activity_date,
          totalSolved: d.total_solved,
          easySolved: d.easy_solved,
          mediumSolved: d.medium_solved,
          hardSolved: d.hard_solved,
          schoolSolved: d.school_solved,
          basicSolved: d.basic_solved,
          rating: d.rating,
          status: d.status,
          errorMessage: d.error_message,
          rawStats: d.raw_stats,
        }));
      }
    } catch (e) {
      console.warn('[getAllSnapshotsInDateRange Supabase exception]:', e.message);
    }
  }

  const localList = readLocalJson(SNAPSHOTS_FILE, []);
  let filtered = localList;
  if (startDate) filtered = filtered.filter((s) => s.activityDate >= startDate);
  if (endDate) filtered = filtered.filter((s) => s.activityDate <= endDate);
  filtered.sort((a, b) => new Date(a.snapshotTimestamp) - new Date(b.snapshotTimestamp));
  return filtered;
}

/**
 * Returns the most recent snapshot for a student on a platform before a given timestamp
 */
async function getLatestSnapshotBefore(studentId, platform, beforeTimestamp) {
  const supabase = getSupabase();

  if (supabase && isSupabaseSnapshotsTableAvailable !== false) {
    try {
      const { data, error } = await supabase
        .from('student_activity_snapshots')
        .select('*')
        .eq('student_id', studentId)
        .eq('platform', platform.toLowerCase())
        .lt('snapshot_timestamp', beforeTimestamp)
        .order('snapshot_timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          studentId: data.student_id,
          platform: data.platform,
          snapshotTimestamp: data.snapshot_timestamp,
          activityDate: data.activity_date,
          totalSolved: data.total_solved,
          easySolved: data.easy_solved,
          mediumSolved: data.medium_solved,
          hardSolved: data.hard_solved,
          schoolSolved: data.school_solved,
          basicSolved: data.basic_solved,
          rating: data.rating,
          status: data.status,
          rawStats: data.raw_stats,
        };
      }

      if (error?.code === 'PGRST205') {
        isSupabaseSnapshotsTableAvailable = false;
      }
    } catch (e) {}
  }

  const localList = readLocalJson(SNAPSHOTS_FILE, []);
  const beforeTime = new Date(beforeTimestamp).getTime();
  const matching = localList
    .filter(
      (s) =>
        s.studentId === studentId &&
        s.platform === platform.toLowerCase() &&
        new Date(s.snapshotTimestamp).getTime() < beforeTime
    )
    .sort((a, b) => new Date(b.snapshotTimestamp) - new Date(a.snapshotTimestamp));

  return matching[0] || null;
}

/**
 * Upserts an activity anomaly into the database or fallback store
 */
async function upsertActivityAnomaly(anomaly) {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  const record = {
    anomaly_key: anomaly.anomalyKey,
    student_id: anomaly.studentId,
    platform: anomaly.platform.toLowerCase(),
    activity_date: anomaly.activityDate,
    observed_count: Math.round(Number(anomaly.observedCount || 0)),
    baseline_count: Number(Number(anomaly.baselineCount || 0).toFixed(2)),
    absolute_increase: Math.round(Number(anomaly.absoluteIncrease || 0)),
    relative_increase_pct: anomaly.relativeIncreasePct !== null ? Number(anomaly.relativeIncreasePct) : null,
    rule_triggered: anomaly.ruleTriggered,
    detection_reason: anomaly.detectionReason,
    severity: anomaly.severity || 'MEDIUM',
    difficulty_breakdown: anomaly.difficultyBreakdown || {},
    data_confidence: anomaly.dataConfidence || 'HIGH',
    review_status: anomaly.reviewStatus || 'NEEDS_REVIEW',
    reviewed_by: anomaly.reviewedBy || null,
    reviewed_at: anomaly.reviewedAt || null,
    review_notes: anomaly.reviewNotes || null,
    metadata: anomaly.metadata || {},
    updated_at: now,
  };

  if (supabase && isSupabaseAnomaliesTableAvailable !== false) {
    try {
      const { data, error } = await supabase
        .from('activity_anomalies')
        .upsert(record, { onConflict: 'anomaly_key' })
        .select()
        .single();

      if (!error && data) {
        isSupabaseAnomaliesTableAvailable = true;
        return {
          id: data.id,
          anomalyKey: data.anomaly_key,
          studentId: data.student_id,
          platform: data.platform,
          activityDate: data.activity_date,
          observedCount: data.observed_count,
          baselineCount: data.baseline_count,
          absoluteIncrease: data.absolute_increase,
          relativeIncreasePct: data.relative_increase_pct,
          ruleTriggered: data.rule_triggered,
          detectionReason: data.detection_reason,
          severity: data.severity,
          difficultyBreakdown: data.difficulty_breakdown,
          dataConfidence: data.data_confidence,
          reviewStatus: data.review_status,
          reviewedBy: data.reviewed_by,
          reviewedAt: data.reviewed_at,
          reviewNotes: data.review_notes,
          metadata: data.metadata,
        };
      }

      if (error?.code === 'PGRST205') {
        isSupabaseAnomaliesTableAvailable = false;
        console.info('[Activity Tracking Notice]: Supabase table "activity_anomalies" not found. Persisting anomaly in local fallback store.');
      } else {
        console.warn('[Anomaly Upsert Supabase Error]:', error.message);
      }
    } catch (e) {
      console.warn('[Anomaly Upsert Exception]:', e.message);
    }
  }

  // Fallback store
  const localAnomalies = readLocalJson(ANOMALIES_FILE, []);
  const index = localAnomalies.findIndex((a) => a.anomalyKey === record.anomaly_key);

  const fallbackRecord = {
    id: index >= 0 ? localAnomalies[index].id : `anom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    anomalyKey: record.anomaly_key,
    studentId: record.student_id,
    platform: record.platform,
    activityDate: record.activity_date,
    observedCount: record.observed_count,
    baselineCount: record.baseline_count,
    absoluteIncrease: record.absolute_increase,
    relativeIncreasePct: record.relative_increase_pct,
    ruleTriggered: record.rule_triggered,
    detectionReason: record.detection_reason,
    severity: record.severity,
    difficultyBreakdown: record.difficulty_breakdown,
    dataConfidence: record.data_confidence,
    reviewStatus: record.review_status,
    reviewedBy: record.reviewed_by,
    reviewedAt: record.reviewed_at,
    reviewNotes: record.review_notes,
    metadata: record.metadata,
    createdAt: index >= 0 ? localAnomalies[index].createdAt : now,
    updatedAt: now,
  };

  if (index >= 0) {
    // Preserve review status if already reviewed
    if (['REVIEWED', 'DISMISSED'].includes(localAnomalies[index].reviewStatus) && record.review_status === 'NEEDS_REVIEW') {
      fallbackRecord.reviewStatus = localAnomalies[index].reviewStatus;
      fallbackRecord.reviewedBy = localAnomalies[index].reviewedBy;
      fallbackRecord.reviewedAt = localAnomalies[index].reviewedAt;
      fallbackRecord.reviewNotes = localAnomalies[index].reviewNotes;
    }
    localAnomalies[index] = fallbackRecord;
  } else {
    localAnomalies.push(fallbackRecord);
  }

  writeLocalJson(ANOMALIES_FILE, localAnomalies);
  return fallbackRecord;
}

/**
 * Returns anomalies with filtering, searching, and pagination
 */
async function getActivityAnomalies({ studentId = null, reviewStatus = 'ALL', severity = 'ALL', platform = 'ALL', search = '', limit = 50, page = 1 }) {
  const supabase = getSupabase();

  if (supabase && isSupabaseAnomaliesTableAvailable !== false) {
    try {
      let query = supabase.from('activity_anomalies').select('*', { count: 'exact' });

      if (studentId) query = query.eq('student_id', studentId);
      if (reviewStatus && reviewStatus !== 'ALL') query = query.eq('review_status', reviewStatus);
      if (severity && severity !== 'ALL') query = query.eq('severity', severity);
      if (platform && platform !== 'ALL') query = query.eq('platform', platform.toLowerCase());

      query = query.order('activity_date', { ascending: false }).order('created_at', { ascending: false });

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (!error && Array.isArray(data)) {
        isSupabaseAnomaliesTableAvailable = true;
        const anomalies = data.map((d) => ({
          id: d.id,
          anomalyKey: d.anomaly_key,
          studentId: d.student_id,
          platform: d.platform,
          activityDate: d.activity_date,
          observedCount: d.observed_count,
          baselineCount: d.baseline_count,
          absoluteIncrease: d.absolute_increase,
          relativeIncreasePct: d.relative_increase_pct,
          ruleTriggered: d.rule_triggered,
          detectionReason: d.detection_reason,
          severity: d.severity,
          difficultyBreakdown: d.difficulty_breakdown,
          dataConfidence: d.data_confidence,
          reviewStatus: d.review_status,
          reviewedBy: d.reviewed_by,
          reviewedAt: d.reviewed_at,
          reviewNotes: d.review_notes,
          metadata: d.metadata,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));

        return {
          anomalies,
          total: count || anomalies.length,
          page,
          limit,
        };
      }

      if (error?.code === 'PGRST205') {
        isSupabaseAnomaliesTableAvailable = false;
      }
    } catch (e) {}
  }

  // Fallback store
  const localList = readLocalJson(ANOMALIES_FILE, []);
  let filtered = localList;

  if (studentId) filtered = filtered.filter((a) => a.studentId === studentId);
  if (reviewStatus && reviewStatus !== 'ALL') filtered = filtered.filter((a) => a.reviewStatus === reviewStatus);
  if (severity && severity !== 'ALL') filtered = filtered.filter((a) => a.severity === severity);
  if (platform && platform !== 'ALL') filtered = filtered.filter((a) => a.platform === platform.toLowerCase());

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(
      (a) =>
        (a.detectionReason || '').toLowerCase().includes(q) ||
        (a.ruleTriggered || '').toLowerCase().includes(q) ||
        (a.platform || '').toLowerCase().includes(q) ||
        (a.studentId || '').toLowerCase().includes(q)
    );
  }

  filtered.sort((a, b) => new Date(b.activityDate || 0) - new Date(a.activityDate || 0));

  const total = filtered.length;
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  return {
    anomalies: paginated,
    total,
    page,
    limit,
  };
}

/**
 * Updates review status for an anomaly
 */
async function updateAnomalyReview({ id, reviewStatus, reviewedBy, reviewNotes = '' }) {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  if (supabase && isSupabaseAnomaliesTableAvailable !== false) {
    try {
      const { data, error } = await supabase
        .from('activity_anomalies')
        .update({
          review_status: reviewStatus,
          reviewed_by: reviewedBy,
          reviewed_at: now,
          review_notes: reviewNotes,
          updated_at: now,
        })
        .match(isNaN(Number(id)) ? { anomaly_key: id } : { id: Number(id) })
        .select()
        .single();

      if (!error && data) {
        return {
          id: data.id,
          reviewStatus: data.review_status,
          reviewedBy: data.reviewed_by,
          reviewedAt: data.reviewed_at,
          reviewNotes: data.review_notes,
        };
      }
    } catch (e) {}
  }

  // Fallback store
  const localList = readLocalJson(ANOMALIES_FILE, []);
  const item = localList.find((a) => String(a.id) === String(id) || a.anomalyKey === String(id));
  if (item) {
    item.reviewStatus = reviewStatus;
    item.reviewedBy = reviewedBy;
    item.reviewedAt = now;
    item.reviewNotes = reviewNotes;
    item.updatedAt = now;
    writeLocalJson(ANOMALIES_FILE, localList);
    return item;
  }

  return null;
}

/**
 * Checks if there are any historical activity snapshots recorded
 */
async function hasHistoricalData() {
  const supabase = getSupabase();
  if (supabase && isSupabaseSnapshotsTableAvailable !== false) {
    try {
      const { count, error } = await supabase
        .from('student_activity_snapshots')
        .select('*', { count: 'exact', head: true });
      if (!error && count !== null) return count > 0;
    } catch (e) {}
  }

  const local = readLocalJson(SNAPSHOTS_FILE, []);
  return local.length > 0;
}

module.exports = {
  insertActivitySnapshot,
  getActivitySnapshots,
  getAllSnapshotsInDateRange,
  getLatestSnapshotBefore,
  upsertActivityAnomaly,
  getActivityAnomalies,
  updateAnomalyReview,
  hasHistoricalData,
};
