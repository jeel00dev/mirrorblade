/**
 * Balance simulation: plays thousands of runs with simple policies against the real rule modules and writes
 * docs/balance-report.md. Run with `npm run simulate` (vite-node). Time-based systems use a modelled
 * think-time per move so Overdrive and Fracture frequencies can be estimated without a browser.
 */
import { writeFileSync } from 'node:fs';
import { BLADE_ENERGY } from '../src/config/blade';
import { FRACTURE, OVERDRIVE } from '../src/config/modes';
import { applyEnergy, createRack, energyForEvent, rechargeCost, spendBlade, type BladeRack } from '../src/game/BladeEnergy';
import { Contracts } from '../src/game/Contracts';
import { DifficultyDirector } from '../src/game/DifficultyDirector';
import { PrecisionCells } from '../src/game/PrecisionCells';
import { PIECE_LIBRARY } from '../src/game/PieceLibrary';
import { BladeCutter } from '../src/game/BladeCutter';
import { BoardState } from '../src/game/BoardState';
import { ClearResolver } from '../src/game/ClearResolver';
import { ComboSystem } from '../src/game/ComboSystem';
import { Fracture } from '../src/game/Fracture';
import { MoveAnalyzer } from '../src/game/MoveAnalyzer';
import { Overdrive } from '../src/game/Overdrive';
import { distinctOrientations, type GridCell, type Piece } from '../src/game/Piece';
import { occupancyRatio, PieceGenerator } from '../src/game/PieceGenerator';
import { PlacementSystem } from '../src/game/PlacementSystem';
import { ScoreSystem } from '../src/game/ScoreSystem';
import { SeededRandom } from '../src/game/SeededRandom';
import { classifyClear } from '../src/game/SkillEvents';
import { Tray } from '../src/game/Tray';
import { BOARD_SIZE, STARTING_BLADE_CHARGES } from '../src/config/gameplay';
import { DIFFICULTY } from '../src/config/difficulty';
import { clearShardReward } from '../src/config/economy';

interface Policy {
  name: string;
  rotation: boolean;
  blades: boolean;
  /** 0 = greedy, 1 = random. */
  noise: number;
  thinkMs: number;
  /** Freeze the director at this level (undefined = live curve). Used to show what the curve changes. */
  fixedLevel?: number;
}

interface RunResult {
  score: number;
  shards: number;
  moves: number;
  lines: number;
  tiers: Record<string, number>;
  bladesForged: number;
  bladesUsed: number;
  forcedCuts: number;
  movesAtMaxBlades: number;
  overdrives: number;
  overdriveMoves: number;
  fractureArms: number;
  fractureEscapes: number;
  perfectMirrors: number;
  perfectClears: number;
  highestChain: number;
  rotationsUsed: number;
  contractsOffered: number;
  contractsCompleted: number;
  precisionSpawned: number;
  precisionHit: number;
  maxStage: number;
  /** Per-band samples for the difficulty progression table. */
  bands: BandSample[];
}

interface BandSample { band: number; legalOptions: number; rating: number; occupancy: number; stall: number; forged: boolean; cost: number; }

const BANDS = [0, 2_500, 7_500, 15_000, 30_000];
const BAND_NAMES = ['early <2.5k', 'mid 2.5–7.5k', 'late 7.5–15k', 'hard 15–30k', 'max 30k+'];
function bandOf(score: number): number { let band = 0; BANDS.forEach((edge, index) => { if (score >= edge) band = index; }); return band; }

const POLICIES: Policy[] = [
  { name: 'Greedy (rotation + blades)', rotation: true, blades: true, noise: 0, thinkMs: 2600 },
  { name: 'Casual (30% random)', rotation: true, blades: true, noise: 0.3, thinkMs: 3400 },
  { name: 'Greedy, director frozen at level 0', rotation: true, blades: true, noise: 0, thinkMs: 2600, fixedLevel: 0 },
  { name: 'Greedy without rotation', rotation: false, blades: true, noise: 0, thinkMs: 2600 },
  { name: 'Greedy without blades', rotation: true, blades: false, noise: 0, thinkMs: 2600 },
  { name: 'Random', rotation: true, blades: true, noise: 1, thinkMs: 2000 },
];

const N = BOARD_SIZE;
const MAX_MOVES = 1500;

