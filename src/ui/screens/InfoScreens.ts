import { DAILY_REWARD_SCORE } from '../../config/gameplay';
import { ECONOMY } from '../../config/economy';
import { formatDailyDate, utcDateKey } from '../../game/DailyMode';
import { pieceMarkup } from '../../render/blocks';
import { ACHIEVEMENTS } from '../../progression/AchievementSystem';
import { button, formatDuration, screenHead, shardsPill } from '../components';
import { icon } from '../Icons';
import { element, type ScreenContext } from './context';

export function buildDailyScreen(ctx: ScreenContext): HTMLElement {
  const today = utcDateKey();
  const daily = ctx.save.daily;
  const playedToday = daily.currentDate === today && daily.todayScore > 0;
  return element(`
    <section aria-label="Daily Mirror">
      ${screenHead('Daily Mirror', 'home', shardsPill(ctx.save.currency))}
      <div class="screen-body narrow">
        <div class="panel daily-hero">
          <span class="t-caption">Today, in every mirror</span>
          <div class="date">${formatDailyDate(today)}</div>
          <span class="streak">${icon('daily')}${daily.streak > 0 ? `${daily.streak}-day streak` : 'Start a streak'}</span>
        </div>
        <div class="daily-records">
          <div><span>Today</span><strong class="num">${(daily.currentDate === today ? daily.todayScore : 0).toLocaleString()}</strong></div>
          <div><span>Daily best</span><strong class="num">${daily.bestDailyScore.toLocaleString()}</strong></div>
          <div><span>Plays</span><strong class="num">${ctx.save.stats.dailyPlays.toLocaleString()}</strong></div>
        </div>
        <p class="daily-rules">Everyone gets the same piece sequence for the day. Reach ${DAILY_REWARD_SCORE.toLocaleString()} for +${ECONOMY.dailyMilestoneReward} Mirror Shards, once per day. Rotation, blades, Overdrive and Fracture all apply.</p>
        <div style="margin-top:var(--s-5)">${button(playedToday ? 'Play again' : 'Play today\'s mirror', 'daily-play', { variant: 'primary', icon: 'play', block: true })}</div>
      </div>
    </section>`);
}

export function buildStatsScreen(ctx: ScreenContext): HTMLElement {
  const s = ctx.save.stats;
  const average = s.totalRuns > 0 ? Math.round(s.totalScore / s.totalRuns) : 0;
  const efficiency = s.bladesUsed > 0 ? s.totalLinesCleared / s.bladesUsed : 0;
  const singles = Math.max(0, s.totalLinesCleared - s.doubles * 2 - s.triples * 3 - s.maxClears * 4);
  const combo: readonly [string, number, string][] = [['Single', singles, 'var(--text-muted)'], ['Double', s.doubles, '#dfe6ea'], ['Triple', s.triples, 'var(--info)'], ['Max', s.maxClears, 'var(--accent)']];
  const comboMax = Math.max(1, ...combo.map(([, value]) => value));
  const stageNumeral = ['—', 'I', 'II', 'III', 'IV', 'V'][Math.max(0, Math.min(5, s.highestStage))];
  const rows: readonly [string, string, string, string?][] = [
    ['stats', 'Runs', s.totalRuns.toLocaleString()],
    ['stats', 'Average score', average.toLocaleString()],
    ['time', 'Longest run', s.longestRunMoves > 0 ? `${s.longestRunMoves.toLocaleString()} placements` : '—'],
    ['board', 'Lines cleared', s.totalLinesCleared.toLocaleString(), `${s.rowsCleared} rows · ${s.columnsCleared} columns`],
    ['blocks', 'Pieces placed', s.piecesPlaced.toLocaleString()],
    ['rotate', 'Pieces rotated', s.piecesRotated.toLocaleString()],
    ['chain', 'Highest chain', s.highestChain > 0 ? `×${s.highestChain}` : '—'],
    ['mirror', 'Perfect Mirrors', s.perfectMirrors.toLocaleString()],
    ['crest', 'Perfect Clears', s.perfectClears.toLocaleString()],
    ['energy', 'Blades forged', s.bladesForged.toLocaleString()],
    ['overdrive', 'Overdrives', s.overdrives.toLocaleString(), `${formatDuration(s.overdriveSeconds)} at 2×`],
    ['fracture', 'Fractures escaped', `${s.fractureEscapes} / ${s.fractures}`],
    ['clutch', 'Clutches', s.clutches.toLocaleString()],
    ['contract', 'Contracts completed', s.contractsCompleted.toLocaleString()],
    ['precision', 'Precision hits', s.precisionHits.toLocaleString()],
    ['daily', 'Daily plays', s.dailyPlays.toLocaleString(), `best ${ctx.save.daily.bestDailyScore.toLocaleString()}`],
    ['time', 'Time in the mirror', formatDuration(s.totalPlayTimeSeconds)],
  ];
  return element(`
    <section aria-label="Statistics">
      ${screenHead('Statistics', 'home')}
      <div class="screen-body narrow">
        <div class="stat-hero">
          <div class="panel"><span>Best score</span><strong>${icon('crest')}<span class="num">${s.bestScore.toLocaleString()}</span></strong>${s.legacyBestScore > 0 ? `<small class="t-caption">V1 record ${s.legacyBestScore.toLocaleString()}</small>` : ''}</div>
          <div class="panel"><span>Total score</span><strong><span class="num">${s.totalScore.toLocaleString()}</span></strong></div>
        </div>
        <div class="stat-viz">
          <div class="panel viz-card">
            <span class="viz-title">Clears by size</span>
            <div class="bars">${combo.map(([label, value, color]) => `<div class="bar-row"><span>${label}</span><div class="bar"><i style="--p:${(value / comboMax * 100).toFixed(1)}%;--c:${color}"></i></div><b class="num">${value.toLocaleString()}</b></div>`).join('')}</div>
          </div>
          <div class="panel viz-card">
            <span class="viz-title">Highest Mirror level</span>
            <div class="stage-viz" data-stage="${s.highestStage}"><i></i><i></i><i></i><i></i><i></i><b>${stageNumeral}</b></div>
            <span class="viz-title" style="margin-top:var(--s-3)">Blade efficiency</span>
            <div class="dial"><i style="--p:${Math.min(100, efficiency / 12 * 100).toFixed(1)}%"></i></div>
            <span class="t-caption">${s.bladesUsed > 0 ? `${efficiency.toFixed(1)} lines per blade` : 'No blades used yet'}</span>
          </div>
        </div>
        <div class="panel stat-list">${rows.map(([iconName, label, value, note]) => `<div class="stat-row">${icon(iconName)}<span>${label}</span><strong>${value}${note ? `<small>${note}</small>` : ''}</strong></div>`).join('')}</div>
      </div>
    </section>`);
}

