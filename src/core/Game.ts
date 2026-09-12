import { AudioManager } from '../audio/AudioManager';
import { BLADE_ENERGY } from '../config/blade';
import { ACCESSIBLE_BLOCK_COLORS, COSMETICS, cosmeticById, type CosmeticCategory } from '../config/cosmetics';
import { clearShardReward, ECONOMY } from '../config/economy';
import { DRAG_MOUSE_OFFSET, DRAG_TOUCH_OFFSET, QUALITY_PROFILES, STARTING_BLADE_CHARGES, type Quality, type QualityProfile } from '../config/gameplay';
import { MOTION } from '../config/motion';
import { applyEnergy, chargeTier, createRack, energyForEvent, energyProgress, rechargeCost, spendBlade, type BladeRack } from '../game/BladeEnergy';
import { Contracts, type Contract } from '../game/Contracts';
import { DifficultyDirector, type DirectorState } from '../game/DifficultyDirector';
import { PrecisionCells } from '../game/PrecisionCells';
import { DIFFICULTY } from '../config/difficulty';
import { BladeCutter, type CutSpec } from '../game/BladeCutter';
import { BoardState } from '../game/BoardState';
import { ClearResolver } from '../game/ClearResolver';
import { ComboSystem } from '../game/ComboSystem';
import { dailySeed, utcDateKey } from '../game/DailyMode';
import { DAILY_TARGET, effectiveStreak, isCompleted, parseKey, recordDailyRun, shiftMonth } from '../game/DailyCalendar';
import { Fracture } from '../game/Fracture';
import { MoveAnalyzer } from '../game/MoveAnalyzer';
import { Overdrive } from '../game/Overdrive';
import { createPiece, pieceDimensions, type GridCell, type Piece } from '../game/Piece';
import { getPieceDefinition } from '../game/PieceLibrary';
import { occupancyRatio, PieceGenerator } from '../game/PieceGenerator';
import { PlacementSystem, type PlacementPreview } from '../game/PlacementSystem';
import { PlacementDeadline, type PlacementDeadlineSnapshot } from '../game/PlacementDeadline';
import { RunClock } from '../game/RunClock';
import { ScoreSystem } from '../game/ScoreSystem';
import { SeededRandom } from '../game/SeededRandom';
import { classifyClear, headlineFor, type SkillEvent } from '../game/SkillEvents';
import { Tray } from '../game/Tray';
import { PointerController, type DragPointer } from '../input/PointerController';
import { CrazyGamesAdapter } from '../platform/CrazyGamesAdapter';
import { StorageAdapter } from '../platform/StorageAdapter';
import { AchievementSystem, type AchievementDefinition } from '../progression/AchievementSystem';
import { Inventory } from '../progression/Inventory';
import type { SaveData } from '../progression/SaveData';
import { Ambience } from '../render/Ambience';
import { BladeScene } from '../render/BladeScene';
import { DragVisual } from '../render/DragVisual';
import { GameOverCinematic, type CinematicEvent, type SlashDirection } from '../render/GameOverCinematic';
import { rectsOverlap } from '../render/Layout';
import { GameplayView } from '../ui/GameplayView';
import { icon } from '../ui/Icons';
import { ScreenManager, type ScreenId } from '../ui/ScreenManager';
import { Toasts } from '../ui/Toasts';
import { buildHomeScreen } from '../ui/screens/HomeScreen';
import { buildSettingsScreen } from '../ui/screens/SettingsScreen';
import { buildCatalogScreen, mountCatalogPreview, type PreviewHandle } from '../ui/screens/ShopScreen';
import { buildAboutScreen, buildAchievementsScreen, buildDailyScreen, buildGameOverScreen, buildHowToScreen, buildPauseScreen, buildStatsScreen, type RunSummary } from '../ui/screens/InfoScreens';
import type { ScreenContext } from '../ui/screens/context';
import type { GameMode } from './GameMode';
import { RunPhaseMachine } from './GameState';

interface DragSession {
  piece: Piece;
  visual: DragVisual;
  sourceRect: DOMRect;
  point: DragPointer;
  preview: PlacementPreview | null;
  anchor: GridCell | null;
  overBlade: boolean;
  cut: CutSpec | null;
  bladeSoundPlayed: boolean;
}

interface RunStats {
  lines: number;
  rows: number;
  columns: number;
  shards: number;
  placed: number;
  cut: number;
  bladesUsed: number;
  bladesForged: number;
  highestChain: number;
  clutches: number;
  overdrives: number;
  stallMoves: number;
  lastPlaySeconds: number;
}

type TutorialStep = 0 | 1 | 2 | 3 | 4 | 5;

export class Game {
  private readonly phase = new RunPhaseMachine();
  private readonly board = new BoardState();
  private readonly placement = new PlacementSystem(this.board);
  private readonly clearResolver = new ClearResolver(this.board);
  private readonly cutter = new BladeCutter();
  private readonly analyzer = new MoveAnalyzer(this.board);
  private readonly tray = new Tray();
  private readonly score = new ScoreSystem();
  private readonly combo = new ComboSystem();
  private readonly overdrive = new Overdrive();
  private readonly fracture = new Fracture();
  private readonly director = new DifficultyDirector();
  private readonly contracts = new Contracts();
  private readonly precision = new PrecisionCells();
  private readonly placementDeadline = new PlacementDeadline();
  private readonly clock = new RunClock();
  private runRandom = new SeededRandom(1);
  private readonly achievements: AchievementSystem;
  private readonly inventory: Inventory;
  private readonly screens: ScreenManager;
  private readonly view: GameplayView;
  private readonly blade: BladeScene;
  private readonly toasts: Toasts;
  private readonly audio: AudioManager;
  private readonly pointer: PointerController;
  private readonly fractureEdges: HTMLElement;
  private readonly ambience: Ambience;
  private readonly cinematic: GameOverCinematic;
  private readonly bootScreen: HTMLElement;
  private generator = new PieceGenerator(new SeededRandom(Date.now()));
  private mode: GameMode = 'endless';
  private rack: BladeRack = createRack(STARTING_BLADE_CHARGES);
  private activeRun = false;
  private finishedRun = false;
  private drag: DragSession | null = null;
  private tutorialStep: TutorialStep = 0;
  private runStats: RunStats = this.newRunStats();
  private cutClearParents = new Map<string, Set<string>>();
  private resolveTimer: number | null = null;
  private deferredNavigation: (() => void) | null = null;
  private settingsReturn: 'home' | 'pause' = 'home';
  private readonly shopState: ScreenContext['shop'] = { category: 'blocks', selected: null, revealing: null };
  private readonly dailyView: ScreenContext['dailyView'] = { year: 0, month: 0, selected: '' };
  private dailyDate = '';
  private dailyCompletedThisRun = false;
  private dailyStreakExtended = false;
  private preview: PreviewHandle | null = null;
  private tick = 0;
  private lastTouchedPiece: string | null = null;
  private resizeGateTimer: number | null = null;
  private quality: QualityProfile = QUALITY_PROFILES.medium;
  private readonly stopMuteObserver: () => void;
  private lastOverdriveTick = 0;
  private lastFractureTick = 0;
  private overdriveSecondsCommitted = 0;
  /** The game-over slash alternates its diagonal from run to run. */
  private nextSlash: SlashDirection = 'tr-bl';
  private cinematicTimers: number[] = [];

  public constructor(
    private readonly root: HTMLElement,
    private readonly platform: CrazyGamesAdapter,
    private readonly storage: StorageAdapter,
    private readonly save: SaveData,
  ) {
    this.achievements = new AchievementSystem(save);
    this.inventory = new Inventory(save);
    this.audio = new AudioManager(save.settings);
    this.root.innerHTML = '';
    this.bootScreen = document.createElement('div');
    this.bootScreen.className = 'screen screen-boot';
    this.bootScreen.innerHTML = `<div class="boot-mark"><span class="boot-glyph">${icon('blade')}</span><div class="wordmark lg"><span>MIRROR</span><span>BLADE</span></div></div>`;
    this.view = new GameplayView(this.root);
    const host = document.createElement('div');
    host.className = 'screen-host';
    this.root.append(host, this.bootScreen);
    this.screens = new ScreenManager(host, this.view.element);
    this.toasts = new Toasts(this.root);
    this.fractureEdges = document.createElement('div');
    this.fractureEdges.className = 'fracture-edges';
    this.fractureEdges.setAttribute('aria-hidden', 'true');
    const crack = '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><path d="M0 0 30 28 24 44 46 52 40 70 60 74"/><path d="M0 0 12 38 4 60"/><path d="M0 0 44 12 62 8"/></svg>';
    this.fractureEdges.innerHTML = crack.repeat(4);
    this.root.append(this.fractureEdges);
    this.ambience = new Ambience(this.root);
    this.blade = new BladeScene();
    this.cinematic = new GameOverCinematic({
      board: this.view.board, blade: this.blade, effects: this.view.effects, layerHost: this.root,
      effectsPoint: (x, y) => this.view.effectsPoint(x, y),
    });
    this.pointer = new PointerController(this.view.element, {
      start: (pieceId, point, element) => this.startDrag(pieceId, point, element),
      move: (point) => this.moveDrag(point),
      end: (point, cancelled) => this.endDrag(point, cancelled),
      tap: (pieceId) => this.rotateTrayPiece(pieceId),
      resize: (point) => this.onResizeDuringDrag(point),
      interrupted: () => this.clock.gate('pointer', false),
    });
    this.root.addEventListener('click', this.onClick);
    // CrazyGames mobile requirement: no context menu / magnifier on long-press inside the game.
    this.root.addEventListener('contextmenu', (event) => event.preventDefault());
    this.root.addEventListener('input', this.onInput);
    this.root.addEventListener('pointerdown', () => {
      void this.audio.unlock();
      this.clock.gate('pointer', true);
      if (this.phase.isCinematic()) this.cinematic.skip();
    }, { capture: true });
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('resize', this.onResize);
    window.addEventListener('beforeunload', this.flush);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('focus', this.onFocus);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.stopMuteObserver = this.platform.observeMuteAudio((muted) => this.audio.setPlatformMuted(muted));
    this.applySettings();
    this.refreshHUD();
  }

  // ------------------------------------------------------------------ lifecycle

