import { create, StateCreator } from 'zustand';

type Sound = {
  key: string;
  url: string;
  volume?: number;
};

interface AudioState {
  bgMusic: HTMLAudioElement | null;
  isMuted: boolean;
  volume: number;
  playingEffects: Set<string>;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  playEffect: (sound: Sound) => void;
  playBackgroundMusic: (url: string) => void;
  stopBackgroundMusic: () => void;
}

// Sound effects library
export const SOUND_EFFECTS = {
  CLICK: { key: 'click', url: '/sounds/click.mp3', volume: 0.5 },
  SUCCESS: { key: 'success', url: '/sounds/success.mp3', volume: 0.7 },
  ERROR: { key: 'error', url: '/sounds/error.mp3', volume: 0.6 },
  TYPING: { key: 'typing', url: '/sounds/typing.mp3', volume: 0.3 },
  COMPLETE: { key: 'complete', url: '/sounds/complete.mp3', volume: 0.8 },
} as const;

// Background music library
export const BACKGROUND_MUSIC = {
  MAIN: '/sounds/background/main.mp3',
  THINKING: '/sounds/background/thinking.mp3',
  SUCCESS: '/sounds/background/success.mp3',
} as const;

export const useAudio = create<AudioState>((set: any, get: any) => ({
  bgMusic: null,
  isMuted: false,
  volume: 0.5,
  playingEffects: new Set<string>(),

  setMuted: (muted: boolean) => {
    const { bgMusic } = get();
    if (bgMusic) {
      bgMusic.muted = muted;
    }
    set({ isMuted: muted });
  },

  setVolume: (volume: number) => {
    const { bgMusic } = get();
    if (bgMusic) {
      bgMusic.volume = volume;
    }
    set({ volume });
  },

  playEffect: (sound: Sound) => {
    const { isMuted, volume, playingEffects } = get();
    
    // Don't play if already playing or muted
    if (isMuted || playingEffects.has(sound.key)) return;

    const audio = new Audio(sound.url);
    audio.volume = (sound.volume || 1) * volume;
    
    playingEffects.add(sound.key);
    
    audio.play().catch(console.error);
    
    audio.onended = () => {
      playingEffects.delete(sound.key);
      set({ playingEffects: new Set(playingEffects) });
    };
  },

  playBackgroundMusic: (url: string) => {
    const { bgMusic, isMuted, volume } = get();
    
    // Stop current music if playing
    if (bgMusic) {
      bgMusic.pause();
      bgMusic.currentTime = 0;
    }

    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = volume;
    audio.muted = isMuted;
    
    audio.play().catch(console.error);
    set({ bgMusic: audio });
  },

  stopBackgroundMusic: () => {
    const { bgMusic } = get();
    if (bgMusic) {
      bgMusic.pause();
      bgMusic.currentTime = 0;
      set({ bgMusic: null });
    }
  },
})); 