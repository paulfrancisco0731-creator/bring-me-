import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { subscribeToRoom, submitPhoto, updateVerificationResult, advanceToNextRound, endGame, collapseTimer } from '../services/db';
import { verifyPhoto, generateRecap } from '../services/ai';
import Avatar from '../components/Avatar';
import Camera from '../components/Camera';
import { motion } from 'framer-motion';

function Game() {
  const { roomCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const playerName = location.state?.playerName || localStorage.getItem('playerName');
  const isHost = location.state?.isHost ?? (localStorage.getItem('isHost') === 'true');

  const [room, setRoom] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null); // null = syncing
  const [submitted, setSubmitted] = useState(false); // local per-round flag

  // Subscribe to room
  useEffect(() => {
    if (!playerName) {
      const timer = setTimeout(() => navigate('/'), 2000);
      return () => clearTimeout(timer);
    }

    const unsubscribe = subscribeToRoom(roomCode, (data) => {
      if (data) {
        setRoom(data);
        if (data.status === 'ended') {
          navigate(`/end/${roomCode}`, { state: { playerName, isHost } });
        }
      }
    });

    return () => unsubscribe();
  }, [roomCode, playerName, isHost, navigate]);

  // Sync global timer from Firebase roundEndsAt
  useEffect(() => {
    if (!room || room.status !== 'playing' || !room.roundEndsAt) return;

    const tick = () => {
      const remaining = Math.max(0, Math.floor((room.roundEndsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      return remaining;
    };

    tick(); // immediate update

    const interval = setInterval(() => {
      const remaining = tick();

      if (isHost && remaining === 0) {
        clearInterval(interval);
        const allItems = Array.isArray(room.items)
          ? room.items
          : room.items ? Object.values(room.items) : [];
        const nextIndex = (room.roomCurrentItemIndex || 0) + 1;

        setTimeout(() => {
          if (nextIndex < allItems.length) {
            advanceToNextRound(roomCode, nextIndex, room.timerDuration || 60);
          } else {
            handleGameEnd();
          }
        }, 3000);
      }
    }, 1000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.roundEndsAt, isHost, roomCode]);

  // Reset local submission state when round changes
  useEffect(() => {
    setSubmitted(false);
    setVerificationFeedback(null);
  }, [room?.roomCurrentItemIndex]);

  // HOST: Collapse timer to 10s when ALL players have submitted
  useEffect(() => {
    if (!isHost || !room?.players || !room?.roundEndsAt) return;
    const players = Object.values(room.players);
    if (players.length === 0) return;
    const allSubmitted = players.every(p => p.status === 'submitted' || p.status === 'verified' || p.status === 'failed');
    // Only collapse if more than 10s remaining (avoid re-triggering)
    const remaining = room.roundEndsAt - Date.now();
    if (allSubmitted && remaining > 10000) {
      collapseTimer(roomCode);
    }
  }, [room?.players, isHost, roomCode, room?.roundEndsAt]);

  const handleGameEnd = async () => {
    if (!isHost || !room) return;
    const allPlayers = Object.values(room.players);
    const winner = allPlayers.reduce((a, b) => (a.score > b.score ? a : b));
    const recap = await generateRecap(room.players, room.theme);
    await endGame(roomCode, winner.name, recap);
  };

  // ─── Loading states ────────────────────────────────────────────
  if (!room || !room.players) {
    return (
      <div className="app-container">
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <h2 className="floating">⏳ Loading Game...</h2>
          <p style={{ color: '#666', marginTop: '1rem' }}>Connecting to room {roomCode}</p>
        </div>
      </div>
    );
  }

  const items = Array.isArray(room.items)
    ? room.items
    : room.items ? Object.values(room.items) : [];

  if (items.length === 0) {
    return (
      <div className="app-container">
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <h2 className="floating">🎮 Starting Game...</h2>
          <p style={{ color: '#666', marginTop: '1rem' }}>Syncing items from server...</p>
        </div>
      </div>
    );
  }

  // Resolve player (fallback if name not found)
  const resolvedPlayerName = room.players[playerName] ? playerName : Object.keys(room.players)[0];
  const me = room.players[resolvedPlayerName];
  const currentItemIndex = room.roomCurrentItemIndex || 0;
  const currentItem = items[currentItemIndex];

  // ─── Capture handler ───────────────────────────────────────────
  const handleCapture = async (base64Image) => {
    if (verifying || submitted || !currentItem) return;

    setVerifying(true);
    setSubmitted(true);
    setVerificationFeedback(null);

    await submitPhoto(roomCode, resolvedPlayerName, base64Image);

    const result = await verifyPhoto(currentItem.description, base64Image);
    setVerificationFeedback(result);

    await updateVerificationResult(roomCode, resolvedPlayerName, result.points, currentItemIndex);
    setVerifying(false);
  };

  // ─── Bubble renderer ───────────────────────────────────────────
  const renderBubble = (p) => {
    let content = null;
    let borderColor = 'transparent';

    if (p.lastSubmittedPhoto) {
      content = (
        <img
          src={p.lastSubmittedPhoto}
          alt="submission"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      );
      borderColor = p.status === 'failed' ? 'var(--secondary)' : 'var(--tertiary)';
    } else {
      content = <div style={{ background: '#333', width: '100%', height: '100%', filter: 'blur(5px)' }} />;
    }

    return (
      <div style={{
        position: 'absolute', top: -70, left: '50%',
        transform: 'translateX(-50%)',
        width: 60, height: 60, borderRadius: 12,
        backgroundColor: '#fff',
        border: `3px solid ${borderColor}`,
        overflow: 'hidden',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        {content}
        <div style={{
          position: 'absolute', bottom: -6, left: '50%',
          transform: 'translateX(-50%) rotate(45deg)',
          width: 12, height: 12,
          backgroundColor: '#fff',
          borderBottom: `3px solid ${borderColor}`,
          borderRight: `3px solid ${borderColor}`
        }} />
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div className="app-container game-screen" style={{ padding: '1rem', justifyContent: 'flex-start' }}>

      {/* HUD */}
      <div style={{ width: '100%', maxWidth: '1100px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '0.5rem 1.5rem', width: 'auto', borderRadius: '1rem' }}>
          <h3 style={{ margin: 0, color: (timeLeft !== null && timeLeft < 10) ? 'var(--secondary)' : 'var(--accent)' }}>
            {timeLeft === null ? '⏱️ ...' : timeLeft > 0 ? `⏱️ ${timeLeft}s` : "⌛ Time's Up!"}
          </h3>
        </div>
        <div className="glass-panel" style={{ padding: '0.5rem 1.5rem', width: 'auto', borderRadius: '1rem' }}>
          <h3 style={{ margin: 0 }}>Round {currentItemIndex + 1} / {items.length}</h3>
        </div>
      </div>

      {/* Item Card */}
      {currentItem && (
        <motion.div
          className="glass-panel"
          key={currentItemIndex}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{ width: '100%', maxWidth: '700px', marginBottom: '1.5rem', textAlign: 'center' }}
        >
          <h2 style={{ color: 'var(--secondary)', fontSize: '1rem', marginBottom: '0.5rem', letterSpacing: '2px' }}>BRING ME...</h2>
          <p style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--dark)', margin: 0 }}>{currentItem.description}</p>
        </motion.div>
      )}

      {/* Game Grid */}
      <div style={{ display: 'flex', gap: '2rem', width: '100%', maxWidth: '1100px', flexWrap: 'wrap', justifyContent: 'center' }}>

        {/* Camera + Feedback */}
        <div style={{ flex: '1 1 300px', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Camera onCapture={handleCapture} disabled={verifying || submitted} />

          {/* Judging indicator */}
          {submitted && verifying && (
            <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.9)', textAlign: 'center' }}>
              <p className="floating" style={{ margin: 0, fontWeight: 'bold', color: 'var(--accent)', fontSize: '1.1rem' }}>
                🔍 AI Huhusgahan ang larawan mo...
              </p>
            </div>
          )}

          {/* Score Result */}
          {submitted && !verifying && verificationFeedback && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                padding: '1.5rem',
                borderRadius: '16px',
                background: verificationFeedback.points >= 70 ? 'var(--tertiary)' : verificationFeedback.points >= 40 ? 'var(--primary)' : 'var(--secondary)',
                textAlign: 'center',
                boxShadow: 'var(--shadow-md)'
              }}
            >
              <h2 style={{ color: 'white', fontSize: '2.5rem', margin: '0 0 0.5rem', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                +{verificationFeedback.points} pts!
              </h2>
              <p style={{ color: 'white', margin: 0, fontSize: '1rem', opacity: 0.95 }}>
                {verificationFeedback.reason}
              </p>
            </motion.div>
          )}

          {/* Time's up warning */}
          {timeLeft === 0 && !submitted && (
            <div style={{ padding: '1rem', borderRadius: '12px', background: 'var(--secondary)', color: 'white', textAlign: 'center' }}>
              <p style={{ margin: 0, fontWeight: 'bold' }}>⌛ Huli ka! 0 points ka ngayon.</p>
            </div>
          )}

          {/* Waiting for next round */}
          {submitted && !verifying && verificationFeedback && (
            <p style={{ textAlign: 'center', opacity: 0.7, fontSize: '0.9rem' }}>
              ✅ Submitted! Waiting for next round...
            </p>
          )}
        </div>

        {/* Leaderboard */}
        <div className="glass-panel" style={{ flex: '1 1 260px', maxWidth: '420px', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'center', alignContent: 'flex-start', paddingTop: '4rem' }}>
          {Object.values(room.players).map(p => {
            const av = p.avatar || { face: 'round', hair: 'short', color: '#ccc' };
            return (
              <div key={p.name} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {renderBubble(p)}
                <Avatar face={av.face} hair={av.hair} color={av.color} size={60} />
                <span style={{
                  marginTop: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem',
                  background: p.name === resolvedPlayerName ? 'var(--primary)' : 'rgba(255,255,255,0.5)',
                  color: 'var(--dark)', padding: '2px 10px', borderRadius: '12px'
                }}>
                  {p.name}: {p.score || 0}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .game-screen { padding: 0.5rem !important; }
          .game-screen > div:last-of-type { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}

export default Game;