  public start(): void {
    this.platform.loadingStop();
    // First session (tutorial pending) goes straight into guided play; returning players land on Home.
    if (!this.save.onboardingComplete) this.startRun('endless');
    else this.showHome('forward');
    window.setTimeout(() => this.bootScreen.classList.add('is-done'), 120);
    window.setTimeout(() => this.bootScreen.remove(), 700);
  }

  public dispose(): void {
    cancelAnimationFrame(this.tick);
    this.cinematic.cancel();
    this.cinematicTimers.forEach((timer) => window.clearTimeout(timer));
    this.pointer.dispose();
    this.blade.dispose();
    this.ambience.dispose();
    this.view.effects.dispose();
    this.view.dispose();
    this.audio.dispose();
    this.stopMuteObserver();
    if (this.resolveTimer !== null) window.clearTimeout(this.resolveTimer);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('beforeunload', this.flush);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('focus', this.onFocus);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.flush();
  }

  // ------------------------------------------------------------------ debug bridge

  public getDebugState(): Record<string, unknown> {
    return {
      phase: this.phase.current(),
      screen: this.screens.current(),
      mode: this.mode,
      score: this.score.current(),
      runShards: this.runStats.shards,
      blades: this.rack.blades,
      energy: this.rack.energy,
      energyProgress: energyProgress(this.rack),
      rechargeCost: rechargeCost(this.rack.bladesEarned),
      bladesEarned: this.rack.bladesEarned,
      difficulty: this.director.state(),
      bladeTriangles: this.blade.triangles,
      bladePresentation: this.blade.diagnostics(),
      contract: this.contracts.current(),
      precision: this.precision.current(),
      chain: this.combo.current(),
      overdrive: this.overdrive.snapshot(this.clock.now()),
      fracture: this.fracture.snapshot(this.clock.now()),
      placementDeadline: this.placementDeadline.snapshot(this.clock.now()),
      clockRunning: this.clock.isRunning(),
      gates: this.clock.closedGateNames(),
      tray: this.tray.list().map((piece) => ({ ...piece, cells: [...piece.cells] })),
      board: this.board.snapshot(),
      activeRun: this.activeRun,
      tutorialStep: this.tutorialStep,
      cinematic: this.cinematic.progress(),
    };
  }

  /** Skips the game-over cinematic once the strike has landed (same rule as a tap). */
  public debugSkipCinematic(): boolean {
    return this.cinematic.skip();
  }

  public debugSetBlades(value: number): void {
    this.rack = { ...this.rack, blades: Math.max(0, Math.min(BLADE_ENERGY.maxBlades, Math.floor(value))) };
    this.refreshHUD();
  }

  /** Sets raw energy toward the current forge. */
  public debugSetEnergy(value: number): void {
    this.rack = { ...this.rack, energy: Math.max(0, Math.min(rechargeCost(this.rack.bladesEarned), value)) };
    this.refreshHUD();
  }

  public debugSetScore(value: number): void {
    this.score.set(value);
    this.director.observe({ score: this.score.current(), lineCount: 1, occupancy: occupancyRatio(this.board), legalOptions: 20 });
    this.refreshHUD();
  }

  public debugForcePiece(definitionId: string, tone: Piece['tone'] = 'cyan'): void {
    const definition = getPieceDefinition(definitionId);
    if (!definition) return;
    this.tray.replaceAll([createPiece(definition.id, definition.cells, tone, 999)]);
    this.view.tray.render(this.tray.list());
  }

  public debugFillBoard(cells: readonly GridCell[], tone: Piece['tone'] = 'cyan'): void {
    this.board.reset();
    this.board.occupy(cells, { tone, pieceId: 'debug' });
    this.view.board.setBoard(this.board.snapshot());
  }

  public debugEndRun(reason: 'stuck' | 'fracture' | 'timeout' = 'stuck'): void {
    if (this.activeRun) this.endRun(reason);
  }

  public debugSetPlacementDeadline(remainingMs: number): void {
    if (!this.activeRun || this.fracture.currentPhase() !== 'idle' || this.tutorialStep !== 0) return;
    this.placementDeadline.forceRemaining(this.clock.now(), remainingMs);
    this.syncPlacementDeadline();
  }

  public debugForceOverdrive(): void {
    this.overdrive.onMove({ tier: 'clear', lineCount: 1, perfectMirror: false, perfectClear: true, chain: 1 }, this.clock.now());
    this.onOverdriveStart();
  }

  public debugForceFracture(): void {
    this.fracture.forceWarning(this.clock.now());
    this.onFractureWarning();
  }

  public debugLayout(enabled: boolean): void {
    this.view.setLayoutDebug(enabled);
  }

  public debugSetOnboarding(complete: boolean): void {
    this.save.onboardingComplete = complete;
  }

  // ------------------------------------------------------------------ run

