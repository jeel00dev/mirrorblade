export interface CrazyAdCallbacks {
  adStarted: () => void;
  adFinished: () => void;
  adError: (error: unknown) => void;
}

export interface CrazyGamesSDK {
  init(): Promise<void>;
  environment?: string;
  data?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'clear'>;
  game?: {
    gameplayStart(): void;
    gameplayStop(): void;
    loadingStart(): void;
    loadingStop(): void;
    happytime(): void;
    reportGameCompletedPercentage?(percentage: number): void;
    settings?: { muteAudio?: boolean; disableChat?: boolean };
    addSettingsChangeListener?(listener: (settings: { muteAudio?: boolean }) => void): void;
    removeSettingsChangeListener?(listener: (settings: { muteAudio?: boolean }) => void): void;
  };
  ad?: { requestAd(type: 'midgame' | 'rewarded', callbacks: CrazyAdCallbacks): void };
  banner?: {
    requestResponsiveBanner(id: string): Promise<void>;
    clearBanner(id: string): void;
    clearAllBanners(): void;
  };
  user?: { systemInfo?: Record<string, unknown> };
}

declare global {
  interface Window {
    CrazyGames?: { SDK: CrazyGamesSDK };
  }
}
