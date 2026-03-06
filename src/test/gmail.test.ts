import { describe, it, expect } from "vitest";
import {
  shouldProcess,
  classifyWorkoutType,
  estimateCalories,
  buildFingerprint,
  parseDate,
  parseTime,
  parseClassPassEmail,
  parseBarrysEmail,
  parseBooking,
  extractEmail,
  stripHtml,
} from "@/lib/gmailParsing";

// ── shouldProcess ─────────────────────────────────────────────────────────────

describe("shouldProcess", () => {
  it("returns true for approved ClassPass sender", () => {
    expect(shouldProcess("team@info.classpass.com", "Your booking")).toBe(true);
  });

  it("returns true for approved Barry's sender with angle brackets", () => {
    expect(shouldProcess("Barry's <hello@barrysbootcamp.sg>", "Class reminder")).toBe(true);
  });

  it("returns true when subject contains 'reservation'", () => {
    expect(shouldProcess("noreply@unknown.com", "Your reservation is confirmed")).toBe(true);
  });

  it("returns true when subject contains 'booking'", () => {
    expect(shouldProcess("noreply@unknown.com", "Booking Confirmation")).toBe(true);
  });

  it("returns false for unknown sender and irrelevant subject", () => {
    expect(shouldProcess("marketing@spam.com", "Special offer today")).toBe(false);
  });
});

// ── extractEmail ──────────────────────────────────────────────────────────────

describe("extractEmail", () => {
  it("extracts bare email", () => {
    expect(extractEmail("user@example.com")).toBe("user@example.com");
  });

  it("extracts email from angle bracket format", () => {
    expect(extractEmail("Display Name <user@example.com>")).toBe("user@example.com");
  });

  it("lowercases the result", () => {
    expect(extractEmail("User@Example.COM")).toBe("user@example.com");
  });
});

// ── classifyWorkoutType ───────────────────────────────────────────────────────

describe("classifyWorkoutType", () => {
  it("classifies hiit", () => {
    expect(classifyWorkoutType("HIIT Burn class at F45")).toBe("hiit");
  });

  it("classifies barry's as hiit", () => {
    expect(classifyWorkoutType("Barry's Bootcamp Full Body")).toBe("hiit");
  });

  it("classifies cycling", () => {
    expect(classifyWorkoutType("Spin Class at SoulCycle")).toBe("cycling");
  });

  it("classifies yoga", () => {
    expect(classifyWorkoutType("Vinyasa Flow Yoga")).toBe("yoga");
  });

  it("classifies pilates", () => {
    expect(classifyWorkoutType("Reformer Pilates session")).toBe("pilates");
  });

  it("classifies barre", () => {
    expect(classifyWorkoutType("Ballet Barre class")).toBe("barre");
  });

  it("classifies boxing", () => {
    expect(classifyWorkoutType("Muay Thai kickboxing")).toBe("boxing");
  });

  it("classifies bootcamp", () => {
    expect(classifyWorkoutType("CrossFit WOD Bootcamp")).toBe("bootcamp");
  });

  it("classifies strength", () => {
    expect(classifyWorkoutType("Weight Training strength")).toBe("strength");
  });

  it("classifies running", () => {
    expect(classifyWorkoutType("Treadmill Running session")).toBe("running");
  });

  it("classifies swimming", () => {
    expect(classifyWorkoutType("Aqua Fit swimming")).toBe("swimming");
  });

  it("returns other for unrecognized text", () => {
    expect(classifyWorkoutType("Random Generic Class")).toBe("other");
  });
});

// ── estimateCalories ──────────────────────────────────────────────────────────

describe("estimateCalories", () => {
  it("calculates correctly for hiit 60 min 70kg", () => {
    // MET 8.0 * 70 * (60/60) = 560
    expect(estimateCalories("hiit", 60, 70)).toBe(560);
  });

  it("calculates correctly for yoga 45 min", () => {
    // MET 3.0 * 70 * (45/60) = 157.5 → 158
    expect(estimateCalories("yoga", 45, 70)).toBe(158);
  });

  it("uses default weight of 70kg", () => {
    expect(estimateCalories("cycling", 60)).toBe(525); // 7.5 * 70 * 1
  });

  it("scales with duration", () => {
    const half = estimateCalories("strength", 30, 70);
    const full = estimateCalories("strength", 60, 70);
    expect(full).toBe(half * 2);
  });
});

