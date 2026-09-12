import { DEFAULT_EQUIPPED, type CosmeticCategory } from '../config/cosmetics';
import type { Quality } from '../config/gameplay';

export const SAVE_VERSION = 2;

export interface PlayerSettings {
  masterVolume: number;
  soundVolume: number;
  musicVolume: number;
  muted: boolean;
  haptics: boolean;
  screenShake: boolean;
  reducedMotion: boolean;
  quality: Quality;
  accessibleColors: boolean;
  highContrast: boolean;
}

export interface PlayerStats {
  bestScore: number;
  /** Best score recorded under V1 rules, kept for the record but not compared with V2 scores. */
  legacyBestScore: number;
  totalRuns: number;
  totalScore: number;
  totalLinesCleared: number;
  rowsCleared: number;
  columnsCleared: number;
  piecesPlaced: number;
  piecesRotated: number;
  piecesCut: number;
  bladesUsed: number;
  bladesForged: number;
  highestChain: number;
  doubles: number;
  triples: number;
  maxClears: number;
  perfectMirrors: number;
  perfectClears: number;
  overdrives: number;
  overdriveSeconds: number;
  fractures: number;
  fractureEscapes: number;
  clutches: number;
  dailyPlays: number;
  totalPlayTimeSeconds: number;
  /** V3 */
  highestStage: number;
  longestRunMoves: number;
  contractsCompleted: number;
  precisionHits: number;
}

export interface DailyProgress {
  lastPlayedDate: string;
  /** Kept for V2 saves; rewards are now per completed date (see `scores`). */
  lastRewardDate: string;
  currentDate: string;
  todayScore: number;
  bestDailyScore: number;
  /** Consecutive days completed on their own date. */
  streak: number;
  /** Last date credited to the streak (UTC key). */
  lastStreakDate: string;
  bestStreak: number;
  /** Best score per puzzle date (UTC key). A date is complete at DAILY_REWARD_SCORE. */
  scores: Record<string, number>;
}

export interface SaveData {
  version: number;
  currency: number;
  ownedCosmetics: string[];
  equipped: Record<CosmeticCategory, string>;
  settings: PlayerSettings;
  onboardingComplete: boolean;
  /** Contextual one-time hints for systems the tutorial deliberately does not explain. */
  hints: { overdrive: boolean; fracture: boolean; energy: boolean; contract: boolean };
  achievements: string[];
  stats: PlayerStats;
  daily: DailyProgress;
}

export function createDefaultStats(): PlayerStats {
  return {
    bestScore: 0,
    legacyBestScore: 0,
    totalRuns: 0,
    totalScore: 0,
    totalLinesCleared: 0,
    rowsCleared: 0,
    columnsCleared: 0,
    piecesPlaced: 0,
    piecesRotated: 0,
    piecesCut: 0,
    bladesUsed: 0,
    bladesForged: 0,
    highestChain: 0,
    doubles: 0,
    triples: 0,
    maxClears: 0,
    perfectMirrors: 0,
    perfectClears: 0,
    overdrives: 0,
    overdriveSeconds: 0,
    fractures: 0,
    fractureEscapes: 0,
    clutches: 0,
    dailyPlays: 0,
    totalPlayTimeSeconds: 0,
    highestStage: 0,
    longestRunMoves: 0,
    contractsCompleted: 0,
    precisionHits: 0,
  };
}

export function createDefaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    currency: 0,
    ownedCosmetics: Object.values(DEFAULT_EQUIPPED),
    equipped: { ...DEFAULT_EQUIPPED },
    settings: {
      masterVolume: 0.85,
      soundVolume: 0.75,
      musicVolume: 0.4,
      muted: false,
      haptics: true,
      screenShake: true,
      reducedMotion: false,
      quality: 'auto',
      accessibleColors: false,
      highContrast: false,
    },
    onboardingComplete: false,
    hints: { overdrive: false, fracture: false, energy: false, contract: false },
    achievements: [],
    stats: createDefaultStats(),
    daily: {
      lastPlayedDate: '',
      lastRewardDate: '',
      currentDate: '',
      todayScore: 0,
      bestDailyScore: 0,
      streak: 0,
      lastStreakDate: '',
      bestStreak: 0,
      scores: {},
    },
  };
}
