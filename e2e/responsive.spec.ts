import { expect, test, type Page } from '@playwright/test';
import { center, drag, openGame, state } from './helpers';

const viewports = [
  [1920, 1080], [1600, 900], [1366, 768], [1280, 720], [1024, 768],
  [1024, 1366], [834, 1194], [768, 1024],
  [430, 932], [412, 915], [390, 844], [375, 812], [360, 800], [320, 568],
  [932, 430], [844, 390], [812, 375], [800, 360], [568, 320],
  [900, 500], [700, 900], [500, 700],
] as const;

const pieceCounts = [1, 2, 3, 4, 5, 6, 7, 8] as const;

async function forceTray(page: Page, count: number, allCuttable = false): Promise<void> {
  await page.evaluate(({ count, allCuttable }) => {
    const game = window.__MIRRORBLADE_TEST__!.game;
    const definitions = allCuttable
      ? Array.from({ length: count }, () => 'line5')
      : ['line5', 'line4', 'plus5', 'corner3x3', 't4', 's4', 'square4', 'single', 'l5', 'u5', 'n5', 'w5'].slice(0, count);
    const tones = ['coral', 'violet', 'amber', 'cyan'] as const;
    const pieces = definitions.map((definition, index) => game['makePiece'](definition, tones[index % tones.length]));
    game['tray'].replaceAll(pieces);
    if (!allCuttable && pieces[0]) game['tray'].rotate(pieces[0].id); // worst-case vertical 1×5
    game['view'].tray.render(game['tray'].list());
  }, { count, allCuttable });
  await page.waitForFunction((expected) => {
    const previews = [...document.querySelectorAll<HTMLElement>('.tray-slot .piece')];
    return previews.length === expected && previews.every((preview) => Boolean(preview.dataset.previewWidth));
  }, count);
}

async function assertInViewport(page: Page, selector: string, width: number, height: number): Promise<void> {
  const box = await page.locator(selector).first().boundingBox();
  expect(box, `${selector} must have a box at ${width}x${height}`).not.toBeNull();
  expect(box!.x, `${selector} left edge at ${width}x${height}`).toBeGreaterThanOrEqual(-1);
  expect(box!.y, `${selector} top edge at ${width}x${height}`).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width, `${selector} right edge at ${width}x${height}`).toBeLessThanOrEqual(width + 1);
  expect(box!.y + box!.height, `${selector} bottom edge at ${width}x${height}`).toBeLessThanOrEqual(height + 1);
}

