import { expect, test, type Page } from '@playwright/test';
import { CINEMATIC } from '../src/config/cinematic';
import { boardCellPoint, center, drag, openGame, state } from './helpers';

/** Fills the board with a mirrored composition (or every cell) and reports how many blocks are rendered. */
async function fillBoard(page: Page, density: 'sparse' | 'dense' | 'full' | 'empty'): Promise<number> {
  return page.evaluate((mode) => {
    const t = window.__MIRRORBLADE_TEST__!;
    const cells: { row: number; col: number }[] = [];
    if (mode === 'full') for (let row = 0; row < 9; row += 1) for (let col = 0; col < 9; col += 1) cells.push({ row, col });
    if (mode === 'dense') for (let row = 0; row < 9; row += 1) for (let col = 0; col < 9; col += 1) if ((row * 7 + col * 3) % 11 !== 0) cells.push({ row, col });
    if (mode === 'sparse') for (const [row, col] of [[1, 1], [1, 2], [2, 1], [1, 7], [1, 6], [2, 7], [5, 3], [5, 4], [5, 5], [8, 0], [8, 8]]) cells.push({ row: row!, col: col! });
    t.fillBoard(cells, 'cyan');
    return document.querySelectorAll('#board .blk').length;
  }, density);
}

const cinematic = async (page: Page): Promise<{ active: boolean; events: string[]; direction: string | null; skipped: boolean }> => (await state(page)).cinematic;

