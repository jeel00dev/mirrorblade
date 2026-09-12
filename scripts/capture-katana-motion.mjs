import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const baseUrl = process.env.KATANA_URL ?? 'http://127.0.0.1:5173';
const outDir = 'docs/qa/katana-collection';
const ids = ['surgical-chrome', 'black-titanium', 'frost-blade', 'prism-edge', 'golden-edge'];
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  for (const [width, height] of [[1366, 768], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height }, recordVideo: { dir: `${outDir}/motion-video`, size: { width, height } } });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('https://sdk.crazygames.com/**', (route) => route.fulfill({ contentType: 'application/javascript', body: 'window.CrazyGames=undefined;' }));
    await page.addInitScript((owned) => localStorage.setItem('mirrorblade.save', JSON.stringify({ version: 2, onboardingComplete: true, currency: 540, ownedCosmetics: owned, settings: { quality: 'high', reducedMotion: false } })), ids);
    await page.goto(baseUrl);
    await page.waitForSelector('.screen-home:not([hidden])');
    for (const id of ids) {
      // Use the game's inventory/equipment presentation path; deterministic mid-flourish capture.
      await page.evaluate((selected) => {
        const game = window.__MIRRORBLADE_TEST__.game;
        game['inventory'].equip(selected);
        game['applyCosmetics']();
        game['showHome']('back');
        const blade = game['blade'];
        blade['showcasePaused'] = false;
        blade['showcaseTime'] = blade['design'].duration * 0.38;
      }, id);
      await page.waitForTimeout(350);
      await page.screenshot({ path: `${outDir}/motion-${id}-${width}x${height}.png` });
      // Record the rest of the flourish, the still pause, and the beginning of its next loop.
      await page.waitForTimeout(6500);
    }
    const video = page.video();
    await page.close();
    await video.saveAs(`${outDir}/motion-video/katana-loops-${width}x${height}.webm`);
    await video.delete();
    console.log(`Motion captures and loop video: ${width}x${height}`);
  }
} finally { await browser.close(); }
if (errors.length) throw new Error(errors.join('\n'));