  private startRun(mode: GameMode, dailyDate?: string): void {
    this.cancelDrag(false);
    this.clearResolveTimer();
    this.cinematic.cancel();
    this.cinematicTimers.forEach((timer) => window.clearTimeout(timer));
    this.cinematicTimers = [];
    this.ambience.freeze(false);
    this.audio.setDucked(false);
    this.mode = mode;
    const today = utcDateKey();
    // A future date can never be played; anything up to today can.
    this.dailyDate = mode === 'daily' ? (dailyDate && dailyDate <= today ? dailyDate : today) : '';
    this.dailyCompletedThisRun = false;
    this.dailyStreakExtended = false;
    this.board.reset();
    this.score.reset();
    this.combo.reset();
    this.overdrive.reset();
    this.fracture.reset();
    this.placementDeadline.reset();
    this.director.reset();
    this.contracts.reset();
    this.precision.reset();
    this.rack = createRack(STARTING_BLADE_CHARGES);
    this.runStats = this.newRunStats();
    this.cutClearParents.clear();
    this.finishedRun = false;
    this.overdriveSecondsCommitted = 0;
    const seed = mode === 'daily' ? dailySeed(this.dailyDate) : (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    this.generator = new PieceGenerator(new SeededRandom(seed), { mode });
    this.runRandom = new SeededRandom((seed ^ 0x5bd1e995) >>> 0);
    this.tutorialStep = this.save.onboardingComplete || mode === 'daily' ? 0 : 1;
    this.tray.replaceAll(this.initialBatch());
    this.activeRun = true;
    this.platform.resetCompletion();
    if (this.phase.current() !== 'PLAYING') this.phase.transition('PLAYING');
    if (mode === 'daily') this.beginDaily();
    this.clock.reset();
    if (this.tutorialStep === 0) this.armPlacementDeadline();
    this.view.setDead(false);
    this.view.callouts.clear();
    this.view.effects.clear();
    this.view.board.setBoard(this.board.snapshot());
    this.view.tray.render(this.tray.list());
    this.view.tray.setUrgent(false);
    this.view.board.setPrecision(null);
    this.view.setContract(null, 'lapsed');
    this.view.setStress(0);
    this.setBodyState();
    this.audio.clearLayers();
    this.audio.setIntensity(0);
    this.refreshHUD();
    if (mode !== 'daily') this.view.setDailyTarget(0, DAILY_TARGET, false, false);
    this.showGameplay('forward');
    this.showTutorial();
    this.platform.gameplayStart();
    this.startTicking();
  }

  private initialBatch(): Piece[] {
    if (this.tutorialStep === 0) return this.generator.nextBatch(this.board, this.director.state().level);
    return [this.makePiece('domino', 'cyan'), this.makePiece('l4', 'coral'), this.makePiece('line3', 'amber')];
  }

  private makePiece(definitionId: string, tone: Piece['tone']): Piece {
    const definition = getPieceDefinition(definitionId)!;
    return createPiece(definitionId, definition.cells, tone, 1);
  }

  /**
   * Game over. The model is locked and every consequence (stats, shards, save, daily) is committed immediately;
   * the katana cinematic then plays out and the results overlay follows its RESULTS_REVEAL event.
   */
  private endRun(reason: 'stuck' | 'fracture' | 'timeout'): void {
    if (this.finishedRun) return;
    this.finishedRun = true;
    this.activeRun = false;
    this.clearPlacementDeadline();
    this.cancelDrag(false);
    this.clearResolveTimer();
    this.deferredNavigation = null;
    this.phase.transition('CINEMATIC');
    this.platform.gameplayStop();
    this.clock.gate('over', false);
    this.audio.clearLayers();
    this.setBodyState();
    const finalScore = this.score.current();
    const oldBest = this.save.stats.bestScore;
    const isNewBest = finalScore > oldBest;
    const shards = this.runStats.shards;
    const stats = this.save.stats;
    this.save.currency += shards;
    stats.totalRuns += 1;
    stats.totalScore += finalScore;
    stats.totalLinesCleared += this.runStats.lines;
    stats.rowsCleared += this.runStats.rows;
    stats.columnsCleared += this.runStats.columns;
    stats.bestScore = Math.max(oldBest, finalScore);
    stats.highestStage = Math.max(stats.highestStage, this.director.state().stage);
    stats.longestRunMoves = Math.max(stats.longestRunMoves, this.runStats.placed);
    stats.contractsCompleted += this.contracts.summary().completed;
    stats.precisionHits += this.precision.summary().hit;
    this.commitPlayTime();
    this.commitOverdriveTime();
    let dailySummary: RunSummary['daily'] = null;
    if (this.mode === 'daily') {
      const today = utcDateKey();
      const result = recordDailyRun(this.save.daily, this.dailyDate, today, finalScore);
      if (result.firstCompletion) this.onDailyCompleted(result.streakExtended, result.streak);
      dailySummary = { date: this.dailyDate, target: DAILY_TARGET, completed: isCompleted(this.save.daily, this.dailyDate), streak: effectiveStreak(this.save.daily, today), streakExtended: this.dailyStreakExtended || result.streakExtended, isToday: this.dailyDate === today };
    }
    this.clock.gate('over', true);
    if (isNewBest && finalScore >= 1_500) this.platform.happyTime();
    this.storage.save(this.save);
    this.storage.flush();
    const summary: RunSummary = {
      score: finalScore, best: stats.bestScore, isNewBest, lines: this.runStats.lines, highestChain: this.runStats.highestChain,
      bladesForged: this.runStats.bladesForged, bladesUsed: this.runStats.bladesUsed, overdrives: this.runStats.overdrives,
      clutches: this.runStats.clutches, shards, mode: this.mode, reason, daily: dailySummary,
    };
    const direction = this.nextSlash;
    this.nextSlash = direction === 'tr-bl' ? 'tl-br' : 'tr-bl';
    this.cinematic.play(
      { reason, isNewBest, direction, reducedMotion: this.save.settings.reducedMotion, seed: this.runRandom.integer(0xffffffff), particles: this.quality.boardEffects },
      (event) => this.onCinematicEvent(event, summary),
    );
  }

  /** Everything outside the cinematic layer that answers its timeline: HUD, audio, haptics, phase, results. */
  private onCinematicEvent(event: CinematicEvent, summary: RunSummary): void {
    const reduced = this.save.settings.reducedMotion;
    switch (event) {
      case 'CINEMATIC_START':
        this.view.callouts.clear();
        this.view.hideHint();
        this.view.setCinematic(true, { newBest: false });
        this.ambience.freeze(true);
        this.audio.setDucked(true);
        if (reduced) this.audio.play('game-over');
        break;
      case 'KATANA_ENTER':
        if (!reduced) this.audio.play('katana-enter');
        break;
      case 'KATANA_SLASH_START':
        if (!reduced) this.audio.play('katana-slash');
        break;
      case 'KATANA_IMPACT':
        if (!reduced) {
          this.audio.play('katana-impact');
          if (this.save.settings.screenShake) this.view.shake(2);
        }
        this.audio.vibrate(reduced ? 10 : [14, 30, 8]);
        if (summary.isNewBest) this.view.setCinematic(true, { newBest: true });
        if (summary.reason === 'fracture') {
          this.fractureEdges.classList.add('is-shattering');
          this.cinematicTimer(() => this.fractureEdges.classList.remove('is-shattering'), 900);
        }
        break;
      case 'BLOCKS_RELEASE':
        if (!reduced) this.audio.play('blocks-detach');
        break;
      case 'BLOCKS_FALL':
        if (!reduced) for (const delay of [180, 340, 540]) this.cinematicTimer(() => this.audio.play('block-thud'), delay);
        break;
      case 'BOARD_SETTLED':
        if (!reduced) this.audio.play('mirror-end');
        break;
      case 'RESULTS_REVEAL':
        if (this.phase.current() === 'CINEMATIC') this.phase.transition('OVER');
        this.audio.setDucked(false);
        if (summary.isNewBest) this.cinematicTimer(() => this.audio.play('best'), reduced ? 0 : 160);
        this.blade.unmount();
        this.screens.show('gameover', () => buildGameOverScreen(summary, { staged: !reduced }), { overlay: true, focus: '[data-action="restart"]' });
        break;
      case 'CINEMATIC_END':
        this.ambience.freeze(false);
        break;
      default:
        break;
    }
  }

  private cinematicTimer(action: () => void, delay: number): void {
    this.cinematicTimers.push(window.setTimeout(action, delay));
  }

  // ------------------------------------------------------------------ ticking (timed systems)

  private startTicking(): void {
    cancelAnimationFrame(this.tick);
    const step = (): void => {
      if (!this.activeRun) return;
      this.updateTimers();
      this.tick = requestAnimationFrame(step);
    };
    this.tick = requestAnimationFrame(step);
  }

  private updateTimers(): void {
    const now = this.clock.now();
    const overdriveEvent = this.overdrive.update(now);
    if (overdriveEvent === 'final') this.onOverdriveFinal();
    else if (overdriveEvent === 'ended') this.onOverdriveEnd();
    const fractureEvent = this.fracture.update(now);
    if (fractureEvent === 'active') this.onFractureStart();
    else if (fractureEvent === 'timeout') { this.endRun('fracture'); return; }
    if (this.fracture.currentPhase() !== 'idle' && this.placementDeadline.isActive()) this.clearPlacementDeadline();
    if (this.fracture.currentPhase() === 'idle' && this.placementDeadline.update(now) === 'expired') { this.endRun('timeout'); return; }
    const od = this.overdrive.snapshot(now);
    const fr = this.fracture.snapshot(now);
    if (od.phase === 'final' && this.clock.isRunning()) {
      const second = Math.ceil(od.remainingMs / 1000);
      if (second !== this.lastOverdriveTick) { this.lastOverdriveTick = second; this.audio.play('overdrive-tick'); }
    }
    if (fr.phase === 'active' && this.clock.isRunning()) {
      const second = Math.ceil(fr.remainingMs / 1000);
      if (second !== this.lastFractureTick && second <= 3) { this.lastFractureTick = second; this.audio.play('fracture-tick'); this.audio.vibrate(6); }
    }
    document.body.classList.toggle('state-overdrive-final', od.phase === 'final');
    document.body.classList.toggle('state-fracture-final', fr.phase === 'active' && fr.remainingMs <= 3000);
    this.syncPlacementDeadline(this.placementDeadline.snapshot(now));
    this.view.setStatus({
      chain: this.combo.current(),
      overdrive: od.phase === 'idle' ? null : { active: true, final: od.phase === 'final', remainingMs: od.remainingMs, progress: od.progress },
      fracture: fr.phase === 'idle' ? null : { phase: fr.phase, remainingMs: fr.remainingMs, progress: fr.windowMs > 0 ? fr.remainingMs / fr.windowMs : 0, final: fr.phase === 'active' && fr.remainingMs <= 3000 },
    });
  }

  private setBodyState(): void {
    const od = this.overdrive.snapshot(this.clock.now());
    const fr = this.fracture.currentPhase();
    document.body.classList.toggle('state-overdrive', this.activeRun && od.phase !== 'idle');
    document.body.classList.toggle('state-fracture-warning', this.activeRun && fr === 'warning');
    document.body.classList.toggle('state-fracture', this.activeRun && fr === 'active');
    if (!this.activeRun) document.body.classList.remove('state-overdrive-final', 'state-fracture-final', 'state-stress', 'state-stress-high');
    this.syncPlacementDeadline();
    this.blade.setState({ overdrive: od.phase !== 'idle', fracture: fr === 'active' });
  }

  private onOverdriveStart(): void {
    this.runStats.overdrives += 1;
    this.save.stats.overdrives += 1;
    this.setBodyState();
    this.audio.play('overdrive-start');
    this.audio.setLayer('overdrive', true);
    this.audio.vibrate([10, 30, 14]);
    this.view.callouts.show('OVERDRIVE', 'perfect', '2× score');
    if (!this.save.hints.overdrive) {
      this.save.hints.overdrive = true;
      window.setTimeout(() => this.view.showHint('Overdrive — every clear scores double for 10 s', { iconName: 'overdrive' }), 700);
      window.setTimeout(() => this.view.hideHint(), 4800);
    }
    this.showUnlocks(this.achievements.evaluate({ type: 'overdrive' }));
    this.queueSave();
  }

  private onOverdriveFinal(): void {
    this.lastOverdriveTick = 0;
  }

  private onOverdriveEnd(): void {
    this.commitOverdriveTime();
    this.setBodyState();
    this.audio.play('overdrive-end');
    this.audio.setLayer('overdrive', false);
    this.queueSave();
  }

  private onFractureWarning(): void {
    this.clearPlacementDeadline();
    this.runStats.stallMoves = 0;
    this.save.stats.fractures += 1;
    this.setBodyState();
    this.audio.play('fracture-warn');
    this.view.tray.setUrgent(true);
    if (!this.save.hints.fracture) {
      this.save.hints.fracture = true;
      this.view.showHint('Fracture — clear a line to escape', { iconName: 'fracture' });
    } else this.view.callouts.show('FRACTURE', 'hint', 'clear a line to escape');
    this.queueSave();
  }

  private onFractureStart(): void {
    this.lastFractureTick = 0;
    this.setBodyState();
    this.audio.play('fracture-start');
    this.audio.setLayer('fracture', true);
    this.audio.vibrate([12, 40, 12]);
  }

  private onFractureEscape(clutch: boolean): void {
    this.view.hideHint();
    this.view.tray.setUrgent(false);
    this.setBodyState();
    this.audio.setLayer('fracture', false);
    this.save.stats.fractureEscapes += 1;
    this.showUnlocks(this.achievements.evaluate({ type: 'fracture-escape', lifetimeEscapes: this.save.stats.fractureEscapes }));
    if (clutch) {
      this.runStats.clutches += 1;
      this.save.stats.clutches += 1;
      this.audio.play('clutch');
      this.audio.vibrate([16, 30, 20]);
      this.showUnlocks(this.achievements.evaluate({ type: 'clutch' }));
    } else this.audio.play('escape');
  }

  // ------------------------------------------------------------------ input: rotate / drag

  private canInteract(): boolean {
    return this.activeRun && this.phase.is('PLAYING') && this.screens.current() === 'gameplay';
  }

  private rotateTrayPiece(pieceId: string): void {
    if (!this.canInteract()) return;
    const before = this.tray.find(pieceId);
    if (!before) return;
    const rotated = this.tray.rotate(pieceId);
    if (!rotated) return;
    this.lastTouchedPiece = pieceId;
    this.view.tray.rotated(rotated, before.cells);
    this.audio.play('rotate');
    this.audio.vibrate(4);
    this.save.stats.piecesRotated += 1;
    this.showUnlocks(this.achievements.evaluate({ type: 'rotate' }));
    if (this.tutorialStep === 3) this.advanceTutorial(4);
    this.queueSave();
  }

  private startDrag(pieceId: string, point: DragPointer, element: HTMLElement): boolean {
    if (!this.canInteract()) return false;
    const piece = this.tray.find(pieceId);
    if (!piece) return false;
    this.lastTouchedPiece = pieceId;
    this.audio.play('pickup');
    const sourceRect = element.getBoundingClientRect();
    const metrics = this.view.metrics();
    const previewCell = this.view.tray.previewCell(pieceId) ?? metrics.trayCell;
    const visual = new DragVisual(piece, sourceRect, metrics.cell, previewCell);
    this.view.tray.markSource(pieceId, true);
    this.drag = { piece, visual, sourceRect, point, preview: null, anchor: null, overBlade: false, cut: null, bladeSoundPlayed: false };
    this.phase.transition('DRAGGING');
    this.moveDrag(point);
    return true;
  }

  private moveDrag(point: DragPointer): void {
    const drag = this.drag;
    if (!drag) return;
    drag.point = point;
    const offset = point.pointerType === 'touch' ? DRAG_TOUCH_OFFSET : DRAG_MOUSE_OFFSET;
    const x = point.clientX;
    const y = point.clientY - offset;
    drag.visual.moveTo(x, y);
    const visualRect = drag.visual.rect();
    const bladeRect = this.view.bladeZone.querySelector<HTMLElement>('.blade-dock')!.getBoundingClientRect();
    drag.overBlade = rectsOverlap(visualRect, bladeRect);
    drag.visual.setOverBlade(drag.overBlade);
    if (drag.overBlade) {
      this.view.board.clearGhost();
      this.view.setBladeHover(true);
      this.blade.setState({ hover: true });
      const cuts = this.cutter.validCuts(drag.piece);
      drag.cut = this.closestCut(drag.piece, cuts, visualRect, bladeRect);
      const usable = this.rack.blades > 0 && drag.cut !== null;
      if (!drag.bladeSoundPlayed && usable) { this.audio.play('blade-hover'); drag.bladeSoundPlayed = true; }
      if (drag.cut) {
        const dimensions = pieceDimensions(drag.piece);
        const denominator = drag.cut.orientation === 'vertical' ? dimensions.cols : dimensions.rows;
        drag.visual.setCutGuide(drag.cut.orientation, drag.cut.seam / denominator, this.rack.blades > 0);
      } else drag.visual.setCutGuide(longAxis(drag.piece), 0.5, false);
      drag.preview = null;
      drag.anchor = null;
      return;
    }
    this.view.setBladeHover(false);
    this.blade.setState({ hover: false });
    drag.visual.setCutGuide(null);
    const grid = this.view.board.gridRect();
    const cell = grid.width / 9;
    const dimensions = pieceDimensions(drag.piece);
    const centerX = visualRect.left + visualRect.width / 2;
    const centerY = visualRect.top + visualRect.height / 2;
    const near = centerX >= grid.left - cell && centerX <= grid.right + cell && centerY >= grid.top - cell && centerY <= grid.bottom + cell;
    if (!near) {
      drag.preview = null;
      drag.anchor = null;
      this.view.board.clearGhost();
      return;
    }
    const anchor = {
      row: Math.round((centerY - grid.top) / cell - dimensions.rows / 2),
      col: Math.round((centerX - grid.left) / cell - dimensions.cols / 2),
    };
    const preview = this.placement.preview(drag.piece, anchor);
    drag.preview = preview;
    drag.anchor = anchor;
    this.view.board.showGhost(preview.original, preview.mirrored, preview.valid, drag.piece.tone);
  }

  private endDrag(point: DragPointer, cancelled: boolean): void {
    const drag = this.drag;
    if (!drag) return;
    drag.point = point;
    this.view.setBladeHover(false);
    this.blade.setState({ hover: false });
    this.clock.gate('pointer', true);
    if (!cancelled && drag.overBlade) {
      if (this.rack.blades > 0 && drag.cut) this.commitCut(drag);
      else this.rejectDrag(drag, true);
      return;
    }
    if (!cancelled && drag.preview?.valid && drag.anchor) {
      this.commitPlacement(drag);
      return;
    }
    this.rejectDrag(drag, false);
  }

  private rejectDrag(drag: DragSession, bladeReject: boolean): void {
    this.view.board.clearGhost();
    const metrics = this.view.metrics();
    const currentSource = this.view.tray.pieceElement(drag.piece.id)?.getBoundingClientRect() ?? drag.sourceRect;
    const previewCell = this.view.tray.previewCell(drag.piece.id) ?? metrics.trayCell;
    drag.visual.returnTo(currentSource, previewCell, metrics.cell);
    this.view.tray.markSource(drag.piece.id, false);
    this.audio.play(bladeReject ? 'invalid' : 'return');
    if (bladeReject) {
      this.audio.vibrate(6);
      if (this.rack.blades <= 0) this.view.showHint('No blades left — fill the energy ring with clears to forge one', { iconName: 'energy' });
      else if (drag.piece.cells.length < 2) this.view.showHint('A single block has nothing to split', { iconName: 'blade' });
      window.setTimeout(() => { if (this.tutorialStep === 0) this.view.hideHint(); }, 2600);
    }
    this.drag = null;
    this.phase.transition('PLAYING');
  }

  private cancelDrag(animated: boolean): void {
    if (!this.drag) return;
    const drag = this.drag;
    this.view.board.clearGhost();
    this.view.setBladeHover(false);
    this.blade.setState({ hover: false });
    if (animated) this.rejectDrag(drag, false);
    else {
      drag.visual.remove();
      this.view.tray.markSource(drag.piece.id, false);
      this.drag = null;
      if (this.phase.current() === 'DRAGGING') this.phase.transition('PLAYING');
    }
  }

  private onResizeDuringDrag(point: DragPointer | null): void {
    if (!this.drag || !point) return;
    const inside = point.clientX >= 0 && point.clientX <= window.innerWidth && point.clientY >= 0 && point.clientY <= window.innerHeight;
    if (inside) this.moveDrag(point);
    else this.cancelDrag(true);
  }

  private closestCut(piece: Piece, cuts: readonly CutSpec[], visualRect: DOMRect, bladeRect: DOMRect): CutSpec | null {
    if (cuts.length === 0) return null;
    const dimensions = pieceDimensions(piece);
    const bladeX = bladeRect.left + bladeRect.width / 2;
    const bladeY = bladeRect.top + bladeRect.height / 2;
    let best: CutSpec | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const cut of cuts) {
      const line = cut.orientation === 'vertical'
        ? visualRect.left + visualRect.width * (cut.seam / dimensions.cols)
        : visualRect.top + visualRect.height * (cut.seam / dimensions.rows);
      const distance = Math.abs(line - (cut.orientation === 'vertical' ? bladeX : bladeY));
      if (distance < bestDistance) { best = cut; bestDistance = distance; }
    }
    return best;
  }

