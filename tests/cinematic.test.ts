import { describe, expect, it } from 'vitest';
import { CINEMATIC } from '../src/config/cinematic';
import { RunPhaseMachine } from '../src/core/GameState';
import { SeededRandom } from '../src/game/SeededRandom';
import { blockPose, buildTimeline, CINEMATIC_EVENTS, katanaPath, katanaPose, planBlocks, slashGeometry, type BlockPlan } from '../src/render/GameOverCinematic';

const rect = { left: 100, top: 80, width: 360, height: 360 };
const cell = 40;

function board(density: 'sparse' | 'full'): { cell: { row: number; col: number }; model: { tone: 'cyan'; pieceId: string } }[] {
  const cells: { cell: { row: number; col: number }; model: { tone: 'cyan'; pieceId: string } }[] = [];
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (density === 'sparse' && (row * 7 + col * 3) % 4 !== 0) continue;
      cells.push({ cell: { row, col }, model: { tone: 'cyan', pieceId: `p${Math.floor(row / 2)}-${Math.floor(col / 3)}` } });
    }
  }
  return cells;
}

describe('game-over cinematic timeline', () => {
  it('fires every event in order and lands the whole sequence inside the 1.8–2.7 s window', () => {
    const timeline = buildTimeline(false);
    const times = CINEMATIC_EVENTS.map((event) => timeline.at[event]);
    for (let index = 1; index < times.length; index += 1) expect(times[index]).toBeGreaterThanOrEqual(times[index - 1]!);
    expect(timeline.at.CINEMATIC_START).toBe(0);
    expect(timeline.total).toBeGreaterThanOrEqual(1800);
    expect(timeline.total).toBeLessThanOrEqual(2700);
    expect(timeline.at.RESULTS_REVEAL).toBeGreaterThanOrEqual(1500);
  });

  it('respects the brief: anticipation 100–180 ms, slash 120–220 ms, hit-stop 50–90 ms, pop 180–320 ms, stagger 80–160 ms', () => {
    const timeline = buildTimeline(false);
    expect(timeline.at.KATANA_ENTER).toBeGreaterThanOrEqual(100);
    expect(timeline.at.KATANA_ENTER).toBeLessThanOrEqual(180);
    expect(CINEMATIC.slashMs).toBeGreaterThanOrEqual(120);
    expect(CINEMATIC.slashMs).toBeLessThanOrEqual(220);
    expect(timeline.at.BLOCKS_RELEASE - timeline.at.KATANA_IMPACT).toBe(CINEMATIC.hitStopMs);
    expect(CINEMATIC.hitStopMs).toBeGreaterThanOrEqual(50);
    expect(CINEMATIC.hitStopMs).toBeLessThanOrEqual(90);
    expect(CINEMATIC.popMs).toBeGreaterThanOrEqual(180);
    expect(CINEMATIC.popMs).toBeLessThanOrEqual(320);
    expect(CINEMATIC.staggerMs + CINEMATIC.delayJitterMs).toBeGreaterThanOrEqual(80);
    expect(CINEMATIC.staggerMs + CINEMATIC.delayJitterMs).toBeLessThanOrEqual(160);
    expect(CINEMATIC.cutLineFadeMs).toBeGreaterThanOrEqual(250);
    expect(CINEMATIC.cutLineFadeMs).toBeLessThanOrEqual(500);
    // Blocks leave the frame after ~1.5 s and the results follow within 300–500 ms.
    expect(timeline.at.BOARD_SETTLED).toBeGreaterThanOrEqual(1400);
    expect(timeline.at.BOARD_SETTLED).toBeLessThanOrEqual(1600);
    expect(timeline.at.CINEMATIC_END - timeline.at.RESULTS_REVEAL).toBeGreaterThanOrEqual(300);
    expect(timeline.at.CINEMATIC_END - timeline.at.RESULTS_REVEAL).toBeLessThanOrEqual(500);
  });

  it('reduced motion keeps the same event order in under a second', () => {
    const timeline = buildTimeline(true);
    const times = CINEMATIC_EVENTS.map((event) => timeline.at[event]);
    for (let index = 1; index < times.length; index += 1) expect(times[index]).toBeGreaterThanOrEqual(times[index - 1]!);
    expect(timeline.total).toBeLessThanOrEqual(1000);
    expect(timeline.reducedMotion).toBe(true);
  });
});

