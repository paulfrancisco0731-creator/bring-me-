import React, { useState, useRef, useCallback } from 'react';

// Jolly Filipino-style melody (Magtanim ay Di Biro inspired, C major)
const MELODY = [
  // Bar 1
  { f: 523.25, d: 0.25 }, // C5
  { f: 659.25, d: 0.25 }, // E5
  { f: 783.99, d: 0.25 }, // G5
  { f: 659.25, d: 0.25 }, // E5
  // Bar 2
  { f: 587.33, d: 0.25 }, // D5
  { f: 523.25, d: 0.25 }, // C5
  { f: 493.88, d: 0.25 }, // B4
  { f: 392.00, d: 0.5  }, // G4
  // Bar 3
  { f: 440.00, d: 0.25 }, // A4
  { f: 523.25, d: 0.25 }, // C5
  { f: 587.33, d: 0.25 }, // D5
  { f: 659.25, d: 0.25 }, // E5
  // Bar 4
  { f: 587.33, d: 0.25 }, // D5
  { f: 523.25, d: 0.25 }, // C5
  { f: 440.00, d: 0.25 }, // A4
  { f: 392.00, d: 0.5  }, // G4
  // Bar 5
  { f: 392.00, d: 0.25 }, // G4
  { f: 440.00, d: 0.25 }, // A4
  { f: 523.25, d: 0.25 }, // C5
  { f: 440.00, d: 0.25 }, // A4
  // Bar 6
  { f: 392.00, d: 0.25 }, // G4
  { f: 349.23, d: 0.25 }, // F4
  { f: 329.63, d: 0.5  }, // E4
  // Bar 7
  { f: 349.23, d: 0.25 }, // F4
  { f: 392.00, d: 0.25 }, // G4
  { f: 440.00, d: 0.25 }, // A4
  { f: 523.25, d: 0.25 }, // C5
  // Bar 8
  { f: 587.33, d: 0.25 }, // D5
  { f: 523.25, d: 0.25 }, // C5
  { f: 440.00, d: 0.25 }, // A4
  { f: 392.00, d: 0.75 }, // G4
];

// Pluck a guitar-like note using Web Audio API
const pluckNote = (ctx, masterGain, freq, startTime, duration) => {
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gainNode = ctx.createGain();

  // Slightly detune two oscillators for a fuller sound
  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(freq, startTime);
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 2, startTime); // octave harmonic

  // Guitar pluck envelope: fast attack, exponential decay
  gainNode.gain.setValueAtTime(0.001, startTime);
  gainNode.gain.linearRampToValueAtTime(0.4, startTime + 0.012);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + Math.min(duration * 0.85, 0.6));

  osc1.connect(gainNode);
  osc2.connect(gainNode);
  gainNode.connect(masterGain);

  osc1.start(startTime);
  osc2.start(startTime);
  osc1.stop(startTime + duration + 0.1);
  osc2.stop(startTime + duration + 0.1);
};

const BackgroundMusic = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const ctxRef = useRef(null);
  const gainRef = useRef(null);
  const schedulerRef = useRef(null);
  const nextNoteTimeRef = useRef(0);
  const noteIndexRef = useRef(0);

  const scheduleNotes = useCallback(() => {
    const ctx = ctxRef.current;
    const masterGain = gainRef.current;
    if (!ctx || !masterGain) return;

    // Schedule 200ms ahead to avoid gaps
    while (nextNoteTimeRef.current < ctx.currentTime + 0.2) {
      const note = MELODY[noteIndexRef.current % MELODY.length];
      pluckNote(ctx, masterGain, note.f, nextNoteTimeRef.current, note.d);
      nextNoteTimeRef.current += note.d;
      noteIndexRef.current += 1;
    }

    schedulerRef.current = setTimeout(scheduleNotes, 50);
  }, []);

  const toggle = () => {
    if (isPlaying) {
      // Stop
      clearTimeout(schedulerRef.current);
      if (gainRef.current) {
        gainRef.current.gain.linearRampToValueAtTime(0, ctxRef.current.currentTime + 0.3);
      }
      setTimeout(() => {
        if (ctxRef.current) {
          ctxRef.current.close();
          ctxRef.current = null;
        }
      }, 400);
      setIsPlaying(false);
    } else {
      // Start
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctxRef.current = ctx;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.18, ctx.currentTime);
      masterGain.connect(ctx.destination);
      gainRef.current = masterGain;

      nextNoteTimeRef.current = ctx.currentTime + 0.05;
      noteIndexRef.current = 0;
      scheduleNotes();
      setIsPlaying(true);
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
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.4)',
        background: isPlaying
          ? 'linear-gradient(135deg, #EF476F, #FFD166)'
          : 'rgba(7,59,76,0.85)',
        color: 'white',
        cursor: 'pointer',
        fontSize: '1.4rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: isPlaying
          ? '0 0 20px rgba(239,71,111,0.5), 0 4px 12px rgba(0,0,0,0.3)'
          : '0 4px 12px rgba(0,0,0,0.3)',
        transition: 'all 0.3s ease',
        backdropFilter: 'blur(8px)',
        animation: isPlaying ? 'musicBeat 0.5s ease-in-out infinite alternate' : 'none'
      }}
    >
      {isPlaying ? '🎸' : '🎵'}
      <style>{`
        @keyframes musicBeat {
          from { transform: scale(1); }
          to   { transform: scale(1.12); }
        }
      `}</style>
    </button>
  );
};

export default BackgroundMusic;
