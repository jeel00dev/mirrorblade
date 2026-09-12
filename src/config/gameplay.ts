export const BOARD_SIZE = 9;
export const MIRROR_COLUMN = 4;
export const STARTING_BLADE_CHARGES = 3;
export const TRAY_BATCH_SIZE = 3;
export const DAILY_REWARD_SCORE = 900;
export const SAVE_DEBOUNCE_MS = 650;

/** Pointer distance (CSS px) before a press on a tray piece becomes a drag instead of a tap-to-rotate. */
export const DRAG_START_THRESHOLD = 7;
/** Touch-drag lifts the piece above the finger so the landing cells stay visible. */
export const DRAG_TOUCH_OFFSET = 84;
export const DRAG_MOUSE_OFFSET = 10;

export const GAMEPLAY_FLAGS = {
  adsEnabled: false,
  bannerAdsEnabled: false,
  rewardedAdsEnabled: false,
} as const;

export type Quality = 'auto' | 'low' | 'medium' | 'high';

export interface QualityProfile {
  maxDpr: number;
  particles: number;
  bladeReflections: boolean;
  boardEffects: boolean;
}

export const QUALITY_PROFILES: Record<Exclude<Quality, 'auto'>, QualityProfile> = {
  low: { maxDpr: 1, particles: 24, bladeReflections: false, boardEffects: false },
  medium: { maxDpr: 1.5, particles: 64, bladeReflections: true, boardEffects: true },
  high: { maxDpr: 2, particles: 120, bladeReflections: true, boardEffects: true },
};

/** Daily Mirror: the same sequence for every player; the director level ramps by batch index instead of score. */
export const DAILY_DIFFICULTY = {
  batchesPerTier: 4,
  maxTier: 5,
} as const;