export function buildAchievementsScreen(ctx: ScreenContext): HTMLElement {
  const earned = ctx.save.achievements;
  const percent = Math.round((earned.length / ACHIEVEMENTS.length) * 100);
  return element(`
    <section aria-label="Achievements">
      ${screenHead('Achievements', 'home', shardsPill(ctx.save.currency))}
      <div class="screen-body">
        <div class="achievement-summary"><span>${earned.length} of ${ACHIEVEMENTS.length}</span><div class="progress-bar" role="progressbar" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"><i style="--p:${percent}%"></i></div></div>
        <div class="achievement-grid">${ACHIEVEMENTS.map((achievement) => {
          const done = earned.includes(achievement.id);
          const rare = achievement.reward >= 36;
          return `<div class="achievement${done ? ' is-earned' : ''}${rare ? ' is-rare' : ''}"><span class="medallion"><span class="ring"></span>${icon(achievement.icon)}</span><div><b>${achievement.name}</b><small>${achievement.description}</small></div><span class="reward">${done ? icon('owned') : `+${achievement.reward} ${icon('shard')}`}</span></div>`;
        }).join('')}</div>
      </div>
    </section>`);
}

export function buildHowToScreen(backAction: string): HTMLElement {
  const step = (no: number, title: string, text: string, diagram: string): string =>
    `<div class="panel howto-step"><div class="diagram">${diagram}</div><div><span class="step-no">Step ${no}</span><h3>${title}</h3><p>${text}</p></div></div>`;
  const mini = (cells: string): string => `<span class="mini-board" aria-hidden="true">${cells}</span>`;
  const empty = (n: number): string => '<i></i>'.repeat(n);
  const l3 = pieceMarkup({ cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }], tone: 'coral' });
  const l3Mirror = pieceMarkup({ cells: [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }], tone: 'coral' });
  const line3 = pieceMarkup({ cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }], tone: 'amber' });
  const four = pieceMarkup({ cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }], tone: 'cyan' });
  const two = pieceMarkup({ cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }], tone: 'cyan' });
  return element(`
    <section aria-label="How to play">
      ${screenHead('Guide', backAction)}
      <div class="screen-body narrow howto-steps">
        ${step(1, 'Place', 'Drag a piece from the tray onto the board. Fill a full row or column to clear it.', `<div class="demo demo-place">${mini(empty(9))}${l3}</div>`)}
        ${step(2, 'Mirror', 'Every piece is reflected across the glass column in the centre. Both halves must fit, and both count.', `<div class="demo demo-mirror"><span class="axis"></span>${l3}${l3Mirror}</div>`)}
        ${step(3, 'Rotate', 'Tap a piece (or press R) to turn it a quarter clockwise. Rotation is free and works on cut fragments too.', `<div class="demo demo-rotate">${line3}</div>`)}
        ${step(4, 'Cut', 'Drag a piece over the katana to split it along the lit seam. Each cut spends a blade — and you can keep splitting fragments while you have blades.', `<div class="demo demo-cut"><span class="slash"></span><span class="half a">${two}</span><span class="half b">${two}</span><span class="whole">${four}</span></div>`)}
        ${step(5, 'Blade Energy', 'Clears fill the ring around the katana. A full ring forges a new blade, up to 5. Each blade you forge costs a little more energy than the last — the ring gains tick marks as the cost rises.', `<div class="demo demo-energy"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="5"/><circle class="fill" cx="50" cy="50" r="44" fill="none" stroke="var(--info)" stroke-width="5" stroke-linecap="round" stroke-dasharray="276"/></svg>${icon('blade')}<b class="count">3</b></div>`)}
        ${step(6, 'Combo', 'Two lines in one placement is a DOUBLE, three a TRIPLE, four or more a MAX. Clearing on consecutive moves builds a Symmetry Chain. Bigger clears give more energy and louder feedback.', `<div class="demo demo-combo">${mini('<i class="f"></i><i class="f"></i><i class="f"></i>' + empty(3) + '<i class="f"></i><i class="f"></i><i class="f"></i>')}<span class="word">DOUBLE</span></div>`)}
        ${step(7, 'Overdrive', 'A chain of three clears ignites Refraction Overdrive: ten seconds of double score. The board warms up and the music lifts. Keep clearing.', `<div class="demo demo-overdrive">${mini(empty(9))}<span class="chip">2×</span></div>`)}
        ${step(8, 'Fracture', 'When the board is dense and you have stalled, the mirror fractures: you get a short window per placement. Any line clear escapes. Clearing with under a second left is a Clutch.', `<div class="demo demo-fracture">${mini(empty(9))}<span class="timer">6.2</span></div>`)}
      </div>
    </section>`);
}

