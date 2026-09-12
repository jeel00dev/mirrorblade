/**
 * Captures every major screen and gameplay state at the V2 target viewports into docs/qa/v2.
 * Usage: node scripts/capture-screens.mjs [baseUrl] [outDir]   (defaults: http://127.0.0.1:5173, docs/qa/v3 — run `npm run dev` first)
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:5173';
const outDir = process.argv[3] ?? 'docs/qa/v3';
mkdirSync(outDir, { recursive: true });

const viewports = [[1920, 1080], [1366, 768], [1280, 720], [390, 844], [430, 932], [844, 390], [768, 1024]];

const save = {
  version: 2, onboardingComplete: true, currency: 340,
  settings: { quality: 'medium' },
  stats: { bestScore: 12780, totalRuns: 41, totalScore: 190400, totalLinesCleared: 612, rowsCleared: 380, columnsCleared: 232, piecesPlaced: 2210, piecesRotated: 640, piecesCut: 96, bladesUsed: 96, bladesForged: 44, highestChain: 6, doubles: 88, triples: 21, maxClears: 3, perfectMirrors: 9, perfectClears: 2, overdrives: 17, overdriveSeconds: 170, fractures: 23, fractureEscapes: 15, clutches: 4, dailyPlays: 12, totalPlayTimeSeconds: 15900, highestStage: 4, longestRunMoves: 212, contractsCompleted: 9, precisionHits: 5 },
  ownedCosmetics: ['classic-spectrum', 'midnight', 'surgical-chrome', 'glass-shatter', 'soft-glow', 'studio-sound', 'frosted-glass', 'black-titanium'],
  achievements: ['first-reflection', 'first-cut', 'turned', 'double-vision', 'surgeon', 'hot-streak'],
  daily: { streak: 3, bestStreak: 5, lastStreakDate: new Date().toISOString().slice(0, 10), bestDailyScore: 4120, currentDate: new Date().toISOString().slice(0, 10), todayScore: 2100, lastPlayedDate: new Date().toISOString().slice(0, 10), scores: Object.fromEntries([0, 1, 2, 4, 5, 9, 11, 12].map((d) => [new Date(Date.now() - d * 86400000).toISOString().slice(0, 10), 900 + d * 40])) },
};

const populate = () => {
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
  g.debugSetScore(9200);
  t.setEnergy(64);
};
const contractState = () => {
  const g = window.__MIRRORBLADE_TEST__.game;
  const contract = { kind: 'clear-lines', title: 'Clear 2 lines', detail: 'in 3 moves', target: 2, progress: 1, movesLeft: 2, reward: { score: 300, energy: 25, shards: 3 } };
  g['contracts']['active'] = contract;
  g['view'].setContract(contract, 'offered');
  g['view'].board.setPrecision([{ row: 6, col: 1 }, { row: 6, col: 7 }]);
};

const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const problems = [];
for (const [width, height] of viewports) {
  const page = await browser.newPage({ viewport: { width, height } });
  page.on('pageerror', (error) => problems.push(`${width}x${height}: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') problems.push(`${width}x${height}: ${message.text()}`); });
  await page.route('https://sdk.crazygames.com/**', (route) => route.fulfill({ contentType: 'application/javascript', body: 'window.CrazyGames=undefined;' }));
  await page.addInitScript((data) => localStorage.setItem('mirrorblade.save', JSON.stringify(data)), save);
  await page.goto(baseUrl);
  await page.waitForTimeout(700);
  const click = async (selector) => page.locator(`${selector}:visible`).first().click();
  const shot = async (name) => { await page.waitForTimeout(420); await page.screenshot({ path: `${outDir}/${name}-${width}x${height}.png` }); };

  await shot('home');
  await click('[data-action="settings"]'); await shot('settings');
  await click('[data-action="home"]');
  await click('[data-action="shop"]'); await shot('shop');
  await click('[data-action="catalog-category"][data-value="blades"]'); await shot('shop-blades');
  await click('[data-action="home"]');
  await click('[data-action="collection"]'); await shot('collection');
  await click('[data-action="home"]');
  await click('[data-action="stats"]'); await shot('stats');
  await click('[data-action="home"]');
  await click('[data-action="achievements"]'); await shot('achievements');
  await click('[data-action="home"]');
  await click('[data-action="daily"]'); await shot('daily');
  await click('[data-action="home"]');
  await click('[data-action="howto"]'); await shot('howto');
  await click('[data-action="home"]');
  await click('[data-action="quick-play"]');
  await page.waitForTimeout(350);
  await page.evaluate(populate);
  await shot('gameplay-normal');
  await page.evaluate(() => window.__MIRRORBLADE_TEST__.setPlacementDeadline(5_000));
  await shot('gameplay-deadline');
  await page.evaluate(() => window.__MIRRORBLADE_TEST__.setPlacementDeadline(30_000));
  await page.evaluate(contractState);
  await shot('gameplay-contract');
  await page.evaluate(() => { const g = window.__MIRRORBLADE_TEST__.game; g['contracts']['active'] = null; g['view'].setContract(null, 'lapsed'); g['view'].board.setPrecision(null); for (let i = 0; i < 8; i++) g['director'].observe({ score: g['score'].current(), lineCount: 0, occupancy: 0.5, legalOptions: 20 }); g['presentStress'](g['director'].state()); });
  await shot('gameplay-stress');
  await page.evaluate(() => window.__MIRRORBLADE_TEST__.forceOverdrive());
  await page.waitForTimeout(900);
  await shot('gameplay-overdrive');
  await page.reload();
  await page.waitForTimeout(600);
  await click('[data-action="quick-play"]');
  await page.waitForTimeout(350);
  await page.evaluate(populate);
  await page.evaluate(() => window.__MIRRORBLADE_TEST__.forceFracture());
  await page.waitForTimeout(3600);
  await shot('gameplay-fracture');
  await page.keyboard.press('Escape');
  await shot('pause');
  await click('[data-action="resume"]');
  await page.waitForTimeout(200);
  await page.evaluate(() => { const t = window.__MIRRORBLADE_TEST__; t.setScore(13410); t.endRun(); });
  // shot() itself waits 420 ms, so the first frame lands on the strike (~420–490 ms) and the second mid-fall.
  await shot('gameover-cinematic-slash');
  await page.waitForTimeout(150);
  await shot('gameover-cinematic-fall');
  await page.waitForTimeout(1500);
  await shot('gameover');
  await page.close();
  console.log(`captured ${width}x${height}`);
}
await browser.close();
if (problems.length) {
  console.error('Console errors during capture:\n' + problems.join('\n'));
  process.exit(1);
}
console.log(`done → ${outDir}`);
