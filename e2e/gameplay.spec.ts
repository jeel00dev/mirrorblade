import { expect, test } from '@playwright/test';
import { BLADE_ENERGY } from '../src/config/blade';
import { boardCellPoint, center, drag, openGame, state, touchDrag } from './helpers';

test('places a mirrored piece with the mouse and scores it', async ({ page }) => {
  await openGame(page);
  await page.evaluate(() => window.__MIRRORBLADE_TEST__!.forcePiece('single'));
  const source = await center(page, '[data-piece-id]');
  const target = await boardCellPoint(page, 4, 1);
  await drag(page, source, { x: target.x, y: target.y + 10 });
  await expect.poll(() => state(page).then((s) => s.score)).toBe(20);
  const s = await state(page);
  expect((s.board as unknown[][]).flat().filter(Boolean)).toHaveLength(2);
  expect(s.board[4][1]).toBeTruthy();
  expect(s.board[4][7]).toBeTruthy();
});

test('tap rotates a tray piece and R rotates from the keyboard; cut fragments rotate too', async ({ page }) => {
  await openGame(page);
  await page.evaluate(() => window.__MIRRORBLADE_TEST__!.forcePiece('line3'));
  const piece = await center(page, '[data-piece-id]');
  await page.mouse.click(piece.x, piece.y);
  await expect.poll(() => state(page).then((s) => s.tray[0].rotation)).toBe(1);
  expect((await state(page)).tray[0].cells).toEqual([{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }]);
  await page.keyboard.press('r');
  await expect.poll(() => state(page).then((s) => s.tray[0].rotation)).toBe(2);
  const blade = await center(page, '[data-testid="blade"] .blade-dock');
  const rotated = await center(page, '[data-piece-id]');
  await drag(page, rotated, blade);
  await expect.poll(() => state(page).then((s) => s.tray.length)).toBe(2);
  await expect.poll(() => state(page).then((s) => s.phase)).toBe('PLAYING');
  await expect(page.locator('[data-piece-id]')).toHaveCount(2);
  const fragment = await center(page, '[data-piece-id]');
  await page.mouse.click(fragment.x, fragment.y);
  await expect.poll(() => state(page).then((s) => s.tray[0].rotation)).toBe(1);
  expect((await state(page)).tray[0].cutGeneration).toBe(1);
});

test('cuts a piece into two fragments, spends one blade, and rejects with zero blades', async ({ page }) => {
  await openGame(page);
  await page.evaluate(() => window.__MIRRORBLADE_TEST__!.forcePiece('l4'));
  const source = await center(page, '[data-piece-id]');
  const blade = await center(page, '[data-testid="blade"] .blade-dock');
  await drag(page, source, blade);
  await expect.poll(() => state(page).then((s) => s.blades)).toBe(2);
  const cut = await state(page);
  expect(cut.tray).toHaveLength(2);
  expect(cut.tray.every((piece: { cutGeneration: number }) => piece.cutGeneration === 1)).toBe(true);

  await page.evaluate(() => { window.__MIRRORBLADE_TEST__!.setBlades(0); window.__MIRRORBLADE_TEST__!.forcePiece('l4'); });
  await expect(page.locator('[data-testid="blade"]')).toHaveClass(/is-empty/);
  const again = await center(page, '[data-piece-id]');
  await drag(page, again, blade);
  await page.waitForTimeout(400);
  const rejected = await state(page);
  expect(rejected.blades).toBe(0);
  expect(rejected.tray).toHaveLength(1);
  expect(rejected.phase).toBe('PLAYING');
});

test('touch drag lifts the piece above the finger and still lands on the intended cells', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openGame(page);
  await page.evaluate(() => window.__MIRRORBLADE_TEST__!.forcePiece('single'));
  const source = await center(page, '[data-piece-id]');
  const target = await boardCellPoint(page, 6, 2);
  // The visual sits DRAG_TOUCH_OFFSET above the finger, so the finger aims below the target cell.
  await touchDrag(page, source, { x: target.x, y: target.y + 84 }, 0);
  await expect.poll(() => state(page).then((s) => (s.board as unknown[][]).flat().filter(Boolean).length)).toBe(2);
  const s = await state(page);
  expect(s.board[6][2]).toBeTruthy();
  expect(s.board[6][6]).toBeTruthy();
});

