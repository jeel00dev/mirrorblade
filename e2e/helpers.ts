import { expect, type Page } from '@playwright/test';

export const sdkStub = `
  window.CrazyGames = { SDK: {
    environment: 'local',
    async init() {},
    data: {
      getItem(key) { return localStorage.getItem(key); },
      setItem(key, value) { localStorage.setItem(key, value); },
      removeItem(key) { localStorage.removeItem(key); },
      clear() { localStorage.clear(); }
    },
    game: {
      calls: [],
      gameplayStart(){ this.calls.push('gameplayStart'); }, gameplayStop(){ this.calls.push('gameplayStop'); },
      loadingStart(){ this.calls.push('loadingStart'); }, loadingStop(){ this.calls.push('loadingStop'); },
      happytime(){ this.calls.push('happytime'); }, reportGameCompletedPercentage(value){ this.calls.push('completion:' + value); },
      settings: { muteAudio: false }, addSettingsChangeListener(){}, removeSettingsChangeListener(){}
    },
    user: { systemInfo: { device: 'desktop' } },
    ad: { requestAd(_type, callbacks) { callbacks.adError({ code: 'adsDisabledBasicLaunch', message: 'disabled' }); } },
    banner: { async requestResponsiveBanner(){ throw new Error('disabled'); }, clearBanner(){}, clearAllBanners(){} }
  }};
`;

export interface OpenOptions {
  onboardingComplete?: boolean;
  save?: Record<string, unknown>;
  /** Go straight into an endless run from Home. */
  play?: boolean;
}

export async function openGame(page: Page, options: OpenOptions = {}): Promise<void> {
  const { onboardingComplete = true, play = true } = options;
  await page.route('https://sdk.crazygames.com/**', (route) => route.fulfill({ contentType: 'application/javascript', body: sdkStub }));
  await page.addInitScript(({ complete, save }) => {
    if (!localStorage.getItem('mirrorblade.save')) {
      localStorage.setItem('mirrorblade.save', JSON.stringify({ version: 2, onboardingComplete: complete, settings: { quality: 'low', reducedMotion: false }, ...save }));
    }
  }, { complete: onboardingComplete, save: options.save ?? {} });
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => document.body.dataset.screen)).toMatch(onboardingComplete ? /home/ : /gameplay/);
  if (onboardingComplete && play) {
    await page.locator('[data-action="quick-play"]:visible').click();
    await expect.poll(() => state(page).then((s) => s.phase)).toBe('PLAYING');
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function state(page: Page): Promise<Record<string, any>> {
  return page.evaluate(() => window.__MIRRORBLADE_TEST__!.state());
}

export async function drag(page: Page, source: { x: number; y: number }, target: { x: number; y: number }): Promise<void> {
  await page.mouse.move(source.x, source.y);
  await page.mouse.down();
  await page.mouse.move(source.x + 12, source.y + 12, { steps: 2 });
  await page.mouse.move(target.x, target.y, { steps: 10 });
  await page.mouse.up();
}

/** Real touch input through CDP, so pointerType === 'touch' and the touch drag offset applies. */
export async function touchDrag(page: Page, source: { x: number; y: number }, target: { x: number; y: number }, offsetY: number): Promise<void> {
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: source.x, y: source.y }] });
  const steps = 10;
  for (let step = 1; step <= steps; step += 1) {
    const x = source.x + ((target.x - source.x) * step) / steps;
    const y = source.y + offsetY + ((target.y - source.y) * step) / steps;
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await client.detach();
}

export async function center(page: Page, selector: string): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await page.locator(selector).first().boundingBox();
  expect(box, `${selector} must be visible`).not.toBeNull();
  return { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2, width: box!.width, height: box!.height };
}

export async function boardCellPoint(page: Page, row: number, col: number): Promise<{ x: number; y: number }> {
  const box = await page.locator('[data-testid="board"]').boundingBox();
  const size = box!.width / 9;
  return { x: box!.x + (col + 0.5) * size, y: box!.y + (row + 0.5) * size };
}