// ── buildFingerprint ──────────────────────────────────────────────────────────

describe("buildFingerprint", () => {
  it("produces a deterministic lowercase pipe-joined string", () => {
    const fp = buildFingerprint("Vinyasa Yoga", "Pure Yoga Studio", "2026-03-06", "09:00");
    expect(fp).toBe("vinyasa yoga|pure yoga studio|2026-03-06|09:00");
  });

  it("normalises extra whitespace", () => {
    const a = buildFingerprint("  HIIT  ", "Studio", "2026-01-01", "10:00");
    const b = buildFingerprint("HIIT", "Studio", "2026-01-01", "10:00");
    expect(a).toBe(b);
  });

  it("two different start times yield different fingerprints", () => {
    const a = buildFingerprint("Yoga", "Studio", "2026-03-06", "09:00");
    const b = buildFingerprint("Yoga", "Studio", "2026-03-06", "10:00");
    expect(a).not.toBe(b);
  });
});

// ── parseTime ─────────────────────────────────────────────────────────────────

describe("parseTime", () => {
  it('parses "9:00 AM"', () => expect(parseTime("9:00 AM")).toBe("09:00"));
  it('parses "12:00 PM"', () => expect(parseTime("12:00 PM")).toBe("12:00"));
  it('parses "12:00 AM" (midnight)', () => expect(parseTime("12:00 AM")).toBe("00:00"));
  it('parses "1:30pm"', () => expect(parseTime("1:30pm")).toBe("13:30"));
  it('parses "9am"', () => expect(parseTime("9am")).toBe("09:00"));
  it('parses "09:00" (24h)', () => expect(parseTime("09:00")).toBe("09:00"));
  it('parses "18:30" (24h)', () => expect(parseTime("18:30")).toBe("18:30"));
  it("returns null for garbage input", () => expect(parseTime("not a time")).toBeNull());
});

// ── parseDate ─────────────────────────────────────────────────────────────────

describe("parseDate", () => {
  it('parses "Thursday, March 6, 2026"', () =>
    expect(parseDate("Thursday, March 6, 2026")).toBe("2026-03-06"));

  it('parses "March 6, 2026"', () =>
    expect(parseDate("March 6, 2026")).toBe("2026-03-06"));

  it('parses "6 March 2026"', () =>
    expect(parseDate("6 March 2026")).toBe("2026-03-06"));

  it('parses "6th March 2026"', () =>
    expect(parseDate("6th March 2026")).toBe("2026-03-06"));

  it('parses "March 6" with no year (uses current year)', () => {
    const result = parseDate("March 6");
    expect(result).toMatch(/^\d{4}-03-06$/);
  });

  it("returns null for garbage input", () =>
    expect(parseDate("not a date")).toBeNull());
});

// ── stripHtml ─────────────────────────────────────────────────────────────────

