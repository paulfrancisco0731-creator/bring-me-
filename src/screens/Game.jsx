import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { subscribeToRoom, submitPhoto, updateVerificationResult, setPlayerStatus, endGame } from '../services/db';
import { verifyPhoto, generateRecap } from '../services/gemini';
import Avatar from '../components/Avatar';
import Camera from '../components/Camera';
import { motion, AnimatePresence } from 'framer-motion';

function Game() {
  const { roomCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const { playerName, isHost } = location.state || {};
  const [room, setRoom] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState(null); // { pass, reason }
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(60);

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

  // Handle timer
  useEffect(() => {
    if (!room || room.status !== 'playing') return;
    
    // Simplistic timer that runs on the client. 
    // In a production app, sync with server time.
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Timer out logic - for simplicity, just skip to next item or auto-fail
          return room.timerDuration || 60;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [room]);

  // Check for winner
  useEffect(() => {
    if (!room || !room.players || !isHost) return;
    
    const checkWinner = async () => {
      const itemsCount = room.items?.length || 0;
      if (itemsCount === 0) return;

      for (const [name, p] of Object.entries(room.players)) {
        if (p.currentItemIndex >= itemsCount && room.status !== 'ended') {
          // A player has finished all items. Declare winner based on points!
          const allPlayers = Object.values(room.players);
          const winnerByPoints = allPlayers.reduce((prev, current) => (prev.score > current.score) ? prev : current);
          
          const endAction = async () => {
            const recap = await generateRecap(room.players, room.theme);
            await endGame(roomCode, winnerByPoints.name, recap);
          };
          endAction();
        }
      }
    };
    checkWinner();
  }, [room, isHost, roomCode]);

  if (!room || !room.players) return <div className="app-container">Loading game state...</div>;

  const me = room.players[playerName];
  const items = room.items || [];
  const currentItem = items[me.currentItemIndex];

  const handleCapture = async (base64Image) => {
    if (verifying || !currentItem) return;
    
    setVerifying(true);
    setVerificationFeedback(null);
    
    // Optimistic UI update
    await submitPhoto(roomCode, playerName, base64Image);
    
    // Send to Gemini
    const result = await verifyPhoto(currentItem.description, base64Image);
    setVerificationFeedback(result);
    
    // Update DB (this will also increment currentItemIndex)
    await updateVerificationResult(roomCode, playerName, result.points, me.currentItemIndex);
    
    setVerifying(false);
    
    // Reset timer and show points feedback
    setTimeLeft(room.timerDuration || 60);
    // Wait a sec to show result before resetting feedback
    setTimeout(() => setVerificationFeedback(null), 3500);
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

    if (p.status === 'verified') {
      borderColor = 'var(--tertiary)';
      content = (
        <>
          {content}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(6, 214, 160, 0.5)' }}>
            <span style={{ fontSize: '2rem' }}>✅</span>
          </div>
        </>
      );
    } else if (p.status === 'failed') {
      borderColor = 'var(--secondary)';
      content = (
        <>
          {content}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239, 71, 111, 0.5)' }}>
            <span style={{ fontSize: '2rem' }}>❌</span>
          </div>
        </>
      );
    }

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
        {/* Tail for bubble */}
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
    <div className="app-container" style={{ padding: '1rem', height: '100vh', justifyContent: 'flex-start' }}>
      
      {/* Top Bar: Timer & Progress */}
      <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div className="glass-panel" style={{ padding: '0.5rem 1rem', width: 'auto', borderRadius: '1rem' }}>
          <h3 style={{ margin: 0, color: 'var(--secondary)' }}>⏱️ {timeLeft}s</h3>
        </div>
        <div className="glass-panel" style={{ padding: '0.5rem 1rem', width: 'auto', borderRadius: '1rem' }}>
          <h3 style={{ margin: 0 }}>Item {Math.min(me.currentItemIndex + 1, items.length)} / {items.length}</h3>
        </div>
      </div>

      {/* Current Item Card */}
      {currentItem && (
        <motion.div 
          className="glass-panel" 
          style={{ width: '100%', maxWidth: '800px', marginBottom: '2rem' }}
          key={currentItem.id}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <h2 style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>Bring Me...</h2>
          <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{currentItem.description}</p>
        </motion.div>
      )}

      <div style={{ display: 'flex', gap: '2rem', width: '100%', maxWidth: '1000px', height: '100%', flexWrap: 'wrap' }}>
        
        {/* Left: Camera & Feedback */}
        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Camera onCapture={handleCapture} disabled={verifying || !currentItem} />
          
          <AnimatePresence>
            {verificationFeedback && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  background: verificationFeedback.points > 70 ? 'var(--tertiary)' : (verificationFeedback.points > 30 ? 'var(--primary)' : 'var(--secondary)'),
                  color: verificationFeedback.points > 30 && verificationFeedback.points <= 70 ? 'var(--dark)' : 'white',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  boxShadow: 'var(--shadow-md)'
                }}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>
                  {verificationFeedback.points > 0 ? `+${verificationFeedback.points} Points!` : '0 Points'}
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>{verificationFeedback.reason}</div>
              </motion.div>
            )}
          </AnimatePresence>
          {verifying && <p style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--primary)' }}>AI is verifying your photo...</p>}
        </div>

        {/* Right: Room / Avatars */}
        <div className="glass-panel" style={{ flex: '2 1 400px', display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'center', alignContent: 'flex-start', paddingTop: '4rem' }}>
          {Object.values(room.players).map(p => (
            <div key={p.name} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {renderBubble(p)}
              <Avatar face={p.avatar.face} hair={p.avatar.hair} color={p.avatar.color} size={80} />
              <span style={{ marginTop: '0.5rem', fontWeight: 'bold', background: p.name === playerName ? 'var(--primary)' : 'transparent', color: p.name === playerName ? 'var(--dark)' : 'inherit', padding: '2px 8px', borderRadius: '12px' }}>
                {p.name} • {p.score} pts
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Game;