test('first session teaches place, mirror, rotate, cut and energy in play', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openGame(page, { onboardingComplete: false });
  await expect(page.locator('#hint-bar')).toContainText('Drag a piece');
  await page.evaluate(() => window.__MIRRORBLADE_TEST__!.forcePiece('single'));
  const source = await center(page, '[data-piece-id]');
  const target = await boardCellPoint(page, 4, 4);
  await drag(page, source, { x: target.x, y: target.y + 10 });
  await expect(page.locator('#hint-bar')).toContainText('mirrors', { timeout: 3000 });
  await expect(page.locator('#hint-bar')).toContainText('rotate', { timeout: 4000 });
  const piece = await center(page, '[data-piece-id]');
  await page.mouse.click(piece.x, piece.y);
  await expect(page.locator('#hint-bar')).toContainText('blade');
  await page.evaluate(() => window.__MIRRORBLADE_TEST__!.forcePiece('l4'));
  const cutSource = await center(page, '[data-piece-id]');
  const blade = await center(page, '[data-testid="blade"] .blade-dock');
  await drag(page, cutSource, blade);
  await expect(page.locator('#hint-bar')).toContainText('ring', { timeout: 3000 });
  await page.locator('#hint-bar button').click();
  await expect(page.locator('#hint-bar')).toBeHidden();
  await expect.poll(() => state(page).then((s) => s.tutorialStep)).toBe(0);
});

test('handles resize during pointer capture without losing the piece', async ({ page }) => {
  await page.setViewportSize({ width: 907, height: 510 });
  await openGame(page);
  await page.evaluate(() => window.__MIRRORBLADE_TEST__!.forcePiece('single'));
  const source = await center(page, '[data-piece-id]');
  await page.mouse.move(source.x, source.y);
  await page.mouse.down();
  await page.mouse.move(source.x + 50, source.y - 40, { steps: 4 });
  await page.setViewportSize({ width: 821, height: 462 });
  const target = await boardCellPoint(page, 4, 4);
  await page.mouse.move(target.x, target.y + 10, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => state(page).then((s) => (s.board as unknown[][]).flat().filter(Boolean).length)).toBe(1);
});

test('line clears award blade energy and a full meter forges a blade', async ({ page }) => {
  await openGame(page);
  await page.evaluate(() => {
    const t = window.__MIRRORBLADE_TEST__!;
    const cells = [];
    for (let col = 0; col < 9; col += 1) if (col !== 4) cells.push({ row: 2, col });
    cells.push({ row: 0, col: 0 }, { row: 0, col: 8 }); // keep the board non-empty so this is not a Perfect Clear
    t.fillBoard(cells, 'amber');
    t.setEnergy(95);
    t.forcePiece('single');
  });
  const source = await center(page, '[data-piece-id]');
  const target = await boardCellPoint(page, 2, 4);
  await drag(page, source, { x: target.x, y: target.y + 10 });
  await expect.poll(() => state(page).then((s) => s.blades)).toBe(4);
  const s = await state(page);
  expect(s.energy).toBe(95 + BLADE_ENERGY.gains.single - BLADE_ENERGY.full);
  expect(s.score).toBeGreaterThanOrEqual(110);
  await expect(page.locator('#blade-count')).toHaveText('4');
});

test('Overdrive doubles the score of moves committed while it is active', async ({ page }) => {
  await openGame(page);
  await page.evaluate(() => { window.__MIRRORBLADE_TEST__!.forcePiece('single'); });
  const before = await center(page, '[data-piece-id]');
  await drag(page, before, await boardCellPoint(page, 0, 4).then((p) => ({ x: p.x, y: p.y + 10 })));
  await expect.poll(() => state(page).then((s) => s.score)).toBe(10);
  await page.evaluate(() => { window.__MIRRORBLADE_TEST__!.forceOverdrive(); window.__MIRRORBLADE_TEST__!.forcePiece('single'); });
  await expect.poll(() => state(page).then((s) => s.overdrive.multiplier)).toBe(2);
  await expect(page.locator('body')).toHaveClass(/state-overdrive/);
  await expect(page.locator('.status-chip.overdrive')).toBeVisible();
  const during = await center(page, '[data-piece-id]');
  await drag(page, during, await boardCellPoint(page, 1, 4).then((p) => ({ x: p.x, y: p.y + 10 })));
  await expect.poll(() => state(page).then((s) => s.score)).toBe(30);
});

