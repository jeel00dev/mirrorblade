import { BoardView } from '../render/BoardView';
import { Callouts } from './Callouts';
import { EffectsLayer } from '../render/EffectsLayer';
import { applyLayout, computeLayout, type LayoutMetrics } from '../render/Layout';
import { TrayView } from '../render/TrayView';
import { icon, iconButton } from './Icons';
import type { Contract } from '../game/Contracts';

export interface HudStatus {
  chain: number;
  overdrive: { active: boolean; final: boolean; remainingMs: number; progress: number } | null;
  fracture: { phase: 'warning' | 'active'; remainingMs: number; progress: number; final: boolean } | null;
}

/**
 * The persistent gameplay screen: HUD, board, tray, blade zone and hint bar.
 * Presentation only — every value shown here was committed by the run first.
 */
export class GameplayView {
  public readonly element: HTMLElement;
  public readonly board: BoardView;
  public readonly tray: TrayView;
  public readonly effects: EffectsLayer;
  public readonly callouts: Callouts;
  public readonly bladeZone: HTMLElement;
  public readonly bladeStage: HTMLElement;
  public readonly boardWrap: HTMLElement;
  private readonly scoreValue: HTMLElement;
  private readonly bestValue: HTMLElement;
  private readonly status: HTMLElement;
  private readonly bladeCount: HTMLElement;
  private readonly energyLabel: HTMLElement;
  private readonly ring: SVGCircleElement;
  private readonly hintBar: HTMLElement;
  private readonly stageMark: HTMLElement;
  private readonly ticks: SVGGElement;
  private layout: LayoutMetrics;
  private lastTier = 0;
  private scoreTween = 0;
  private lastScore = 0;

  public constructor(host: HTMLElement) {
    this.element = document.createElement('main');
    this.element.id = 'gameplay';
    this.element.className = 'screen screen-gameplay';
    this.element.setAttribute('aria-label', 'Gameplay');
    this.element.innerHTML = `
      <header class="hud">
        <div class="hud-score"><span class="crest">${icon('crest')}</span><div><strong id="score-value" class="num">0</strong><small>Best <b id="best-value">0</b><span class="mirror-stage" id="mirror-stage" title="Mirror level"><i></i><i></i><i></i><i></i><i></i><b>I</b></span></small></div></div>
        <div class="hud-controls">${iconButton('home', 'Home', 'home')}${iconButton('pause', 'Pause', 'pause')}</div>
      </header>
      <div class="hud-status" id="hud-status" aria-live="polite"></div>
      <div class="board-wrap"><div id="board"></div><div class="effects-host"></div><div class="callout-host"></div></div>
      <div id="tray"></div>
      <div class="blade-zone" id="blade-zone" data-testid="blade" aria-label="Blade">
        <div class="blade-dock">
          <svg class="energy-ring" viewBox="0 0 100 100" aria-hidden="true"><circle class="track" cx="50" cy="50" r="46"/><circle class="fill" cx="50" cy="50" r="46" style="--circ:289"/><g class="ticks" id="energy-ticks"></g></svg>
          <div class="blade-stage" id="blade-stage"></div>
        </div>
        <div class="blade-meta"><span class="blade-count">${icon('blade')}<b id="blade-count">3</b></span><span class="blade-energy-label" id="energy-label"><span class="charge-tier">Charge I</span> · <b>0%</b></span></div>
      </div>
      <div class="hint-bar" id="hint-bar" hidden></div>`;
    host.append(this.element);
    this.board = new BoardView(this.element.querySelector<HTMLElement>('#board')!);
    this.tray = new TrayView(this.element.querySelector<HTMLElement>('#tray')!);
    this.boardWrap = this.element.querySelector<HTMLElement>('.board-wrap')!;
    this.effects = new EffectsLayer(this.element.querySelector<HTMLElement>('.effects-host')!);
    this.callouts = new Callouts(this.element.querySelector<HTMLElement>('.callout-host')!);
    this.bladeZone = this.element.querySelector<HTMLElement>('#blade-zone')!;
    this.bladeStage = this.element.querySelector<HTMLElement>('#blade-stage')!;
    this.scoreValue = this.element.querySelector<HTMLElement>('#score-value')!;
    this.bestValue = this.element.querySelector<HTMLElement>('#best-value')!;
    this.status = this.element.querySelector<HTMLElement>('#hud-status')!;
    this.bladeCount = this.element.querySelector<HTMLElement>('#blade-count')!;
    this.energyLabel = this.element.querySelector<HTMLElement>('#energy-label')!;
    this.ring = this.element.querySelector<SVGCircleElement>('.energy-ring .fill')!;
    this.hintBar = this.element.querySelector<HTMLElement>('#hint-bar')!;
    this.stageMark = this.element.querySelector<HTMLElement>('#mirror-stage')!;
    this.ticks = this.element.querySelector<SVGGElement>('#energy-ticks')!;
    this.layout = computeLayout(window.innerWidth, window.innerHeight);
    this.relayout();
  }

