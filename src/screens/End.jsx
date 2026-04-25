import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { subscribeToRoom, resetGame } from '../services/db';
import Avatar from '../components/Avatar';
import Camera from '../components/Camera';
import { motion, AnimatePresence } from 'framer-motion';

function End() {
  const { roomCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const { playerName, isHost } = location.state || {};
  const [room, setRoom] = useState(null);

  useEffect(() => {
    if (!playerName) {
      navigate('/');
      return;
    }

    const unsubscribe = subscribeToRoom(roomCode, (data) => {
      if (data) {
        setRoom(data);
        if (data.status === 'lobby') {
          // Host triggered rematch
          navigate(`/lobby/${roomCode}`, { state: { playerName, isHost } });
        }
      }
    });

    return () => unsubscribe();
  }, [roomCode, playerName, isHost, navigate]);

  const handleRematch = async () => {
    await resetGame(roomCode);
  };

  const handleLeave = () => {
    navigate('/');
  };

  if (!room) return null;

  const playersArr = Object.values(room.players || {}).sort((a, b) => b.score - a.score);
  const winner = room.players[room.winner];

  return (
    <div className="app-container">
      <motion.div 
        className="glass-panel" 
        style={{ maxWidth: '800px' }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', bounce: 0.5 }}
      >
        <h1 style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏆 Winner! 🏆</h1>
        
        {winner && (
          <div style={{ position: 'relative', height: '450px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
            
            {/* Polaroid Gallery around the winner */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              {(winner.photos || []).map((photo, idx) => {
                const angle = (idx / (winner.photos.length || 1)) * Math.PI * 2;
                const radius = 180;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                const rotation = (idx * 15) % 30 - 15;

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                    animate={{ opacity: 1, scale: 1, x, y, rotate: rotation }}
                    transition={{ delay: 0.5 + idx * 0.1, type: 'spring' }}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: '100px',
                      padding: '8px 8px 24px 8px',
                      background: 'white',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                      transformOrigin: 'center'
                    }}
                  >
                    <img src={photo} alt={`victory-${idx}`} style={{ width: '100%', height: '80px', objectFit: 'cover' }} />
                  </motion.div>
                );
              })}
            </div>

            {/* Central Winner Feed/Avatar */}
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
              style={{ 
                zIndex: 10,
                width: '220px',
                height: '220px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '8px solid var(--primary)',
                boxShadow: '0 0 30px rgba(255, 209, 102, 0.5)',
                background: '#eee'
              }}
            >
              {playerName === winner.name ? (
                <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                  <Camera disabled={true} />
                  <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center', color: 'white', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.5)', fontSize: '0.8rem' }}>
                    LIVE VICTORY FEED
                  </div>
                </div>
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                   {winner.photos && winner.photos.length > 0 ? (
                     <img src={winner.photos[winner.photos.length - 1]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                   ) : (
                     <Avatar face={winner.avatar.face} hair={winner.avatar.hair} color={winner.avatar.color} size={220} />
                   )}
                </div>
              )}
            </motion.div>

            <div style={{ position: 'absolute', bottom: 20, zIndex: 11, background: 'var(--dark)', color: 'white', padding: '4px 16px', borderRadius: '20px', fontWeight: 'bold' }}>
              {winner.name} • {winner.score} pts
            </div>
          </div>
        )}

        {room.recap && (
          <div style={{ backgroundColor: 'rgba(255,255,255,0.5)', padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem', fontStyle: 'italic', fontSize: '1.2rem', color: '#333' }}>
            "{room.recap}"
          </div>
        )}

        <h3 style={{ marginBottom: '1rem' }}>Final Standings</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem', textAlign: 'left' }}>
          {playersArr.map((p, index) => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.05)', padding: '0.5rem 1rem', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontWeight: 'bold', fontSize: '1.2rem', width: '30px' }}>#{index + 1}</span>
                <Avatar face={p.avatar.face} hair={p.avatar.hair} color={p.avatar.color} size={40} />
                <span style={{ fontWeight: 'bold' }}>{p.name}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 'bold', color: 'var(--secondary)' }}>{p.score} Total Points</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          {isHost && (
            <button className="btn btn-primary" onClick={handleRematch}>
              Rematch
            </button>
          )}
          <button className="btn btn-secondary" onClick={handleLeave}>
            Leave Room
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default End;
