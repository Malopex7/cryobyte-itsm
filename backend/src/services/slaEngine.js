import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load SA public holidays database
const holidaysPath = path.join(__dirname, 'holidays.json');
let holidaySet = new Set();
try {
  const holidaysData = JSON.parse(fs.readFileSync(holidaysPath, 'utf8'));
  holidaySet = new Set(holidaysData.map(h => h.date));
} catch (err) {
  console.error('[SlaEngine] Failed to load holidays database:', err.message);
}

/**
 * Check if a date falls within South African Standard Time (SAST / UTC+2) business hours:
 * Mon-Fri, 08:00 to 17:00 (08:00 inclusive to 17:00 exclusive), excluding public holidays.
 */
export const isBusinessHourSast = (date) => {
  // SAST is UTC+2. Add 2 hours to the UTC timestamp to represent SAST Date in UTC methods
  const sastTime = new Date(date.getTime() + 2 * 60 * 60 * 1000);

  const day = sastTime.getUTCDay(); // 0 = Sunday, 6 = Saturday
  if (day === 0 || day === 6) return false;

  const hour = sastTime.getUTCHours();
  if (hour < 8 || hour >= 17) return false;

  // Format as YYYY-MM-DD to check against holidays.json
  const yearStr = sastTime.getUTCFullYear();
  const monthStr = String(sastTime.getUTCMonth() + 1).padStart(2, '0');
  const dayStr = String(sastTime.getUTCDate()).padStart(2, '0');
  const dateStr = `${yearStr}-${monthStr}-${dayStr}`;

  if (holidaySet.has(dateStr)) return false;

  return true;
};

/**
 * Adds N business minutes to a starting date, skipping non-business hours, weekends, and holidays.
 */
export const addBusinessMinutes = (startDate, minutesToAdd) => {
  const date = new Date(startDate);
  let remainingMinutes = minutesToAdd;

  // Loop minute by minute
  while (remainingMinutes > 0) {
    date.setMinutes(date.getMinutes() + 1);
    if (isBusinessHourSast(date)) {
      remainingMinutes--;
    }
  }

  return date;
};

/**
 * Calculate the acknowledgement and resolution target deadlines for a ticket.
 */
export const calculateSlaTargets = (priority, createdAtDate, clientSlaConfig = null) => {
  const createdAt = new Date(createdAtDate);

  // Standard SLA Durations (in minutes)
  const defaults = {
    P1: { ack: 15, resolve: 120 },      // 15 mins / 2 hours (Calendar clock)
    P2: { ack: 60, resolve: 480 },      // 60 mins / 8 hours (Business clock)
    P3: { ack: 120, resolve: 1440 },    // 2 hours / 24 hours (Business clock)
    P4: { ack: 240, resolve: 2880 }     // 4 hours / 48 hours (Business clock)
  };

  const pri = priority ? priority.toUpperCase() : 'P3';
  const limits = defaults[pri] || defaults.P3;

  // Resolve durations, supporting custom Client overrides
  const ackDuration = clientSlaConfig?.[pri.toLowerCase()]?.ackTarget ?? limits.ack;
  const resolveDuration = clientSlaConfig?.[pri.toLowerCase()]?.resolveTarget ?? limits.resolve;

  // P1 Tickets: 24/7/365 linear calendar clock
  if (pri === 'P1') {
    return {
      ackTarget: new Date(createdAt.getTime() + ackDuration * 60 * 1000),
      resolveTarget: new Date(createdAt.getTime() + resolveDuration * 60 * 1000)
    };
  }

  // P2-P4 Tickets: Business clock hours (08:00 - 17:00 SAST, skipping weekends & holidays)
  return {
    ackTarget: addBusinessMinutes(createdAt, ackDuration),
    resolveTarget: addBusinessMinutes(createdAt, resolveDuration)
  };
};

/**
 * Calculates the pause duration in minutes between pausedAt and resumeAt.
 * Handles linear elapsed time for P1, and business-only elapsed time for P2-P4.
 */
export const calculatePauseDelta = (priority, pausedAtDate, resumeAtDate) => {
  const pausedAt = new Date(pausedAtDate);
  const resumeAt = new Date(resumeAtDate);

  if (resumeAt <= pausedAt) return 0;

  const pri = priority ? priority.toUpperCase() : 'P3';

  // P1 Tickets: linear calendar clock pause duration
  if (pri === 'P1') {
    const diffMs = resumeAt.getTime() - pausedAt.getTime();
    return Math.max(0, Math.round(diffMs / (60 * 1000)));
  }

  // P2-P4 Tickets: business clock pause duration (only counts minutes spent within business hours)
  let current = new Date(pausedAt);
  let businessMinutes = 0;

  while (current < resumeAt) {
    if (isBusinessHourSast(current)) {
      businessMinutes++;
    }
    current.setMinutes(current.getMinutes() + 1);
  }

  return businessMinutes;
};