describe('slash geometry and katana path', () => {
  it('runs corner to corner on either diagonal with a unit direction and CSS angle', () => {
    const trbl = slashGeometry(rect, 'tr-bl');
    expect(trbl.entry).toEqual({ x: 460, y: 80 });
    expect(trbl.exit).toEqual({ x: 100, y: 440 });
    expect(Math.hypot(trbl.dir.x, trbl.dir.y)).toBeCloseTo(1);
    expect(trbl.angleDeg).toBeCloseTo(135);
    const tlbr = slashGeometry(rect, 'tl-br');
    expect(tlbr.entry).toEqual({ x: 100, y: 80 });
    expect(tlbr.angleDeg).toBeCloseTo(45);
    expect(tlbr.diagonal).toBeCloseTo(Math.hypot(360, 360));
  });

  it('scales the katana from the board diagonal, smaller on phones, and never wider than the viewport', () => {
    const geometry = slashGeometry(rect, 'tr-bl');
    const desktop = katanaPath(geometry, { width: 1280, height: 800 });
    expect(desktop.size).toBeCloseTo(geometry.diagonal * CINEMATIC.katanaScale);
    const phone = katanaPath(geometry, { width: 390, height: 844 });
    expect(phone.size).toBeCloseTo(geometry.diagonal * CINEMATIC.katanaScalePhone);
    expect(phone.size).toBeLessThan(desktop.size);
    const tiny = katanaPath(slashGeometry({ left: 0, top: 0, width: 900, height: 900 }, 'tr-bl'), { width: 320, height: 480 });
    expect(tiny.size).toBeLessThanOrEqual(320 * 0.9);
    // Phones travel less: the start point is closer to the entry corner.
    const phoneApproach = Math.hypot(phone.start.x - phone.entry.x, phone.start.y - phone.entry.y);
    const desktopApproach = Math.hypot(desktop.start.x - desktop.entry.x, desktop.start.y - desktop.entry.y);
    expect(phoneApproach).toBeLessThan(desktopApproach);
  });

  it('turns the sword over for the mirrored diagonal so the edge still leads', () => {
    const a = katanaPath(slashGeometry(rect, 'tr-bl'), { width: 1280, height: 800 });
    const b = katanaPath(slashGeometry(rect, 'tl-br'), { width: 1280, height: 800 });
    expect(a.flip).toBe(false);
    expect(b.flip).toBe(true);
    expect(a.tilt).toBeCloseTo(b.tilt);
    // The tip leads: its offset points along the travel direction on both diagonals.
    expect(a.tipOffset.x).toBeLessThan(0);
    expect(a.tipOffset.y).toBeGreaterThan(0);
    expect(b.tipOffset.x).toBeGreaterThan(0);
    expect(b.tipOffset.y).toBeGreaterThan(0);
  });

  it('moves the tip outside → entry corner → axis (held through the hit-stop) → exit corner → gone', () => {
    const geometry = slashGeometry(rect, 'tr-bl');
    const path = katanaPath(geometry, { width: 1280, height: 800 });
    const timeline = buildTimeline(false);
    expect(katanaPose(0, path, timeline).visible).toBe(false);
    const entering = katanaPose(timeline.at.KATANA_ENTER + 1, path, timeline);
    expect(entering.visible).toBe(true);
    expect(entering.x).toBeGreaterThan(path.entry.x - 1);
    const atEntry = katanaPose(timeline.at.KATANA_SLASH_START, path, timeline);
    expect(atEntry.x).toBeCloseTo(path.entry.x, 0);
    expect(atEntry.y).toBeCloseTo(path.entry.y, 0);
    const impact = katanaPose(timeline.at.KATANA_IMPACT, path, timeline);
    expect(impact.x).toBeCloseTo(geometry.center.x, 0);
    expect(impact.y).toBeCloseTo(geometry.center.y, 0);
    expect(impact.cut).toBeCloseTo(0.5);
    const frozen = katanaPose(timeline.at.KATANA_IMPACT + CINEMATIC.hitStopMs - 1, path, timeline);
    expect(frozen.x).toBeCloseTo(impact.x);
    expect(frozen.y).toBeCloseTo(impact.y);
    expect(frozen.glow).toBe(1);
    const leaving = katanaPose(timeline.slashEnd, path, timeline);
    expect(leaving.x).toBeCloseTo(path.exit.x, 0);
    expect(leaving.cut).toBeCloseTo(1);
    expect(katanaPose(timeline.katanaGone, path, timeline).visible).toBe(false);
  });

  it('fracture jitter only nudges the blade across the path', () => {
    const path = katanaPath(slashGeometry(rect, 'tr-bl'), { width: 1280, height: 800 });
    const timeline = buildTimeline(false);
    const t = timeline.at.KATANA_SLASH_START + 20;
    const clean = katanaPose(t, path, timeline, 0);
    const shaky = katanaPose(t, path, timeline, 1.5);
    expect(Math.hypot(shaky.x - clean.x, shaky.y - clean.y)).toBeLessThanOrEqual(1.5 + 1e-9);
  });
});

