// Shared Gmail booking parsing logic.
// This file is the source of truth — supabase/functions/_shared/gmailParsing.ts is an identical copy.

export const APPROVED_SENDERS = [
  "team@info.classpass.com",
  "hello@barrysbootcamp.sg",
  "no-reply@classpass.com",
  "noreply@classpass.com",
  "bookings@classpass.com",
];

// Domain patterns for approved fitness senders
const APPROVED_DOMAINS = ["classpass.com", "barrysbootcamp.sg", "barrys.com"];

export function extractEmail(from: string): string {
  const match = from.match(/<([^>]+)>/) || from.match(/([^\s<>]+@[^\s<>]+)/);
  return match ? match[1].toLowerCase().trim() : from.toLowerCase().trim();
}

export function shouldProcess(from: string, subject: string): boolean {
  const email = extractEmail(from);
  if (APPROVED_SENDERS.includes(email)) return true;
  // Domain-level matching (catches no-reply@classpass.com etc.)
  if (APPROVED_DOMAINS.some((d) => email.endsWith("@" + d) || email.endsWith("." + d))) return true;
  // Barry's sends via ZingFit — match on display name containing barrysbootcamp.sg
  if (from.toLowerCase().includes("barrysbootcamp.sg") || from.toLowerCase().includes("barry")) return true;
  return /\b(reservation confirmed|booking confirmed|you'?re booked|class confirmation|booked for)\b/i.test(subject);
}

export type WorkoutType =
  | "hiit" | "cycling" | "yoga" | "pilates" | "strength"
  | "bootcamp" | "barre" | "boxing" | "running" | "swimming" | "other";

const TYPE_PATTERNS: [WorkoutType, RegExp][] = [
  ["hiit",      /\bhiit\b|barry'?s\b|barrys\b|f45\b|orange\s*theory/i],
  ["cycling",   /\bcycl(ing|e)\b|spin\b|rpm\b|soul\s*cycle/i],
  ["yoga",      /\byoga\b|vinyasa|hatha|\byin\b/i],
  ["pilates",   /\bpilates\b|reformer/i],
  ["barre",     /\bbarre\b|ballet\s*fit/i],
  ["boxing",    /\bboxing\b|muay\s*thai|kickbox/i],
  ["bootcamp",  /\bbootcamp\b|boot\s*camp\b|crossfit/i],
  ["strength",  /\bstrength\b|weight\s*training|powerlifting/i],
  ["running",   /\brunning\b|treadmill/i],
  ["swimming",  /\bswimming\b|aqua\s*fit/i],
];

export function classifyWorkoutType(text: string): WorkoutType {
  for (const [type, pattern] of TYPE_PATTERNS) {
    if (pattern.test(text)) return type;
  }
  return "other";
}

const MET: Record<WorkoutType, number> = {
  hiit: 8.0, cycling: 7.5, yoga: 3.0, pilates: 4.0, barre: 4.0,
  boxing: 9.0, bootcamp: 8.0, strength: 5.0, running: 9.0, swimming: 7.0, other: 5.0,
};

export function estimateCalories(type: WorkoutType, durationMinutes: number, weightKg = 70): number {
  return Math.round(MET[type] * weightKg * (durationMinutes / 60));
}

export function buildFingerprint(className: string, studio: string, date: string, startTime: string): string {
  return [className, studio, date, startTime]
    .map((s) => s.toLowerCase().replace(/\s+/g, " ").trim())
    .join("|");
}

// ── Time / Date parsing ──────────────────────────────────────────────────────

export function parseTime(s: string): string | null {
  s = s.trim();
  // "9:00 AM" / "9:00am"
  const m12 = s.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (m12) {
    let h = parseInt(m12[1]);
    const min = m12[2], mer = m12[3].toLowerCase();
    if (mer === "pm" && h !== 12) h += 12;
    if (mer === "am" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${min}`;
  }
  // "9am" / "9pm"
  const m12s = s.match(/^(\d{1,2})\s*(am|pm)$/i);
  if (m12s) {
    let h = parseInt(m12s[1]);
    const mer = m12s[2].toLowerCase();
    if (mer === "pm" && h !== 12) h += 12;
    if (mer === "am" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:00`;
  }
  // "09:00"
  const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) return `${String(parseInt(m24[1])).padStart(2, "0")}:${m24[2]}`;
  return null;
}

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8,
  sep: 9, oct: 10, nov: 11, dec: 12,
};

export function parseDate(s: string): string | null {
  s = s.trim();
  // "Thursday, March 6, 2026" / "March 6, 2026"
  const mLong = s.match(/(?:\w+,\s*)?(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})/i);
  if (mLong) {
    const mo = MONTHS[mLong[1].toLowerCase()];
    if (mo) return fmt(parseInt(mLong[3]), mo, parseInt(mLong[2]));
  }
  // "6 March 2026" / "6th March 2026"
  const mDay = s.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)\s+(\d{4})/i);
  if (mDay) {
    const mo = MONTHS[mDay[2].toLowerCase()];
    if (mo) return fmt(parseInt(mDay[3]), mo, parseInt(mDay[1]));
  }
  // "March 6" (no year — assume current year)
  const mNoYear = s.match(/^(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?$/i);
  if (mNoYear) {
    const mo = MONTHS[mNoYear[1].toLowerCase()];
    if (mo) return fmt(new Date().getFullYear(), mo, parseInt(mNoYear[2]));
  }
  return null;
}

