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
  await update(ref(database, `rooms/${roomCode}`), {
    status: 'playing',
    items: items,
    startedAt: Date.now()
  });
  
  // reset player states
  const snapshot = await get(ref(database, `rooms/${roomCode}/players`));
  const players = snapshot.val();
  const updates = {};
  for (const p in players) {
    updates[`rooms/${roomCode}/players/${p}/status`] = 'taking_photo';
    updates[`rooms/${roomCode}/players/${p}/currentItemIndex`] = 0;
    updates[`rooms/${roomCode}/players/${p}/lastSubmittedPhoto`] = null;
    updates[`rooms/${roomCode}/players/${p}/score`] = 0;
    updates[`rooms/${roomCode}/players/${p}/failedAttempts`] = 0;
    updates[`rooms/${roomCode}/players/${p}/totalTime`] = 0;
  }
  await update(ref(database), updates);
};

export const submitPhoto = async (roomCode, playerName, photo) => {
  await update(ref(database, `rooms/${roomCode}/players/${playerName}`), {
    status: 'submitted',
    lastSubmittedPhoto: photo
  });
};

export const updateVerificationResult = async (roomCode, playerName, pass, itemIndex) => {
  if (pass) {
    await update(ref(database, `rooms/${roomCode}/players/${playerName}`), {
      status: 'verified',
      score: itemIndex + 1,
      currentItemIndex: itemIndex + 1,
      lastSubmittedPhoto: null // clear to show success checkmark then next item
    });
  } else {
    const pRef = ref(database, `rooms/${roomCode}/players/${playerName}`);
    const snap = await get(pRef);
    const fails = (snap.val().failedAttempts || 0) + 1;
    await update(pRef, {
      status: 'failed',
      failedAttempts: fails
    });
  }
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

export const resetGame = async (roomCode) => {
  await update(ref(database, `rooms/${roomCode}`), {
    status: 'lobby',
    items: [],
    winner: null,
    recap: null
  });
};

export const subscribeToRoom = (roomCode, callback) => {
  const roomRef = ref(database, `rooms/${roomCode}`);
  return onValue(roomRef, (snapshot) => {
    callback(snapshot.val());
  });
};