describe("stripHtml", () => {
  it("removes HTML tags", () => {
    expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  it("replaces &amp; and &nbsp;", () => {
    expect(stripHtml("A &amp; B&nbsp;C")).toBe("A & B C");
  });
});

// ── parseClassPassEmail ───────────────────────────────────────────────────────

const CLASSPASS_SUBJECT = "You're booked for Vinyasa Yoga at Pure Yoga!";
const CLASSPASS_BODY_STRATEGY1 = `
Hi there,

Your booking is confirmed.

Thursday, March 6, 2026 • 9:00 AM - 10:00 AM

Pure Yoga Studio
Orchard Road
`;

const CLASSPASS_BODY_STRATEGY2 = `
Class: Vinyasa Yoga
Studio: Pure Yoga
Date: March 6, 2026
Time: 9:00 AM - 10:00 AM
`;

describe("parseClassPassEmail", () => {
  it("parses strategy-1 body (date•time pattern)", () => {
    const result = parseClassPassEmail(CLASSPASS_SUBJECT, CLASSPASS_BODY_STRATEGY1);
    expect(result).not.toBeNull();
    expect(result!.date).toBe("2026-03-06");
    expect(result!.startTime).toBe("09:00");
    expect(result!.endTime).toBe("10:00");
    expect(result!.durationMinutes).toBe(60);
  });

  it("parses strategy-2 body (labeled fields)", () => {
    const result = parseClassPassEmail(CLASSPASS_SUBJECT, CLASSPASS_BODY_STRATEGY2);
    expect(result).not.toBeNull();
    expect(result!.date).toBe("2026-03-06");
    expect(result!.startTime).toBe("09:00");
    expect(result!.endTime).toBe("10:00");
    expect(result!.className).toBe("Vinyasa Yoga");
    expect(result!.studio).toBe("Pure Yoga");
  });

  it("returns null when no parseable date/time found", () => {
    expect(parseClassPassEmail("Subject", "No date or time here at all.")).toBeNull();
  });
});

// ── parseBarrysEmail ──────────────────────────────────────────────────────────

const BARRYS_SUBJECT = "Your Barry's class is confirmed!";
const BARRYS_BODY = `
Class: Full Body
Date: Thursday, March 6, 2026
Time: 7:00 AM
`;

describe("parseBarrysEmail", () => {
  it("parses a typical Barry's email", () => {
    const result = parseBarrysEmail(BARRYS_SUBJECT, BARRYS_BODY);
    expect(result).not.toBeNull();
    expect(result!.studio).toBe("Barry's Bootcamp");
    expect(result!.className).toBe("Full Body");
    expect(result!.date).toBe("2026-03-06");
    expect(result!.startTime).toBe("07:00");
  });

  it("returns null when date is missing", () => {
    const body = "Class: Full Body\nTime: 7:00 AM\n";
    expect(parseBarrysEmail(BARRYS_SUBJECT, body)).toBeNull();
  });

  it("returns null when time is missing", () => {
    const body = "Class: Full Body\nDate: March 6, 2026\n";
    expect(parseBarrysEmail(BARRYS_SUBJECT, body)).toBeNull();
  });
});

// ── parseBooking ──────────────────────────────────────────────────────────────

describe("parseBooking", () => {
  it("routes ClassPass sender to ClassPass parser and returns full booking", () => {
    const result = parseBooking(
      "team@info.classpass.com",
      CLASSPASS_SUBJECT,
      CLASSPASS_BODY_STRATEGY1,
    );
    expect(result).not.toBeNull();
    expect(result!.workoutType).toBe("yoga");
    expect(result!.caloriesBurned).toBeGreaterThan(0);
    expect(result!.fingerprint).toContain("2026-03-06");
  });

  it("routes Barry's sender to Barry's parser", () => {
    const result = parseBooking(
      "Barry's <hello@barrysbootcamp.sg>",
      BARRYS_SUBJECT,
      BARRYS_BODY,
    );
    expect(result).not.toBeNull();
    expect(result!.workoutType).toBe("hiit");
    expect(result!.studio).toBe("Barry's Bootcamp");
  });

  it("fingerprint is consistent across two identical calls", () => {
    const a = parseBooking("team@info.classpass.com", CLASSPASS_SUBJECT, CLASSPASS_BODY_STRATEGY1);
    const b = parseBooking("team@info.classpass.com", CLASSPASS_SUBJECT, CLASSPASS_BODY_STRATEGY1);
    expect(a!.fingerprint).toBe(b!.fingerprint);
  });

  it("different time produces different fingerprint (deduplication integrity)", () => {
    const body2 = CLASSPASS_BODY_STRATEGY1.replace("9:00 AM - 10:00 AM", "11:00 AM - 12:00 PM");
    const a = parseBooking("team@info.classpass.com", CLASSPASS_SUBJECT, CLASSPASS_BODY_STRATEGY1);
    const b = parseBooking("team@info.classpass.com", CLASSPASS_SUBJECT, body2);
    expect(a!.fingerprint).not.toBe(b!.fingerprint);
  });

  it("returns null for unknown sender with no parseable content", () => {
    const result = parseBooking("unknown@example.com", "Your booking", "No useful content here.");
    expect(result).toBeNull();
  });
});
