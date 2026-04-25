import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { subscribeToRoom, resetGame } from '../services/db';
import Avatar from '../components/Avatar';
import { motion } from 'framer-motion';

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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
            <Avatar face={winner.avatar.face} hair={winner.avatar.hair} color={winner.avatar.color} size={150} />
            <h2 style={{ marginTop: '1rem', color: 'var(--primary)', fontSize: '2.5rem' }}>{winner.name}</h2>
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
                <div style={{ fontWeight: 'bold', color: 'var(--secondary)' }}>{p.score} Items</div>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>{p.failedAttempts} Retries</div>
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