  // ------------------------------------------------------------------ transactions

  private commitPlacement(drag: DragSession): void {
    const now = this.clock.now();
    const cells = this.placement.commit(drag.piece, drag.anchor!);
    this.clearPlacementDeadline();
    this.tray.consume(drag.piece.id);
    this.view.tray.markSource(drag.piece.id, false);
    drag.visual.settleAndRemove(60);
    this.drag = null;
    this.phase.transition('RESOLVING');
    this.view.board.clearGhost();

    const detected = this.clearResolver.detect();
    const chain = this.combo.resolveMove(detected.lineCount);
    const boardEmptyAfter = this.board.occupiedCount() - detected.cells.length === 0;
    const event = classifyClear(detected, chain, boardEmptyAfter);
    const fractureResult = this.fracture.onAction('place', detected.lineCount > 0, now);
    const multiplier = this.overdrive.multiplier();
    const breakdown = this.score.addMove(cells.length, event, { multiplier, clutch: fractureResult.clutch });
    const shardReward = clearShardReward(detected.lineCount);
    this.runStats.shards += shardReward.total;
    const energyAmount = energyForEvent(event, fractureResult.clutch);
    const energyResult = applyEnergy(this.rack, energyAmount);
    this.rack = energyResult.rack;
    const ignited = this.overdrive.onMove(event, now);
    const precisionResult = this.precision.onMove(detected.cells);
    const contractResult = this.contracts.onMove({ lineCount: detected.lineCount, rotated: drag.piece.rotation !== 0, fragment: drag.piece.cutGeneration > 0 });
    let bonusEnergy = 0;
    let bonusScore = 0;
    if (precisionResult === 'hit') { bonusScore += this.precisionReward().score; bonusEnergy += this.precisionReward().energy; }
    if (contractResult.outcome === 'completed' && contractResult.contract) {
      bonusScore += contractResult.contract.reward.score;
      bonusEnergy += contractResult.contract.reward.energy;
      this.save.currency += contractResult.contract.reward.shards;
    }
    if (bonusScore > 0) this.score.addBonus(bonusScore, multiplier);
    if (bonusEnergy > 0) {
      const extra = applyEnergy(this.rack, bonusEnergy);
      if (extra.gain.bladesForged > 0 && energyResult.gain.bladesForged === 0) {
        // A bonus can complete a forge; fold it into the same celebration.
        (energyResult.gain as { bladesForged: number }).bladesForged = 1;
      }
      this.rack = extra.rack;
    }
    if (detected.lineCount > 0) this.clearResolver.resolve();
    const directorState = this.director.observe({ score: this.score.current(), lineCount: detected.lineCount, occupancy: occupancyRatio(this.board), legalOptions: 0 });

    // Stats and achievements commit before any presentation.
    const stats = this.save.stats;
    this.runStats.placed += 1;
    stats.piecesPlaced += 1;
    this.runStats.stallMoves = detected.lineCount > 0 ? 0 : this.runStats.stallMoves + 1;
    this.runStats.highestChain = Math.max(this.runStats.highestChain, chain);
    stats.highestChain = Math.max(stats.highestChain, chain);
    if (detected.lineCount > 0) {
      this.runStats.lines += detected.lineCount;
      this.runStats.rows += detected.rows.length;
      this.runStats.columns += detected.columns.length;
      if (event.tier === 'double') stats.doubles += 1;
      if (event.tier === 'triple') stats.triples += 1;
      if (event.tier === 'max') stats.maxClears += 1;
      if (event.perfectMirror) stats.perfectMirrors += 1;
      if (event.perfectClear) stats.perfectClears += 1;
      const mirroredPair = detected.columns.some((col) => col !== 4 && detected.columns.includes(8 - col));
      this.showUnlocks(this.achievements.evaluate({ type: 'clear', rows: detected.rows.length, columns: detected.columns.length, mirroredPair, chain, lineCount: detected.lineCount, perfectMirror: event.perfectMirror, perfectClear: event.perfectClear }));
      if (drag.piece.parentId) this.markCutFragmentClear(drag.piece);
    }
    if (energyResult.gain.bladesForged > 0) {
      this.runStats.bladesForged += 1;
      stats.bladesForged += 1;
      this.showUnlocks(this.achievements.evaluate({ type: 'blade-forged' }));
    }
    this.showUnlocks(this.achievements.evaluate({ type: 'place' }));
    this.showUnlocks(this.achievements.evaluate({ type: 'score', score: this.score.current(), bladesUsed: this.runStats.bladesUsed }));
    this.checkDailyReward();

    // Presentation.
    const placedSnapshot = detected.lineCount > 0 ? this.withCells(this.board.snapshot(), detected.cells, drag.piece.tone) : this.board.snapshot();
    this.view.board.setBoard(placedSnapshot, cells);
    this.view.board.pulse('place');
    this.audio.play('place');
    this.audio.play('mirror');
    this.audio.vibrate(8);
    const cellSize = this.view.board.cellSize();
    this.view.effects.placement(cells.map((cell) => { const c = this.view.board.cellCenter(cell); return this.view.effectsPoint(c.x, c.y); }), cellSize);
    if (detected.lineCount > 0) this.presentClear(detected.rows, detected.columns, detected.cells, event, fractureResult.clutch, breakdown.multiplier, shardReward.total);
    this.presentEnergy(energyResult.gain.amount + bonusEnergy, energyResult.gain.bladesForged > 0, energyResult.gain.energyBefore, this.rack.energy, detected.cells);
    if (precisionResult === 'hit') this.onPrecisionHit();
    else if (precisionResult === 'expired') this.view.board.setPrecision(null);
    if (contractResult.outcome === 'completed' && contractResult.contract) this.onContractCompleted(contractResult.contract);
    else if (contractResult.outcome === 'lapsed') this.onContractLapsed();
    else if (contractResult.outcome === 'progress' && contractResult.contract) this.view.setContract(contractResult.contract, 'progress');
    if (directorState.milestone !== null) this.onMilestone(directorState.milestone);
    this.presentStress(directorState);
    if (fractureResult.escaped) this.onFractureEscape(fractureResult.clutch);
    if (ignited) this.onOverdriveStart();
    this.audio.setLayer('chain', chain >= 2);
    this.refreshHUD();
    this.view.tray.render(this.tray.list());
    if (this.tutorialStep === 1) this.advanceTutorial(2);

    const wait = this.save.settings.reducedMotion ? MOTION.reducedMotionMs : detected.lineCount > 0 ? MOTION.clearResolveMs : MOTION.placeResolveMs;
    this.clearResolveTimer();
    this.resolveTimer = window.setTimeout(() => this.finishResolution(), wait);
    this.queueSave();
  }

