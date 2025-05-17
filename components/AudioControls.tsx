import React from 'react';
import { useAudio, SOUND_EFFECTS, BACKGROUND_MUSIC } from '../lib/audio';

const AudioControls = () => {
  const { playEffect, playBackgroundMusic, stopBackgroundMusic, setVolume, setMuted } = useAudio();

  const handleClick = () => {
    playEffect(SOUND_EFFECTS.CLICK);
  };

  const startMusic = () => {
    playBackgroundMusic(BACKGROUND_MUSIC.MAIN);
  };

  const stopMusic = () => {
    stopBackgroundMusic();
  };

  return (
    <div>
      <button onClick={handleClick}>Play Click Sound</button>
      <button onClick={startMusic}>Start Music</button>
      <button onClick={stopMusic}>Stop Music</button>
      <input type="range" min="0" max="1" step="0.1" onChange={(e) => setVolume(parseFloat(e.target.value))} />
      <button onClick={() => setMuted(true)}>Mute</button>
      <button onClick={() => setMuted(false)}>Unmute</button>
    </div>
  );
};

export default AudioControls; 