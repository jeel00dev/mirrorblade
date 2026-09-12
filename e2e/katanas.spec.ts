import { expect, test, type Page } from '@playwright/test';
import { openGame, state } from './helpers';

const ids = ['surgical-chrome', 'black-titanium', 'frost-blade', 'prism-edge', 'golden-edge'];
const costs = [0, 170, 220, 260, 360];
const click = (page: Page, action: string, value?: string) => page.locator(`[data-action="${action}"]${value ? `[data-value="${value}"]` : ''}:visible`).first().click();
async function openBlades(page: Page): Promise<void> {
  await click(page, 'shop');
  await click(page, 'catalog-category', 'blades');
}
async function expectBlade(page: Page, id: string): Promise<void> {
  await expect(page.locator('.blade-canvas:visible')).toHaveAttribute('data-blade-id', id);
  expect((await state(page)).bladePresentation.id).toBe(id);
}

test('each katana can be bought, equipped, used in Home and gameplay, and restored after reload', async ({ page }) => {
  test.setTimeout(120_000);
  await openGame(page, { play: false, save: { currency: 2000 } });
  let balance = 2000;
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]!;
    await openBlades(page);
    await click(page, 'catalog-select', id);
    if (i > 0) {
      await click(page, 'purchase', id);
      balance -= costs[i]!;
      await expect(page.locator('[data-action="purchase"]:visible')).toHaveCount(0);
      await click(page, 'equip', id);
    }
    await click(page, 'home');
    await expectBlade(page, id);
    await expect(page.locator('[data-equipped-blade]')).toHaveAttribute('data-equipped-blade', id);
    await click(page, 'quick-play');
    await expectBlade(page, id);
    await click(page, 'home');
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('mirrorblade.save')!).equipped?.blades ?? 'surgical-chrome')).toBe(id);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mirrorblade.save')!));
    expect(saved.currency).toBe(balance);
    await page.reload();
    await expectBlade(page, id);
  }
});

test('unowned previews never leak into equipment; Collection and Use default restore the same model', async ({ page }) => {
  await openGame(page, { play: false, save: { currency: 0, ownedCosmetics: ['black-titanium'], equipped: { blades: 'black-titanium' } } });
  await openBlades(page);
  await click(page, 'catalog-select', 'golden-edge');
  await expectBlade(page, 'golden-edge');
  await expect(page.locator('[data-action="purchase"]:visible')).toBeDisabled();
  await click(page, 'home');
  await expectBlade(page, 'black-titanium');
  await click(page, 'collection');
  await click(page, 'catalog-category', 'blades');
  await expect(page.locator('.katana-item')).toHaveCount(2);
  await click(page, 'catalog-select', 'black-titanium');
  await click(page, 'catalog-unequip', 'blades');
  await click(page, 'home');
  await expectBlade(page, 'surgical-chrome');
  await click(page, 'quick-play');
  await expectBlade(page, 'surgical-chrome');
});

test('signature animation has a true hold, replay, pause and an inspectable fittings view', async ({ page }) => {
  await openGame(page, { play: false });
  await expect.poll(() => state(page).then((s) => s.bladePresentation.phase)).toBe('hold');
  const hold = (await state(page)).bladePresentation;
  await page.waitForTimeout(450);
  const later = (await state(page)).bladePresentation;
  expect(later.rotation).toEqual(hold.rotation);
  expect(later.position).toEqual(hold.position);
  expect(later.effectsVisible).toBe(false);
  await openBlades(page);
  await click(page, 'catalog-select', 'golden-edge');
  await click(page, 'blade-motion');
  await expect(page.locator('[data-action="blade-motion"]:visible')).toHaveAttribute('aria-pressed', 'true');
  const paused = (await state(page)).bladePresentation.time;
  await page.waitForTimeout(350);
  expect((await state(page)).bladePresentation.time).toBe(paused);
  await click(page, 'blade-replay');
  await expect.poll(() => state(page).then((s) => s.bladePresentation.phase)).toBe('flourish');
  await page.evaluate(() => Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }));
  const hiddenTime = (await state(page)).bladePresentation.time;
  await page.waitForTimeout(300);
  expect((await state(page)).bladePresentation.time).toBe(hiddenTime);
  await page.evaluate(() => { Reflect.deleteProperty(document, 'hidden'); });
  await click(page, 'blade-detail');
  await expect(page.locator('.blade-canvas:visible')).toHaveAttribute('data-blade-view', 'detail');
  await click(page, 'blade-detail');
  await expect(page.locator('.blade-canvas:visible')).toHaveAttribute('data-blade-view', 'full');
});

test('reduced motion holds all five blades still and switching designs does not accumulate GPU resources', async ({ page }) => {
  await openGame(page, { play: false, save: { settings: { reducedMotion: true, quality: 'low' } } });
  await expect(page.locator('[data-action="blade-motion"]:visible')).toBeDisabled();
  await openBlades(page);
  const readings: { textures: number; geometries: number }[] = [];
  for (let pass = 0; pass < 3; pass++) for (const id of ids) {
    await click(page, 'catalog-select', id);
    await expectBlade(page, id);
    await expect.poll(() => state(page).then((s) => s.bladePresentation.phase)).toBe('hold');
    const presentation = (await state(page)).bladePresentation;
    expect(presentation.effectsVisible).toBe(false);
    expect(presentation.triangles).toBeLessThan(15000);
    readings.push(presentation);
  }
  expect(readings[14]!.textures).toBe(readings[4]!.textures);
  expect(readings[14]!.geometries).toBe(readings[4]!.geometries);
  await expect(page.locator('[data-action="blade-replay"]:visible')).toBeDisabled();
  await expect(page.locator('canvas.blade-canvas')).toHaveCount(1);
});

test('all five ordered cards and controls are reachable on a narrow phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openGame(page, { play: false });
  await openBlades(page);
  await expect(page.locator('.katana-tier b')).toHaveText(['01', '02', '03', '04', '05']);
  for (const id of ids) {
    await click(page, 'catalog-select', id);
    await expectBlade(page, id);
    await expect(page.locator('.preview-info h2')).toBeVisible();
  }
  await click(page, 'blade-detail');
  await expect(page.locator('.blade-canvas:visible')).toHaveAttribute('data-blade-view', 'detail');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  await page.locator('[data-action="blade-detail"]:visible').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.blade-canvas:visible')).toHaveAttribute('data-blade-view', 'full');
  expect(overflow).toBe(false);
});