  private presentClear(rows: readonly number[], columns: readonly number[], cells: readonly GridCell[], event: SkillEvent, clutch: boolean, multiplier: number, shards: number): void {
    const cellSize = this.view.board.cellSize();
    const grid = this.view.board.gridRect();
    const origin = this.view.effectsPoint(grid.left, grid.top);
    const points = cells.map((cell) => { const c = this.view.board.cellCenter(cell); return this.view.effectsPoint(c.x, c.y); });
    const strong = event.lineCount >= 2 || event.perfectMirror || event.perfectClear || clutch;
    const premium = event.perfectClear || event.perfectMirror || event.tier === 'max' || clutch;
    const intensity = event.perfectClear ? 1 : event.tier === 'max' ? 0.95 : event.tier === 'triple' ? 0.8 : event.tier === 'double' ? 0.6 : 0.4;
    const reduced = this.save.settings.reducedMotion;
    // Timeline: 0 detect · ~60 ms anticipation (strong) · 120–360 ms dissolve · 180 ms title · 250–550 ms energy travel · score settles by ~700 ms.
    const anticipation = reduced ? 0 : strong ? 70 : 0;
    if (premium && !reduced) this.view.board.perfectDim();
    this.view.board.animateClear(cells, event.perfectMirror, anticipation);
    window.setTimeout(() => {
      this.view.effects.lineClear([...rows.map((index) => ({ horizontal: true, index })), ...columns.map((index) => ({ horizontal: false, index }))], points, cellSize, origin, intensity);
    }, anticipation);
    const headline = headlineFor(event, clutch);
    if (headline) {
      const tier = clutch ? 'clutch' : event.perfectClear ? 'perfect' : event.tier === 'max' ? 'max' : event.perfectMirror ? 'perfect' : event.tier === 'triple' ? 'triple' : 'double';
      const detail = multiplier > 1 ? `${multiplier}× score` : event.chain >= 2 ? `chain ×${event.chain}` : '';
      const shardDetail = `+${shards} ${shards === 1 ? 'shard' : 'shards'}`;
      const sub = detail ? `${detail} · ${shardDetail}` : shardDetail;
      window.setTimeout(() => this.view.callouts.show(headline, tier, sub), reduced ? 0 : premium ? 220 : 140);
    }
    this.view.board.pulse(event.perfectClear ? 'perfect' : event.tier === 'max' ? 'max' : event.tier === 'triple' ? 'triple' : event.tier === 'double' ? 'double' : 'place');
    if (event.tier === 'triple') this.blade.flash(0.35);
    if (event.tier === 'max' || premium) window.setTimeout(() => this.blade.flash(premium ? 0.8 : 0.55), reduced ? 0 : 260);
    const sound = clutch ? null : event.perfectClear ? 'perfect-clear' : event.tier === 'max' ? 'max' : event.tier === 'triple' ? 'triple' : event.tier === 'double' ? 'double' : 'clear';
    if (sound) window.setTimeout(() => this.audio.play(sound), anticipation);
    if (event.perfectMirror && !event.perfectClear) this.audio.play('perfect-mirror');
    if (event.chain >= 2) this.audio.play('chain');
    this.audio.setChainDepth(event.chain);
    this.audio.vibrate(event.tier === 'clear' ? 10 : [10, 20, 14]);
    if (this.save.settings.screenShake && !reduced) {
      if (event.perfectClear || event.tier === 'max' || clutch) window.setTimeout(() => this.view.shake(3), anticipation + 40);
      else if (event.tier === 'triple') window.setTimeout(() => this.view.shake(2), anticipation + 40);
    }
    this.ambience.pulse(intensity);
  }

  private presentEnergy(amount: number, forged: boolean, before: number, after: number, sourceCells: readonly GridCell[] = []): void {
    if (amount <= 0 && !forged) return;
    const cost = rechargeCost(this.rack.bladesEarned);
    const full = this.rack.blades >= BLADE_ENERGY.maxBlades && this.rack.energy >= cost;
    if (sourceCells.length > 0 && amount > 0) {
      const dock = this.view.bladeZone.querySelector<HTMLElement>('.blade-dock')!.getBoundingClientRect();
      const target = this.view.effectsPoint(dock.left + dock.width / 2, dock.top + dock.height / 2);
      const points = sourceCells.slice(0, 16).map((cell) => { const c = this.view.board.cellCenter(cell); return this.view.effectsPoint(c.x, c.y); });
      const count = amount >= 40 ? 16 : amount >= 26 ? 12 : amount >= 14 ? 8 : 4;
      this.view.effects.energyTransfer(points, target, count, this.view.board.cellSize(), () => this.view.energyArrived());
      window.setTimeout(() => {
        this.view.setBlades(this.rack.blades, energyProgress(this.rack), { bump: forged, forge: forged, full, tier: chargeTier(this.rack) });
        this.blade.setState({ charges: this.rack.blades, energy: energyProgress(this.rack) });
        this.blade.energyPulse();
      }, this.save.settings.reducedMotion ? 0 : 320);
    } else {
      this.view.setBlades(this.rack.blades, energyProgress(this.rack), { bump: forged, forge: forged, full, tier: chargeTier(this.rack) });
      this.blade.setState({ charges: this.rack.blades, energy: energyProgress(this.rack) });
    }
    if (forged) {
      this.blade.forgeBurst();
      window.setTimeout(() => {
        this.audio.play('blade-forged');
        this.audio.vibrate([8, 24, 16]);
        const tier = chargeTier(this.rack);
        this.view.callouts.show('NEW BLADE', 'forge', tier > 1 ? `charge ${['I', 'II', 'III', 'IV', 'V'][tier - 1]} · ${rechargeCost(this.rack.bladesEarned)} energy next` : 'forged from energy');
      }, 260);
    } else if ((before / cost < 0.5 && after / cost >= 0.5) || (before / cost < 0.75 && after / cost >= 0.75)) this.audio.play('energy-milestone');
    if (this.tutorialStep === 5) this.completeTutorial();
    if (!this.save.hints.energy && this.tutorialStep === 0 && amount > 0) {
      this.save.hints.energy = true;
      this.view.showHint('Clears fill the blade ring — a full ring forges a new blade', { iconName: 'energy' });
      window.setTimeout(() => this.view.hideHint(), 4200);
    }
  }

  private commitCut(drag: DragSession): void {
    const result = this.cutter.cut(drag.piece, drag.cut!);
    if (!result || !this.tray.replaceWithCut(drag.piece.id, result)) {
      this.rejectDrag(drag, true);
      return;
    }
    const spent = spendBlade(this.rack);
    this.rack = spent.rack;
    this.fracture.onAction('cut', false, this.clock.now());
    this.runStats.cut += 1;
    this.runStats.bladesUsed += 1;
    this.save.stats.piecesCut += 1;
    this.save.stats.bladesUsed += 1;
    this.showUnlocks(this.achievements.evaluate({ type: 'cut' }));
    this.drag = null;
    this.phase.transition('CUTTING');

    drag.visual.cutAndRemove();
    const dock = this.view.bladeZone.querySelector<HTMLElement>('.blade-dock')!.getBoundingClientRect();
    this.view.effects.cutSparks(this.view.effectsPoint(dock.left + dock.width / 2, dock.top + dock.height / 2), this.view.board.cellSize());
    this.blade.slash();
    this.audio.play('cut');
    this.audio.vibrate([7, 16, 9]);
    this.refreshHUD();
    if (spent.redeemed) window.setTimeout(() => { this.audio.play('blade-forged'); this.view.callouts.show('BLADE REFORGED', 'forge', 'banked energy'); }, 200);
    window.setTimeout(() => {
      this.view.tray.render(this.tray.list(), {
        arriving: [result.a.id, result.b.id],
        reveal: [result.a.id, result.b.id],
        smoothReveal: !this.save.settings.reducedMotion,
      });
      if (this.phase.current() === 'CUTTING') this.phase.transition('PLAYING');
      if (this.tutorialStep === 4) this.advanceTutorial(5);
      this.afterTransaction(false);
    }, this.save.settings.reducedMotion ? MOTION.reducedMotionMs : MOTION.cutResolveMs);
    this.queueSave();
  }