test('Fracture warns, times each placement, resets on placement, escapes on a clear and ends the run on timeout', async ({ page }) => {
  await openGame(page);
  await page.evaluate(() => {
    const t = window.__MIRRORBLADE_TEST__!;
    const cells = [];
    for (let col = 0; col < 9; col += 1) if (col !== 4) cells.push({ row: 8, col });
    t.fillBoard(cells, 'coral');
    t.forcePiece('single');
    t.forceFracture();
  });
  await expect.poll(() => state(page).then((s) => s.fracture.phase)).toBe('warning');
  await expect(page.locator('#hint-bar')).toContainText('escape');
  await expect.poll(() => state(page).then((s) => s.fracture.phase), { timeout: 6000 }).toBe('active');
  await expect(page.locator('.status-chip.fracture')).toBeVisible();
  await page.waitForTimeout(1500);
  const beforePlace = (await state(page)).fracture.remainingMs as number;
  expect(beforePlace).toBeLessThan(7000);
  // A non-clearing placement resets the window.
  const first = await center(page, '[data-piece-id]');
  await drag(page, first, await boardCellPoint(page, 0, 1).then((p) => ({ x: p.x, y: p.y + 10 })));
  await expect.poll(() => state(page).then((s) => s.fracture.remainingMs)).toBeGreaterThan(7000);
  // Clearing the bottom row escapes.
  await expect.poll(() => state(page).then((s) => s.phase)).toBe('PLAYING');
  await page.evaluate(() => window.__MIRRORBLADE_TEST__!.forcePiece('single'));
  const second = await center(page, '[data-piece-id]');
  await drag(page, second, await boardCellPoint(page, 8, 4).then((p) => ({ x: p.x, y: p.y + 10 })));
  await expect.poll(() => state(page).then((s) => s.fracture.phase)).toBe('idle');
  await expect(page.locator('body')).not.toHaveClass(/state-fracture/);

  // Timeout ends the run with the fracture result screen.
  await page.evaluate(() => window.__MIRRORBLADE_TEST__!.forceFracture());
  await expect.poll(() => state(page).then((s) => s.phase), { timeout: 15000 }).toBe('OVER');
  await expect(page.locator('.results')).toContainText('fractured');
});

test('timers pause while the tab is hidden and while a menu is open', async ({ page }) => {
  await openGame(page);
  await page.evaluate(() => window.__MIRRORBLADE_TEST__!.forceOverdrive());
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const hiddenAt = (await state(page)).overdrive.remainingMs as number;
  await page.waitForTimeout(700);
  const stillHidden = await state(page);
  expect(stillHidden.gates).toContain('hidden');
  expect(Math.abs((stillHidden.overdrive.remainingMs as number) - hiddenAt)).toBeLessThan(40);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.keyboard.press('Escape');
  await expect(page.locator('.pause-card')).toBeVisible();
  const pausedAt = (await state(page)).overdrive.remainingMs as number;
  await page.waitForTimeout(600);
  expect(Math.abs(((await state(page)).overdrive.remainingMs as number) - pausedAt)).toBeLessThan(40);
  await page.locator('[data-action="resume"]:visible').click();
  await page.waitForTimeout(500);
  expect((await state(page)).overdrive.remainingMs as number).toBeLessThan(pausedAt - 300);
});