/** Flat occupancy grid for fast candidate search (1 = occupied). */
function gridOf(board: BoardState): Uint8Array {
  const grid = new Uint8Array(N * N);
  for (let row = 0; row < N; row += 1) for (let col = 0; col < N; col += 1) if (!board.isEmpty(row, col)) grid[row * N + col] = 1;
  return grid;
}

/** Places the mirrored union of `cells` at `anchor` into a copy; returns null if any target is occupied/outside. */
function tryPlace(grid: Uint8Array, cells: readonly GridCell[], anchor: GridCell): { next: Uint8Array; placed: number } | null {
  const next = new Uint8Array(grid);
  let placed = 0;
  for (const cell of cells) {
    const row = anchor.row + cell.row;
    const col = anchor.col + cell.col;
    if (row < 0 || row >= N || col < 0 || col >= N) return null;
    for (const target of [col, N - 1 - col]) {
      const index = row * N + target;
      if (next[index] === 1) return null;
      next[index] = 1;
      placed += 1;
    }
    if (col === N - 1 - col) placed -= 1;
  }
  return { next, placed };
}

/** Clears full lines in place; returns the number of lines. */
function clearLines(grid: Uint8Array): number {
  const rows: number[] = [];
  const cols: number[] = [];
  for (let i = 0; i < N; i += 1) {
    let rowFull = true;
    let colFull = true;
    for (let j = 0; j < N; j += 1) {
      if (grid[i * N + j] === 0) rowFull = false;
      if (grid[j * N + i] === 0) colFull = false;
    }
    if (rowFull) rows.push(i);
    if (colFull) cols.push(i);
  }
  for (const row of rows) for (let col = 0; col < N; col += 1) grid[row * N + col] = 0;
  for (const col of cols) for (let row = 0; row < N; row += 1) grid[row * N + col] = 0;
  return rows.length + cols.length;
}

function evaluateGrid(grid: Uint8Array): number {
  // Lower is better: occupancy plus fragmentation (empty cells with at most one empty neighbour).
  let occupied = 0;
  let isolated = 0;
  for (let row = 0; row < N; row += 1) {
    for (let col = 0; col < N; col += 1) {
      if (grid[row * N + col] === 1) { occupied += 1; continue; }
      let neighbours = 0;
      if (row > 0 && grid[(row - 1) * N + col] === 0) neighbours += 1;
      if (row < N - 1 && grid[(row + 1) * N + col] === 0) neighbours += 1;
      if (col > 0 && grid[row * N + col - 1] === 0) neighbours += 1;
      if (col < N - 1 && grid[row * N + col + 1] === 0) neighbours += 1;
      if (neighbours <= 1) isolated += 1;
    }
  }
  return occupied + isolated * 2.2;
}

interface Candidate { piece: Piece; cells: readonly GridCell[]; anchor: GridCell; value: number; rotated: boolean; }

function bestPlacement(board: BoardState, tray: Tray, policy: Policy, random: SeededRandom): Candidate | null {
  const grid = gridOf(board);
  const candidates: Candidate[] = [];
  for (const piece of tray.list()) {
    const orientations = policy.rotation ? distinctOrientations(piece.cells) : [piece.cells];
    orientations.forEach((cells, index) => {
      const rows = Math.max(...cells.map((c) => c.row)) + 1;
      const cols = Math.max(...cells.map((c) => c.col)) + 1;
      for (let row = 0; row <= N - rows; row += 1) {
        for (let col = 0; col <= N - cols; col += 1) {
          const anchor = { row, col };
          const trial = tryPlace(grid, cells, anchor);
          if (!trial) continue;
          const lines = clearLines(trial.next);
          const value = lines * 40 + trial.placed * 1.5 - evaluateGrid(trial.next) + (index > 0 ? -0.5 : 0);
          candidates.push({ piece: { ...piece, cells }, cells, anchor, value, rotated: index > 0 });
        }
      }
    });
  }
  if (candidates.length === 0) return null;
  if (random.next() < policy.noise) return random.pick(candidates);
  let best = candidates[0]!;
  for (const candidate of candidates) if (candidate.value > best.value) best = candidate;
  return best;
}

