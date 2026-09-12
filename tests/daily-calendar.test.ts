import { describe, expect, it } from 'vitest';
import { DAILY_REWARD_SCORE } from '../src/config/gameplay';
import { addDays, buildMonth, daysInMonth, effectiveStreak, isCompleted, keyFor, recordDailyRun, shiftMonth } from '../src/game/DailyCalendar';
import { decodeSave, encodeSave } from '../src/progression/SaveCodec';
import { createDefaultSave, type DailyProgress } from '../src/progression/SaveData';

const fresh = (): DailyProgress => createDefaultSave().daily;

describe('daily calendar grid', () => {
  it('knows month lengths including leap years', () => {
    expect(daysInMonth(2024, 1)).toBe(29);
    expect(daysInMonth(2026, 1)).toBe(28);
    expect(daysInMonth(2100, 1)).toBe(28);
    expect(daysInMonth(2000, 1)).toBe(29);
    expect(daysInMonth(2026, 8)).toBe(30);
    expect(daysInMonth(2026, 11)).toBe(31);
  });

  it('aligns the first day to its weekday (Sunday-first) and pads to whole weeks', () => {
    // 1 September 2026 is a Tuesday.
    const month = buildMonth(2026, 8, '2026-09-12', fresh());
    expect(month.weeks[0]!.slice(0, 2)).toEqual([null, null]);
    expect(month.weeks[0]![2]!.day).toBe(1);
    expect(month.weeks.every((week) => week.length === 7)).toBe(true);
    const days = month.weeks.flat().filter((cell): cell is NonNullable<typeof cell> => cell !== null);
    expect(days).toHaveLength(30);
    expect(days[0]!.key).toBe('2026-09-01');
    expect(days[29]!.key).toBe('2026-09-30');
    // February 2026 starts on a Sunday and needs exactly four weeks.
    expect(buildMonth(2026, 1, '2026-09-12', fresh()).weeks).toHaveLength(4);
    // May 2027 starts on a Saturday and spills into a sixth week.
    expect(buildMonth(2027, 4, '2027-06-01', fresh()).weeks).toHaveLength(6);
  });

  it('classifies days relative to today and completion', () => {
    const daily = fresh();
    daily.scores['2026-09-03'] = DAILY_REWARD_SCORE;
    daily.scores['2026-09-05'] = DAILY_REWARD_SCORE - 1;
    const month = buildMonth(2026, 8, '2026-09-12', daily);
    const byKey = new Map(month.weeks.flat().filter(Boolean).map((cell) => [cell!.key, cell!]));
    expect(byKey.get('2026-09-03')!.state).toBe('done');
    expect(byKey.get('2026-09-05')!.state).toBe('available');
    expect(byKey.get('2026-09-12')!.state).toBe('today');
    expect(byKey.get('2026-09-12')!.isToday).toBe(true);
    expect(byKey.get('2026-09-13')!.state).toBe('future');
    expect(month.completed).toBe(1);
    expect(month.canGoForward).toBe(false);
    expect(buildMonth(2026, 7, '2026-09-12', daily).canGoForward).toBe(true);
  });

  it('shifts months across year boundaries', () => {
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(keyFor(2026, 8, 5)).toBe('2026-09-05');
  });
});

describe('daily streak rules', () => {
  it('completing today starts and extends the streak; past days count as done but never extend it', () => {
    const daily = fresh();
    const first = recordDailyRun(daily, '2026-09-10', '2026-09-10', DAILY_REWARD_SCORE);
    expect(first).toEqual({ firstCompletion: true, streakExtended: true, streak: 1 });
    const next = recordDailyRun(daily, '2026-09-11', '2026-09-11', DAILY_REWARD_SCORE + 500);
    expect(next.streakExtended).toBe(true);
    expect(next.streak).toBe(2);
    // Going back to 8 September on the 11th: done, rewarded once, streak untouched.
    const past = recordDailyRun(daily, '2026-09-08', '2026-09-11', DAILY_REWARD_SCORE);
    expect(past).toEqual({ firstCompletion: true, streakExtended: false, streak: 2 });
    expect(isCompleted(daily, '2026-09-08')).toBe(true);
    // Replaying a completed day is not a first completion.
    expect(recordDailyRun(daily, '2026-09-08', '2026-09-11', DAILY_REWARD_SCORE * 2).firstCompletion).toBe(false);
    expect(daily.scores['2026-09-08']).toBe(DAILY_REWARD_SCORE * 2);
    expect(daily.bestStreak).toBe(2);
  });

  it('a missed day breaks the streak, and falling short of the target completes nothing', () => {
    const daily = fresh();
    recordDailyRun(daily, '2026-09-10', '2026-09-10', DAILY_REWARD_SCORE);
    recordDailyRun(daily, '2026-09-11', '2026-09-11', DAILY_REWARD_SCORE);
    expect(effectiveStreak(daily, '2026-09-12')).toBe(2);
    expect(effectiveStreak(daily, '2026-09-13')).toBe(0);
    const short = recordDailyRun(daily, '2026-09-13', '2026-09-13', DAILY_REWARD_SCORE - 1);
    expect(short).toEqual({ firstCompletion: false, streakExtended: false, streak: 0 });
    const restart = recordDailyRun(daily, '2026-09-13', '2026-09-13', DAILY_REWARD_SCORE);
    expect(restart.streak).toBe(1);
    expect(daily.bestStreak).toBe(2);
    // Completing today twice does not double count.
    expect(recordDailyRun(daily, '2026-09-13', '2026-09-13', DAILY_REWARD_SCORE + 1).streakExtended).toBe(false);
    expect(daily.streak).toBe(1);
  });

  it('persists per-date results and drops invalid keys', () => {
    const save = createDefaultSave();
    save.daily.scores = { '2026-09-01': 1200, 'garbage': 5, '2026-09-02': -3 } as Record<string, number>;
    save.daily.lastStreakDate = '2026-09-02';
    save.daily.streak = 2;
    const decoded = decodeSave(encodeSave(save));
    expect(decoded.daily.scores).toEqual({ '2026-09-01': 1200, '2026-09-02': 0 });
    expect(decoded.daily.lastStreakDate).toBe('2026-09-02');
    expect(decoded.daily.bestStreak).toBe(2);
    expect(decodeSave(JSON.stringify({ version: 2, daily: { streak: 3 } })).daily.scores).toEqual({});
  });
});
