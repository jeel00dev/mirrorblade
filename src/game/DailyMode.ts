import { hashString } from './SeededRandom';

/** Daily Mirror is shared world-wide, so the calendar day is UTC for everyone. */
export function utcDateKey(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Version suffix changes whenever the rules or library change so old dates are not compared against new sequences. */
export function dailySeed(dateKey: string): number {
  return hashString(`mirrorblade-daily:${dateKey}:v2`);
}

export function dayDistance(from: string, to: string): number {
  const first = Date.parse(`${from}T12:00:00Z`);
  const second = Date.parse(`${to}T12:00:00Z`);
  if (!Number.isFinite(first) || !Number.isFinite(second)) return 0;
  return Math.round((second - first) / 86_400_000);
}

export function formatDailyDate(dateKey: string): string {
  const parsed = Date.parse(`${dateKey}T12:00:00Z`);
  if (!Number.isFinite(parsed)) return dateKey;
  return new Date(parsed).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
}