function tryCut(board: BoardState, tray: Tray, cutter: BladeCutter, policy: Policy): { pieceId: string; result: ReturnType<BladeCutter['cut']> } | null {
  // Cut the piece whose fragments fit best (prefer enabling a placement).
  const analyzer = new MoveAnalyzer(board);
  let best: { pieceId: string; result: ReturnType<BladeCutter['cut']>; score: number } | null = null;
  for (const piece of tray.list()) {
    for (const spec of cutter.validCuts(piece)) {
      const result = cutter.cut(piece, spec);
      if (!result) continue;
      const fits = [result.a, result.b].filter((fragment) => policy.rotation ? analyzer.fitsAnyOrientation(fragment) : new PlacementSystem(board).canPlace(fragment)).length;
      const score = fits * 10 - Math.abs(result.a.cells.length - result.b.cells.length);
      if (!best || score > best.score) best = { pieceId: piece.id, result, score };
    }
  }
  return best && best.score > 0 ? { pieceId: best.pieceId, result: best.result } : null;
}

function playRun(seed: number, policy: Policy): RunResult {
  const random = new SeededRandom(seed);
  const board = new BoardState();
  const placement = new PlacementSystem(board);
  const resolver = new ClearResolver(board);
  const cutter = new BladeCutter();
  const analyzer = new MoveAnalyzer(board);
  const tray = new Tray();
  const score = new ScoreSystem();
  const combo = new ComboSystem();
  const overdrive = new Overdrive();
  const fracture = new Fracture();
  const generator = new PieceGenerator(new SeededRandom(seed ^ 0x9e3779b9), { mode: 'endless' });
  const director = new DifficultyDirector();
  const contracts = new Contracts();
  const precision = new PrecisionCells();
  const runRandom = new SeededRandom(seed ^ 0x5bd1e995);
  const levelNow = (): number => policy.fixedLevel ?? director.state().level;
  let rack: BladeRack = createRack(STARTING_BLADE_CHARGES);
  let now = 0;
  let stall = 0;
  const result: RunResult = { score: 0, shards: 0, moves: 0, lines: 0, tiers: { clear: 0, double: 0, triple: 0, max: 0 }, bladesForged: 0, bladesUsed: 0, forcedCuts: 0, movesAtMaxBlades: 0, overdrives: 0, overdriveMoves: 0, fractureArms: 0, fractureEscapes: 0, perfectMirrors: 0, perfectClears: 0, highestChain: 0, rotationsUsed: 0, contractsOffered: 0, contractsCompleted: 0, precisionSpawned: 0, precisionHit: 0, maxStage: 1, bands: [] };
  tray.replaceAll(generator.nextBatch(board, levelNow()));

  for (let guard = 0; guard < MAX_MOVES; guard += 1) {
    now += policy.thinkMs * (0.7 + random.next() * 0.6);
    if (overdrive.update(now) === 'ended') { /* window closed */ }
    if (fracture.update(now) === 'timeout') break;

    const analysis = analyzer.analyze(tray.list(), policy.blades ? rack.blades : 0);
    let candidate = bestPlacement(board, tray, policy, random);
    if (!candidate) {
      // Forced cut: the only way forward.
      if (policy.blades && rack.blades > 0) {
        const cut = tryCut(board, tray, cutter, policy);
        if (cut && cut.result && tray.replaceWithCut(cut.pieceId, cut.result)) {
          rack = spendBlade(rack).rack;
          result.bladesUsed += 1;
          result.forcedCuts += 1;
          fracture.onAction('cut', false, now);
          candidate = bestPlacement(board, tray, policy, random);
        }
      }
      if (!candidate) break;
    }
    if (analysis.gameOver) break;

    const placedCells = placement.commit(candidate.piece, candidate.anchor);
    tray.consume(candidate.piece.id);
    if (candidate.rotated) result.rotationsUsed += 1;
    const placedRating = PIECE_LIBRARY.find((d) => d.id === candidate!.piece.definitionId)?.rating ?? 3;
    const detected = resolver.detect();
    const chain = combo.resolveMove(detected.lineCount);
    const emptyAfter = board.occupiedCount() - detected.cells.length === 0;
    const event = classifyClear(detected, chain, emptyAfter);
    const escape = fracture.onAction('place', detected.lineCount > 0, now);
    if (escape.escaped) result.fractureEscapes += 1;
    const multiplier = overdrive.multiplier();
    if (multiplier > 1) result.overdriveMoves += 1;
    score.addMove(placedCells.length, event, { multiplier, clutch: escape.clutch });
    result.shards += clearShardReward(detected.lineCount).total;
    const energy = applyEnergy(rack, energyForEvent(event, escape.clutch));
    rack = energy.rack;
    if (energy.gain.bladesForged > 0) result.bladesForged += 1;
    if (overdrive.onMove(event, now)) result.overdrives += 1;
    const precisionOutcome = precision.onMove(detected.cells);
    if (precisionOutcome === 'hit') { score.addBonus(150, multiplier); rack = applyEnergy(rack, 12).rack; result.precisionHit += 1; }
    const contractOutcome = contracts.onMove({ lineCount: detected.lineCount, rotated: candidate.rotated, fragment: candidate.piece.cutGeneration === 1 });
    if (contractOutcome.outcome === 'completed' && contractOutcome.contract) { score.addBonus(contractOutcome.contract.reward.score, multiplier); rack = applyEnergy(rack, contractOutcome.contract.reward.energy).rack; result.contractsCompleted += 1; }
    if (detected.lineCount > 0) resolver.resolve();
    const directorState = director.observe({ score: score.current(), lineCount: detected.lineCount, occupancy: occupancyRatio(board), legalOptions: analysis.legalOptions });
    result.maxStage = Math.max(result.maxStage, directorState.stage);

    result.moves += 1;
    result.lines += detected.lineCount;
    if (event.tier !== 'none') result.tiers[event.tier] = (result.tiers[event.tier] ?? 0) + 1;
    if (event.perfectMirror) result.perfectMirrors += 1;
    if (event.perfectClear) result.perfectClears += 1;
    result.highestChain = Math.max(result.highestChain, chain);
    if (rack.blades >= BLADE_ENERGY.maxBlades) result.movesAtMaxBlades += 1;
    stall = detected.lineCount > 0 ? 0 : stall + 1;

    if (tray.isEmpty()) tray.replaceAll(generator.nextBatch(board, levelNow()));
    const after = analyzer.analyze(tray.list(), policy.blades ? rack.blades : 0);
    result.bands.push({ band: bandOf(score.current()), legalOptions: after.legalOptions, rating: placedRating, occupancy: occupancyRatio(board), stall, forged: energy.gain.bladesForged > 0, cost: rechargeCost(rack.bladesEarned) });
    if (after.gameOver) break;
    if (contracts.tick({ level: levelNow(), stage: directorState.stage, fracture: fracture.currentPhase() !== 'idle', overdrive: overdrive.isActive(), blades: rack.blades }, runRandom)) result.contractsOffered += 1;
    if (precision.tick(board, levelNow(), runRandom)) result.precisionSpawned += 1;
    if (fracture.evaluate({ placements: result.moves, occupancy: occupancyRatio(board), stallMoves: stall, legalOptions: after.legalOptions, tutorialComplete: true, overdriveActive: overdrive.isActive() }, now)) {
      result.fractureArms += 1;
    }
  }
  result.score = score.current();
  return result;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}
