import { expect, test, type Page } from '@playwright/test';
import { openGame, state } from './helpers';

/** SDK calls recorded by the stub in helpers.ts (docs/crazygames-compliance.md). */
const calls = (page: Page): Promise<string[]> => page.evaluate(() => (window as unknown as { CrazyGames: { SDK: { game: { calls: string[] } } } }).CrazyGames.SDK.game.calls);

test('SDK lifecycle: loading events at boot, gameplayStart on play/resume, gameplayStop on pause/menu/game over, never on focus loss', async ({ page }) => {
  await openGame(page, { play: false });
  expect(await calls(page)).toEqual(['loadingStart', 'loadingStop']);
  await page.locator('[data-action="quick-play"]:visible').click();
  await expect.poll(() => state(page).then((s) => s.phase)).toBe('PLAYING');
  expect((await calls(page)).at(-1)).toBe('gameplayStart');
  // Focus loss is handled by the platform: no gameplayStop from blur/visibility.
  await page.evaluate(() => { window.dispatchEvent(new Event('blur')); window.dispatchEvent(new Event('focus')); });
  expect((await calls(page)).filter((call) => call === 'gameplayStop')).toHaveLength(0);
  await page.keyboard.press('p');
  await expect(page.locator('.screen-pause:not(.is-leaving)')).toBeVisible();
  expect((await calls(page)).at(-1)).toBe('gameplayStop');
  await page.locator('[data-action="resume"]:visible').click();
  await expect.poll(() => state(page).then((s) => s.screen)).toBe('gameplay');
  expect((await calls(page)).at(-1)).toBe('gameplayStart');
  await page.evaluate(() => window.__MIRRORBLADE_TEST__!.endRun());
  expect((await calls(page)).at(-1)).toBe('gameplayStop');
  await expect(page.locator('.results')).toBeVisible();
  // Restart: gameplay resumes and completion is reported when a Mirror Level is reached.
  await page.locator('[data-action="restart"]:visible').click();
  await expect.poll(() => state(page).then((s) => s.phase)).toBe('PLAYING');
  expect((await calls(page)).at(-1)).toBe('gameplayStart');
  await page.evaluate(() => { window.__MIRRORBLADE_TEST__!.setScore(2_400); window.__MIRRORBLADE_TEST__!.fillBoard([{ row: 4, col: 0 }, { row: 4, col: 1 }, { row: 4, col: 2 }, { row: 4, col: 3 }, { row: 4, col: 5 }, { row: 4, col: 6 }, { row: 4, col: 7 }, { row: 4, col: 8 }], 'amber'); window.__MIRRORBLADE_TEST__!.forcePiece('single'); });
  const piece = await page.locator('[data-piece-id]').first().boundingBox();
  const board = await page.locator('[data-testid="board"]').boundingBox();
  const size = board!.width / 9;
  await page.mouse.move(piece!.x + piece!.width / 2, piece!.y + piece!.height / 2);
  await page.mouse.down();
  await page.mouse.move(piece!.x + 20, piece!.y + 20, { steps: 2 });
  await page.mouse.move(board!.x + 4.5 * size, board!.y + 4.5 * size + 10, { steps: 10 });
  await page.mouse.up();
  await expect.poll(() => calls(page).then((list) => list.some((call) => call.startsWith('completion:')))).toBe(true);
  expect(await calls(page)).toContain('completion:20');
});

test('without the SDK (blocked script) the game boots and plays locally; disabled environment is never used', async ({ page }) => {
  await page.route('https://sdk.crazygames.com/**', (route) => route.abort());
  await page.addInitScript(() => localStorage.setItem('mirrorblade.save', JSON.stringify({ version: 2, onboardingComplete: true, settings: { quality: 'low' } })));
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => document.body.dataset.screen)).toBe('home');
  await page.locator('[data-action="quick-play"]:visible').click();
  await expect.poll(() => state(page).then((s) => s.phase)).toBe('PLAYING');
  expect(errors).toEqual([]);
  // A "disabled" environment (foreign domain) must not be initialised at all.
  await page.route('https://sdk.crazygames.com/**', (route) => route.fulfill({ contentType: 'application/javascript', body: 'window.CrazyGames={SDK:{environment:"disabled",async init(){throw new Error("must not init");},game:{gameplayStart(){throw new Error("must not call");}}}};' }));
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => document.body.dataset.screen)).toBe('home');
  await page.locator('[data-action="quick-play"]:visible').click();
  await expect.poll(() => state(page).then((s) => s.phase)).toBe('PLAYING');
  expect(errors).toEqual([]);
});

test('no custom fullscreen control, no external links, context menu suppressed, English UI', async ({ page }) => {
  await openGame(page, { play: false });
  for (const action of ['settings', 'home', 'about']) {
    if (action === 'about') { await page.locator('[data-action="settings"]:visible').click(); }
    await page.locator(`[data-action="${action}"]:visible`).first().click();
    await page.waitForTimeout(250);
  }
  expect(await page.locator('a[href^="http"]').count()).toBe(0);
  expect(await page.locator('[data-action*="fullscreen"], button:has-text("Fullscreen")').count()).toBe(0);
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('en');
  const prevented = await page.evaluate(() => { const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true }); document.querySelector('#app')!.dispatchEvent(event); return event.defaultPrevented; });
  expect(prevented).toBe(true);
});