test('every screen is reachable, settings persist across reload, and play again is immediate', async ({ page }) => {
  await openGame(page);
  const act = (action: string) => page.locator(`.screen:not(.is-leaving) [data-action="${action}"]:visible`).first();
  await act('home').click();
  await expect(page.locator('.screen-home:not(.is-leaving)')).toBeVisible();
  for (const [action, screen] of [['shop', 'shop'], ['collection', 'collection'], ['stats', 'stats'], ['achievements', 'achievements'], ['daily', 'daily'], ['howto', 'howto']] as const) {
    await act(action).click();
    await expect(page.locator(`.screen-${screen}:not(.is-leaving)`)).toBeVisible();
    await act('home').click();
    await expect(page.locator('.screen-home:not(.is-leaving)')).toBeVisible();
  }
  await act('settings').click();
  await expect(page.locator('.screen-settings')).toBeVisible();
  await page.locator('[data-setting-toggle="haptics"]').click();
  await expect(page.locator('[data-setting-toggle="haptics"]')).toHaveAttribute('aria-checked', 'false');
  await page.locator('[data-setting-choice="quality"][data-value="high"]').click();
  await page.waitForTimeout(800);
  await page.reload();
  await expect.poll(() => page.evaluate(() => document.body.dataset.screen)).toBe('home');
  await act('settings').click();
  await expect(page.locator('[data-setting-toggle="haptics"]')).toHaveAttribute('aria-checked', 'false');
  await expect(page.locator('[data-setting-choice="quality"][data-value="high"]')).toHaveAttribute('aria-pressed', 'true');
  await act('about').click();
  await expect(page.locator('.screen-about:not(.is-leaving)')).toBeVisible();
  await act('settings').click();
  await expect(page.locator('.screen-settings:not(.is-leaving)')).toBeVisible();
  await act('home').click();
  await expect(page.locator('.screen-home:not(.is-leaving)')).toBeVisible();
  await act('quick-play').click();
  await expect.poll(() => state(page).then((s) => s.phase)).toBe('PLAYING');
  await page.evaluate(() => window.__MIRRORBLADE_TEST__!.endRun());
  await expect(page.locator('.results')).toBeVisible();
  await page.locator('[data-action="restart"]:visible').click();
  await expect.poll(() => state(page).then((s) => s.phase)).toBe('PLAYING');
  await expect(page.locator('[data-testid="board"]')).toBeVisible();
});

test('shop purchase animates the balance, equips and persists', async ({ page }) => {
  await openGame(page, { play: false, save: { currency: 500 } });
  await page.locator('[data-action="shop"]:visible').click();
  await page.locator('[data-action="catalog-select"][data-value="frosted-glass"]').click();
  await expect(page.locator('.preview-info h2')).toHaveText('Frosted Glass');
  await page.locator('[data-action="purchase"][data-value="frosted-glass"]').click();
  await expect(page.locator('[data-action="equip"][data-value="frosted-glass"]')).toBeVisible();
  await expect(page.locator('#catalog-shards b')).toHaveText('340', { timeout: 3000 });
  await page.locator('[data-action="equip"][data-value="frosted-glass"]').click();
  await expect(page.locator('.item-card[data-value="frosted-glass"] .item-state.is-equipped')).toBeVisible();
  await page.waitForTimeout(800);
  await page.reload();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mirrorblade.save')!));
  expect(saved.equipped.blocks).toBe('frosted-glass');
  expect(saved.currency).toBe(340);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--block-cyan').trim())).toBe('#8fdbe6');
});

test('navigation requested during a resolving placement is deferred, never dropped', async ({ page }) => {
  await openGame(page);
  await page.evaluate(() => window.__MIRRORBLADE_TEST__!.forcePiece('single'));
  const source = await center(page, '[data-piece-id]');
  const target = await boardCellPoint(page, 3, 3);
  await drag(page, source, { x: target.x, y: target.y + 10 });
  await page.locator('[data-action="pause"]:visible').click({ force: true });
  await expect(page.locator('.pause-card')).toBeVisible();
  expect((await state(page)).phase).toBe('PLAYING');
});

