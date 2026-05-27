import type { DetectedTime } from "./types.js";
import { normalizeText } from "./normalizer.js";

function twoDigits(value: number): string {
  return value.toString().padStart(2, "0");
}

function timeString(hour: number, minute = 0): string {
  return `${twoDigits(hour)}:${twoDigits(minute)}`;
}

function isoDateInTimezone(baseDate: Date, timezone: string, offsetDays = 0): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const shifted = new Date(baseDate.getTime() + offsetDays * 24 * 60 * 60 * 1000);
  return formatter.format(shifted);
}

function pushUnique(results: DetectedTime[], item: DetectedTime): void {
  const key = `${item.raw}|${item.detected_time}|${item.detected_date}|${item.relative_minutes ?? ""}`;
  if (results.some((existing) => `${existing.raw}|${existing.detected_time}|${existing.detected_date}|${existing.relative_minutes ?? ""}` === key)) {
    return;
  }
  results.push(item);
}

export function detectTimes(rawMessage: string, timezone: string, now = new Date()): DetectedTime[] {
  const normalized = normalizeText(rawMessage).reduced;
  const results: DetectedTime[] = [];
  const today = isoDateInTimezone(now, timezone, 0);
  const tomorrow = isoDateInTimezone(now, timezone, 1);

  const relativeRegex = /\ben\s+(\d{1,3})\s*(minutos?|mins?|m|horas?|hs?|h)\b/g;
  for (const match of normalized.matchAll(relativeRegex)) {
    const amount = Number.parseInt(match[1] ?? "0", 10);
    const unit = match[2] ?? "";
    const minutes = unit.startsWith("h") ? amount * 60 : amount;
    pushUnique(results, {
      raw: match[0],
      detected_time: null,
      detected_date: today,
      relative_minutes: minutes,
      confidence: 0.95
    });
  }

  const todayTomorrowRegex =
    /\b(hoy|manana)\s*(?:a\s+las|a\s+la|tipo|desde|sobre|)\s*(\d{1,2})(?:\s*(?:[:.]\s*|\s+)([0-5]\d))?\s*(?:hs?|h)?\b/g;
  for (const match of normalized.matchAll(todayTomorrowRegex)) {
    const dayWord = match[1] ?? "hoy";
    const hour = Number.parseInt(match[2] ?? "0", 10);
    const minute = match[3] ? Number.parseInt(match[3], 10) : 0;
    if (hour > 23) continue;
    pushUnique(results, {
      raw: match[0],
      detected_time: timeString(hour, minute),
      detected_date: dayWord === "manana" ? tomorrow : today,
      confidence: 0.9
    });
  }

  const explicitRegex =
    /\b(?:a\s+las\s+)?([01]?\d|2[0-3])\s*(?:(?:[:.]\s*|\s+)([0-5]\d))?\s*(?:hs?|h)\b/g;
  for (const match of normalized.matchAll(explicitRegex)) {
    const hour = Number.parseInt(match[1] ?? "0", 10);
    const minute = match[2] ? Number.parseInt(match[2], 10) : 0;
    pushUnique(results, {
      raw: match[0],
      detected_time: timeString(hour, minute),
      detected_date: today,
      confidence: 0.85
    });
  }

  const dotOrColonRegex = /\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/g;
  for (const match of normalized.matchAll(dotOrColonRegex)) {
    const hour = Number.parseInt(match[1] ?? "0", 10);
    const minute = Number.parseInt(match[2] ?? "0", 10);
    pushUnique(results, {
      raw: match[0],
      detected_time: timeString(hour, minute),
      detected_date: today,
      confidence: 0.8
    });
  }

  if (/\bmediodia\b/.test(normalized)) {
    pushUnique(results, {
      raw: "mediodia",
      detected_time: "12:00",
      detected_date: today,
      confidence: 0.75
    });
  }

  if (/\bmedianoche\b/.test(normalized)) {
    pushUnique(results, {
      raw: "medianoche",
      detected_time: "00:00",
      detected_date: today,
      confidence: 0.75
    });
  }

  if (/\besta noche\b/.test(normalized)) {
    pushUnique(results, {
      raw: "esta noche",
      detected_time: "21:00",
      detected_date: today,
      confidence: 0.45
    });
  }

  if (/\bhoy a la tarde\b|\bhoy tarde\b/.test(normalized)) {
    pushUnique(results, {
      raw: "hoy a la tarde",
      detected_time: "16:00",
      detected_date: today,
      confidence: 0.45
    });
  }

  if (/\bmanana al mediodia\b/.test(normalized)) {
    pushUnique(results, {
      raw: "manana al mediodia",
      detected_time: "12:00",
      detected_date: tomorrow,
      confidence: 0.75
    });
  }

  return results;
}