  public relayout(): LayoutMetrics {
    const rect = this.element.getBoundingClientRect();
    const width = rect.width || window.innerWidth;
    const height = rect.height || window.innerHeight;
    this.layout = computeLayout(width, height);
    applyLayout(this.element, this.layout);
    return this.layout;
  }

  public metrics(): LayoutMetrics {
    return this.layout;
  }

  /** Score counts up over ~300–700 ms (longer for bigger gains); Best follows immediately. */
  public setScore(score: number, best: number, animate = true): void {
    if (score !== this.lastScore) {
      const from = this.lastScore;
      const gain = score - from;
      this.lastScore = score;
      if (this.scoreTween) cancelAnimationFrame(this.scoreTween);
      if (!animate || gain <= 0 || gain < 30 || document.body.classList.contains('reduced-motion')) {
        this.scoreValue.textContent = score.toLocaleString();
      } else {
        const duration = Math.min(700, 300 + gain / 4);
        const start = performance.now();
        const step = (now: number): void => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          this.scoreValue.textContent = Math.round(from + gain * eased).toLocaleString();
          if (t < 1) this.scoreTween = requestAnimationFrame(step); else this.scoreTween = 0;
        };
        this.scoreTween = requestAnimationFrame(step);
      }
      this.scoreValue.classList.remove('is-bumping');
      void this.scoreValue.offsetWidth;
      if (gain > 0) this.scoreValue.classList.add('is-bumping');
    }
    this.bestValue.textContent = Math.max(best, score).toLocaleString();
  }

  /** `progress` is 0–1 toward the current forge; `tier` (1–5) reflects the rising recharge cost. */
  public setBlades(count: number, progress: number, options: { bump?: boolean; forge?: boolean; full?: boolean; tier?: number } = {}): void {
    if (this.bladeCount.textContent !== String(count)) {
      this.bladeCount.textContent = String(count);
      if (options.bump) {
        this.bladeCount.classList.remove('is-bumping');
        void this.bladeCount.offsetWidth;
        this.bladeCount.classList.add('is-bumping');
      }
    }
    const percent = Math.round(Math.max(0, Math.min(1, progress)) * 100);
    this.ring.style.setProperty('--energy', String(Math.max(0, Math.min(1, progress))));
    const tier = options.tier ?? this.lastTier ?? 1;
    const numeral = ['I', 'II', 'III', 'IV', 'V'][Math.max(1, Math.min(5, tier)) - 1];
    this.energyLabel.innerHTML = `<span class="charge-tier">Charge ${numeral}</span> · <b>${percent}%</b>`;
    if (tier !== this.lastTier) {
      this.lastTier = tier;
      this.renderTicks(4 + tier * 1.5);
      this.energyLabel.classList.remove('is-bumping');
      void this.energyLabel.offsetWidth;
      this.energyLabel.classList.add('is-bumping');
    }
    this.bladeZone.classList.toggle('is-empty', count <= 0);
    this.bladeZone.classList.toggle('is-full', Boolean(options.full));
    this.bladeZone.setAttribute('aria-label', `Blade, ${count} ${count === 1 ? 'charge' : 'charges'}, charge tier ${numeral}, energy ${percent} percent`);
    if (options.forge) {
      this.bladeZone.classList.remove('is-forging');
      void this.bladeZone.offsetWidth;
      this.bladeZone.classList.add('is-forging');
      window.setTimeout(() => this.bladeZone.classList.remove('is-forging'), 900);
    }
  }

  public setBladeHover(hover: boolean): void {
    this.bladeZone.classList.toggle('is-hover', hover);
  }

  public suggestCut(): void {
    this.bladeZone.classList.remove('suggest-cut');
    void this.bladeZone.offsetWidth;
    this.bladeZone.classList.add('suggest-cut');
  }

  public setStatus(status: HudStatus): void {
    // Chips persist while their state lasts and are updated in place, so their entrance animation plays once.
    const fractureChip = this.chip('fracture', Boolean(status.fracture), () =>
      `${icon('fracture')}<span class="label">Fracture</span><b class="value"></b><span class="bar"><i></i></span>`);
    if (fractureChip && status.fracture) {
      const seconds = (status.fracture.remainingMs / 1000).toFixed(1);
      fractureChip.classList.toggle('is-final', status.fracture.final);
      fractureChip.querySelector<HTMLElement>('.label')!.hidden = status.fracture.phase !== 'warning';
      const value = fractureChip.querySelector<HTMLElement>('.value')!;
      value.hidden = status.fracture.phase === 'warning';
      if (value.textContent !== seconds) value.textContent = seconds;
      fractureChip.querySelector<HTMLElement>('.bar i')!.style.setProperty('--p', status.fracture.progress.toFixed(3));
    }
    const overdriveChip = this.chip('overdrive', Boolean(status.overdrive?.active) && !status.fracture, () =>
      `${icon('overdrive')}<b>2×</b><span class="label">Overdrive</span><span class="bar"><i></i></span>`);
    if (overdriveChip && status.overdrive) {
      overdriveChip.querySelector<HTMLElement>('.bar i')!.style.setProperty('--p', status.overdrive.progress.toFixed(3));
      overdriveChip.classList.toggle('is-final', status.overdrive.final);
    }
    const chainChip = this.chip('chain', status.chain >= 2, () => `${icon('chain')}<span class="label">Chain </span><b class="value"></b>`);
    if (chainChip) {
      const value = chainChip.querySelector<HTMLElement>('.value')!;
      const text = `×${status.chain}`;
      if (value.textContent !== text) {
        value.textContent = text;
        chainChip.classList.remove('is-bumping');
        void chainChip.offsetWidth;
        chainChip.classList.add('is-bumping');
      }
    }
  }

  private chip(kind: 'fracture' | 'overdrive' | 'chain' | 'stress' | 'contract' | 'daily', present: boolean, markup: () => string): HTMLElement | null {
    let element = this.status.querySelector<HTMLElement>(`.status-chip.${kind}`);
    if (!present) {
      element?.remove();
      return null;
    }
    if (!element) {
      element = document.createElement('span');
      element.className = `status-chip ${kind}`;
      element.innerHTML = markup();
      if (kind === 'chain') this.status.append(element); else this.status.prepend(element);
    }
    return element;
  }

  /** Tick marks around the ring: more segments as the recharge cost rises. */
  private renderTicks(count: number): void {
    const segments = Math.round(count);
    const marks: string[] = [];
    for (let index = 0; index < segments; index += 1) {
      const angle = (index / segments) * Math.PI * 2;
      const x1 = 50 + Math.cos(angle) * 42.5; const y1 = 50 + Math.sin(angle) * 42.5;
      const x2 = 50 + Math.cos(angle) * 49.5; const y2 = 50 + Math.sin(angle) * 49.5;
      marks.push(`<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"/>`);
    }
    this.ticks.innerHTML = marks.join('');
  }

  /** The ring bumps when energy particles arrive. */
  public energyArrived(): void {
    const dock = this.bladeZone.querySelector<HTMLElement>('.blade-dock')!;
    dock.classList.remove('is-receiving');
    void dock.offsetWidth;
    dock.classList.add('is-receiving');
  }

  public setStage(stage: number, visible: boolean): void {
    this.stageMark.hidden = !visible;
    this.stageMark.dataset.stage = String(stage);
    this.stageMark.querySelector('b')!.textContent = ['I', 'II', 'III', 'IV', 'V'][Math.max(1, Math.min(5, stage)) - 1] ?? 'I';
  }

  public setStress(stress: number): void {
    this.element.style.setProperty('--stress', stress.toFixed(2));
    const chip = this.chip('stress', stress >= 0.65, () => `${icon('mirror')}<span class="label">Mirror stress</span><span class="bar"><i></i></span>`);
    chip?.querySelector<HTMLElement>('.bar i')!.style.setProperty('--p', stress.toFixed(2));
  }

  public setContract(contract: Contract | null, state: 'offered' | 'progress' | 'completed' | 'lapsed'): void {
    const chip = this.chip('contract', Boolean(contract), () => `${icon('contract')}<span class="contract-text"><b class="title"></b><span class="detail"></span></span><span class="moves"></span>`);
    if (chip && contract) {
      chip.querySelector<HTMLElement>('.title')!.textContent = contract.title;
      chip.querySelector<HTMLElement>('.detail')!.textContent = contract.target > 1 ? `${contract.progress}/${contract.target} · ${contract.detail}` : contract.detail;
      chip.querySelector<HTMLElement>('.moves')!.textContent = `${contract.movesLeft}`;
      chip.classList.toggle('is-urgent', contract.movesLeft <= 1);
      if (state === 'progress') { chip.classList.remove('is-bumping'); void chip.offsetWidth; chip.classList.add('is-bumping'); }
    }
  }

  /** Daily Mirror: progress toward the day's target; turns gold when done. */
  public setDailyTarget(score: number, target: number, done: boolean, visible = true): void {
    const chip = this.chip('daily', visible, () => `${icon('daily')}<span class="label">Daily</span><b class="value"></b><span class="bar"><i></i></span>`);
    if (!chip) return;
    chip.classList.toggle('is-done', done);
    chip.querySelector<HTMLElement>('.value')!.textContent = done ? 'Done' : `${score.toLocaleString()} / ${target.toLocaleString()}`;
    chip.querySelector<HTMLElement>('.bar i')!.style.setProperty('--p', Math.min(1, score / target).toFixed(3));
  }

  public milestonePulse(): void {
    this.element.classList.remove('is-milestone');
    void this.element.offsetWidth;
    this.element.classList.add('is-milestone');
    window.setTimeout(() => this.element.classList.remove('is-milestone'), 1200);
  }

  public showHint(text: string, options: { skippable?: boolean; iconName?: string } = {}): void {
    this.hintBar.hidden = false;
    this.hintBar.innerHTML = `${icon(options.iconName ?? 'info')}<span>${text}</span>${options.skippable ? '<button type="button" data-action="skip-tutorial">Skip</button>' : ''}`;
  }

  public hideHint(): void {
    this.hintBar.hidden = true;
    this.hintBar.innerHTML = '';
  }

  public setDead(dead: boolean): void {
    this.board.element.classList.toggle('is-dead', dead);
    if (!dead) {
      this.board.element.classList.remove('is-mirror-dead', 'is-cinematic', 'is-unstable', 'is-recoil');
      this.setCinematic(false);
    }
  }

  /** Game-over cinematic: secondary HUD steps back, the score stays; the crest answers a new best. */
  public setCinematic(active: boolean, options: { newBest?: boolean } = {}): void {
    this.element.classList.toggle('is-cinematic', active);
    this.element.classList.toggle('is-new-best', active && Boolean(options.newBest));
  }

  public shake(level: 2 | 3): void {
    document.body.classList.remove('shake-2', 'shake-3');
    void document.body.offsetWidth;
    document.body.classList.add(`shake-${level}`);
    window.setTimeout(() => document.body.classList.remove(`shake-${level}`), 400);
  }

  /** Host-local coordinates for the effects layer. */
  public effectsPoint(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.effects.canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }
}
