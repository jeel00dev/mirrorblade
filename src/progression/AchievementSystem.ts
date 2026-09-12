import { ECONOMY } from '../config/economy';
import type { SaveData } from './SaveData';

export type AchievementEvent =
  | { type: 'place' }
  | { type: 'cut' }
  | { type: 'rotate' }
  | { type: 'clear'; rows: number; columns: number; mirroredPair: boolean; chain: number; lineCount: number; perfectMirror: boolean; perfectClear: boolean }
  | { type: 'score'; score: number; bladesUsed: number }
  | { type: 'perfect-cut' }
  | { type: 'blade-forged' }
  | { type: 'overdrive' }
  | { type: 'clutch' }
  | { type: 'fracture-escape'; lifetimeEscapes: number }
  | { type: 'daily'; streak: number }
  | { type: 'contract' }
  | { type: 'precision' }
  | { type: 'milestone'; index: number };

export interface AchievementDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly reward: number;
  /** Icon id from the icon family (Icons.ts). */
  readonly icon: string;
}

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  { id: 'first-reflection', name: 'First Reflection', description: 'Place your first mirrored piece.', reward: 12, icon: 'mirror' },
  { id: 'first-cut', name: 'First Cut', description: 'Use your first blade.', reward: 15, icon: 'blade' },
  { id: 'turned', name: 'Turned', description: 'Rotate a piece before placing it.', reward: 10, icon: 'rotate' },
  { id: 'reflection', name: 'Reflection', description: 'Clear both mirrored columns in one move.', reward: 24, icon: 'mirror' },
  { id: 'double-vision', name: 'Double Vision', description: 'Clear a row and a column in one move.', reward: 24, icon: 'stats' },
  { id: 'surgeon', name: 'Surgeon', description: 'Forge a blade through Blade Energy.', reward: 26, icon: 'energy' },
  { id: 'hot-streak', name: 'Hot Streak', description: 'Ignite Refraction Overdrive.', reward: 28, icon: 'overdrive' },
  { id: 'last-second', name: 'Last Second', description: 'Escape Fracture with under a second left.', reward: 36, icon: 'clutch' },
  { id: 'escape-artist', name: 'Escape Artist', description: 'Escape Fracture five times.', reward: 30, icon: 'fracture' },
  { id: 'perfect-cut', name: 'Perfect Cut', description: 'Clear lines with both halves of one cut.', reward: 30, icon: 'blade' },
  { id: 'mirror-clear', name: 'Mirror Clear', description: 'Clear the mirror axis itself.', reward: 30, icon: 'mirror' },
  { id: 'perfection', name: 'Perfection', description: 'Empty the board with a Perfect Clear.', reward: 45, icon: 'crest' },
  { id: 'chain-master', name: 'Chain Master', description: 'Reach Symmetry Chain ×5.', reward: 32, icon: 'chain' },
  { id: 'no-knife-needed', name: 'No Knife Needed', description: 'Reach 2,000 without using a blade.', reward: 28, icon: 'lock' },
  { id: 'master-of-glass', name: 'Master of Glass', description: 'Reach a score of 10,000.', reward: 45, icon: 'crest' },
  { id: 'daily-devotion', name: 'Daily Devotion', description: 'Play the Daily Mirror seven days in a row.', reward: 40, icon: 'daily' },
  { id: 'under-contract', name: 'Under Contract', description: 'Complete a Mirror Contract.', reward: 22, icon: 'contract' },
  { id: 'precise', name: 'Precise', description: 'Clear through a pair of Precision Cells.', reward: 22, icon: 'precision' },
  { id: 'mirror-level-iii', name: 'Mirror Level III', description: 'Reach 7,500 in one run.', reward: 30, icon: 'stage' },
  { id: 'mirror-level-v', name: 'Mirror Level V', description: 'Reach 30,000 in one run.', reward: 60, icon: 'stage' },
];

export class AchievementSystem {
  public constructor(private readonly save: SaveData) {}

  public evaluate(event: AchievementEvent): AchievementDefinition[] {
    const ids: string[] = [];
    switch (event.type) {
      case 'place': ids.push('first-reflection'); break;
      case 'cut': ids.push('first-cut'); break;
      case 'rotate': ids.push('turned'); break;
      case 'perfect-cut': ids.push('perfect-cut'); break;
      case 'blade-forged': ids.push('surgeon'); break;
      case 'overdrive': ids.push('hot-streak'); break;
      case 'clutch': ids.push('last-second'); break;
      case 'fracture-escape': if (event.lifetimeEscapes >= 5) ids.push('escape-artist'); break;
      case 'daily': if (event.streak >= 7) ids.push('daily-devotion'); break;
      case 'contract': ids.push('under-contract'); break;
      case 'precision': ids.push('precise'); break;
      case 'milestone':
        if (event.index >= 1) ids.push('mirror-level-iii');
        if (event.index >= 3) ids.push('mirror-level-v');
        break;
      case 'clear':
        if (event.rows > 0 && event.columns > 0) ids.push('double-vision');
        if (event.mirroredPair) ids.push('reflection');
        if (event.chain >= 5) ids.push('chain-master');
        if (event.perfectMirror) ids.push('mirror-clear');
        if (event.perfectClear) ids.push('perfection');
        break;
      case 'score':
        if (event.score >= 2_000 && event.bladesUsed === 0) ids.push('no-knife-needed');
        if (event.score >= 10_000) ids.push('master-of-glass');
        break;
    }
    const unlocked = ACHIEVEMENTS.filter((achievement) => ids.includes(achievement.id) && !this.save.achievements.includes(achievement.id));
    for (const achievement of unlocked) {
      this.save.achievements.push(achievement.id);
      this.save.currency += achievement.reward || ECONOMY.achievementRewardDefault;
    }
    return unlocked;
  }
}
