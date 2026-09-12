import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const baseUrl = process.env.KATANA_URL ?? 'http://127.0.0.1:5173';
const outDir = 'docs/qa/katana-collection';
const quick = process.argv.includes('--quick');
const viewports = quick ? [[1366, 768]] : [[1920, 1080], [1366, 768], [1280, 720], [390, 844], [430, 932], [844, 390], [768, 1024]];
const ids = ['surgical-chrome', 'black-titanium', 'frost-blade', 'prism-edge', 'golden-edge'];
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [], measurements = [];
try {
  for (const [width, height] of viewports) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('https://sdk.crazygames.com/**', (route) => route.fulfill({ contentType: 'application/javascript', body: 'window.CrazyGames=undefined;' }));
    await page.addInitScript((owned) => {
      localStorage.setItem('mirrorblade.save', JSON.stringify({ version: 2, onboardingComplete: true, currency: 540, settings: { quality: 'high', reducedMotion: false }, ownedCosmetics: owned }));
    }, ids);
    await page.goto(baseUrl);
    await page.waitForSelector('.screen-home:not([hidden])');
    const click = (selector) => page.locator(`${selector}:visible`).first().click();
    await click('[data-action="shop"]');
    await click('[data-action="catalog-category"][data-value="blades"]');
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i], suffix = `${i + 1}-${id}-${width}x${height}`;
      await click(`[data-action="catalog-select"][data-value="${id}"]`);
      await page.evaluate(() => { const blade = window.__MIRRORBLADE_TEST__.game['blade']; blade['showcasePaused'] = true; });
      await page.waitForTimeout(350);
      await page.locator('.screen-shop .screen-body').evaluate((element) => { element.scrollTop = 0; });
      await page.screenshot({ path: `${outDir}/shop-${suffix}.png` });
      measurements.push(await page.evaluate(() => {
        const blade = window.__MIRRORBLADE_TEST__.game['blade'];
        return { id: blade.canvas.dataset.bladeId, viewport: [innerWidth, innerHeight], triangles: blade.triangles, calls: blade['renderer'].info.render.calls, textures: blade['renderer'].info.memory.textures, geometries: blade['renderer'].info.memory.geometries };
      }));
      if (quick || width === 1366) {
        await click('[data-action="blade-detail"]');
        await page.waitForTimeout(200);
        await page.screenshot({ path: `${outDir}/detail-${suffix}.png` });
        await click('[data-action="blade-detail"]');
      }
      if (!quick) {
        if (await page.locator('[data-action="equip"]:visible').count()) await click('[data-action="equip"]');
        await click('[data-action="home"]');
        await page.waitForTimeout(350);
        await page.screenshot({ path: `${outDir}/home-${suffix}.png` });
        await click('[data-action="quick-play"]');
        await page.waitForTimeout(450);
        await page.screenshot({ path: `${outDir}/gameplay-${suffix}.png` });
        await click('[data-action="home"]');
        await click('[data-action="shop"]');
        await click('[data-action="catalog-category"][data-value="blades"]');
      }
    }
    await page.close();
    console.log(`Katana capture: ${width}x${height}`);
  }
} finally { await browser.close(); }
writeFileSync(`${outDir}/measurements.json`, JSON.stringify({ measurements, errors }, null, 2) + '\n');
console.log(JSON.stringify({ measurements: measurements.slice(0, 5), errors }, null, 2));
if (errors.length) process.exitCode = 1;