test('game over locks the run at once, plays the full katana timeline in order, then shows the results and cleans up', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openGame(page);
  const blocks = await fillBoard(page, 'dense');
  expect(blocks).toBeGreaterThan(60);
  await page.evaluate(() => window.__MIRRORBLADE_TEST__!.endRun());
  // Locked immediately: explicit phase, no run, board untouchable, katana still to come.
  const locked = await state(page);
  expect(locked.phase).toBe('CINEMATIC');
  expect(locked.activeRun).toBe(false);
  expect(locked.cinematic.active).toBe(true);
  // Read within the first frames: nothing past the katana's entrance can have happened yet.
  expect(locked.cinematic.events[0]).toBe('CINEMATIC_START');
  expect(locked.cinematic.events).not.toContain('KATANA_IMPACT');
  await expect(page.locator('.cinematic-layer')).toHaveCount(1);
  await expect(page.locator('.cine-block')).toHaveCount(blocks);
  await expect(page.locator('.screen-gameplay')).toHaveClass(/is-cinematic/);
  await expect(page.locator('#board')).toHaveClass(/is-cinematic/);
  // The katana borrows the shared canvas for the slash and hands it back afterwards.
  await expect(page.locator('.cine-katana')).toHaveCount(1);
  await expect(page.locator('.cine-cut')).toHaveCount(1);
  // A drag on the tray can never place anything now: at most it counts as a skip once the strike has landed.
  const trayBefore = locked.tray.length;
  const piece = await page.locator('[data-piece-id]').first().boundingBox();
  if (piece) await drag(page, { x: piece.x + piece.width / 2, y: piece.y + piece.height / 2 }, await boardCellPoint(page, 4, 4));
  const afterDrag = await state(page);
  expect(['CINEMATIC', 'OVER']).toContain(afterDrag.phase);
  expect(afterDrag.tray).toHaveLength(trayBefore);
  expect((afterDrag.board as unknown[][]).flat().filter(Boolean)).toHaveLength(blocks);
  await expect(page.locator('.results')).toBeVisible();
  const done = await cinematic(page);
  expect(done.events).toEqual(['CINEMATIC_START', 'KATANA_ENTER', 'KATANA_SLASH_START', 'KATANA_IMPACT', 'BLOCKS_RELEASE', 'BLOCKS_FALL', 'BOARD_SETTLED', 'RESULTS_REVEAL', 'CINEMATIC_END'].slice(0, done.events.length));
  expect(done.events).toContain('RESULTS_REVEAL');
  expect((await state(page)).phase).toBe('OVER');
  await expect(page.locator('.results')).toHaveClass(/is-staged/);
  await expect(page.locator('#board')).toHaveClass(/is-mirror-dead/);
  await expect.poll(() => cinematic(page).then((c) => c.active)).toBe(false);
  await expect(page.locator('.cinematic-layer')).toHaveCount(0);
  await expect(page.locator('.cine-block')).toHaveCount(0);
  expect((await cinematic(page)).events).toHaveLength(9);
  // Play again: everything the cinematic touched is back to normal and the katana is in its dock.
  await page.locator('[data-action="restart"]:visible').click();
  await expect.poll(() => state(page).then((s) => s.phase)).toBe('PLAYING');
  await expect(page.locator('#board')).not.toHaveClass(/is-mirror-dead|is-cinematic|is-dead|is-unstable/);
  await expect(page.locator('.screen-gameplay')).not.toHaveClass(/is-cinematic/);
  await expect(page.locator('.blade-stage canvas')).toHaveCount(1);
  await expect(page.locator('#board .blk')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('the slash alternates its diagonal from run to run', async ({ page }) => {
  await openGame(page);
  await fillBoard(page, 'sparse');
  await page.evaluate(() => window.__MIRRORBLADE_TEST__!.endRun());
  expect((await cinematic(page)).direction).toBe('tr-bl');
  await expect(page.locator('.results')).toBeVisible();
  await page.locator('[data-action="restart"]:visible').click();
  await expect.poll(() => state(page).then((s) => s.phase)).toBe('PLAYING');
  await fillBoard(page, 'sparse');
  await page.evaluate(() => window.__MIRRORBLADE_TEST__!.endRun());
  expect((await cinematic(page)).direction).toBe('tl-br');
  await expect(page.locator('.results')).toBeVisible();
});

test('skip is refused before the strike lands and fast-forwards to the results after it; Escape and taps are skips, never navigation', async ({ page }) => {
  await openGame(page);
  await fillBoard(page, 'dense');
  await page.evaluate(() => window.__MIRRORBLADE_TEST__!.endRun());
  expect(await page.evaluate(() => window.__MIRRORBLADE_TEST__!.skipCinematic())).toBe(false);
  expect((await cinematic(page)).skipped).toBe(false);
  // Pause / back keys never navigate: before the strike they are ignored, after it they are a skip.
  await page.keyboard.press('Escape');
  await page.keyboard.press('p');
  const afterKeys = await state(page);
  expect(['gameplay', 'gameover']).toContain(afterKeys.screen);
  expect(afterKeys.screen === 'gameover').toBe(afterKeys.cinematic.skipped);
  await expect.poll(() => cinematic(page).then((c) => c.events.includes('KATANA_IMPACT'))).toBe(true);
  const board = await center(page, '[data-testid="board"]');
  await page.mouse.click(board.x, board.y);
  const started = Date.now();
  await expect(page.locator('.results')).toBeVisible();
  expect(Date.now() - started).toBeLessThan(900);
  const after = await cinematic(page);
  expect(after.skipped).toBe(true);
  expect((await state(page)).screen).toBe('gameover');
  expect(after.events).toContain('RESULTS_REVEAL');
  expect((await state(page)).phase).toBe('OVER');
  await expect(page.locator('.cinematic-layer')).toHaveCount(0);
});

test('reduced motion: no katana travel, no falling clones, a line flash and a fade, results within a second', async ({ page }) => {
  await openGame(page, { save: { settings: { quality: 'low', reducedMotion: true } } });
  await fillBoard(page, 'dense');
  const started = Date.now();
  await page.evaluate(() => window.__MIRRORBLADE_TEST__!.endRun());
  expect((await state(page)).phase).toBe('CINEMATIC');
  await expect(page.locator('.cinematic-layer')).toHaveCount(1);
  await expect(page.locator('.cine-katana')).toHaveCount(0);
  await expect(page.locator('.cine-block')).toHaveCount(0);
  await expect(page.locator('.results')).toBeVisible();
  expect(Date.now() - started).toBeLessThan(CINEMATIC.reduced.resultsMs + 900);
  await expect(page.locator('#board')).toHaveClass(/is-dead/);
  await expect(page.locator('.results')).not.toHaveClass(/is-staged/);
  await expect(page.locator('.cinematic-layer')).toHaveCount(0);
});

test('new best: gold cut line, crest response and the gold results variant', async ({ page }) => {
  await openGame(page, { save: { stats: { bestScore: 100 } } });
  await fillBoard(page, 'sparse');
  await page.evaluate(() => { window.__MIRRORBLADE_TEST__!.setScore(4_000); window.__MIRRORBLADE_TEST__!.endRun(); });
  await expect(page.locator('.cinematic-layer')).toHaveClass(/is-best/);
  await expect.poll(() => cinematic(page).then((c) => c.events.includes('KATANA_IMPACT'))).toBe(true);
  await expect(page.locator('.screen-gameplay')).toHaveClass(/is-new-best/);
  await expect(page.locator('.results .final-score')).toHaveClass(/is-best/);
  await expect(page.locator('.results')).toContainText('NEW BEST');
});

test('fracture timeout: the axis is unstable before the strike and the results say so', async ({ page }) => {
  await openGame(page);
  await fillBoard(page, 'sparse');
  await page.evaluate(() => window.__MIRRORBLADE_TEST__!.endRun('fracture'));
  await expect(page.locator('.cinematic-layer')).toHaveClass(/is-fracture/);
  await expect(page.locator('#board')).toHaveClass(/is-unstable/);
  await expect.poll(() => cinematic(page).then((c) => c.events.includes('KATANA_IMPACT'))).toBe(true);
  await expect(page.locator('#board')).not.toHaveClass(/is-unstable/);
  await expect(page.locator('.results')).toContainText('The mirror fractured');
});

test('a second game over during the sequence is ignored and an empty or full board both complete', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openGame(page);
  await fillBoard(page, 'full');
  await page.evaluate(() => { window.__MIRRORBLADE_TEST__!.endRun(); window.__MIRRORBLADE_TEST__!.endRun('fracture'); });
  await expect(page.locator('.cinematic-layer')).toHaveCount(1);
  await expect(page.locator('.cine-block')).toHaveCount(81);
  expect((await cinematic(page)).direction).toBe('tr-bl');
  await expect(page.locator('.results')).toBeVisible();
  await expect(page.locator('.results')).toContainText('Mirror at rest');
  await page.locator('[data-action="restart"]:visible').click();
  await expect.poll(() => state(page).then((s) => s.phase)).toBe('PLAYING');
  expect(await fillBoard(page, 'empty')).toBe(0);
  await page.evaluate(() => window.__MIRRORBLADE_TEST__!.endRun());
  await expect(page.locator('.cine-block')).toHaveCount(0);
  await expect(page.locator('.results')).toBeVisible();
  await expect.poll(() => cinematic(page).then((c) => c.active)).toBe(false);
  expect(errors).toEqual([]);
});

test('a resize during the sequence lands on the results without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openGame(page);
  await fillBoard(page, 'dense');
  await page.evaluate(() => window.__MIRRORBLADE_TEST__!.endRun());
  await expect.poll(() => cinematic(page).then((c) => c.events.includes('KATANA_IMPACT'))).toBe(true);
  await page.setViewportSize({ width: 900, height: 700 });
  await expect(page.locator('.results')).toBeVisible();
  await expect(page.locator('.cinematic-layer')).toHaveCount(0);
  expect((await state(page)).phase).toBe('OVER');
  expect(errors).toEqual([]);
});

for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1280, height: 800 }]) {
  test(`the katana starts outside the board and finishes off it at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openGame(page);
    await fillBoard(page, 'dense');
    await page.evaluate(() => window.__MIRRORBLADE_TEST__!.endRun());
    await expect.poll(() => cinematic(page).then((c) => c.events.includes('KATANA_ENTER'))).toBe(true);
    const board = await page.locator('[data-testid="board"]').boundingBox();
    const katana = await page.locator('.cine-katana').boundingBox();
    expect(board && katana).toBeTruthy();
    // Sized from the board diagonal, never wider than the viewport.
    const diagonal = Math.hypot(board!.width, board!.height);
    expect(katana!.width).toBeLessThanOrEqual(Math.min(viewport.width, viewport.height) * 0.9 + 1);
    expect(katana!.width).toBeLessThanOrEqual(diagonal * CINEMATIC.katanaScale + 1);
    await expect(page.locator('.results')).toBeVisible();
    await expect(page.locator('.cinematic-layer')).toHaveCount(0);
  });
}