function fmt(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function durationBetween(start: string, end: string | null): number {
  if (!end) return 60;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diff = eh * 60 + em - (sh * 60 + sm);
  return diff > 0 ? diff : 60;
}

// ── Email-specific parsers ───────────────────────────────────────────────────

export interface ParsedBooking {
  className: string;
  studio: string;
  date: string;         // YYYY-MM-DD
  startTime: string;    // HH:MM (24h)
  endTime: string | null;
  durationMinutes: number;
  workoutType: WorkoutType;
  caloriesBurned: number;
  fingerprint: string;
}

type Partial_ = Omit<ParsedBooking, "workoutType" | "caloriesBurned" | "fingerprint">;

/** Strip HTML tags to plain text */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

/** Decode base64url (Gmail API uses base64url encoding) */
export function decodeBase64(s: string): string {
  // base64url → base64
  const base64 = s.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return atob(base64);
  } catch {
    return "";
  }
}

export function parseClassPassEmail(subject: string, body: string): Partial_ | null {
  // Strategy 1: "Day, Month Date, Year • StartTime - EndTime" pattern (most reliable)
  const dtPattern = body.match(
    /([A-Za-z]+day,?\s+[A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})\s*[•·|]\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*[-–]\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i
  );
  if (dtPattern) {
    const date = parseDate(dtPattern[1]);
    const startTime = parseTime(dtPattern[2]);
    const endTime = parseTime(dtPattern[3]);
    if (date && startTime) {
      const className = extractClassNameFromBody(body, subject) || "Fitness Class";
      const studio = extractStudioFromSubjectOrBody(subject, body) || "ClassPass Studio";
      return { className, studio, date, startTime, endTime, durationMinutes: durationBetween(startTime, endTime) };
    }
  }

  // Strategy 2: Date on one line, time range on next/nearby line
  const dateMatch = body.match(/([A-Za-z]+day,?\s+[A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/i)
    || body.match(/([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/i);
  const timeRangeMatch = body.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s*[-–to]+\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i)
    || body.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
  if (dateMatch && timeRangeMatch) {
    const date = parseDate(dateMatch[1]);
    const startTime = parseTime(timeRangeMatch[1]);
    const endTime = timeRangeMatch[2] ? parseTime(timeRangeMatch[2]) : null;
    if (date && startTime) {
      const className = extractClassNameFromBody(body, subject) || "Fitness Class";
      const studio = extractStudioFromSubjectOrBody(subject, body) || "ClassPass Studio";
      return { className, studio, date, startTime, endTime, durationMinutes: durationBetween(startTime, endTime) };
    }
  }

  // Strategy 3: labeled fields
  const rawDate = extractLabeledField(body, "date");
  const date = rawDate ? parseDate(rawDate) : null;
  const timeField = extractLabeledField(body, "time");
  if (date && timeField) {
    const timeParts = timeField.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*[-–]\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
    const startTime = timeParts ? parseTime(timeParts[1]) : parseTime(timeField);
    const endTime = timeParts ? parseTime(timeParts[2]) : null;
    if (!startTime) return null;
    const className = extractLabeledField(body, "class") || extractClassNameFromBody(body, subject) || "Fitness Class";
    const studio = extractLabeledField(body, "studio") || extractStudioFromSubjectOrBody(subject, body) || "ClassPass Studio";
    return { className, studio, date, startTime, endTime, durationMinutes: durationBetween(startTime, endTime) };
  }

  return null;
}

export function parseBarrysEmail(subject: string, body: string): Partial_ | null {
  const studio = "Barry's Bootcamp";

  const className = extractLabeledField(body, "class")
    || extractLabeledField(body, "session")
    || matchFirst(body, /Barry'?s\s+([A-Za-z\s]+?)(?:\s+at\s+|\s+on\s+|\s*\n)/i)
    || "Barry's";

  const rawDate = extractLabeledField(body, "date")
    || extractLabeledField(body, "when")
    || matchFirst(body, /([A-Za-z]+day,?\s+[A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/i)
    || matchFirst(body, /([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/i)
    || matchFirst(body, /(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i);

  const rawTime = extractLabeledField(body, "time")
    || extractLabeledField(body, "start")
    || matchFirst(body, /(\d{1,2}:\d{2}\s*(?:AM|PM)\s*[-–]\s*\d{1,2}:\d{2}\s*(?:AM|PM))/i)
    || matchFirst(body, /(\d{1,2}:\d{2}\s*(?:AM|PM))/i);

  if (!rawDate || !rawTime) return null;

  const date = parseDate(rawDate.trim());
  if (!date) return null;

  const timeParts = rawTime.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*[-–]\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
  const startTime = timeParts ? parseTime(timeParts[1]) : parseTime(rawTime.trim());
  const endTime = timeParts ? parseTime(timeParts[2]) : null;
  if (!startTime) return null;

  return { className, studio, date, startTime, endTime, durationMinutes: durationBetween(startTime, endTime) };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractLabeledField(body: string, label: string): string | null {
  // Require a colon so "ClassPass" is never matched by label "class"
  const re = new RegExp(`\\b${label}\\s*:\\s*([^\\n\\r]{2,80})`, "i");
  const m = body.match(re);
  return m ? m[1].trim() : null;
}

function matchFirst(body: string, re: RegExp): string | null {
  const m = body.match(re);
  return m ? (m[1] || m[0]).trim() : null;
}

function extractClassNameFromBody(body: string, subject: string): string | null {
  // Require a colon to avoid matching "ClassPass" as a label
  const m = body.match(/\bclass(?:\s*name)?\s*:\s*([^\n\r]{2,80})/i);
  if (m) return m[1].trim();
  // From subject: "confirmed for X at Studio"
  const subj = subject.match(/(?:confirmed for|booked for|booking for)\s+(.+?)\s+(?:at|@)\s+/i);
  if (subj) return subj[1].trim();
  return null;
}

function extractStudioFromSubjectOrBody(subject: string, body: string): string | null {
  // Subject: "... at Studio!"
  const subj = subject.match(/\bat\s+([^!,@]+?)(?:\s*!|$)/i);
  if (subj) return subj[1].trim();
  const labeled = extractLabeledField(body, "studio(?:\\s*name)?");
  if (labeled) return labeled;
  const loc = extractLabeledField(body, "location");
  if (loc) return loc;
  return null;
}

// ── Main entry point ─────────────────────────────────────────────────────────

export function parseBooking(from: string, subject: string, bodyText: string): ParsedBooking | null {
  const sender = extractEmail(from);
  let partial: Partial_ | null = null;

  if (sender === "team@info.classpass.com") {
    partial = parseClassPassEmail(subject, bodyText);
  } else if (sender === "hello@barrysbootcamp.sg" || from.toLowerCase().includes("barrysbootcamp.sg")) {
    partial = parseBarrysEmail(subject, bodyText);
  } else {
    // Subject-matched email: try both parsers
    partial = parseClassPassEmail(subject, bodyText) ?? parseBarrysEmail(subject, bodyText);
  }

  if (!partial) return null;

  const typeText = `${partial.className} ${partial.studio} ${subject}`;
  const workoutType = classifyWorkoutType(typeText);
  const caloriesBurned = estimateCalories(workoutType, partial.durationMinutes);
  const fingerprint = buildFingerprint(partial.className, partial.studio, partial.date, partial.startTime);

  return { ...partial, workoutType, caloriesBurned, fingerprint };
}