  private finishResolution(): void {
    this.resolveTimer = null;
    this.view.board.setBoard(this.board.snapshot());
    if (this.tray.isEmpty()) {
      this.tray.replaceAll(this.generator.nextBatch(this.board, this.director.state().level));
      this.view.tray.render(this.tray.list(), { arriving: this.tray.list().map((piece) => piece.id) });
    }
    if (this.phase.current() === 'RESOLVING') this.phase.transition('PLAYING');
    if (this.tutorialStep === 2) window.setTimeout(() => { if (this.tutorialStep === 2) this.advanceTutorial(3); }, 1400);
    this.afterTransaction(true);
  }

  /** Runs after any board transaction settles: game-over analysis, Fracture arming, deferred navigation. */
  private afterTransaction(resetPlacementDeadline = false): void {
    if (!this.activeRun) return;
    const analysis = this.analyzer.analyze(this.tray.list(), this.rack.blades);
    if (analysis.gameOver) { this.endRun('stuck'); return; }
    if (!analysis.canPlace && analysis.canCut) this.view.suggestCut();
    const armed = this.fracture.evaluate({
      placements: this.runStats.placed,
      occupancy: occupancyRatio(this.board),
      stallMoves: this.runStats.stallMoves,
      legalOptions: analysis.legalOptions,
      tutorialComplete: this.tutorialStep === 0,
      overdriveActive: this.overdrive.isActive(),
    }, this.clock.now());
    if (armed) this.onFractureWarning();
    if (this.tutorialStep === 0 && this.mode === 'endless') {
      const state = this.director.state();
      const offered = this.contracts.tick({ level: state.level, stage: state.stage, fracture: this.fracture.currentPhase() !== 'idle', overdrive: this.overdrive.isActive(), blades: this.rack.blades }, this.runRandom);
      if (offered) this.onContractOffered(offered);
      const target = this.precision.tick(this.board, state.level, this.runRandom);
      if (target) { this.view.board.setPrecision(target.cells); this.audio.play('precision-spawn'); }
    }
    if ((resetPlacementDeadline || !this.placementDeadline.isActive()) && this.tutorialStep === 0 && this.fracture.currentPhase() === 'idle') this.armPlacementDeadline();
    if (this.deferredNavigation) {
      const navigate = this.deferredNavigation;
      this.deferredNavigation = null;
      navigate();
    }
  }

  private armPlacementDeadline(): void {
    this.placementDeadline.arm(this.clock.now(), this.director.state().base);
    this.syncPlacementDeadline();
  }

  private clearPlacementDeadline(): void {
    this.placementDeadline.clear();
    this.syncPlacementDeadline();
  }

  private syncPlacementDeadline(snapshot: PlacementDeadlineSnapshot = this.placementDeadline.snapshot(this.clock.now())): void {
    const visible = this.activeRun && this.fracture.currentPhase() === 'idle' && snapshot.warning;
    document.body.classList.toggle('state-deadline-final', visible);
    this.view.setPlacementDeadline(visible ? snapshot.seconds : null);
  }

  private clearResolveTimer(): void {
    if (this.resolveTimer !== null) window.clearTimeout(this.resolveTimer);
    this.resolveTimer = null;
  }

  private withCells(snapshot: ReturnType<BoardState['snapshot']>, cells: readonly GridCell[], tone: Piece['tone']) {
    for (const cell of cells) {
      const row = snapshot[cell.row];
      if (row && !row[cell.col]) row[cell.col] = { tone, pieceId: 'clearing' };
    }
    return snapshot;
  }

  // ------------------------------------------------------------------ tutorial

  private showTutorial(): void {
    this.view.tray.clearHighlight();
    switch (this.tutorialStep) {
      case 1: this.view.showHint('Drag a piece onto the board', { skippable: true, iconName: 'blocks' }); this.view.tray.highlightFirst(); break;
      case 2: this.view.showHint('It mirrors across the glass — both halves must fit', { skippable: true, iconName: 'mirror' }); break;
      case 3: this.view.showHint('Tap a piece to rotate it', { skippable: true, iconName: 'rotate' }); break;
      case 4: this.view.showHint('Drag a piece over the blade to split it', { skippable: true, iconName: 'blade' }); this.view.suggestCut(); break;
      case 5: this.view.showHint('Clears fill the blade ring — a full ring forges a new blade', { skippable: true, iconName: 'energy' }); break;
      default: this.view.hideHint();
    }
  }

  private advanceTutorial(step: TutorialStep): void {
    this.tutorialStep = step;
    this.showTutorial();
  }

  private completeTutorial(): void {
    this.save.onboardingComplete = true;
    this.tutorialStep = 0;
    this.view.hideHint();
    this.view.tray.clearHighlight();
    if (this.activeRun && this.phase.is('PLAYING') && this.fracture.currentPhase() === 'idle') this.armPlacementDeadline();
    this.queueSave();
  }

  // ------------------------------------------------------------------ navigation

  private context(): ScreenContext {
    const today = utcDateKey();
    if (!this.dailyView.selected) {
      const { year, month } = parseKey(today);
      this.dailyView.year = year;
      this.dailyView.month = month;
      this.dailyView.selected = today;
    }
    return { save: this.save, inventory: this.inventory, activeRun: this.activeRun && !this.finishedRun, runScore: this.score.current(), shop: this.shopState, dailyView: this.dailyView, today };
  }

  /** Navigation waits for an in-flight board transaction so a menu can never race a placement. */
  private navigate(action: () => void): void {
    // The game-over cinematic owns the screen: a navigation request is at most a skip, never a screen change.
    if (this.phase.isCinematic()) { this.cinematic.skip(); return; }
    if (this.phase.isBusy() && this.phase.current() !== 'DRAGGING') { this.deferredNavigation = action; return; }
    this.cancelDrag(false);
    action();
  }

  private showGameplay(direction: 'forward' | 'back'): void {
    const fromHome = this.screens.current() === 'home';
    this.disposePreview();
    this.screens.showGameplay(direction);
    this.blade.mount(this.view.bladeStage, { travel: fromHome });
    if (fromHome && !this.save.settings.reducedMotion) this.cutReveal();
    this.blade.setState({ charges: this.rack.blades, energy: this.rack.energy / BLADE_ENERGY.full, hover: false });
    this.clock.gate('screen', true);
    this.view.relayout();
    if (this.activeRun) this.platform.gameplayStart();
  }

  /** Home → Play: a thin diagonal cut line sweeps across as the board arrives. */
  private cutReveal(): void {
    const line = document.createElement('div');
    line.className = 'cut-reveal';
    line.setAttribute('aria-hidden', 'true');
    this.root.append(line);
    this.audio.play('slice');
    window.setTimeout(() => line.remove(), 700);
  }

  private leaveGameplay(): void {
    this.cancelDrag(false);
    this.clock.gate('screen', false);
    this.platform.gameplayStop();
  }

  private showHome(direction: 'forward' | 'back'): void {
    this.leaveGameplay();
    this.disposePreview();
    const element = this.screens.show('home', () => buildHomeScreen(this.context()), { direction, focus: '[data-action="quick-play"], [data-action="resume"]' });
    const stage = element.querySelector<HTMLElement>('#hero-stage');
    if (stage) {
      this.blade.setSkin(this.inventory.equipped('blades'));
      this.blade.setState({ charges: 3, hover: false, energy: 0.35, overdrive: false, fracture: false });
      this.blade.mount(stage, { hero: true });
      this.syncBladeControls();
    }
  }

  private showCatalog(mode: 'shop' | 'collection', refresh = false): void {
    this.disposePreview();
    const build = (): HTMLElement => buildCatalogScreen(this.context(), mode);
    if (refresh) this.screens.refresh(mode, build);
    else this.screens.show(mode, build, { onLeave: () => this.disposePreview() });
    const element = this.screens.activeElement();
    const card = element?.querySelector<HTMLElement>('[data-preview-id]');
    const item = card ? cosmeticById(card.dataset.previewId ?? '') : undefined;
    if (element && item) this.preview = mountCatalogPreview(element, item, this.blade, this.blockColors());
    this.syncBladeControls();
    this.shopState.revealing = null;
  }

  private disposePreview(): void {
    this.preview?.dispose();
    this.preview = null;
    this.blade.setSkin(this.inventory.equipped('blades'));
  }

  private syncBladeControls(): void {
    const reduced = this.save.settings.reducedMotion;
    const paused = this.blade.isShowcasePaused();
    this.screens.activeElement()?.querySelectorAll<HTMLButtonElement>('[data-action="blade-motion"]').forEach((control) => {
      control.disabled = reduced;
      control.setAttribute('aria-pressed', String(paused || reduced));
      control.setAttribute('aria-label', reduced ? 'Blade animation disabled by reduced motion' : paused ? 'Resume blade animation' : 'Pause blade animation');
      control.innerHTML = icon(paused || reduced ? 'play' : 'pause') + `<span>${reduced ? 'Still' : paused ? 'Resume' : 'Pause'}</span>`;
    });
    const replay = this.screens.activeElement()?.querySelector<HTMLButtonElement>('[data-action="blade-replay"]');
    if (replay) replay.disabled = reduced;
  }

