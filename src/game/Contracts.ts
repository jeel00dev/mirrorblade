import { CONTRACTS } from '../config/difficulty';
import type { SeededRandom } from './SeededRandom';

export type ContractKind = 'clear-lines' | 'double' | 'rotated-clear' | 'fragment-clear';

export interface Contract {
  readonly kind: ContractKind;
  readonly title: string;
  readonly detail: string;
  readonly target: number;
  progress: number;
  movesLeft: number;
  readonly reward: { score: number; energy: number; shards: number };
}

export interface ContractMove {
  lineCount: number;
  rotated: boolean;
  fragment: boolean;
}

export type ContractOutcome = 'progress' | 'completed' | 'lapsed' | null;

/**
 * Mirror Contracts: optional short objectives. Completing one pays score, Blade Energy and shards;
 * failing one simply lets it lapse. Offers pause during Fracture and Overdrive so they never compete.
 */
export class Contracts {
  private active: Contract | null = null;
  private movesUntilOffer: number = CONTRACTS.interval;
  private stats = { offered: 0, completed: 0, lapsed: 0 };

  public current(): Contract | null {
    return this.active;
  }

  public summary(): { offered: number; completed: number; lapsed: number } {
    return { ...this.stats };
  }

  /** Called once per move before the move is evaluated. Returns a newly offered contract, or null. */
  public tick(context: { level: number; stage: number; fracture: boolean; overdrive: boolean; blades: number }, random: SeededRandom): Contract | null {
    if (this.active) return null;
    if (context.level < CONTRACTS.minLevel || context.fracture || context.overdrive) return null;
    this.movesUntilOffer -= 1;
    if (this.movesUntilOffer > 0) return null;
    this.movesUntilOffer = CONTRACTS.interval + random.integer(CONTRACTS.jitter * 2 + 1) - CONTRACTS.jitter;
    this.active = this.build(context, random);
    this.stats.offered += 1;
    return this.active;
  }

  /** Called after each committed placement. */
  public onMove(move: ContractMove): { outcome: ContractOutcome; contract: Contract | null } {
    const contract = this.active;
    if (!contract) return { outcome: null, contract: null };
    let progressed = false;
    switch (contract.kind) {
      case 'clear-lines': if (move.lineCount > 0) { contract.progress += move.lineCount; progressed = true; } break;
      case 'double': if (move.lineCount >= 2) { contract.progress = contract.target; progressed = true; } break;
      case 'rotated-clear': if (move.lineCount > 0 && move.rotated) { contract.progress = contract.target; progressed = true; } break;
      case 'fragment-clear': if (move.lineCount > 0 && move.fragment) { contract.progress = contract.target; progressed = true; } break;
    }
    if (contract.progress >= contract.target) {
      this.active = null;
      this.stats.completed += 1;
      return { outcome: 'completed', contract };
    }
    contract.movesLeft -= 1;
    if (contract.movesLeft <= 0) {
      this.active = null;
      this.stats.lapsed += 1;
      return { outcome: 'lapsed', contract };
    }
    return { outcome: progressed ? 'progress' : null, contract };
  }

  public reset(): void {
    this.active = null;
    this.movesUntilOffer = CONTRACTS.interval;
    this.stats = { offered: 0, completed: 0, lapsed: 0 };
  }

  private build(context: { level: number; stage: number; blades: number }, random: SeededRandom): Contract {
    const kinds: ContractKind[] = ['clear-lines', 'double', 'rotated-clear'];
    if (context.blades > 0) kinds.push('fragment-clear');
    const kind = random.pick(kinds);
    const late = context.level >= 0.6;
    const reward = {
      score: CONTRACTS.reward.scoreBase + CONTRACTS.reward.scorePerStage * context.stage,
      energy: CONTRACTS.reward.energyBase + CONTRACTS.reward.energyPerStage * context.stage,
      shards: CONTRACTS.reward.shards,
    };
    switch (kind) {
      case 'clear-lines': {
        const target = late ? 3 : 2;
        const moves = late ? 4 : 3;
        return { kind, title: `Clear ${target} lines`, detail: `in ${moves} moves`, target, progress: 0, movesLeft: moves, reward };
      }
      case 'double': return { kind, title: 'Double clear', detail: 'in 4 moves', target: 1, progress: 0, movesLeft: 4, reward };
      case 'rotated-clear': return { kind, title: 'Clear with a rotated piece', detail: 'in 3 moves', target: 1, progress: 0, movesLeft: 3, reward };
      default: return { kind: 'fragment-clear', title: 'Clear with a cut fragment', detail: 'in 4 moves', target: 1, progress: 0, movesLeft: 4, reward };
    }
  }
}
