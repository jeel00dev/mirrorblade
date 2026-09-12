import { DAILY_REWARD_SCORE } from '../config/gameplay';
import type { DailyProgress } from '../progression/SaveData';
import { utcDateKey } from './DailyMode';

export type DayState = 'done' | 'today' | 'available' | 'future';

export interface CalendarDay {
  readonly key: string;
  readonly day: number;
  readonly state: DayState;
  readonly score: number;
  readonly isToday: boolean;
}

export interface CalendarMonth {
  readonly year: number;
  /** 0–11 */
  readonly month: number;
  readonly label: string;
  /** Six rows max, Sunday-first; null = padding outside the month. */
  readonly weeks: readonly (readonly (CalendarDay | null)[])[];
  readonly completed: number;
  readonly daysInMonth: number;
  readonly canGoForward: boolean;
}

export const DAILY_TARGET = DAILY_REWARD_SCORE;

export function parseKey(key: string): { year: number; month: number; day: number } {
  const [y, m, d] = key.split('-').map(Number);
  return { year: y ?? 1970, month: (m ?? 1) - 1, day: d ?? 1 };
}

export function keyFor(year: number, month: number, day: number): string {
  return utcDateKey(new Date(Date.UTC(year, month, day)));
}

export function addDays(key: string, days: number): string {
  const { year, month, day } = parseKey(key);
  return utcDateKey(new Date(Date.UTC(year, month, day + days)));
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const date = new Date(Date.UTC(year, month + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

export function monthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 1)).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function isCompleted(daily: DailyProgress, key: string): boolean {
  return (daily.scores[key] ?? 0) >= DAILY_TARGET;
}

/** Builds a Sunday-first month grid. Days after `today` are locked; every earlier day can be played. */
export function buildMonth(year: number, month: number, today: string, daily: DailyProgress): CalendarMonth {
  const total = daysInMonth(year, month);
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const cells: (CalendarDay | null)[] = Array.from({ length: firstWeekday }, () => null);
  let completed = 0;
  for (let day = 1; day <= total; day += 1) {
    const key = keyFor(year, month, day);
    const score = daily.scores[key] ?? 0;
    const done = score >= DAILY_TARGET;
    if (done) completed += 1;
    const state: DayState = done ? 'done' : key === today ? 'today' : key < today ? 'available' : 'future';
    cells.push({ key, day, state, score, isToday: key === today });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (CalendarDay | null)[][] = [];
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7));
  const { year: ty, month: tm } = parseKey(today);
  const canGoForward = year < ty || (year === ty && month < tm);
  return { year, month, label: monthLabel(year, month), weeks, completed, daysInMonth: total, canGoForward };
}

/** The streak shown to the player: it survives until the end of the day after the last credited day. */
export function effectiveStreak(daily: DailyProgress, today: string): number {
  if (daily.lastStreakDate === today || daily.lastStreakDate === addDays(today, -1)) return daily.streak;
  return 0;
}

export interface CompletionResult {
  /** True the first time this date's puzzle reaches the target. */
  readonly firstCompletion: boolean;
  /** True when the completion was on the puzzle's own day and extended (or started) the streak. */
  readonly streakExtended: boolean;
  readonly streak: number;
}

/**
 * Records a daily run. Past-date completions count as done and can be rewarded, but only a completion
 * on the puzzle's own date can extend the continuous streak.
 */
export function recordDailyRun(daily: DailyProgress, date: string, today: string, score: number): CompletionResult {
  const previous = daily.scores[date] ?? 0;
  const wasDone = previous >= DAILY_TARGET;
  daily.scores[date] = Math.max(previous, score);
  daily.bestDailyScore = Math.max(daily.bestDailyScore, score);
  if (date === today) {
    if (daily.currentDate !== today) { daily.currentDate = today; daily.todayScore = 0; }
    daily.todayScore = Math.max(daily.todayScore, score);
  }
  const nowDone = daily.scores[date]! >= DAILY_TARGET;
  const firstCompletion = nowDone && !wasDone;
  let streakExtended = false;
  if (firstCompletion && date === today && daily.lastStreakDate !== today) {
    daily.streak = daily.lastStreakDate === addDays(today, -1) ? daily.streak + 1 : 1;
    daily.lastStreakDate = today;
    daily.bestStreak = Math.max(daily.bestStreak, daily.streak);
    streakExtended = true;
  }
  return { firstCompletion, streakExtended, streak: effectiveStreak(daily, today) };
}