  private handleAction(action: string, value?: string): void {
    void this.audio.unlock();
    if (action !== 'noop') this.audio.play('tap');
    switch (action) {
      case 'home': this.navigate(() => this.showHome(this.screens.current() === 'gameplay' ? 'forward' : 'back')); break;
      case 'pause':
        this.navigate(() => {
          if (!this.activeRun) { this.showHome('forward'); return; }
          this.leaveGameplay();
          this.screens.show('pause', () => buildPauseScreen(this.context()), { overlay: true, focus: '[data-action="resume"]' });
        });
        break;
      case 'resume':
        if (this.activeRun && !this.finishedRun) this.showGameplay('back');
        else this.startRun(this.mode, this.dailyDate || undefined);
        break;
      case 'quick-play': this.startRun('endless'); break;
      case 'daily':
        this.navigate(() => {
          if (this.screens.current() === 'gameplay') this.leaveGameplay();
          const { year, month } = parseKey(utcDateKey());
          this.dailyView.year = year; this.dailyView.month = month; this.dailyView.selected = utcDateKey();
          this.screens.show('daily', () => buildDailyScreen(this.context()));
        });
        break;
      case 'daily-month': {
        const next = shiftMonth(this.dailyView.year, this.dailyView.month, value === 'next' ? 1 : -1);
        const { year: ty, month: tm } = parseKey(utcDateKey());
        if (next.year > ty || (next.year === ty && next.month > tm)) break;
        this.dailyView.year = next.year; this.dailyView.month = next.month;
        this.screens.refresh('daily', () => buildDailyScreen(this.context()));
        break;
      }
      case 'daily-select':
        if (value && value <= utcDateKey()) { this.dailyView.selected = value; this.screens.refresh('daily', () => buildDailyScreen(this.context())); }
        break;
      case 'daily-play': {
        const date = value ?? this.dailyView.selected;
        if (date && date <= utcDateKey()) this.startRun('daily', date);
        break;
      }
      case 'restart':
        this.navigate(() => {
          void this.platform.requestMidgameAd({
            onStart: () => { this.audio.setPlatformMuted(true); this.clock.gate('ad', false); },
            onFinish: () => { this.audio.setPlatformMuted(false); this.clock.gate('ad', true); },
          }).finally(() => this.startRun(this.mode, this.dailyDate || undefined));
        });
        break;
      case 'settings':
        this.settingsReturn = this.screens.current() === 'pause' || (this.activeRun && !this.finishedRun && this.screens.current() === 'gameplay') ? 'pause' : 'home';
        this.navigate(() => {
          if (this.screens.current() === 'gameplay') this.leaveGameplay();
          this.screens.show('settings', () => buildSettingsScreen(this.context(), this.settingsReturn), { direction: this.screens.current() === 'about' ? 'back' : 'forward' });
        });
        break;
      case 'about': this.screens.show('about', () => buildAboutScreen()); break;
      case 'shop': this.shopState.selected = null; if (this.screens.current() === 'home') this.shopState.category = 'blocks'; this.navigate(() => { this.leaveGameplay(); this.showCatalog('shop'); }); break;
      case 'collection': this.shopState.selected = null; if (this.screens.current() === 'home') this.shopState.category = 'blocks'; this.navigate(() => { this.leaveGameplay(); this.showCatalog('collection'); }); break;
      case 'stats': this.screens.show('stats', () => buildStatsScreen(this.context())); break;
      case 'achievements': this.screens.show('achievements', () => buildAchievementsScreen(this.context())); break;
      case 'howto':
        this.navigate(() => {
          if (this.screens.current() === 'gameplay') this.leaveGameplay();
          const back = this.activeRun && !this.finishedRun && this.screens.current() === 'pause' ? 'pause' : 'home';
          this.screens.show('howto', () => buildHowToScreen(back));
        });
        break;
      case 'catalog-category':
        if (value) { this.shopState.category = value as CosmeticCategory; this.shopState.selected = null; }
        this.showCatalog(this.screens.current() === 'collection' ? 'collection' : 'shop', true);
        break;
      case 'catalog-select':
        if (value) this.shopState.selected = value;
        this.showCatalog(this.screens.current() === 'collection' ? 'collection' : 'shop', true);
        // On phones the page scrolls; bring the updated preview into view.
        this.screens.activeElement()?.querySelector<HTMLElement>('.screen-body')?.scrollTo({ top: 0, behavior: this.save.settings.reducedMotion ? 'auto' : 'smooth' });
        break;
      case 'purchase': if (value) this.purchase(value); break;
      case 'blade-replay': this.blade.replayShowcase(); this.syncBladeControls(); break;
      case 'blade-motion': this.blade.toggleShowcase(); this.syncBladeControls(); break;
      case 'blade-detail': {
        const detail = this.blade.toggleDetail();
        const control = this.screens.activeElement()?.querySelector<HTMLButtonElement>('[data-action="blade-detail"]');
        if (control) {
          control.setAttribute('aria-pressed', String(detail));
          control.innerHTML = icon('blade') + `<span>${detail ? 'Full katana' : 'Inspect fittings'}</span>`;
        }
        break;
      }
      case 'equip':
        if (value && this.inventory.equip(value)) {
          this.applyCosmetics();
          this.audio.play('equip');
          this.queueSave();
          this.showCatalog(this.screens.current() === 'collection' ? 'collection' : 'shop', true);
        }
        break;
      case 'catalog-unequip':
        if (value) {
          this.inventory.resetCategory(value as CosmeticCategory);
          this.applyCosmetics();
          this.queueSave();
          this.shopState.selected = null;
          this.showCatalog(this.screens.current() === 'collection' ? 'collection' : 'shop', true);
        }
        break;
      case 'preview-effect': this.preview?.play?.(); this.audio.play('triple'); break;
      case 'preview-sound': {
        const item = value ? cosmeticById(value) : undefined;
        const previous = this.inventory.equipped('sounds').sound ?? 'studio';
        if (item?.sound) this.audio.setTheme(item.sound);
        this.audio.play('place'); window.setTimeout(() => this.audio.play('double'), 180); window.setTimeout(() => this.audio.play('cut'), 520);
        window.setTimeout(() => this.audio.setTheme(previous), 1200);
        break;
      }
      case 'skip-tutorial': this.completeTutorial(); break;
      case 'reset-tutorial':
        this.save.onboardingComplete = false;
        this.queueSave();
        this.toasts.show('Tutorial reset', 'Guidance appears on your next run.', 'howto');
        this.screens.refresh('settings', () => buildSettingsScreen(this.context(), this.settingsReturn));
        break;
      default: break;
    }
  }

  private purchase(id: string): void {
    const item = cosmeticById(id);
    const result = this.inventory.purchase(id);
    if (result.ok && item) {
      this.audio.play('purchase');
      this.audio.vibrate(8);
      this.shopState.revealing = id;
      this.shopState.selected = id;
      this.animateShards(this.save.currency + item.cost, this.save.currency);
      this.toasts.show('Added to your collection', `${item.name} is ready to equip.`, 'owned');
      this.queueSave();
      this.showCatalog('shop', true);
    } else if (result.reason === 'funds') {
      this.toasts.show('Not enough Mirror Shards', 'Finish runs, clear lines and chase achievements to earn more.', 'shard');
    }
  }