test('twenty restarts leave no stray screens, canvases, drag visuals or toasts behind', async ({ page }) => {
  test.setTimeout(120_000); // each round waits for the katana strike before it can skip
  await openGame(page);
  const counts = () => page.evaluate(() => ({
    screens: document.querySelectorAll('.screen').length,
    canvases: document.querySelectorAll('canvas').length,
    dragVisuals: document.querySelectorAll('.drag-visual').length,
    toasts: document.querySelectorAll('.toast').length,
    callouts: document.querySelectorAll('.callout').length,
    blocks: document.querySelectorAll('#board .blk').length,
    cinematic: document.querySelectorAll('.cinematic-layer, .cine-block').length,
  }));
  await page.evaluate(() => window.__MIRRORBLADE_TEST__!.forcePiece('single'));
  const source = await center(page, '[data-piece-id]');
  await drag(page, source, await boardCellPoint(page, 4, 1).then((p) => ({ x: p.x, y: p.y + 10 })));
  await expect.poll(() => state(page).then((s) => s.phase)).toBe('PLAYING');
  const baseline = await counts();
  for (let round = 0; round < 20; round += 1) {
    await page.evaluate(() => window.__MIRRORBLADE_TEST__!.endRun());
    // Skip the katana cinematic as soon as the strike lands: twenty full sequences would take a minute.
    await expect.poll(() => page.evaluate(() => window.__MIRRORBLADE_TEST__!.skipCinematic())).toBe(true);
    await expect(page.locator('.results')).toBeVisible();
    await page.locator('[data-action="restart"]:visible').click();
    await expect.poll(() => state(page).then((s) => s.phase)).toBe('PLAYING');
  }
  await page.waitForTimeout(400);
  const after = await counts();
  expect(after.screens).toBeLessThanOrEqual(baseline.screens);
  expect(after.canvases).toBe(baseline.canvases);
  expect(after.dragVisuals).toBe(0);
  expect(after.blocks).toBe(0);
  expect(after.cinematic).toBe(0);
  expect(after.callouts).toBeLessThanOrEqual(1);
  expect(after.toasts).toBeLessThanOrEqual(3);
  expect((await state(page)).blades).toBe(3);
});

test('V3: difficulty stage, recharge cost and charge tier are visible and rise with play', async ({ page }) => {
  await openGame(page);
  await expect(page.locator('#mirror-stage b')).toHaveText('I');
  await page.evaluate(() => window.__MIRRORBLADE_TEST__!.setScore(9_200));
  await expect.poll(() => state(page).then((s) => s.difficulty.stage)).toBe(3);
  await expect(page.locator('#mirror-stage b')).toHaveText('III');
  // Forge one blade: the next forge costs more and the ring label changes tier.
  await page.evaluate(() => {
    const t = window.__MIRRORBLADE_TEST__!;
    const cells = [];
    for (let col = 0; col < 9; col += 1) if (col !== 4) cells.push({ row: 2, col });
    cells.push({ row: 0, col: 0 }, { row: 0, col: 8 });
    t.fillBoard(cells, 'amber');
    t.setEnergy(97);
    t.forcePiece('single');
  });
  const source = await center(page, '[data-piece-id]');
  const target = await boardCellPoint(page, 2, 4);
  await drag(page, source, { x: target.x, y: target.y + 10 });
  await expect.poll(() => state(page).then((s) => s.blades)).toBe(4);
  const s = await state(page);
  expect(s.bladesEarned).toBe(1);
  expect(s.rechargeCost).toBe(115);
  await expect(page.locator('#energy-label')).toContainText('Charge II', { timeout: 3000 });
  // Detailed collection replaces the original 1.6k model; see the katana research budget.
  expect(s.bladeTriangles).toBeLessThan(15000);
});

test('V3: a Mirror Contract completes on a qualifying clear and pays its reward', async ({ page }) => {
  await openGame(page);
  await page.evaluate(() => {
    const t = window.__MIRRORBLADE_TEST__!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = t.game as unknown as Record<string, any>;
    const contract = { kind: 'clear-lines', title: 'Clear 2 lines', detail: 'in 3 moves', target: 2, progress: 0, movesLeft: 3, reward: { score: 300, energy: 25, shards: 3 } };
    g['contracts']['active'] = contract;
    g['view'].setContract(contract, 'offered');
    const cells = [];
    for (let col = 0; col < 9; col += 1) if (col !== 4) { cells.push({ row: 2, col }); cells.push({ row: 6, col }); }
    cells.push({ row: 0, col: 0 }, { row: 0, col: 8 });
    t.fillBoard(cells, 'coral');
    t.forcePiece('line5', 'cyan');
  });
  await expect(page.locator('.status-chip.contract')).toBeVisible();
  const before = (await state(page)).score as number;
  // Rotate the 5-line vertical and drop it through column 4 rows 2–6: clears rows 2 and 6 → double.
  const piece = await center(page, '[data-piece-id]');
  await page.mouse.click(piece.x, piece.y);
  await expect.poll(() => state(page).then((s) => s.tray[0].rotation)).toBe(1);
  const source = await center(page, '[data-piece-id]');
  const target = await boardCellPoint(page, 4, 4);
  await drag(page, source, { x: target.x, y: target.y + 10 });
  await expect.poll(() => state(page).then((s) => s.contract)).toBeNull();
  const after = await state(page);
  expect((after.score as number) - before).toBeGreaterThanOrEqual(300 + 200);
  await expect(page.locator('.status-chip.contract')).toHaveCount(0);
});

