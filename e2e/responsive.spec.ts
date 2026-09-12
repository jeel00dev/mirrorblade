import { expect, test, type Page } from '@playwright/test';
import { openGame, state } from './helpers';

const viewports = [
  [907, 510], [1216, 684], [1077, 606], [821, 462], [1366, 768], [1920, 1080], [1536, 864], [1280, 720], [1080, 607], [800, 450],
  [390, 844], [430, 932], [768, 1024], [1024, 768], [844, 390], [932, 430],
] as const;

async function assertInViewport(page: Page, selector: string, width: number, height: number): Promise<void> {
  const box = await page.locator(selector).first().boundingBox();
  expect(box, `${selector} must have a box at ${width}x${height}`).not.toBeNull();
  expect(box!.x, `${selector} left edge at ${width}x${height}`).toBeGreaterThanOrEqual(-1);
  expect(box!.y, `${selector} top edge at ${width}x${height}`).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width, `${selector} right edge at ${width}x${height}`).toBeLessThanOrEqual(width + 1);
  expect(box!.y + box!.height, `${selector} bottom edge at ${width}x${height}`).toBeLessThanOrEqual(height + 1);
}

test('all target viewports keep board, tray, score and blade inside the screen with no overlap', async ({ page }) => {
  test.setTimeout(120_000);
  await openGame(page);
  await page.evaluate(() => {
    const t = window.__MIRRORBLADE_TEST__!;
    t.game['tray'].replaceAll([
      t.game['makePiece']('line5', 'amber'), t.game['makePiece']('corner3x3', 'violet'), t.game['makePiece']('plus5', 'cyan'),
    ]);
    t.game['view'].tray.render(t.game['tray'].list());
  });
  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(80);
    for (const selector of ['.board', '#tray', '#blade-zone', '.hud-score', '.hud-controls', '.tray-slot:nth-child(3) .piece']) await assertInViewport(page, selector, width, height);
    const board = await page.locator('.board').boundingBox();
    expect(Math.abs(board!.width - board!.height)).toBeLessThan(2);
    expect(board!.width, `board size at ${width}x${height}`).toBeGreaterThanOrEqual(width < 500 && height < 500 ? 270 : 300);
    const boxes = await Promise.all(['.board', '#tray', '#blade-zone', '.hud'].map((s) => page.locator(s).boundingBox()));
    for (let a = 0; a < boxes.length; a += 1) {
      for (let b = a + 1; b < boxes.length; b += 1) {
        const first = boxes[a]!; const second = boxes[b]!;
        const overlapX = Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x);
        const overlapY = Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y);
        expect(Math.min(overlapX, overlapY), `overlap between regions ${a}/${b} at ${width}x${height}`).toBeLessThanOrEqual(2);
      }
    }
    const overflow = await page.evaluate(() => ({ x: document.documentElement.scrollWidth - window.innerWidth, y: document.documentElement.scrollHeight - window.innerHeight }));
    expect(overflow.x).toBeLessThanOrEqual(0);
    expect(overflow.y).toBeLessThanOrEqual(0);
    const trayCell = await page.evaluate(() => parseFloat(getComputedStyle(document.getElementById('gameplay')!).getPropertyValue('--tray-cell')));
    expect(trayCell, `tray cell at ${width}x${height}`).toBeGreaterThanOrEqual(14);
  }
  expect((await state(page)).phase).toBe('PLAYING');
});

test('placed block colour matches the tray block colour exactly', async ({ page }) => {
  await openGame(page);
  await page.evaluate(() => {
    const t = window.__MIRRORBLADE_TEST__!;
    t.fillBoard([{ row: 2, col: 2 }], 'coral');
    t.forcePiece('single', 'coral');
  });
  const colors = await page.evaluate(() => {
    const read = (element: Element | null): string => element ? getComputedStyle(element).backgroundImage : '';
    return {
      board: read(document.querySelector('.cell[data-row="2"][data-col="2"] .blk')),
      tray: read(document.querySelector('#tray .blk')),
    };
  });
  expect(colors.board).toBe(colors.tray);
  expect(colors.board).toContain('gradient');
});
