import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoom } from '../services/db';
import { motion } from 'framer-motion';

function Home() {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleCreateRoom = async () => {
    if (!name.trim()) {
      setError('Please enter your name first!');
      return;
    }
    try {
      setLoading(true);
      setError('');
      // Default avatar configuration
      const defaultAvatar = { face: 'round', hair: 'black', color: '#EF476F' };
      const code = await createRoom(name, defaultAvatar);
      // Pass player name to lobby state
      navigate(`/lobby/${code}`, { state: { playerName: name, isHost: true } });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleJoinRoom = () => {
    if (!name.trim()) {
      setError('Please enter your name first!');
      return;
    }
    if (!roomCode.trim()) {
      setError('Please enter a room code!');
      return;
    }
    // Navigate to lobby, the lobby will handle the actual joining logic
    navigate(`/lobby/${roomCode.toUpperCase()}`, { state: { playerName: name, isHost: false } });
  };

  return (
    <div className="app-container">
      <motion.div 
        className="glass-panel"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div className="floating">
          <h1>Saan Mo Sya Dalhin?</h1>
        </motion.div>
        
        <p style={{ marginBottom: '2rem', fontSize: '1.2rem', color: '#666' }}>
          The classic Filipino Bring Me game, now AI-powered!
        </p>

        {error && <p style={{ color: 'var(--secondary)', marginBottom: '1rem', fontWeight: 'bold' }}>{error}</p>}

        <input 
          type="text" 
          placeholder="Enter your name..." 
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={15}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          <button 
            className="btn btn-primary" 
            onClick={handleCreateRoom}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create New Room'}
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1rem 0' }}>
            <div style={{ flex: 1, height: '2px', background: '#eee' }}></div>
            <span style={{ color: '#999', fontWeight: 'bold' }}>OR</span>
            <div style={{ flex: 1, height: '2px', background: '#eee' }}></div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              placeholder="Room Code (e.g. SMSD-1234)" 
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              style={{ marginBottom: 0 }}
            />
            <button 
              className="btn btn-secondary" 
              style={{ width: 'auto', padding: '1rem' }}
              onClick={handleJoinRoom}
            >
              Join
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default Home;
