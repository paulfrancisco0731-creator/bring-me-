import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { subscribeToRoom, submitPhoto, updateVerificationResult, advanceToNextRound, endGame } from '../services/db';
import { verifyPhoto, generateRecap } from '../services/ai';
import Avatar from '../components/Avatar';
import Camera from '../components/Camera';
import { motion, AnimatePresence } from 'framer-motion';

function Game() {
  const { roomCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const playerName = location.state?.playerName || localStorage.getItem('playerName');
  const isHost = location.state?.isHost ?? (localStorage.getItem('isHost') === 'true');
  const [room, setRoom] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!playerName) {
      navigate('/');
      return;
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

  // Sync Global Timer
  useEffect(() => {
    if (!room || room.status !== 'playing' || !room.roundEndsAt) return;
    
    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((room.roundEndsAt - now) / 1000));
      setTimeLeft(remaining);

      // HOST ONLY: Watchdog to move rounds
      if (isHost && remaining === 0) {
        const nextIndex = room.roomCurrentItemIndex + 1;
        const totalItems = room.items?.length || 0;

        if (nextIndex < totalItems) {
          // Automatic 0 points for those who didn't submit
          // We'll give it a 3s buffer to show "Time's up" before moving
          setTimeout(() => {
            advanceToNextRound(roomCode, nextIndex, room.timerDuration || 60);
          }, 3000);
          clearInterval(interval);
        } else {
          // Game finished!
          handleGameEnd();
          clearInterval(interval);
        }
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [room?.roundEndsAt, isHost, roomCode]);

  const handleGameEnd = async () => {
    if (!isHost || !room) return;
    const allPlayers = Object.values(room.players);
    const winnerByPoints = allPlayers.reduce((prev, current) => (prev.score > current.score) ? prev : current);
    const recap = await generateRecap(room.players, room.theme);
    await endGame(roomCode, winnerByPoints.name, recap);
  };

  // Ensure items is always an array (Firebase sometimes stores arrays as objects)
  const items = Array.isArray(room?.items) ? room.items : (room?.items ? Object.values(room.items) : []);

  if (!room || !room.players || !room.players[playerName] || items.length === 0) {
    return <div className="app-container"><h2>Loading game state...</h2><p>Wait a sec, items are syncing!</p></div>;
  }

  const me = room.players[playerName];
  const currentItemIndex = room.roomCurrentItemIndex || 0;
  const currentItem = items[currentItemIndex];

  const handleCapture = async (base64Image) => {
    if (verifying || !currentItem || me.status === 'submitted' || timeLeft === 0) return;
    
    setVerifying(true);
    setVerificationFeedback(null);
    
    // Optimistic UI: Player is submitting
    await submitPhoto(roomCode, playerName, base64Image);
    
    // AI Verification
    const result = await verifyPhoto(currentItem.description, base64Image);
    setVerificationFeedback(result);
    
    // Update DB with results
    await updateVerificationResult(roomCode, playerName, result.points, currentItemIndex);
    setVerifying(false);

    // Feedback persists until next round
  };

  const renderBubble = (p) => {
    let content = null;
    let borderColor = 'transparent';

    if (p.status === 'submitted' || p.status === 'verified' || p.status === 'failed') {
      if (p.lastSubmittedPhoto) {
        content = <img src={p.lastSubmittedPhoto} alt="submission" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
      }
    } else {
      content = <div style={{ background: '#333', width: '100%', height: '100%', filter: 'blur(5px)' }} />;
    }

    if (p.status === 'verified' || (p.status === 'submitted' && !verifying)) {
      borderColor = 'var(--tertiary)';
    } else if (p.status === 'failed') {
      borderColor = 'var(--secondary)';
    }

    const avatarData = p.avatar || { face: 'round', hair: 'short', color: '#ccc' };

    return (
      <div style={{
        position: 'absolute',
        top: -70,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: '#fff',
        border: `3px solid ${borderColor}`,
        overflow: 'hidden',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        {content}
        <div style={{
          position: 'absolute',
          bottom: -6,
          left: '50%',
          transform: 'translateX(-50%) rotate(45deg)',
          width: 12,
          height: 12,
          backgroundColor: '#fff',
          borderBottom: `3px solid ${borderColor}`,
          borderRight: `3px solid ${borderColor}`
        }} />
      </div>
    );
  };

  return (
    <div className="app-container game-screen" style={{ padding: '1rem', justifyContent: 'flex-start' }}>
      
      {/* HUD: Timer & Round */}
      <div className="hud-bar" style={{ width: '100%', maxWidth: '1000px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div className="glass-panel hud-item" style={{ padding: '0.5rem 1.5rem', width: 'auto', borderRadius: '1rem' }}>
          <h3 style={{ margin: 0, color: timeLeft < 10 ? 'var(--secondary)' : 'var(--accent)' }}>
            {timeLeft > 0 ? `⏱️ ${timeLeft}s` : '⌛ Time\'s Up!'}
          </h3>
        </div>
        <div className="glass-panel hud-item" style={{ padding: '0.5rem 1.5rem', width: 'auto', borderRadius: '1rem' }}>
          <h3 style={{ margin: 0 }}>Round {currentItemIndex + 1} / {items.length}</h3>
        </div>
      </div>

      {/* Main Layout */}
      <div className="game-main-layout" style={{ display: 'flex', gap: '2rem', width: '100%', maxWidth: '1200px', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* Current Item Card */}
        {currentItem && (
          <motion.div 
            className="glass-panel item-card" 
            style={{ width: '100%', maxWidth: '600px', padding: '1.5rem' }}
            key={currentItemIndex}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <h2 style={{ color: 'var(--secondary)', fontSize: '1.2rem', marginBottom: '0.5rem' }}>BRING ME...</h2>
            <p style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--dark)' }}>{currentItem.description}</p>
          </motion.div>
        )}

        <div className="game-grid" style={{ display: 'flex', gap: '2rem', width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
          
          {/* Left: Camera Section */}
          <div className="camera-section" style={{ flex: '1 1 320px', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Camera onCapture={handleCapture} disabled={verifying || me.status === 'submitted' || timeLeft === 0} />
            
            {me.status === 'submitted' && !verifying && verificationFeedback && (
               <motion.div 
               initial={{ scale: 0.8, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               style={{
                 padding: '1rem',
                 borderRadius: '16px',
                 background: 'white',
                 border: '3px solid var(--tertiary)',
                 textAlign: 'center',
                 boxShadow: 'var(--shadow-md)'
               }}
             >
               <h2 style={{ color: 'var(--tertiary)', fontSize: '2rem', margin: 0 }}>+{verificationFeedback.points} pts!</h2>
               <p style={{ color: 'var(--dark)', margin: '0.5rem 0 0' }}>{verificationFeedback.reason}</p>
             </motion.div>
            )}

            {verifying && (
              <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.8)' }}>
                <p className="floating" style={{ margin: 0, fontWeight: 'bold', color: 'var(--accent)' }}>🔍 AI is judging your photo...</p>
              </div>
            )}

            {timeLeft === 0 && me.status !== 'submitted' && (
              <div className="glass-panel" style={{ padding: '1rem', background: 'var(--secondary)', color: 'white' }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>⌛ Too slow! You get 0 points this round.</p>
              </div>
            )}
          </div>

          {/* Right: Leaderboard */}
          <div className="glass-panel leaderboard-section" style={{ flex: '1 1 300px', maxWidth: '500px', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'center', alignContent: 'flex-start', paddingTop: '4rem' }}>
            {Object.values(room.players).map(p => {
              const avatarData = p.avatar || { face: 'round', hair: 'short', color: '#ccc' };
              return (
                <div key={p.name} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {renderBubble(p)}
                  <Avatar face={avatarData.face} hair={avatarData.hair} color={avatarData.color} size={60} />
                  <span style={{ 
                    marginTop: '0.5rem', 
                    fontWeight: 'bold', 
                    fontSize: '0.9rem',
                    background: p.name === playerName ? 'var(--primary)' : 'rgba(255,255,255,0.5)', 
                    color: 'var(--dark)', 
                    padding: '2px 10px', 
                    borderRadius: '12px',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    {p.name}: {p.score || 0}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .game-grid { flex-direction: column; align-items: center; }
          .hud-bar { padding: 0 0.5rem; }
          .hud-item h3 { font-size: 1rem; }
          .item-card h2 { font-size: 1rem; }
          .item-card p { font-size: 1.2rem; }
        }
      `}</style>
    </div>
  );
}

export default Game;