export function buildAboutScreen(): HTMLElement {
  return element(`
    <section aria-label="About">
      ${screenHead('About', 'settings')}
      <div class="screen-body narrow about-body">
        <div class="panel">
          <h2>MIRRORBLADE</h2>
          <p>A precision mirror block puzzle. Every placement is reflected, blades split pieces, and skilful clears forge new blades, ignite Refraction Overdrive and escape Fracture.</p>
          <h2>Privacy</h2>
          <p>The game stores settings and progress with the CrazyGames Data Module when available, otherwise in this browser's local storage. No personal data is collected by the game, and no third-party analytics or advertising code is bundled.</p>
          <h2>Credits</h2>
          <p>Design, engineering, procedural artwork and synthesized audio were produced for MIRRORBLADE V2. Rendering uses Three.js for the blade; everything else is HTML, CSS and Canvas.</p>
        </div>
      </div>
    </section>`);
}

export function buildPauseScreen(ctx: ScreenContext): HTMLElement {
  return element(`
    <section aria-label="Paused">
      <div class="panel pause-card">
        <h1>Paused</h1>
        <div class="pause-score"><div>Score<b class="num">${ctx.runScore.toLocaleString()}</b></div><div>Best<b class="num">${Math.max(ctx.save.stats.bestScore, ctx.runScore).toLocaleString()}</b></div></div>
        ${button('Resume', 'resume', { variant: 'primary', icon: 'play' })}
        ${button('Restart', 'restart', { variant: 'secondary', icon: 'restart' })}
        ${button('Settings', 'settings', { variant: 'secondary', icon: 'settings' })}
        ${button('How to play', 'howto', { variant: 'quiet', icon: 'howto' })}
        ${button('Home', 'home', { variant: 'quiet', icon: 'home' })}
      </div>
    </section>`);
}

export interface RunSummary {
  score: number;
  best: number;
  isNewBest: boolean;
  lines: number;
  highestChain: number;
  bladesForged: number;
  bladesUsed: number;
  overdrives: number;
  clutches: number;
  shards: number;
  mode: 'endless' | 'daily';
  reason: 'stuck' | 'fracture';
}

export function buildGameOverScreen(summary: RunSummary): HTMLElement {
  const metric = (label: string, value: string | number): string => `<div><span>${label}</span><strong class="num">${value}</strong></div>`;
  return element(`
    <section aria-label="Run over">
      <div class="panel results">
        <span class="eyebrow">${summary.reason === 'fracture' ? 'The mirror fractured' : summary.mode === 'daily' ? 'Daily Mirror complete' : 'Mirror at rest'}</span>
        <span class="crest-mark${summary.isNewBest ? ' is-best' : ''}">${icon('crest')}</span>
        <div class="final-score${summary.isNewBest ? ' is-best' : ''}">${summary.score.toLocaleString()}</div>
        <div class="best-line${summary.isNewBest ? ' is-new' : ''}">${summary.isNewBest ? 'NEW BEST' : `Best ${summary.best.toLocaleString()}`}</div>
        <div class="metrics">
          ${metric('Lines', summary.lines)}${metric('Chain', summary.highestChain > 0 ? `×${summary.highestChain}` : '—')}${metric('Blades forged', summary.bladesForged)}
          ${metric('Blades used', summary.bladesUsed)}${metric('Overdrives', summary.overdrives)}${metric('Clutches', summary.clutches)}
        </div>
        <span class="payout">${icon('shard')}+${summary.shards} Mirror Shards</span>
        <div class="actions">${button('Play again', 'restart', { variant: 'primary', icon: 'play' })}${button('Home', 'home', { variant: 'quiet', icon: 'home' })}</div>
      </div>
    </section>`);
}
