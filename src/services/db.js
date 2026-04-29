import { database } from '../firebase';
import { ref, set, get, update, onValue, remove, push } from 'firebase/database';

export const createRoom = async (hostName, hostAvatar) => {
  // Generate a random 4-digit code
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  const roomCode = `SMSD-${code}`;
  
  const roomRef = ref(database, `rooms/${roomCode}`);
  await set(roomRef, {
    status: 'lobby',
    theme: 'Filipino Humor',
    timerDuration: 60,
    players: {
      [hostName]: {
        name: hostName,
        avatar: hostAvatar,
        isHost: true,
        score: 0,
        currentItemIndex: 0,
        status: 'waiting', // waiting, taking_photo, submitted, verified, failed
        lastSubmittedPhoto: null,
        photos: [], // Store all captured photos for the gallery
        failedAttempts: 0,
        totalTime: 0
      }
    },
    items: [],
    winner: null,
    createdAt: Date.now()
  });
  
  return roomCode;
};

export const joinRoom = async (roomCode, playerName, playerAvatar) => {
  const roomRef = ref(database, `rooms/${roomCode}`);
  const snapshot = await get(roomRef);
  
  if (!snapshot.exists()) {
    throw new Error('Room not found');
  }
  
  const roomData = snapshot.val();
  if (roomData.status !== 'lobby') {
    throw new Error('Game already started');
  }
  
  if (roomData.players && roomData.players[playerName]) {
    throw new Error('Name already taken in this room');
  }
  
  await update(ref(database, `rooms/${roomCode}/players`), {
    [playerName]: {
      name: playerName,
      avatar: playerAvatar,
      isHost: false,
      score: 0,
      currentItemIndex: 0,
      status: 'waiting',
      lastSubmittedPhoto: null,
      photos: [],
      failedAttempts: 0,
      totalTime: 0
    }
  });
  
  return roomCode;
};

export const updateRoomConfig = async (roomCode, config) => {
  await update(ref(database, `rooms/${roomCode}`), config);
};

export const startGame = async (roomCode, items) => {
  const snapshot = await get(ref(database, `rooms/${roomCode}`));
  const roomData = snapshot.val();
  const timerDuration = roomData.timerDuration || 60;
  const players = roomData.players || {};

  const updates = {};
  // Room updates
  updates[`rooms/${roomCode}/status`] = 'playing';
  updates[`rooms/${roomCode}/items`] = items;
  updates[`rooms/${roomCode}/startedAt`] = Date.now();
  updates[`rooms/${roomCode}/roomCurrentItemIndex`] = 0;
  updates[`rooms/${roomCode}/roundEndsAt`] = Date.now() + (timerDuration * 1000);
  
  // Reset all players
  for (const p in players) {
    updates[`rooms/${roomCode}/players/${p}/status`] = 'taking_photo';
    updates[`rooms/${roomCode}/players/${p}/currentItemIndex`] = 0;
    updates[`rooms/${roomCode}/players/${p}/lastSubmittedPhoto`] = null;
    updates[`rooms/${roomCode}/players/${p}/photos`] = [];
    updates[`rooms/${roomCode}/players/${p}/score`] = 0;
    updates[`rooms/${roomCode}/players/${p}/failedAttempts`] = 0;
    updates[`rooms/${roomCode}/players/${p}/totalTime`] = 0;
  }
  
  await update(ref(database), updates);
};

export const submitPhoto = async (roomCode, playerName, photo) => {
  const pRef = ref(database, `rooms/${roomCode}/players/${playerName}`);
  const snap = await get(pRef);
  const currentPhotos = snap.val().photos || [];
  
  await update(pRef, {
    status: 'submitted',
    lastSubmittedPhoto: photo,
    photos: [...currentPhotos, photo]
  });
};

export const updateVerificationResult = async (roomCode, playerName, points, itemIndex) => {
  const pRef = ref(database, `rooms/${roomCode}/players/${playerName}`);
  const snap = await get(pRef);
  const currentData = snap.val();
  
  const newScore = (currentData.score || 0) + points;
  
  await update(pRef, {
    status: points > 0 ? 'verified' : 'failed',
    score: newScore,
    currentItemIndex: itemIndex + 1,
    // We'll keep the photo briefly for the UI to show it with the score overlay
  });
};

export const setPlayerStatus = async (roomCode, playerName, status) => {
  await update(ref(database, `rooms/${roomCode}/players/${playerName}`), {
    status
  });
};

export const endGame = async (roomCode, winnerName, recap) => {
  await update(ref(database, `rooms/${roomCode}`), {
    status: 'ended',
    winner: winnerName,
    recap: recap
  });
};

export const advanceToNextRound = async (roomCode, nextIndex, timerDuration) => {
  const roomRef = ref(database, `rooms/${roomCode}`);
  const snap = await get(roomRef);
  const players = snap.val().players;

  const updates = {};
  updates[`rooms/${roomCode}/roomCurrentItemIndex`] = nextIndex;
  updates[`rooms/${roomCode}/roundEndsAt`] = Date.now() + (timerDuration * 1000);
  
  for (const p in players) {
    updates[`rooms/${roomCode}/players/${p}/status`] = 'taking_photo';
    updates[`rooms/${roomCode}/players/${p}/lastSubmittedPhoto`] = null;
  }
  
  await update(ref(database), updates);
};

export const resetGame = async (roomCode) => {
  await update(ref(database, `rooms/${roomCode}`), {
    status: 'lobby',
    items: [],
    winner: null,
    recap: null,
    roomCurrentItemIndex: 0,
    roundEndsAt: null
  });
};

export const subscribeToRoom = (roomCode, callback) => {
  const roomRef = ref(database, `rooms/${roomCode}`);
  return onValue(roomRef, (snapshot) => {
    callback(snapshot.val());
  });
};