// One test per viewport so a failure names the size and no single test runs long enough to time out under load.
for (const [width, height] of viewports) {
  test(`${width}x${height} keeps dynamic trays contained, reachable and separate from the katana`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await openGame(page, { save: { settings: { quality: 'low', reducedMotion: true } } });
    await page.evaluate(() => { window.__MIRRORBLADE_TEST__!.setScore(1234); window.__MIRRORBLADE_TEST__!.setBlades(2); });
    await page.mouse.move(1, 1);
    for (const count of pieceCounts) {
      await forceTray(page, count);
      // The final-five placement countdown lives on the board and must stay on screen at every size.
      await page.evaluate(() => window.__MIRRORBLADE_TEST__!.setPlacementDeadline(5_000));
      for (const selector of ['.board', '#tray', '#blade-zone', '.hud-score', '.hud-controls', '.placement-deadline']) {
        await assertInViewport(page, selector, width, height);
      }
      const result = await page.evaluate(() => {
        const rect = (element: Element) => {
          const value = element.getBoundingClientRect();
          return { left: value.left, right: value.right, top: value.top, bottom: value.bottom, width: value.width, height: value.height };
        };
        const overlaps = (a: ReturnType<typeof rect>, b: ReturnType<typeof rect>) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        const tray = document.querySelector<HTMLElement>('#tray')!;
        const blade = document.querySelector<HTMLElement>('#blade-zone')!;
        const trayRect = rect(tray);
        const bladeRect = rect(blade);
        const cards = [...document.querySelectorAll<HTMLElement>('.tray-slot')];
        const previews = [...document.querySelectorAll<HTMLElement>('.tray-slot .piece')];
        const escaped = previews.map((preview, index) => {
          const pieceRect = rect(preview); const cardRect = rect(cards[index]!);
          return pieceRect.left < cardRect.left - 0.75 || pieceRect.right > cardRect.right + 0.75
            || pieceRect.top < cardRect.top - 0.75 || pieceRect.bottom > cardRect.bottom + 0.75 ? index : -1;
        }).filter((index) => index >= 0);
        // Only the part inside the tray scrollport is painted/hit-testable. That clipped part must never meet the blade.
        const visibleBladeOverlaps = cards.map((card, index) => {
          const cardRect = rect(card);
          const clipped = {
            left: Math.max(cardRect.left, trayRect.left), right: Math.min(cardRect.right, trayRect.right),
            top: Math.max(cardRect.top, trayRect.top), bottom: Math.min(cardRect.bottom, trayRect.bottom),
            width: 0, height: 0,
          };
          return clipped.right > clipped.left && clipped.bottom > clipped.top && overlaps(clipped, bladeRect) ? index : -1;
        }).filter((index) => index >= 0);
        return {
          board: rect(document.querySelector('.board')!), tray: trayRect, blade: bladeRect,
          escaped, visibleBladeOverlaps, cards: cards.length,
          scrollable: tray.scrollHeight > tray.clientHeight + 1,
          scrollHeight: tray.scrollHeight, clientHeight: tray.clientHeight,
          overflowY: getComputedStyle(tray).overflowY, touchAction: getComputedStyle(tray).touchAction,
          documentOverflow: {
            x: document.documentElement.scrollWidth - window.innerWidth,
            y: document.documentElement.scrollHeight - window.innerHeight,
          },
        };
      });
      expect(result.cards, `card count at ${width}×${height}`).toBe(count);
      expect(result.escaped, `preview/card containment at ${width}×${height}, count ${count}`).toEqual([]);
      expect(result.visibleBladeOverlaps, `visible card/blade overlap at ${width}×${height}, count ${count}`).toEqual([]);
      expect(result.tray.bottom, `tray/blade separation at ${width}×${height}, count ${count}`).toBeLessThanOrEqual(result.blade.top + 0.75);
      expect(Math.abs(result.board.width - result.board.height)).toBeLessThan(2);
      expect(result.documentOverflow.x).toBeLessThanOrEqual(0);
      expect(result.documentOverflow.y).toBeLessThanOrEqual(0);
      expect(result.touchAction).toBe('pan-y');
      if (result.scrollable) {
        expect(result.overflowY).toBe('auto');
        expect(result.scrollHeight).toBeGreaterThan(result.clientHeight);
        await page.locator('#tray').evaluate((tray) => { tray.scrollTop = tray.scrollHeight; });
        await expect.poll(async () => page.locator('.tray-slot').last().evaluate((card) => {
          const cardRect = card.getBoundingClientRect(); const trayRect = document.querySelector('#tray')!.getBoundingClientRect();
          return Math.min(cardRect.bottom, trayRect.bottom) - Math.max(cardRect.top, trayRect.top);
        })).toBeGreaterThan(20);
      }
      await page.locator('#tray').evaluate((tray) => { tray.scrollTop = 0; });
    }
    const finalState = await state(page);
    expect(finalState.score).toBe(1234);
    expect(finalState.blades).toBe(2);
    expect(finalState.phase).toBe('PLAYING');
  });
}

test('defensive 12-piece trays degrade to scrolling without covering the blade', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openGame(page, { save: { settings: { quality: 'low', reducedMotion: true } } });
  await forceTray(page, 12);
  const geometry = await page.evaluate(() => {
    const tray = document.querySelector<HTMLElement>('#tray')!; const blade = document.querySelector('#blade-zone')!.getBoundingClientRect(); const area = tray.getBoundingClientRect();
    return { count: tray.querySelectorAll('.tray-slot').length, client: tray.clientHeight, scroll: tray.scrollHeight, trayBottom: area.bottom, bladeTop: blade.top };
  });
  expect(geometry.count).toBe(12);
  expect(geometry.scroll).toBeGreaterThan(geometry.client);
  expect(geometry.trayBottom).toBeLessThanOrEqual(geometry.bladeTop + 0.75);
});