function mean(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}
const fmt = (value: number, digits = 1): string => value.toFixed(digits);

const RUNS = Number(process.argv[2] ?? 300);
const lines: string[] = [];
lines.push('# Balance report (V3)');
lines.push('');
lines.push(`Generated ${new Date().toISOString()} by \`scripts/simulate-runs.ts\` — ${RUNS} seeded runs per policy against the real rule modules, capped at ${MAX_MOVES} placements per run (a strong player is not expected to lose inside that). Think time per move is modelled (see policy table) so Overdrive/Fracture timing can be estimated; Clutch is time-critical and is not simulated.`);
lines.push('');
lines.push('Config under test: ' + JSON.stringify({ BLADE_ENERGY: BLADE_ENERGY.gains, maxBlades: BLADE_ENERGY.maxBlades, OVERDRIVE, FRACTURE }));
lines.push('');
lines.push('| Policy | Median score | Mean shards | Mean moves | Lines/100 moves | Doubles+ /run | Blades forged /run | Blades used /run | Forced cuts /run | % moves at 5 blades | Overdrives /run | % moves at 2× | Fracture arms /run | Fracture escapes | Rotations used /run | Perfect mirrors | Perfect clears | Max chain (mean) |');
lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
const summaries: Record<string, RunResult[]> = {};
for (const policy of POLICIES) {
  const results: RunResult[] = [];
  for (let run = 0; run < RUNS; run += 1) results.push(playRun(1000 + run * 7919, policy));
  summaries[policy.name] = results;
  const moves = results.map((r) => r.moves);
  lines.push(`| ${policy.name} | ${median(results.map((r) => r.score)).toLocaleString()} | ${fmt(mean(results.map((r) => r.shards)))} | ${fmt(mean(moves))} | ${fmt(mean(results.map((r) => r.lines / Math.max(1, r.moves) * 100)))} | ${fmt(mean(results.map((r) => r.tiers.double! + r.tiers.triple! + r.tiers.max!)))} | ${fmt(mean(results.map((r) => r.bladesForged)))} | ${fmt(mean(results.map((r) => r.bladesUsed)))} | ${fmt(mean(results.map((r) => r.forcedCuts)))} | ${fmt(mean(results.map((r) => r.movesAtMaxBlades / Math.max(1, r.moves) * 100)))}% | ${fmt(mean(results.map((r) => r.overdrives)), 2)} | ${fmt(mean(results.map((r) => r.overdriveMoves / Math.max(1, r.moves) * 100)))}% | ${fmt(mean(results.map((r) => r.fractureArms)), 2)} | ${fmt(mean(results.map((r) => r.fractureEscapes)), 2)} | ${fmt(mean(results.map((r) => r.rotationsUsed)))} | ${fmt(mean(results.map((r) => r.perfectMirrors)), 2)} | ${fmt(mean(results.map((r) => r.perfectClears)), 2)} | ${fmt(mean(results.map((r) => r.highestChain)))} |`);
}
lines.push('');
const greedy = summaries[POLICIES[0]!.name]!;
const casual = summaries[POLICIES[1]!.name]!;
const frozen = summaries[POLICIES[2]!.name]!;
const noRotation = summaries[POLICIES[3]!.name]!;
const noBlades = summaries[POLICIES[4]!.name]!;
const random = summaries[POLICIES[5]!.name]!;
lines.push('## Readings');
lines.push('');
lines.push(`- **Rotation vs blades:** greedy with rotation and blades reaches a median ${median(greedy.map((r) => r.score)).toLocaleString()}; without rotation ${median(noRotation.map((r) => r.score)).toLocaleString()}; without blades ${median(noBlades.map((r) => r.score)).toLocaleString()}. Blades still matter after rotation if the with-blades score and run length exceed the no-blades run: ${fmt(mean(greedy.map((r) => r.moves)))} vs ${fmt(mean(noBlades.map((r) => r.moves)))} moves.`);
lines.push(`- **Forced cuts** (no placement possible without a cut) per greedy run: ${fmt(mean(greedy.map((r) => r.forcedCuts)), 2)} — each one is a run the blade extended.`);
lines.push(`- **Line-earned shards:** greedy earns ${fmt(mean(greedy.map((r) => r.shards)))} per run, casual ${fmt(mean(casual.map((r) => r.shards)))}, random ${fmt(mean(random.map((r) => r.shards)))}. These exclude separately labelled achievements, contracts and Daily rewards.`);
lines.push(`- **Hoarding:** greedy spends ${fmt(mean(greedy.map((r) => r.movesAtMaxBlades / Math.max(1, r.moves) * 100)))}% of moves at the 5-blade cap; casual ${fmt(mean(casual.map((r) => r.movesAtMaxBlades / Math.max(1, r.moves) * 100)))}%.`);
lines.push(`- **Overdrive** ignites ${fmt(mean(greedy.map((r) => r.overdrives)), 2)}× per greedy run (${fmt(mean(greedy.map((r) => r.overdriveMoves / Math.max(1, r.moves) * 100)))}% of moves at 2×) and ${fmt(mean(casual.map((r) => r.overdrives)), 2)}× per casual run.`);
lines.push(`- **Fracture** arms ${fmt(mean(greedy.map((r) => r.fractureArms)), 2)}× per greedy run and ${fmt(mean(casual.map((r) => r.fractureArms)), 2)}× per casual run; escapes ${fmt(mean(casual.map((r) => r.fractureEscapes)), 2)}× per casual run.`);
lines.push('');
lines.push('## Difficulty progression by score band (greedy and casual policies)');
lines.push('');
lines.push('| Band | Samples | Legal options (mean) | Piece rating (mean) | Occupancy | Stall streak (mean) | Moves per forge | Recharge cost (mean) |');
lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
for (const policyName of [POLICIES[0]!.name, POLICIES[1]!.name]) {
  const samples = summaries[policyName]!.flatMap((r) => r.bands);
  lines.push(`| **${policyName}** | | | | | | | |`);
  BAND_NAMES.forEach((name, band) => {
    const inBand = samples.filter((sample) => sample.band === band);
    if (inBand.length === 0) { lines.push(`| ${name} | 0 | — | — | — | — | — | — |`); return; }
    const forges = inBand.filter((sample) => sample.forged).length;
    lines.push(`| ${name} | ${inBand.length} | ${fmt(mean(inBand.map((x) => x.legalOptions)))} | ${fmt(mean(inBand.map((x) => x.rating)), 2)} | ${fmt(mean(inBand.map((x) => x.occupancy)) * 100)}% | ${fmt(mean(inBand.map((x) => x.stall)))} | ${forges > 0 ? fmt(inBand.length / forges) : '∞'} | ${fmt(mean(inBand.map((x) => x.cost)), 0)} |`);
  });
}
lines.push('');
lines.push('## Game-over score distribution');
lines.push('');
lines.push('| Policy | p10 | p25 | median | p75 | p90 | max | runs hitting the ' + MAX_MOVES + '-move cap | max stage reached (mean) | contracts offered / completed | precision spawned / hit |');
lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
for (const policy of POLICIES) {
  const results = summaries[policy.name]!;
  const scores = [...results.map((r) => r.score)].sort((a, b) => a - b);
  const q = (p: number): number => scores[Math.min(scores.length - 1, Math.floor(p * scores.length))] ?? 0;
  lines.push(`| ${policy.name} | ${q(0.1).toLocaleString()} | ${q(0.25).toLocaleString()} | ${q(0.5).toLocaleString()} | ${q(0.75).toLocaleString()} | ${q(0.9).toLocaleString()} | ${(scores[scores.length - 1] ?? 0).toLocaleString()} | ${results.filter((r) => r.moves >= MAX_MOVES).length} | ${fmt(mean(results.map((r) => r.maxStage)))} | ${fmt(mean(results.map((r) => r.contractsOffered)))} / ${fmt(mean(results.map((r) => r.contractsCompleted)))} | ${fmt(mean(results.map((r) => r.precisionSpawned)))} / ${fmt(mean(results.map((r) => r.precisionHit)))} |`);
}
lines.push('');
lines.push('Curve under test: ' + JSON.stringify(DIFFICULTY.curve) + '; recharge ' + JSON.stringify(BLADE_ENERGY.recharge));
lines.push('');
lines.push('## Decisions (2026-09-12 scoring revision)');
lines.push('');
const greedyScores = greedy.map((result) => result.score);
const sortedGreedyScores = [...greedyScores].sort((a, b) => a - b);
const greedyP90 = sortedGreedyScores[Math.min(sortedGreedyScores.length - 1, Math.floor(sortedGreedyScores.length * 0.9))] ?? 0;
const greedyMax = sortedGreedyScores[sortedGreedyScores.length - 1] ?? 0;
lines.push([
  `1. **The formula rewards planned simultaneous clears.** The score rule is deterministic: 10 per unique placed cell, 100 per line, 100 per simultaneous line pair, fixed chain/skill bonuses, then the active score multiplier. Normal shards are line count squared.`,
  `2. **The Difficulty Director still ends expert runs.** The live greedy policy has median ${median(greedyScores).toLocaleString()}, p90 ${greedyP90.toLocaleString()} and max ${greedyMax.toLocaleString()}, with ${greedy.filter((result) => result.moves >= MAX_MOVES).length} runs reaching the ${MAX_MOVES}-move cap. Freezing the director reaches median ${median(frozen.map((result) => result.score)).toLocaleString()} and ${frozen.filter((result) => result.moves >= MAX_MOVES).length} capped runs.`,
  `3. **Session length remains stable.** Greedy averages ${fmt(mean(greedy.map((result) => result.moves)))} placements and casual averages ${fmt(mean(casual.map((result) => result.moves)))}; the scoring change moves score milestones without materially extending run length.`,
  `4. **Currency now follows clear performance directly.** Mean normal-play payout is ${fmt(mean(greedy.map((result) => result.shards)))} shards for greedy, ${fmt(mean(casual.map((result) => result.shards)))} for casual and ${fmt(mean(random.map((result) => result.shards)))} for random play. Human economy testing should verify time-to-purchase against the 170–360 shard katana prices.`,
  `5. **Limits:** the policies estimate strategy and progression but do not model Clutch timing, player comprehension, aesthetic satisfaction, or real-session purchase behavior.`,
].join('\n'));
lines.push('');
writeFileSync('docs/balance-report-v3.md', lines.join('\n'));
console.log(lines.join('\n'));
