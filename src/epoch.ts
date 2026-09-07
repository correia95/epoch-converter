// Unix timestamp helpers. All pure, no dependencies.

export type Unit = 's' | 'ms' | 'us' | 'ns';

export interface ParsedStamp {
  ok: boolean;
  date?: Date;
  detectedUnit?: Unit;
  error?: string;
}

// Heuristic: decide whether a bare integer is seconds, millis, micros or nanos
// by its magnitude. A 10-digit number ~ seconds around 2001-2286; 13-digit ~ ms.
export function detectUnit(digits: number): Unit {
  if (digits <= 11) return 's';
  if (digits <= 14) return 'ms';
  if (digits <= 17) return 'us';
  return 'ns';
}

export function toDate(value: number, unit: Unit): Date {
  const ms =
    unit === 's' ? value * 1000
    : unit === 'ms' ? value
    : unit === 'us' ? value / 1000
    : value / 1e6;
  return new Date(ms);
}

export function fromDate(date: Date, unit: Unit): number {
  const ms = date.getTime();
  return unit === 's' ? Math.floor(ms / 1000)
    : unit === 'ms' ? ms
    : unit === 'us' ? ms * 1000
    : ms * 1e6;
}

// Parse whatever the user typed: a number (any unit) or a date string.
export function parseInput(raw: string, forcedUnit?: Unit): ParsedStamp {
  const s = raw.trim();
  if (!s) return { ok: false, error: 'Enter a timestamp or a date.' };

  // pure integer (optionally negative) → treat as epoch
  if (/^-?\d+$/.test(s)) {
    const digits = s.replace('-', '').length;
    const unit = forcedUnit ?? detectUnit(digits);
    const n = Number(s);
    if (!Number.isFinite(n)) return { ok: false, error: 'Number is too large.' };
    const d = toDate(n, unit);
    if (Number.isNaN(d.getTime())) return { ok: false, error: 'That is not a valid timestamp.' };
    return { ok: true, date: d, detectedUnit: unit };
  }

  // decimal seconds e.g. 1712345678.123
  if (/^-?\d+\.\d+$/.test(s)) {
    const n = Number(s);
    const d = toDate(n, forcedUnit ?? 's');
    if (Number.isNaN(d.getTime())) return { ok: false, error: 'That is not a valid timestamp.' };
    return { ok: true, date: d, detectedUnit: forcedUnit ?? 's' };
  }

  // otherwise a date string
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    return { ok: false, error: 'Could not read that as a date. Try 2026-09-07 14:30 or an ISO string.' };
  }
  return { ok: true, date: d };
}

// ---------- formatting ----------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const p2 = (n: number) => String(n).padStart(2, '0');

export function isoUtc(d: Date): string {
  return d.toISOString();
}

export function isoLocal(d: Date): string {
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const oh = p2(Math.floor(Math.abs(off) / 60));
  const om = p2(Math.abs(off) % 60);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(
    d.getMinutes(),
  )}:${p2(d.getSeconds())}${sign}${oh}:${om}`;
}

export function humanUtc(d: Date): string {
  return `${DAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} ${p2(
    d.getUTCHours(),
  )}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())} UTC`;
}

export function humanLocal(d: Date): string {
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} ${p2(
    d.getHours(),
  )}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
}

export function rfc2822(d: Date): string {
  return d.toUTCString();
}

export function localTzName(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
  } catch {
    return 'Local';
  }
}

export function tzOffsetLabel(d: Date): string {
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const oh = Math.floor(Math.abs(off) / 60);
  const om = Math.abs(off) % 60;
  return `UTC${sign}${oh}${om ? ':' + p2(om) : ''}`;
}

export function relativeFrom(d: Date, now: Date): string {
  const diff = d.getTime() - now.getTime();
  const abs = Math.abs(diff);
  const future = diff > 0;
  const units: [number, string][] = [
    [1000, 'second'],
    [60, 'minute'],
    [60, 'hour'],
    [24, 'day'],
    [7, 'week'],
    [4.34524, 'month'],
    [12, 'year'],
  ];
  let val = abs;
  let name = 'millisecond';
  for (const [size, label] of units) {
    if (val < size) break;
    val /= size;
    name = label;
  }
  if (name === 'millisecond') return future ? 'in a moment' : 'just now';
  const rounded = Math.round(val);
  const plural = rounded === 1 ? name : name + 's';
  return future ? `in ${rounded} ${plural}` : `${rounded} ${plural} ago`;
}

// Day of year, ISO week, days in month — small handy extras.
export function extras(d: Date): { doy: number; isoWeek: number; leap: boolean } {
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  const doy = Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - start) / 86400000) + 1;
  // ISO 8601 week number
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - day + 3);
  const firstThursday = t.getTime();
  t.setUTCMonth(0, 1);
  if (t.getUTCDay() !== 4) {
    t.setUTCMonth(0, 1 + ((4 - t.getUTCDay() + 7) % 7));
  }
  const isoWeek = 1 + Math.round((firstThursday - t.getTime()) / (7 * 86400000));
  const y = d.getUTCFullYear();
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  return { doy, isoWeek, leap };
}