test('a piece can be cut from the end of a scrolled tray and both new fragments are revealed', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openGame(page, { save: { settings: { quality: 'low', reducedMotion: true } } });
  await forceTray(page, 8, true);
  const sourceId = await page.locator('.tray-slot').last().getAttribute('data-slot-piece');
  await page.locator('#tray').evaluate((tray) => { tray.scrollTop = tray.scrollHeight; });
  const source = await center(page, '.tray-slot:last-child .piece');
  const blade = await center(page, '.blade-dock');
  await drag(page, source, blade);
  await expect.poll(() => state(page).then((value) => value.tray.length)).toBe(9);
  const fragments = await state(page).then((value) => value.tray.filter((piece: { parentId?: string }) => piece.parentId === sourceId));
  expect(fragments).toHaveLength(2);
  await expect.poll(() => state(page).then((value) => value.phase)).toBe('PLAYING');
  await expect(page.locator(fragments.map((piece: { id: string }) => `[data-slot-piece="${piece.id}"]`).join(','))).toHaveCount(2);
  await expect.poll(async () => page.evaluate((ids) => {
    const trayRect = document.querySelector('#tray')!.getBoundingClientRect();
    return ids.every((id: string) => {
      const rect = document.querySelector<HTMLElement>(`[data-slot-piece="${id}"]`)!.getBoundingClientRect();
      return Math.min(rect.bottom, trayRect.bottom) - Math.max(rect.top, trayRect.top) > 20;
    });
  }, fragments.map((piece: { id: string }) => piece.id))).toBe(true);
});

test('touch can scroll from a piece, then a held piece can drag to the katana', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openGame(page, { save: { settings: { quality: 'low', reducedMotion: true } } });
  await forceTray(page, 8, true);
  const first = await center(page, '.tray-slot:first-child .piece');
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: first.x, y: first.y }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: first.x, y: first.y - 80 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.locator('#tray').evaluate((tray) => tray.scrollTop)).toBeGreaterThan(40);
  await page.locator('#tray').evaluate((tray) => { tray.scrollTop = tray.scrollHeight; });
  const source = await center(page, '.tray-slot:last-child .piece');
  const blade = await center(page, '.blade-dock');
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: source.x, y: source.y }] });
  await page.waitForTimeout(190);
  for (let step = 1; step <= 10; step += 1) {
    const x = source.x + ((blade.x - source.x) * step) / 10;
    const y = source.y + (((blade.y + 84) - source.y) * step) / 10;
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await client.detach();
  await expect.poll(() => state(page).then((value) => value.tray.length)).toBe(9);
});

test('the Home screen has no blade Play/Pause animation control', async ({ page }) => {
  await openGame(page, { play: false });
  await expect(page.locator('.hero-motion')).toHaveCount(0);
  await expect(page.locator('[data-action="quick-play"]')).toBeVisible();
});

test('placed block colour matches the tray block colour exactly', async ({ page }) => {
  await openGame(page);
  await page.evaluate(() => {
    const api = window.__MIRRORBLADE_TEST__!;
    api.fillBoard([{ row: 2, col: 2 }], 'coral');
    api.forcePiece('single', 'coral');
  });
  const colors = await page.evaluate(() => {
    const read = (element: Element | null): string => element ? getComputedStyle(element).backgroundImage : '';
    return { board: read(document.querySelector('.cell[data-row="2"][data-col="2"] .blk')), tray: read(document.querySelector('#tray .blk')) };
  });
  expect(colors.board).toBe(colors.tray);
  expect(colors.board).toContain('gradient');
});
