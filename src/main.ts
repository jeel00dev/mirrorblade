import './styles/tokens.css';
import './styles/base.css';
import './styles/blocks.css';
import './styles/board.css';
import './styles/components.css';
import './styles/gameplay.css';
import './styles/screens.css';
import './styles/states.css';
import './styles/cinematic.css';
import './styles/katanas.css';
import { Game } from './core/Game';
import { CrazyGamesAdapter } from './platform/CrazyGamesAdapter';
import { localStorageBackend, StorageAdapter } from './platform/StorageAdapter';

async function boot(): Promise<void> {
  const root = document.querySelector<HTMLElement>('#app');
  if (!root) throw new Error('Application root is missing');

  const platform = new CrazyGamesAdapter();
  await platform.init();
  platform.loadingStart();

  const backend = platform.getStorage() ?? localStorageBackend();
  const storage = new StorageAdapter(backend);
  const fresh = !storage.hasSave();
  const save = storage.load();
  // First launch: respect the OS motion preference; the in-game toggle takes over from then on.
  if (fresh && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) save.settings.reducedMotion = true;
  const game = new Game(root, platform, storage, save);
  game.start();

  if (import.meta.env.DEV) {
    window.__MIRRORBLADE_TEST__ = {
      game,
      state: () => game.getDebugState(),
      setBlades: (value) => game.debugSetBlades(value),
      setEnergy: (value) => game.debugSetEnergy(value),
      setScore: (value) => game.debugSetScore(value),
      forcePiece: (definitionId, tone) => game.debugForcePiece(definitionId, tone),
      fillBoard: (cells, tone) => game.debugFillBoard(cells, tone),
      endRun: (reason) => game.debugEndRun(reason),
      setPlacementDeadline: (remainingMs) => game.debugSetPlacementDeadline(remainingMs),
      skipCinematic: () => game.debugSkipCinematic(),
      forceOverdrive: () => game.debugForceOverdrive(),
      forceFracture: () => game.debugForceFracture(),
      toggleLayoutDebug: (enabled) => game.debugLayout(enabled),
    };
  }
}

void boot();
