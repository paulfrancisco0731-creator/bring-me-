import React, { useState, useRef, useEffect } from 'react';

const BackgroundMusic = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    // Jolly, upbeat acoustic guitar track — free & CORS-friendly from pixabay CDN
    const audio = new Audio('https://cdn.pixabay.com/download/audio/2022/03/15/audio_1b6571e038.mp3?filename=funny-guitar-127648.mp3');
    audio.loop = true;
    audio.volume = 0.18;
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
        .catch(() => setIsPlaying(false));
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
        border: '2px solid rgba(255,255,255,0.4)',
        background: isPlaying
          ? 'linear-gradient(135deg, var(--secondary), var(--primary))'
          : 'rgba(7,59,76,0.85)',
        color: 'white',
        cursor: 'pointer',
        fontSize: '1.4rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: isPlaying
          ? '0 0 16px rgba(239,71,111,0.6), 0 4px 12px rgba(0,0,0,0.3)'
          : '0 4px 12px rgba(0,0,0,0.3)',
        transition: 'all 0.3s ease',
        backdropFilter: 'blur(8px)',
        animation: isPlaying ? 'musicPulse 1.5s ease-in-out infinite' : 'none'
      }}
    >
      {isPlaying ? '🎸' : '🔇'}
      <style>{`
        @keyframes musicPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </button>
  );
};

export default BackgroundMusic;
