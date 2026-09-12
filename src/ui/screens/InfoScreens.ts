import { formatDailyDate } from '../../game/DailyMode';
import { buildMonth, DAILY_TARGET, effectiveStreak, isCompleted } from '../../game/DailyCalendar';
import { pieceMarkup } from '../../render/blocks';
import { ACHIEVEMENTS } from '../../progression/AchievementSystem';
import { button, formatDuration, screenHead, shardsPill, streakBadge } from '../components';
import { icon } from '../Icons';
import { element, type ScreenContext } from './context';

export function buildDailyScreen(ctx: ScreenContext): HTMLElement {
  const daily = ctx.save.daily;
  const today = ctx.today;
  const month = buildMonth(ctx.dailyView.year, ctx.dailyView.month, today, daily);
  const selectedKey = ctx.dailyView.selected;
  const selectedScore = daily.scores[selectedKey] ?? 0;
  const selectedDone = isCompleted(daily, selectedKey);
  const selectedIsToday = selectedKey === today;
  const selectedFuture = selectedKey > today;
  const streak = effectiveStreak(daily, today);
  const totalDone = Object.values(daily.scores).filter((score) => score >= DAILY_TARGET).length;
  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const grid = month.weeks.map((week) => week.map((cell) => {
    if (!cell) return '<span class="cal-pad" aria-hidden="true"></span>';
    const classes = ['cal-day', `is-${cell.state}`, cell.key === selectedKey ? 'is-selected' : '', cell.isToday ? 'is-today' : ''].filter(Boolean).join(' ');
    const label = `${cell.day} ${month.label}${cell.state === 'done' ? ', completed' : cell.state === 'future' ? ', locked' : cell.isToday ? ', today' : ''}`;
    return `<button type="button" class="${classes}" data-action="daily-select" data-value="${cell.key}" aria-label="${label}" aria-pressed="${cell.key === selectedKey}"${cell.state === 'future' ? ' disabled' : ''}><span class="num">${cell.day}</span>${cell.state === 'done' ? `<span class="mark">${icon('confirm')}</span>` : ''}</button>`;
  }).join('')).join('');
  const status = selectedFuture ? 'Locked until its day'
    : selectedDone ? `Completed · best ${selectedScore.toLocaleString()}`
      : selectedScore > 0 ? `Best ${selectedScore.toLocaleString()} · target ${DAILY_TARGET.toLocaleString()}`
        : `Target ${DAILY_TARGET.toLocaleString()}`;
  const playLabel = selectedFuture ? 'Not available yet' : selectedDone ? 'Replay this puzzle' : selectedIsToday ? "Play today's mirror" : 'Play this puzzle';
  const note = selectedFuture ? 'Puzzles unlock on their own day (UTC).'
    : selectedIsToday ? 'Complete today\'s puzzle to extend your streak.'
      : 'Past puzzles count as complete and pay shards, but do not extend your streak.';
  return element(`
    <section aria-label="Daily Mirror">
      ${screenHead('Daily Mirror', 'home', shardsPill(ctx.save.currency))}
      <div class="screen-body">
        <div class="daily-layout">
          <div class="panel calendar" role="group" aria-label="${month.label}">
            <div class="cal-head">
              <button type="button" class="icon-button cal-nav" data-action="daily-month" data-value="prev" aria-label="Previous month">${icon('back')}</button>
              <h2>${month.label}</h2>
              <button type="button" class="icon-button cal-nav cal-next" data-action="daily-month" data-value="next" aria-label="Next month"${month.canGoForward ? '' : ' disabled'}>${icon('back')}</button>
            </div>
            <div class="cal-weekdays" aria-hidden="true">${weekdays.map((day) => `<span>${day}</span>`).join('')}</div>
            <div class="cal-grid">${grid}</div>
            <div class="cal-foot"><span>${month.completed} of ${month.daysInMonth} completed this month</span></div>
          </div>
          <div class="daily-side">
            <div class="panel streak-card">
              <div class="streak-main">${streakBadge(streak)}</div>
              <div class="streak-meta"><span>Best streak <b class="num">${daily.bestStreak}</b></span><span>Completed <b class="num">${totalDone}</b></span><span>Daily best <b class="num">${daily.bestDailyScore.toLocaleString()}</b></span></div>
            </div>
            <div class="panel day-detail ${selectedDone ? 'is-done' : ''}">
              <span class="t-caption">${selectedIsToday ? 'Today' : selectedFuture ? 'Upcoming' : 'Past puzzle'}</span>
              <h2>${formatDailyDate(selectedKey)}</h2>
              <div class="day-status">${icon(selectedDone ? 'owned' : selectedFuture ? 'lock' : 'daily')}<span>${status}</span></div>
              <p class="t-body">${note}</p>
              ${button(playLabel, 'daily-play', { variant: selectedDone ? 'secondary' : 'primary', icon: 'play', value: selectedKey, disabled: selectedFuture, block: true })}
            </div>
          </div>
        </div>
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
        ${step(6, 'Score & shards', 'Each unique mirrored cell placed gives 10 points. A line gives 100, plus 100 for every pair cleared together. Single / Double / Triple / four-line Max clears bank 1 / 4 / 9 / 16 Mirror Shards for the end of the run.', `<div class="demo demo-combo">${mini('<i class="f"></i><i class="f"></i><i class="f"></i>' + empty(3) + '<i class="f"></i><i class="f"></i><i class="f"></i>')}<span class="word">+4</span></div>`)}
        ${step(7, 'Combo', 'Two lines in one placement is a DOUBLE, three a TRIPLE, four or more a MAX. Clearing on consecutive moves builds a Symmetry Chain. Bigger clears give more energy and louder feedback.', `<div class="demo demo-combo">${mini('<i class="f"></i><i class="f"></i><i class="f"></i>' + empty(3) + '<i class="f"></i><i class="f"></i><i class="f"></i>')}<span class="word">DOUBLE</span></div>`)}
        ${step(8, 'Overdrive', 'A chain of three clears ignites Refraction Overdrive: ten seconds of double score. The board warms up and the music lifts. Keep clearing.', `<div class="demo demo-overdrive">${mini(empty(9))}<span class="chip">2×</span></div>`)}
        ${step(9, 'Keep placing', 'You start with 30 seconds to place a polygon. The window steadily falls to 10 seconds as your score rises. In the final five, the board rim turns coral and counts down; a valid placement resets the full window.', `<div class="demo demo-fracture">${mini(empty(9))}<span class="timer">5</span></div>`)}
        ${step(10, 'Fracture', 'When the board is dense and you have stalled, the mirror fractures: you get a short window per placement. Any line clear escapes. Clearing with under a second left is a Clutch.', `<div class="demo demo-fracture">${mini(empty(9))}<span class="timer">6.2</span></div>`)}
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
  reason: 'stuck' | 'fracture' | 'timeout';
  daily: { date: string; target: number; completed: boolean; streak: number; streakExtended: boolean; isToday: boolean } | null;
}

/** Results card. `staged` plays the sequential entrance that follows the katana cinematic (score first, buttons last). */
export function buildGameOverScreen(summary: RunSummary, options: { staged?: boolean } = {}): HTMLElement {
  const metric = (label: string, value: string | number): string => `<div><span>${label}</span><strong class="num">${value}</strong></div>`;
  return element(`
    <section aria-label="Run over">
      <div class="panel results${options.staged ? ' is-staged' : ''}">
        <span class="eyebrow">${summary.reason === 'fracture' ? 'The mirror fractured' : summary.reason === 'timeout' ? 'Time ran out' : summary.mode === 'daily' ? `Daily Mirror · ${formatDailyDate(summary.daily?.date ?? '')}` : 'Mirror at rest'}</span>
        <span class="crest-mark${summary.isNewBest ? ' is-best' : ''}">${icon('crest')}</span>
        <div class="final-score${summary.isNewBest ? ' is-best' : ''}">${summary.score.toLocaleString()}</div>
        <div class="best-line${summary.isNewBest ? ' is-new' : ''}">${summary.isNewBest ? 'NEW BEST' : `Best ${summary.best.toLocaleString()}`}</div>
        <div class="metrics">
          ${metric('Lines', summary.lines)}${metric('Chain', summary.highestChain > 0 ? `×${summary.highestChain}` : '—')}${metric('Blades forged', summary.bladesForged)}
          ${metric('Blades used', summary.bladesUsed)}${metric('Overdrives', summary.overdrives)}${metric('Clutches', summary.clutches)}
        </div>
        ${summary.daily ? `<div class="daily-result ${summary.daily.completed ? 'is-done' : ''}">${icon(summary.daily.completed ? 'owned' : 'daily')}<b>${summary.daily.completed ? 'Puzzle complete' : `Target ${summary.daily.target.toLocaleString()} not reached`}</b><small>${summary.daily.completed ? (summary.daily.streakExtended ? `${summary.daily.streak}-day streak` : summary.daily.isToday ? `${summary.daily.streak}-day streak` : 'Past puzzle · streak unchanged') : 'Replay any time from the calendar'}</small></div>` : ''}
        <span class="payout">${icon('shard')}+${summary.shards} Mirror Shards</span>
        <div class="actions">${button('Play again', 'restart', { variant: 'primary', icon: 'play' })}${button('Home', 'home', { variant: 'quiet', icon: 'home' })}</div>
      </div>
    </section>`);
}