test('V3: Precision Cells pay out when a clear passes through both and expire otherwise', async ({ page }) => {
  await openGame(page);
  await page.evaluate(() => {
    const t = window.__MIRRORBLADE_TEST__!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = t.game as unknown as Record<string, any>;
    const cells = [];
    for (let col = 0; col < 9; col += 1) if (col !== 1 && col !== 7) cells.push({ row: 3, col });
    cells.push({ row: 0, col: 0 }, { row: 0, col: 8 });
    t.fillBoard(cells, 'violet');
    g['precision']['active'] = { cells: [{ row: 3, col: 1 }, { row: 3, col: 7 }], movesLeft: 6 };
    g['view'].board.setPrecision([{ row: 3, col: 1 }, { row: 3, col: 7 }]);
    t.forcePiece('single', 'cyan');
  });
  await expect(page.locator('.cell.is-precision')).toHaveCount(2);
  const before = (await state(page)).score as number;
  const source = await center(page, '[data-piece-id]');
  const target = await boardCellPoint(page, 3, 1);
  await drag(page, source, { x: target.x, y: target.y + 10 });
  await expect.poll(() => state(page).then((s) => s.precision)).toBeNull();
  await expect(page.locator('.cell.is-precision')).toHaveCount(0);
  expect(((await state(page)).score as number) - before).toBeGreaterThanOrEqual(150 + 100);
});

test('V3: scrollable screens get a bottom fade and the themed scrollbar rules apply', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 600 });
  await openGame(page, { play: false });
  await page.locator('[data-action="settings"]:visible').click();
  await expect(page.locator('.screen-settings .scroll-fade')).toHaveClass(/is-visible/);
  const body = page.locator('.screen-settings .screen-body');
  await body.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await expect(page.locator('.screen-settings .scroll-fade')).not.toHaveClass(/is-visible/);
  const scrollbar = await body.evaluate((element) => getComputedStyle(element).scrollbarWidth);
  expect(scrollbar).toBe('thin');
});

test('V3: the shop scrolls with a touch swipe on a phone and the tabs stay pinned', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 664 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await openGame(page, { play: false, save: { currency: 340 } });
  await page.locator('[data-action="shop"]:visible').first().tap();
  await expect(page.locator('.screen-shop .item-strip')).toBeVisible();
  const body = page.locator('.screen-shop .screen-body');
  expect(await body.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  const client = await context.newCDPSession(page);
  const x = 195;
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: 600 }] });
  for (let step = 1; step <= 12; step += 1) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: 600 - step * 20 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => body.evaluate((element) => element.scrollTop)).toBeGreaterThan(100);
  const nav = await page.locator('.category-nav').boundingBox();
  const bodyBox = await body.boundingBox();
  expect(nav!.y).toBeGreaterThanOrEqual(bodyBox!.y - 1);
  await page.locator('[data-action="catalog-category"][data-value="blades"]').tap();
  await expect(page.locator('.preview-info h2')).toHaveText('Shoshin');
  await context.close();
});

