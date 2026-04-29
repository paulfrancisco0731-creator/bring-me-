import React, { useState, useRef, useEffect } from 'react';

const BackgroundMusic = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  // Create the audio element once, use a reliable free source
  useEffect(() => {
    const audio = new Audio();
    audio.src = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
    audio.loop = true;
    audio.volume = 0.15; // Low volume
    audio.preload = 'none';
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          console.warn('Music blocked:', err);
          setIsPlaying(false);
        });
    }
  };

  return (
    <button
      onClick={toggle}
      title={isPlaying ? 'Mute Music' : 'Play Music'}
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        zIndex: 9999,
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.3)',
        background: isPlaying ? 'var(--secondary)' : 'rgba(7,59,76,0.85)',
        color: 'white',
        cursor: 'pointer',
        fontSize: '1.3rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        transition: 'all 0.3s ease',
        backdropFilter: 'blur(8px)'
      }}
    >
      {isPlaying ? '🔊' : '🔇'}
    </button>
  );
};

export default BackgroundMusic;
