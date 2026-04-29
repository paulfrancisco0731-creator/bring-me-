import React, { useState, useRef, useEffect } from 'react';
import { Music, VolumeX } from 'lucide-react';

const BackgroundMusic = () => {
  const [isMuted, setIsMuted] = useState(true);
  const audioRef = useRef(null);

  // Playful background music loop
  const musicUrl = "https://assets.mixkit.co/music/preview/mixkit-funny-times-1100.mp3";

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.play().catch(e => console.log("Music play blocked by browser. Need interaction."));
      } else {
        audioRef.current.pause();
      }
      setIsMuted(!isMuted);
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '20px', 
      left: '20px', 
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center'
    }}>
      <audio ref={audioRef} src={musicUrl} loop />
      <button 
        onClick={toggleMute}
        style={{
          width: '45px',
          height: '45px',
          borderRadius: '50%',
          border: 'none',
          background: 'var(--dark)',
          color: 'var(--primary)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-md)',
          opacity: 0.8,
          transition: 'all 0.3s ease'
        }}
        className="music-toggle"
      >
        {isMuted ? <VolumeX size={20} /> : <Music size={20} className="floating" />}
      </button>
      {!isMuted && (
        <span style={{ 
          marginLeft: '10px', 
          fontSize: '0.8rem', 
          fontWeight: 'bold', 
          color: 'var(--primary)',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)',
          pointerEvents: 'none'
        }}>
          Music On
        </span>
      )}
    </div>
  );
};

export default BackgroundMusic;
