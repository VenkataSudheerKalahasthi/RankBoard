/**
 * Timezone and Date Utility for College DSA RankBoard
 * Enforces Asia/Kolkata timezone (UTC+05:30) for day boundaries, daily reports,
 * and period aggregations.
 */

const DEFAULT_TIMEZONE = 'Asia/Kolkata';
const KOLKATA_OFFSET_MS = (5 * 60 + 30) * 60 * 1000; // +05:30 in ms

/**
 * Formats a Date object or timestamp into YYYY-MM-DD in Asia/Kolkata timezone
 * @param {Date|string|number} dateInput 
 * @returns {string} e.g. "2026-10-11"
 */
function getKolkataDateString(dateInput = new Date()) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return null;

  try {
    // Format using Intl.DateTimeFormat in Asia/Kolkata
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: DEFAULT_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(d);
  } catch (e) {
    // Fallback: manual offset calculation
    const kolkataTime = new Date(d.getTime() + KOLKATA_OFFSET_MS);
    return kolkataTime.toISOString().split('T')[0];
  }
}

/**
 * Returns today's date string in Asia/Kolkata
 * @returns {string} "YYYY-MM-DD"
 */
function getKolkataTodayString() {
  return getKolkataDateString(new Date());
}

/**
 * Returns a date string N days ago in Asia/Kolkata
 * @param {number} daysAgo 
 * @returns {string} "YYYY-MM-DD"
 */
function getKolkataNDaysAgoString(daysAgo = 0) {
  const now = new Date();
  const past = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  return getKolkataDateString(past);
}

/**
 * Converts a YYYY-MM-DD string into start and end UTC timestamps for that Asia/Kolkata day
 * 
 * In Asia/Kolkata:
 * 00:00:00 IST = 18:30:00 UTC previous day
 * 23:59:59.999 IST = 18:29:59.999 UTC current day
 * 
 * @param {string} dateStr "YYYY-MM-DD"
 * @returns {{ startUtc: Date, endUtc: Date, dateStr: string }}
 */
function getKolkataDayBounds(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    dateStr = getKolkataTodayString();
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  // IST 00:00:00 is (UTC year, month-1, day, 0, 0, 0) minus 5h30m
  const startUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - KOLKATA_OFFSET_MS);
  const endUtc = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - KOLKATA_OFFSET_MS);

  return {
    startUtc,
    endUtc,
    dateStr,
  };
}

/**
 * Generates an inclusive array of YYYY-MM-DD date strings between start and end
 * @param {string} startDateStr "YYYY-MM-DD"
 * @param {string} endDateStr "YYYY-MM-DD"
 * @returns {string[]}
 */
function getDateRangeDays(startDateStr, endDateStr) {
  const days = [];
  if (!startDateStr || !endDateStr) return days;

  let current = new Date(startDateStr + 'T00:00:00Z');
  const end = new Date(endDateStr + 'T00:00:00Z');

  while (current <= end) {
    days.push(current.toISOString().split('T')[0]);
    current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
  }

  return days;
}

/**
 * Calculates calendar day difference between two timestamps in Asia/Kolkata
 * @param {Date|string} timeA 
 * @param {Date|string} timeB 
 * @returns {number}
 */
function getKolkataDaysBetween(timeA, timeB) {
  const strA = getKolkataDateString(timeA);
  const strB = getKolkataDateString(timeB);
  if (!strA || !strB) return 0;

  const dateA = new Date(strA + 'T00:00:00Z');
  const dateB = new Date(strB + 'T00:00:00Z');
  const diffMs = Math.abs(dateB.getTime() - dateA.getTime());
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

/**
 * Returns the start of the current month in Asia/Kolkata (YYYY-MM-01)
 * @returns {string}
 */
function getKolkataMonthStartString() {
  const today = getKolkataTodayString();
  const [year, month] = today.split('-');
  return `${year}-${month}-01`;
}

/**
 * Resolves period parameters into explicit start/end dates and baseline dates in Asia/Kolkata
 * Supports: 'today', '2d', '7d', '30d', 'month', 'custom'
 * 
 * @param {Object} params - { period, date, startDate, endDate }
 * @returns {{ periodType: string, startDate: string, endDate: string, startUtc: Date, endUtc: Date, baselineStartDate: string, daysCount: number, label: string }}
 */
function resolvePeriodBounds(params = {}) {
  const todayStr = getKolkataTodayString();
  const period = (params.period || '').toLowerCase().trim();

  let startDate = todayStr;
  let endDate = todayStr;
  let periodType = 'today';
  let label = "Today's Verified Activity";

  if (period === '2d' || period === '2-days' || period === 'last-2-days') {
    periodType = '2d';
    startDate = getKolkataNDaysAgoString(1);
    endDate = todayStr;
    label = 'Last 2 Days Activity';
  } else if (period === '7d' || period === '7-days' || period === 'last-7-days' || period === 'weekly') {
    periodType = '7d';
    startDate = getKolkataNDaysAgoString(6);
    endDate = todayStr;
    label = 'Last 7 Days Activity';
  } else if (period === '30d' || period === '30-days' || period === 'last-30-days' || period === 'monthly') {
    periodType = '30d';
    startDate = getKolkataNDaysAgoString(29);
    endDate = todayStr;
    label = 'Last 30 Days Activity';
  } else if (period === 'month' || period === 'this-month') {
    periodType = 'month';
    startDate = getKolkataMonthStartString();
    endDate = todayStr;
    label = 'This Month Activity';
  } else if (period === 'custom' || (params.startDate && params.endDate)) {
    periodType = 'custom';
    if (!params.startDate || !params.endDate) {
      throw new Error('Both start date and end date are required for custom date range.');
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(params.startDate) || !dateRegex.test(params.endDate)) {
      throw new Error('Dates must be in valid YYYY-MM-DD format.');
    }
    if (params.startDate > params.endDate) {
      throw new Error(`Start date (${params.startDate}) cannot be later than end date (${params.endDate}).`);
    }
    startDate = params.startDate;
    endDate = params.endDate;
    label = `Custom Range (${startDate} to ${endDate})`;
  } else if (params.date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(params.date)) {
      throw new Error('Date must be in valid YYYY-MM-DD format.');
    }
    periodType = 'single-date';
    startDate = params.date;
    endDate = params.date;
    label = `Activity on ${params.date}`;
  } else {
    periodType = 'today';
    startDate = todayStr;
    endDate = todayStr;
    label = "Today's Verified Activity";
  }

  // Calculate precise UTC bounds for Asia/Kolkata
  const { startUtc } = getKolkataDayBounds(startDate);
  const { endUtc } = getKolkataDayBounds(endDate);

  // Baseline start date: look back 1 day prior to startDate to capture any threshold snapshot recorded before midnight IST
  const startObj = new Date(startDate + 'T00:00:00Z');
  const baselineOffsetDays = 1;
  const baselineStartObj = new Date(startObj.getTime() - baselineOffsetDays * 24 * 60 * 60 * 1000);
  const baselineStartDate = getKolkataDateString(baselineStartObj) || startDate;

  const daysList = getDateRangeDays(startDate, endDate);

  return {
    periodType,
    startDate,
    endDate,
    startUtc,
    endUtc,
    baselineStartDate,
    daysCount: Math.max(1, daysList.length),
    label,
  };
}

module.exports = {
  DEFAULT_TIMEZONE,
  getKolkataDateString,
  getKolkataTodayString,
  getKolkataNDaysAgoString,
  getKolkataMonthStartString,
  getKolkataDayBounds,
  getDateRangeDays,
  getKolkataDaysBetween,
  resolvePeriodBounds,
};