  private animateShards(from: number, to: number): void {
    const element = this.screens.activeElement()?.querySelector<HTMLElement>('#catalog-shards b');
    if (!element) return;
    const start = performance.now();
    const duration = this.save.settings.reducedMotion ? 60 : 520;
    const step = (now: number): void => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      element.textContent = Math.round(from + (to - from) * eased).toLocaleString();
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ------------------------------------------------------------------ settings & cosmetics

  private handleSetting(key: string, value: string | boolean | number): void {
    const settings = this.save.settings;
    if (typeof value === 'number') {
      if (key === 'masterVolume' || key === 'soundVolume' || key === 'musicVolume') settings[key] = Math.max(0, Math.min(1, value));
    } else if (typeof value === 'boolean') {
      if (key === 'muted' || key === 'haptics' || key === 'screenShake' || key === 'reducedMotion' || key === 'accessibleColors' || key === 'highContrast') settings[key] = value;
    } else if (key === 'quality' && (value === 'auto' || value === 'low' || value === 'medium' || value === 'high')) settings.quality = value as Quality;
    this.applySettings();
    this.queueSave();
    if (key === 'soundVolume') this.audio.play('place');
    if (key === 'masterVolume') this.audio.play('tap');
  }

  private applySettings(): void {
    const settings = this.save.settings;
    document.body.classList.toggle('reduced-motion', settings.reducedMotion);
    document.body.classList.toggle('motion-forced', !settings.reducedMotion);
    document.body.classList.toggle('accessible-colors', settings.accessibleColors);
    document.body.classList.toggle('high-contrast', settings.highContrast);
    this.quality = this.resolveQuality(settings.quality);
    this.audio.updateLevels();
    this.screens.setReducedMotion(settings.reducedMotion);
    this.blade.setReducedMotion(settings.reducedMotion);
    this.blade.setMaxDpr(this.quality.maxDpr);
    this.view.effects.configure({ budget: this.quality.particles, dpr: Math.min(window.devicePixelRatio || 1, this.quality.maxDpr), reducedMotion: settings.reducedMotion });
    this.ambience.configure({ enabled: this.quality.boardEffects, density: this.quality.maxDpr >= 2 ? 1 : 0.7, reducedMotion: settings.reducedMotion });
    this.applyCosmetics();
  }

  private resolveQuality(quality: Quality): QualityProfile {
    if (quality !== 'auto') return QUALITY_PROFILES[quality];
    const cores = navigator.hardwareConcurrency || 4;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
    if (cores <= 4 || memory <= 2) return QUALITY_PROFILES.low;
    return cores >= 8 && memory >= 8 ? QUALITY_PROFILES.high : QUALITY_PROFILES.medium;
  }

  private blockColors(): readonly string[] {
    return this.save.settings.accessibleColors ? ACCESSIBLE_BLOCK_COLORS : this.inventory.equipped('blocks').colors;
  }

  private applyCosmetics(): void {
    const style = document.documentElement.style;
    const [cyan, coral, amber, violet] = this.blockColors();
    style.setProperty('--block-cyan', cyan ?? '#43c2c7');
    style.setProperty('--block-coral', coral ?? '#ea7d78');
    style.setProperty('--block-amber', amber ?? '#ecb455');
    style.setProperty('--block-violet', violet ?? '#8e60d8');
    const [frame, cellFace, gap, axis] = this.inventory.equipped('boards').colors;
    style.setProperty('--board-frame', frame ?? '#181b20');
    style.setProperty('--grid-empty', cellFace ?? '#24282f');
    style.setProperty('--grid-gap', gap ?? '#0f1216');
    style.setProperty('--mirror-axis', axis ?? '#353940');
    const blade = this.inventory.equipped('blades');
    this.blade.setSkin(blade);
    const effect = this.inventory.equipped('effects');
    const trail = this.inventory.equipped('trails');
    this.view.effects.configure({ effect: effect.effect, effectColors: effect.colors, trail: trail.trail, trailColors: trail.colors });
    this.audio.setTheme(this.inventory.equipped('sounds').sound ?? 'studio');
    void COSMETICS;
  }

  // ------------------------------------------------------------------ HUD & helpers

  private refreshHUD(): void {
    this.view.setScore(this.score.current(), this.save.stats.bestScore);
    const full = this.rack.blades >= BLADE_ENERGY.maxBlades && this.rack.energy >= rechargeCost(this.rack.bladesEarned);
    this.view.setBlades(this.rack.blades, energyProgress(this.rack), { full, tier: chargeTier(this.rack) });
    this.view.setStage(this.director.state().stage, this.mode === 'endless');
    this.blade.setState({ charges: this.rack.blades, energy: energyProgress(this.rack) });
  }

  private precisionReward(): { score: number; energy: number } {
    return { score: 150, energy: 12 };
  }

  private onContractOffered(contract: Contract): void {
    this.view.setContract(contract, 'offered');
    this.audio.play('contract-offer');
    if (!this.save.hints.contract) {
      this.save.hints.contract = true;
      this.view.showHint('Mirror Contract — an optional goal with a reward', { iconName: 'contract' });
      window.setTimeout(() => this.view.hideHint(), 4200);
    }
  }

  private onContractCompleted(contract: Contract): void {
    this.view.setContract(null, 'completed');
    this.view.callouts.show('CONTRACT', 'forge', `+${contract.reward.score} · +${contract.reward.shards} shards`);
    this.audio.play('contract-complete');
    this.audio.vibrate([8, 20, 10]);
    this.showUnlocks(this.achievements.evaluate({ type: 'contract' }));
  }

  private onContractLapsed(): void {
    this.view.setContract(null, 'lapsed');
  }

  private onPrecisionHit(): void {
    this.view.board.setPrecision(null);
    this.view.callouts.show('PRECISION', 'triple', `+${this.precisionReward().score}`);
    this.audio.play('precision-hit');
    this.showUnlocks(this.achievements.evaluate({ type: 'precision' }));
  }

  private onMilestone(index: number): void {
    const numeral = ['II', 'III', 'IV', 'V', 'V+'][index] ?? 'V';
    const score = DIFFICULTY.milestones[index] ?? 0;
    this.view.callouts.show(`MIRROR LEVEL ${numeral}`, 'hint', `${score.toLocaleString()} reached`);
    this.view.milestonePulse();
    this.blade.forgeBurst();
    this.audio.play('milestone');
    this.audio.vibrate([6, 18, 8]);
    // CrazyGames completion metric for an endless game: each Mirror Level is a fifth of the way.
    this.platform.reportCompletion(((index + 1) / DIFFICULTY.milestones.length) * 100);
    this.showUnlocks(this.achievements.evaluate({ type: 'milestone', index }));
  }

  private presentStress(state: DirectorState): void {
    const stress = state.stress;
    document.body.classList.toggle('state-stress', stress >= DIFFICULTY.stress.warning && this.fracture.currentPhase() === 'idle');
    document.body.classList.toggle('state-stress-high', stress >= DIFFICULTY.stress.high && this.fracture.currentPhase() === 'idle');
    this.view.setStress(stress);
    this.audio.setLayer('tension', stress >= DIFFICULTY.stress.high || this.fracture.currentPhase() !== 'idle');
    this.audio.setIntensity(state.level);
  }

  private showUnlocks(unlocks: readonly AchievementDefinition[]): void {
    for (const unlock of unlocks) this.toasts.show(unlock.name, `Achievement · +${unlock.reward} shards`, unlock.icon);
    if (unlocks.length > 0) this.queueSave();
  }

  private markCutFragmentClear(piece: Piece): void {
    const parent = piece.parentId!;
    const cleared = this.cutClearParents.get(parent) ?? new Set<string>();
    cleared.add(piece.id);
    this.cutClearParents.set(parent, cleared);
    if (cleared.size >= 2) this.showUnlocks(this.achievements.evaluate({ type: 'perfect-cut' }));
  }

  /** During a daily run: the first time the target is reached, record it, reward it, and credit the streak if it is today's puzzle. */
  private checkDailyReward(): void {
    if (this.mode !== 'daily') return;
    const score = this.score.current();
    this.view.setDailyTarget(score, DAILY_TARGET, this.dailyCompletedThisRun || score >= DAILY_TARGET);
    if (this.dailyCompletedThisRun || score < DAILY_TARGET) return;
    this.dailyCompletedThisRun = true;
    const result = recordDailyRun(this.save.daily, this.dailyDate, utcDateKey(), score);
    if (result.firstCompletion) this.onDailyCompleted(result.streakExtended, result.streak);
    else this.toasts.show('Daily target reached', 'Already completed — keep going for a better score.', 'daily');
  }

  private onDailyCompleted(streakExtended: boolean, streak: number): void {
    this.save.currency += ECONOMY.dailyMilestoneReward;
    this.dailyStreakExtended = streakExtended;
    this.view.callouts.show('DAILY COMPLETE', 'forge', streakExtended ? `${streak}-day streak` : 'past puzzle · streak unchanged');
    this.audio.play('milestone');
    this.audio.vibrate([8, 24, 12]);
    this.toasts.show(streakExtended ? `Daily Mirror · ${streak}-day streak` : 'Daily Mirror complete', `+${ECONOMY.dailyMilestoneReward} Mirror Shards`, 'daily');
    if (streakExtended) this.showUnlocks(this.achievements.evaluate({ type: 'daily', streak }));
    this.queueSave();
  }

  private beginDaily(): void {
    const daily = this.save.daily;
    this.save.stats.dailyPlays += 1;
    daily.lastPlayedDate = utcDateKey();
    this.view.setDailyTarget(0, DAILY_TARGET, isCompleted(daily, this.dailyDate));
    this.queueSave();
  }

  private commitOverdriveTime(): void {
    const total = Math.round(this.overdrive.activeMilliseconds() / 1000);
    const delta = total - this.overdriveSecondsCommitted;
    if (delta > 0) {
      this.save.stats.overdriveSeconds += delta;
      this.overdriveSecondsCommitted = total;
    }
  }

  private commitPlayTime(): void {
    const seconds = Math.floor(this.clock.now() / 1000);
    const delta = Math.max(0, seconds - this.runStats.lastPlaySeconds);
    this.runStats.lastPlaySeconds = seconds;
    this.save.stats.totalPlayTimeSeconds += delta;
  }

  private queueSave(): void {
    this.storage.save(this.save);
  }

  private newRunStats(): RunStats {
    return { lines: 0, rows: 0, columns: 0, shards: 0, placed: 0, cut: 0, bladesUsed: 0, bladesForged: 0, highestChain: 0, clutches: 0, overdrives: 0, stallMoves: 0, lastPlaySeconds: 0 };
  }

  // ------------------------------------------------------------------ DOM events

  private readonly onClick = (event: Event): void => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const toggle = target.closest<HTMLElement>('[data-setting-toggle]');
    if (toggle) {
      const next = toggle.getAttribute('aria-checked') !== 'true';
      toggle.setAttribute('aria-checked', String(next));
      this.handleSetting(toggle.dataset.settingToggle!, next);
      this.audio.play('tap');
      return;
    }
    const choice = target.closest<HTMLElement>('[data-setting-choice]');
    if (choice) {
      choice.parentElement?.querySelectorAll('button').forEach((button) => button.setAttribute('aria-pressed', String(button === choice)));
      this.handleSetting(choice.dataset.settingChoice!, choice.dataset.value ?? '');
      this.audio.play('tap');
      return;
    }
    const action = target.closest<HTMLElement>('[data-action]');
    if (action) this.handleAction(action.dataset.action!, action.dataset.value);
  };

  private readonly onInput = (event: Event): void => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.dataset.settingRange) return;
    const value = Number(input.value);
    input.parentElement?.style.setProperty('--value', `${Math.round(value * 100)}%`);
    const output = input.parentElement?.querySelector('output');
    if (output) output.textContent = `${Math.round(value * 100)}%`;
    this.handleSetting(input.dataset.settingRange, value);
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (this.phase.isCinematic()) { this.cinematic.skip(); return; }
    if (event.key === 'r' || event.key === 'R') {
      if (!this.canInteract()) return;
      const target = this.lastTouchedPiece && this.tray.find(this.lastTouchedPiece) ? this.lastTouchedPiece : this.tray.list()[0]?.id;
      if (target) this.rotateTrayPiece(target);
    } else if (event.key === 'Escape') {
      const screen = this.screens.current();
      if (screen === 'gameplay' && this.activeRun) this.handleAction('pause');
      else if (screen === 'pause') this.handleAction('resume');
      else if (screen === 'settings') this.handleAction(this.settingsReturn);
      else if (screen !== 'home' && screen !== 'gameover' && screen !== 'boot') this.handleAction('home');
    } else if (event.key === 'p' || event.key === 'P') {
      if (this.screens.current() === 'gameplay' && this.activeRun) this.handleAction('pause');
    }
  };

  private readonly onResize = (): void => {
    this.view.relayout();
    // The cinematic measured the board once; after a resize the results are the honest place to be.
    if (this.phase.isCinematic()) this.cinematic.skip();
    if (this.resizeGateTimer !== null) window.clearTimeout(this.resizeGateTimer);
    this.clock.gate('resize', false);
    this.resizeGateTimer = window.setTimeout(() => { this.clock.gate('resize', true); this.resizeGateTimer = null; }, 350);
  };

  private readonly onVisibilityChange = (): void => {
    const hidden = document.visibilityState === 'hidden';
    this.clock.gate('hidden', !hidden);
    this.audio.setSuspended(hidden);
    if (hidden) {
      this.cancelDrag(false);
      this.flush();
    }
  };

  private readonly onBlur = (): void => {
    this.clock.gate('focus', false);
  };

  private readonly onFocus = (): void => {
    this.clock.gate('focus', true);
  };

  private readonly flush = (): void => {
    if (this.activeRun) this.commitPlayTime();
    this.storage.save(this.save);
    this.storage.flush();
  };
}


function longAxis(piece: Piece): 'horizontal' | 'vertical' {
  const dimensions = pieceDimensions(piece);
  return dimensions.cols >= dimensions.rows ? 'vertical' : 'horizontal';
}

export type { ScreenId };
