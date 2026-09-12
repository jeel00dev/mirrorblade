import { COSMETICS, DEFAULT_EQUIPPED, type CosmeticCategory } from '../config/cosmetics';
import { createDefaultSave, createDefaultStats, SAVE_VERSION, type PlayerStats, type SaveData } from './SaveData';

const validCosmeticIds = new Set(COSMETICS.map((cosmetic) => cosmetic.id));
const categories = Object.keys(DEFAULT_EQUIPPED) as CosmeticCategory[];

/** V1 achievement ids that were renamed in V2. */
const ACHIEVEMENT_MIGRATIONS: Record<string, string> = { surgeon: 'first-cut', 'chain-reaction': 'chain-master' };

function number(value: unknown, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function integer(value: unknown, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  return Math.floor(number(value, fallback, min, max));
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function dateString(value: unknown): string {
  return typeof value === 'string' ? value.slice(0, 10) : '';
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Per-date daily results: valid keys only, non-negative integers, capped to the most recent 2,000 dates. */
function dailyScores(value: unknown): Record<string, number> {
  const source = record(value);
  const keys = Object.keys(source).filter((key) => DATE_KEY.test(key)).sort().slice(-2_000);
  const result: Record<string, number> = {};
  for (const key of keys) result[key] = integer(source[key], 0, 0, 9_999_999);
  return result;
}

export function decodeSave(serialized: string | null): SaveData {
  const defaults = createDefaultSave();
  if (!serialized) return defaults;
  try {
    const source = record(JSON.parse(serialized));
    const sourceVersion = integer(source.version, 0, 0, 1_000);
    const settings = record(source.settings);
    const stats = record(source.stats);
    const daily = record(source.daily);
    const hints = record(source.hints);
    const equippedSource = record(source.equipped);
    const owned = Array.isArray(source.ownedCosmetics)
      ? source.ownedCosmetics.filter((id): id is string => typeof id === 'string' && validCosmeticIds.has(id))
      : [];
    const ownedCosmetics = [...new Set([...defaults.ownedCosmetics, ...owned])];
    const equipped = { ...defaults.equipped };
    for (const category of categories) {
      const id = equippedSource[category];
      const definition = typeof id === 'string' ? COSMETICS.find((item) => item.id === id) : undefined;
      if (definition?.category === category && ownedCosmetics.includes(definition.id)) equipped[category] = definition.id;
    }
    const quality = settings.quality;
    const achievements = Array.isArray(source.achievements)
      ? [...new Set(source.achievements
        .filter((id): id is string => typeof id === 'string')
        .map((id) => ACHIEVEMENT_MIGRATIONS[id] ?? id))].slice(0, 100)
      : [];

    const decodedStats: PlayerStats = { ...createDefaultStats() };
    for (const key of Object.keys(decodedStats) as (keyof PlayerStats)[]) decodedStats[key] = integer(stats[key], 0);
    // V1 scores were earned under different rules (no rotation, no Overdrive); keep them as a legacy record.
    if (sourceVersion < 2) {
      decodedStats.legacyBestScore = Math.max(decodedStats.legacyBestScore, decodedStats.bestScore);
      decodedStats.bestScore = 0;
    }

    return {
      version: SAVE_VERSION,
      currency: integer(source.currency, 0, 0, 9_999_999),
      ownedCosmetics,
      equipped,
      settings: {
        masterVolume: number(settings.masterVolume, defaults.settings.masterVolume, 0, 1),
        soundVolume: number(settings.soundVolume, defaults.settings.soundVolume, 0, 1),
        musicVolume: number(settings.musicVolume, defaults.settings.musicVolume, 0, 1),
        muted: bool(settings.muted, defaults.settings.muted),
        haptics: bool(settings.haptics, defaults.settings.haptics),
        screenShake: bool(settings.screenShake, defaults.settings.screenShake),
        reducedMotion: bool(settings.reducedMotion, defaults.settings.reducedMotion),
        quality: quality === 'low' || quality === 'medium' || quality === 'high' || quality === 'auto' ? quality : 'auto',
        accessibleColors: bool(settings.accessibleColors, defaults.settings.accessibleColors),
        highContrast: bool(settings.highContrast, defaults.settings.highContrast),
      },
      onboardingComplete: bool(source.onboardingComplete, false),
      hints: {
        overdrive: bool(hints.overdrive, false),
        fracture: bool(hints.fracture, false),
        energy: bool(hints.energy, false),
        contract: bool(hints.contract, false),
      },
      achievements,
      stats: decodedStats,
      daily: {
        lastPlayedDate: dateString(daily.lastPlayedDate),
        lastRewardDate: dateString(daily.lastRewardDate),
        currentDate: dateString(daily.currentDate),
        todayScore: integer(daily.todayScore, 0),
        bestDailyScore: sourceVersion < 2 ? 0 : integer(daily.bestDailyScore, 0),
        streak: integer(daily.streak, 0, 0, 10_000),
        lastStreakDate: dateString(daily.lastStreakDate),
        bestStreak: Math.max(integer(daily.bestStreak, 0, 0, 10_000), integer(daily.streak, 0, 0, 10_000)),
        scores: dailyScores(daily.scores),
      },
    };
  } catch {
    return defaults;
  }
}

export function encodeSave(save: SaveData): string {
  return JSON.stringify({ ...save, version: SAVE_VERSION });
}
