import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './screens/Home';
import Lobby from './screens/Lobby';
import Game from './screens/Game';
import End from './screens/End';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lobby/:roomCode" element={<Lobby />} />
        <Route path="/game/:roomCode" element={<Game />} />
        <Route path="/end/:roomCode" element={<End />} />
      </Routes>
    </Router>
  );
}

export default App;
