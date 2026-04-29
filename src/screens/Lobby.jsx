import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { joinRoom, subscribeToRoom, updateRoomConfig, startGame } from '../services/db';
import { generateItems } from '../services/ai';
import Avatar from '../components/Avatar';
import { motion } from 'framer-motion';

function Lobby() {
  const { roomCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const { playerName, isHost } = location.state || {};
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  
  const [avatarFace, setAvatarFace] = useState('round');
  const [avatarHair, setAvatarHair] = useState('short');
  const [avatarColor, setAvatarColor] = useState('#EF476F');

  useEffect(() => {
    if (!playerName) {
      navigate('/');
      return;
    }

    const init = async () => {
      try {
        if (!isHost) {
          const avatar = { face: avatarFace, hair: avatarHair, color: avatarColor };
          await joinRoom(roomCode, playerName, avatar);
        }
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    
    init();

    const unsubscribe = subscribeToRoom(roomCode, (data) => {
      if (data) {
        setRoom(data);
        if (data.status === 'playing') {
          navigate(`/game/${roomCode}`, { state: { playerName, isHost } });
        }
      }
    });

    return () => unsubscribe();
  }, [roomCode, playerName, isHost, navigate]);

  const handleStartGame = async () => {
    setStarting(true);
    try {
      const theme = room?.theme || 'Filipino Humor';
      const playersCount = Object.keys(room?.players || {}).length;
      
      const itemData = await generateItems(theme, playersCount);
      if (itemData && itemData.items) {
        await startGame(roomCode, itemData.items);
      } else {
        setError('Failed to generate items. Please try again.');
        setStarting(false);
      }
    } catch (err) {
      setError('Error starting game.');
      setStarting(false);
    }
  };

  const handleUpdateConfig = async (key, value) => {
    await updateRoomConfig(roomCode, { [key]: value });
  };

  if (loading) return <div className="app-container"><h2>Loading...</h2></div>;
  if (error) return <div className="app-container"><div className="glass-panel"><h3 style={{color:'red'}}>{error}</h3><button className="btn btn-secondary mt-4" onClick={() => navigate('/')}>Go Back</button></div></div>;
  if (!room) return null;

  return (
    <div className="app-container" style={{ alignItems: 'flex-start', paddingTop: '4rem' }}>
      <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* Left Col: Customization */}
        <motion.div className="glass-panel" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }}>
          <h2 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>Room: {roomCode}</h2>
          <p style={{ marginBottom: '2rem' }}>Welcome, {playerName}!</p>
          
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
            <Avatar face={avatarFace} hair={avatarHair} color={avatarColor} size={150} />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Background Color</label>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              {['#EF476F', '#FFD166', '#06D6A0', '#118AB2', '#9D4EDD'].map(c => (
                <div 
                  key={c} 
                  onClick={() => setAvatarColor(c)}
                  style={{ width: 30, height: 30, borderRadius: '50%', background: c, cursor: 'pointer', border: avatarColor === c ? '3px solid white' : 'none' }}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Face</label>
              <select 
                value={avatarFace} 
                onChange={(e) => setAvatarFace(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '8px' }}
              >
                <option value="round">Round</option>
                <option value="oval">Oval</option>
                <option value="square">Square</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Hair</label>
              <select 
                value={avatarHair} 
                onChange={(e) => setAvatarHair(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '8px' }}
              >
                <option value="short">Short</option>
                <option value="long">Long</option>
                <option value="spiky">Spiky</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Right Col: Players & Controls */}
        <motion.div className="glass-panel" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }}>
          <h2 style={{ marginBottom: '1rem' }}>Players ({Object.keys(room.players || {}).length})</h2>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem', maxHeight: '200px', overflowY: 'auto' }}>
            {Object.values(room.players || {}).map(p => (
              <div key={p.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Avatar face={p.avatar.face} hair={p.avatar.hair} color={p.avatar.color} size={60} />
                <span style={{ fontSize: '0.8rem', marginTop: '0.5rem', fontWeight: 'bold' }}>{p.name}</span>
              </div>
            ))}
          </div>

          {isHost ? (
            <div style={{ marginTop: 'auto' }}>
              <hr style={{ margin: '1rem 0', opacity: 0.2 }} />
              <h3 style={{ marginBottom: '1rem' }}>Host Controls</h3>
              
              <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Theme</label>
                <select 
                  value={room.theme} 
                  onChange={(e) => handleUpdateConfig('theme', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px' }}
                >
                  <option value="Filipino Humor">Filipino Humor</option>
                  <option value="Random">Random (English)</option>
                </select>
              </div>

              <div style={{ marginBottom: '2rem', textAlign: 'left' }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Timer (seconds)</label>
                <select 
                  value={room.timerDuration} 
                  onChange={(e) => handleUpdateConfig('timerDuration', Number(e.target.value))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px' }}
                >
                  <option value={30}>30s</option>
                  <option value={60}>60s</option>
                  <option value={90}>90s</option>
                </select>
              </div>

              <button 
                className="btn btn-primary" 
                onClick={handleStartGame}
                disabled={starting}
              >
                {starting ? 'Generating Items...' : 'Start Game!'}
              </button>
            </div>
          ) : (
            <div style={{ marginTop: '2rem' }}>
              <p style={{ color: '#666', fontStyle: 'italic' }}>Waiting for host to start...</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default Lobby;