test('Daily Mirror calendar: past days complete without extending the streak, today extends it', async ({ page }) => {
  const today = new Date().toISOString().slice(0, 10);
  const shift = (days: number): string => new Date(Date.parse(`${today}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
  const yesterday = shift(-1);
  const older = shift(-3);
  await openGame(page, { play: false, save: { currency: 100, achievements: ['first-reflection'], daily: { scores: { [older]: 1200 }, streak: 0, lastStreakDate: '', bestStreak: 0, bestDailyScore: 1200 } } });
  await page.locator('[data-action="daily"]:visible').first().click();
  await expect(page.locator('.screen-daily:not(.is-leaving) .calendar')).toBeVisible();
  // Grid invariants: every week has 7 cells, today is marked, tomorrow is locked, the older day is done.
  const weeks = await page.locator('.cal-grid').evaluate((grid) => grid.children.length);
  expect(weeks % 7).toBe(0);
  await expect(page.locator(`.cal-day[data-value="${today}"]`)).toHaveClass(/is-today/);
  await expect(page.locator(`.cal-day[data-value="${shift(1)}"]`)).toBeDisabled();
  await expect(page.locator(`.cal-day[data-value="${older}"]`)).toHaveClass(/is-done/);
  await expect(page.locator('.cal-next')).toBeDisabled();

  // Play yesterday's puzzle and complete it.
  await page.locator(`.cal-day[data-value="${yesterday}"]`).click();
  await expect(page.locator('.day-detail h2')).toContainText(new Date(Date.parse(`${yesterday}T12:00:00Z`)).getUTCDate().toString());
  await page.locator('[data-action="daily-play"]:visible').click();
  await expect.poll(() => state(page).then((s) => s.phase)).toBe('PLAYING');
  expect((await state(page)).mode).toBe('daily');
  await expect(page.locator('.status-chip.daily')).toBeVisible();
  await page.evaluate(() => {
    const t = window.__MIRRORBLADE_TEST__!;
    const cells = [];
    for (let col = 0; col < 9; col += 1) if (col !== 4) cells.push({ row: 2, col });
    cells.push({ row: 0, col: 0 }, { row: 0, col: 8 });
    t.fillBoard(cells, 'amber');
    t.setScore(850);
    t.forcePiece('single');
  });
  const source = await center(page, '[data-piece-id]');
  const target = await boardCellPoint(page, 2, 4);
  await drag(page, source, { x: target.x, y: target.y + 10 });
  await expect.poll(() => state(page).then((s) => s.score)).toBeGreaterThanOrEqual(900);
  await expect(page.locator('.status-chip.daily')).toHaveClass(/is-done/);
  let saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mirrorblade.save')!));
  await expect.poll(async () => (await page.evaluate(() => JSON.parse(localStorage.getItem('mirrorblade.save')!))).daily.scores[yesterday] ?? 0, { timeout: 3000 }).toBeGreaterThanOrEqual(900);
  saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mirrorblade.save')!));
  expect(saved.daily.streak).toBe(0);
  expect(saved.currency).toBe(130);

  // End the run, return to the calendar: yesterday is now done; play today and complete it → streak 1.
  await page.evaluate(() => window.__MIRRORBLADE_TEST__!.endRun());
  await expect(page.locator('.results')).toContainText('Puzzle complete');
  await expect(page.locator('.results')).toContainText('streak unchanged');
  await page.locator('.results [data-action="home"]').click();
  await expect(page.locator('.screen-home:not(.is-leaving)')).toBeVisible();
  await page.locator('.screen-home:not(.is-leaving) [data-action="daily"]').click();
  await expect(page.locator(`.cal-day[data-value="${yesterday}"]`)).toHaveClass(/is-done/);
  const beforeToday = (await page.evaluate(() => JSON.parse(localStorage.getItem('mirrorblade.save')!))).currency as number; // includes the first run's payout
  await page.locator(`.cal-day[data-value="${today}"]`).click();
  await page.locator('[data-action="daily-play"]:visible').click();
  await expect.poll(() => state(page).then((s) => s.phase)).toBe('PLAYING');
  await page.evaluate(() => {
    const t = window.__MIRRORBLADE_TEST__!;
    const cells = [];
    for (let col = 0; col < 9; col += 1) if (col !== 4) cells.push({ row: 2, col });
    cells.push({ row: 0, col: 0 }, { row: 0, col: 8 });
    t.fillBoard(cells, 'amber');
    t.setScore(850);
    t.forcePiece('single');
  });
  const source2 = await center(page, '[data-piece-id]');
  await drag(page, source2, { x: target.x, y: target.y + 10 });
  await expect.poll(async () => (await page.evaluate(() => JSON.parse(localStorage.getItem('mirrorblade.save')!))).daily.streak, { timeout: 3000 }).toBe(1);
  saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mirrorblade.save')!));
  expect(saved.daily.lastStreakDate).toBe(today);
  expect(saved.currency).toBe(beforeToday + 30);
  // Replaying today does not pay or count again.
  await page.evaluate(() => window.__MIRRORBLADE_TEST__!.endRun());
  await expect(page.locator('.results')).toContainText('1-day streak');
});