describe('block release plan', () => {
  const geometry = slashGeometry(rect, 'tr-bl');

  it('is deterministic for a seed and different for another', () => {
    const a = planBlocks(board('sparse'), geometry, cell, new SeededRandom(7));
    const b = planBlocks(board('sparse'), geometry, cell, new SeededRandom(7));
    const c = planBlocks(board('sparse'), geometry, cell, new SeededRandom(8));
    expect(a).toEqual(b);
    expect(a.map((plan) => plan.omega)).not.toEqual(c.map((plan) => plan.omega));
  });

  it('keeps every block inside the brief ranges: delay 0–150 ms, pop ±10 %, spin 20–125 °/s, drift under half a cell per second', () => {
    for (const plan of planBlocks(board('full'), geometry, cell, new SeededRandom(3))) {
      expect(plan.delayMs).toBeGreaterThanOrEqual(0);
      expect(plan.delayMs).toBeLessThanOrEqual(150);
      expect(plan.popMs).toBeGreaterThanOrEqual(CINEMATIC.popMs * 0.9 - 1);
      expect(plan.popMs).toBeLessThanOrEqual(CINEMATIC.popMs * 1.1 + 1);
      expect(Math.abs(plan.omega)).toBeGreaterThanOrEqual(CINEMATIC.spinMinDeg * 0.75 - 1e-9);
      expect(Math.abs(plan.omega)).toBeLessThanOrEqual(CINEMATIC.spinMaxDeg * 1.25 + 1e-9);
      expect(Math.abs(plan.vx - plan.group.vx)).toBeLessThanOrEqual(CINEMATIC.driftCells * cell);
      expect(plan.popScale).toBeGreaterThan(1);
    }
  });

  it('staggers release along the slash and lets blocks near the line react more', () => {
    const plans = planBlocks(board('full'), geometry, cell, new SeededRandom(11));
    const first = plans.find((plan) => plan.cell.row === 0 && plan.cell.col === 8)!;
    const last = plans.find((plan) => plan.cell.row === 8 && plan.cell.col === 0)!;
    expect(first.proj).toBeLessThan(last.proj);
    expect(first.delayMs).toBeLessThan(last.delayMs);
    const centre = plans.find((plan) => plan.cell.row === 4 && plan.cell.col === 4)!;
    const corner = plans.find((plan) => plan.cell.row === 0 && plan.cell.col === 0)!;
    expect(centre.near).toBe(true);
    expect(corner.near).toBe(false);
    expect(centre.popScale).toBeGreaterThan(corner.popScale);
    const span = Math.max(...plans.map((plan) => plan.delayMs)) - Math.min(...plans.map((plan) => plan.delayMs));
    expect(span).toBeGreaterThanOrEqual(80);
    expect(span).toBeLessThanOrEqual(160);
  });

  it('cells of one piece share their motion first, then diverge', () => {
    const plans = planBlocks(board('full'), geometry, cell, new SeededRandom(5));
    const piece = plans.filter((plan) => plan.pieceId === 'p1-1');
    expect(piece.length).toBeGreaterThan(1);
    const [a, b] = piece as [BlockPlan, BlockPlan];
    expect(a.group).toBe(b.group);
    const early = a.popMs + CINEMATIC.cohesionMs * 0.5;
    const pa = blockPose({ ...a, delayMs: 0 }, early);
    const pb = blockPose({ ...b, delayMs: 0 }, early);
    expect(pa.rotation).toBeCloseTo(pb.rotation, 6);
    expect(pa.dx).toBeCloseTo(pb.dx, 6);
    const late = a.popMs + CINEMATIC.cohesionMs + CINEMATIC.cohesionBlendMs + 400;
    const la = blockPose({ ...a, delayMs: 0 }, late);
    const lb = blockPose({ ...b, delayMs: 0 }, late);
    expect(Math.abs(la.rotation - lb.rotation)).toBeGreaterThan(0.01);
  });

  it('rests, pops toward the camera, then falls under gravity with rotation', () => {
    const plan = planBlocks(board('sparse'), geometry, cell, new SeededRandom(2))[0]!;
    expect(blockPose(plan, plan.delayMs - 1).stage).toBe('rest');
    const mid = blockPose(plan, plan.delayMs + plan.popMs / 2);
    expect(mid.stage).toBe('pop');
    expect(mid.scale).toBeGreaterThan(1);
    expect(mid.scale).toBeLessThanOrEqual(plan.popScale);
    const fall = blockPose(plan, plan.delayMs + plan.popMs + 600);
    expect(fall.stage).toBe('fall');
    expect(fall.dy).toBeGreaterThan(cell * 2);
    expect(Math.abs(fall.rotation)).toBeGreaterThan(5);
    const later = blockPose(plan, plan.delayMs + plan.popMs + 900);
    expect(later.dy).toBeGreaterThan(fall.dy);
    expect(later.dy - fall.dy).toBeGreaterThan(fall.dy - blockPose(plan, plan.delayMs + plan.popMs + 300).dy);
  });
});

describe('run phase machine with the cinematic', () => {
  it('locks PLAYING → CINEMATIC → OVER and refuses to leave the cinematic any other way', () => {
    const phase = new RunPhaseMachine();
    phase.transition('PLAYING');
    phase.transition('CINEMATIC');
    expect(phase.isCinematic()).toBe(true);
    expect(phase.isBusy()).toBe(false);
    expect(() => phase.transition('PLAYING')).toThrow();
    expect(() => phase.transition('DRAGGING')).toThrow();
    phase.transition('OVER');
    expect(phase.isCinematic()).toBe(false);
    phase.transition('PLAYING');
    phase.transition('RESOLVING');
    phase.transition('CINEMATIC');
    expect(phase.current()).toBe('CINEMATIC');
  });
});
