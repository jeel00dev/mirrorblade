/**
 * Quick QA screenshot. Usage:
 *   node scripts/qa-shot.mjs <width> <height> <out.png> [--play] [--state overdrive|fracture|stress|contract|deadline]
 *        [--screen shop|collection|settings|stats|achievements|daily|howto|pause|gameover]
 *        [--fresh] [--score N] [--a11y accessible|contrast|reduced] [--url http://127.0.0.1:5173]
 *        [--cinematic <ms>]   capture the game-over cinematic this many ms after the run ends (implies --screen gameover)
 *        [--pieces <count>] [--vertical]   force a dynamic gameplay tray; vertical rotates its first line5
 * Populates the board with the reference composition when --play is given.
 */
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const [width, height, out] = args;
const flag = (name) => { const index = args.indexOf(`--${name}`); return index >= 0 ? args[index + 1] : null; };
const has = (name) => args.includes(`--${name}`);
const url = flag('url') ?? 'http://127.0.0.1:5173';

const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: Number(width), height: Number(height) } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.route('https://sdk.crazygames.com/**', (route) => route.fulfill({ contentType: 'application/javascript', body: 'window.CrazyGames=undefined;' }));
const a11y = flag('a11y');
const settings = { quality: 'medium', ...(a11y === 'accessible' ? { accessibleColors: true } : a11y === 'contrast' ? { highContrast: true } : a11y === 'reduced' ? { reducedMotion: true } : {}) };
if (!has('fresh')) {
  await page.addInitScript((s) => localStorage.setItem('mirrorblade.save', JSON.stringify({ version: 2, onboardingComplete: true, settings: s, stats: { bestScore: 12780, totalRuns: 41, totalScore: 190400, totalLinesCleared: 612, rowsCleared: 380, columnsCleared: 232, piecesPlaced: 2210, piecesRotated: 640, piecesCut: 96, bladesUsed: 96, bladesForged: 44, highestChain: 6, doubles: 88, triples: 21, maxClears: 3, perfectMirrors: 9, perfectClears: 2, overdrives: 17, overdriveSeconds: 170, fractures: 23, fractureEscapes: 15, clutches: 4, dailyPlays: 12, totalPlayTimeSeconds: 15900, highestStage: 4, longestRunMoves: 212, contractsCompleted: 9, precisionHits: 5 }, currency: 340, ownedCosmetics: ['classic-spectrum', 'midnight', 'surgical-chrome', 'glass-shatter', 'soft-glow', 'studio-sound', 'frosted-glass', 'black-titanium'], achievements: ['first-reflection', 'first-cut', 'turned', 'double-vision', 'surgeon', 'hot-streak', 'under-contract'], daily: { streak: 3, bestStreak: 5, lastStreakDate: new Date().toISOString().slice(0, 10), bestDailyScore: 4120, currentDate: new Date().toISOString().slice(0, 10), todayScore: 2100, lastPlayedDate: new Date().toISOString().slice(0, 10), scores: Object.fromEntries([0, 1, 2, 4, 5, 9, 11, 12].map((d) => [new Date(Date.now() - d * 86400000).toISOString().slice(0, 10), 900 + d * 40])) } })), settings);
}
await page.goto(url);
await page.waitForTimeout(700);
const click = async (selector) => page.locator(`${selector}:visible`).first().click();
const screen = flag('screen');
if (has('play') || screen === 'pause' || screen === 'gameover' || flag('state') || flag('cinematic')) {
  if ((await page.evaluate(() => document.body.dataset.screen)) === 'home') await click('[data-action="quick-play"]');
  await page.waitForTimeout(350);
  await page.evaluate((score) => {
    const t = window.__MIRRORBLADE_TEST__;
    const g = t.game;
    const board = g['board'];
    board.reset();
    const put = (cells, tone) => board.occupy(cells.flatMap(([r, c]) => (c === 4 ? [{ row: r, col: c }] : [{ row: r, col: c }, { row: r, col: 8 - c }])), { tone, pieceId: 'qa' });
    put([[1, 1], [1, 2], [2, 1]], 'cyan');
    put([[3, 0], [4, 0], [4, 1]], 'coral');
    put([[5, 3], [5, 4]], 'amber');
    put([[7, 1], [8, 1], [8, 2]], 'violet');
    g['view'].board.setBoard(board.snapshot());
    g.debugSetScore(score);
    t.setEnergy(64);
  }, Number(flag('score') ?? 2340));
  const state = flag('state');
  if (state === 'overdrive') { await page.evaluate(() => window.__MIRRORBLADE_TEST__.forceOverdrive()); await page.waitForTimeout(900); }
  if (state === 'fracture') { await page.evaluate(() => window.__MIRRORBLADE_TEST__.forceFracture()); await page.waitForTimeout(3600); }
  if (state === 'stress') { await page.evaluate(() => { const g = window.__MIRRORBLADE_TEST__.game; for (let i = 0; i < 8; i++) g['director'].observe({ score: g['score'].current(), lineCount: 0, occupancy: 0.5, legalOptions: 20 }); g['presentStress'](g['director'].state()); }); await page.waitForTimeout(500); }
  if (state === 'contract') { await page.evaluate(() => { const g = window.__MIRRORBLADE_TEST__.game; const c = { kind: 'clear-lines', title: 'Clear 2 lines', detail: 'in 3 moves', target: 2, progress: 1, movesLeft: 2, reward: { score: 300, energy: 25, shards: 3 } }; g['contracts']['active'] = c; g['view'].setContract(c, 'offered'); g['view'].board.setPrecision([{ row: 6, col: 1 }, { row: 6, col: 7 }]); }); await page.waitForTimeout(400); }
  const pieceCount = Number(flag('pieces') ?? 0);
  if (pieceCount > 0) {
    await page.evaluate(({ count, vertical }) => {
      const g = window.__MIRRORBLADE_TEST__.game;
      const ids = ['line5', 'line4', 'plus5', 'corner3x3', 't4', 's4', 'square4', 'single', 'l5', 'u5', 'n5', 'w5'];
      const tones = ['coral', 'violet', 'amber', 'cyan'];
      const pieces = Array.from({ length: count }, (_, index) => g['makePiece'](ids[index % ids.length], tones[index % tones.length]));
      g['tray'].replaceAll(pieces);
      if (vertical && pieces[0]) g['tray'].rotate(pieces[0].id);
      g['view'].tray.render(g['tray'].list());
    }, { count: pieceCount, vertical: has('vertical') });
    await page.waitForTimeout(260);
  }
  if (state === 'deadline') { await page.evaluate(() => window.__MIRRORBLADE_TEST__.setPlacementDeadline(5_000)); await page.waitForTimeout(200); }
  if (screen === 'pause') { await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
  if (screen === 'gameover' || flag('cinematic')) { await page.evaluate(() => { const t = window.__MIRRORBLADE_TEST__; t.game.debugSetScore(13410); t.endRun(); }); await page.waitForTimeout(Number(flag('cinematic') ?? 2400)); }
} else if (screen) {
  await click(`[data-action="${screen}"]`);
  await page.waitForTimeout(500);
  const category = flag('category');
  if (category) { await click(`[data-action="catalog-category"][data-value="${category}"]`); await page.waitForTimeout(400); }
}
await page.waitForTimeout(Number(flag('wait') ?? 300));
await page.screenshot({ path: out });
console.log(`${width}x${height} → ${out}`, errors.length ? `ERRORS: ${errors.join(' | ')}` : 'no errors');
await browser.close();
