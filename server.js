const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Serve static assets from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Server health & status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    activeRooms: rooms.size,
    uptime: process.uptime()
  });
});

/**
 * Room Management & Game State Storage
 * roomCode -> Room Object
 */
const rooms = new Map();

// Helper to generate readable 5-char tactical room codes
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate serial numbers for the bomb casing
function generateSerialNumber() {
  const prefixes = ['AEGIS', 'NEXUS', 'VORTEX', 'TITAN', 'CYBER', 'KRONOS'];
  const p = prefixes[Math.floor(Math.random() * prefixes.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  const suffix = ['X', 'Z', 'V', 'K', 'M'][Math.floor(Math.random() * 5)];
  return `${p}-${num}-${suffix}`;
}

/**
 * Generate 4-digit code and asymmetric clues mathematically guaranteed to yield the answer.
 * We formulate clear logical constraints split across players.
 */
function generateAsymmetricMission() {
  // Generate 4 digits (0-9). Let's favor distinct or semi-distinct for compelling logic.
  const digits = [];
  while (digits.length < 4) {
    const d = Math.floor(Math.random() * 10);
    digits.push(d);
  }

  const [d1, d2, d3, d4] = digits;
  const serial = generateSerialNumber();
  const sumTotal = d1 + d2 + d3 + d4;

  const isPrime = (n) => [2, 3, 5, 7].includes(n);
  const isEven = (n) => n % 2 === 0;

  // Build role-specific dossiers
  // OPERATIVE ALPHA (Field Defuser / Keypad Operator):
  // Gets direct visual inspection of bomb modules & tactical mathematical bounds
  const defuserClues = [];
  
  // Clue 1: Relation between D1 and D3 or direct property of D1
  if (d1 === d3) {
    defuserClues.push({
      title: "MODULE ALPHA: OPTICAL SENSOR",
      text: "Diagnostic log: Digit 1 and Digit 3 are IDENTICAL in value.",
      tag: "D1 = D3"
    });
  } else {
    defuserClues.push({
      title: "MODULE ALPHA: VOLTAGE HARMONIC",
      text: `Oscilloscope analysis confirms: (Digit 1 + Digit 3) = ${d1 + d3}.`,
      tag: `D1 + D3 = ${d1 + d3}`
    });
  }

  // Clue 2: Property of D4
  if (isPrime(d4)) {
    defuserClues.push({
      title: "MODULE DELTA: CORE FUSE",
      text: `Fuse resonance indicates Digit 4 is a SINGLE-DIGIT PRIME (${isEven(d4) ? 'and is EVEN' : 'and is ODD'}).`,
      tag: "D4 PRIME"
    });
  } else if (d4 === 0) {
    defuserClues.push({
      title: "MODULE DELTA: GROUND WIRE",
      text: "The fourth capacitor is fully discharged to ZERO (Digit 4 = 0).",
      tag: "D4 = 0"
    });
  } else {
    defuserClues.push({
      title: "MODULE DELTA: RELAY POLARITY",
      text: `Digit 4 is an ${isEven(d4) ? 'EVEN' : 'ODD'} digit, and ${d4 >= 5 ? 'greater than or equal to 5' : 'strictly less than 5'}.`,
      tag: `D4 ${isEven(d4) ? 'EVEN' : 'ODD'}`
    });
  }

  // Clue 3: Total sum or parity rule
  defuserClues.push({
    title: "MODULE SIGMA: CHECKSUM TOTAL",
    text: `Telemetry confirms the SUM of all 4 digits equals ${sumTotal}.`,
    tag: `SUM = ${sumTotal}`
  });

  // OPERATIVE BETA (Cryptanalyst / Intel Specialist):
  // Gets the cryptographic decryption manual, cipher logic, and Digit 2 & 3 relations
  const cryptanalystClues = [];

  // Clue 1: Explicit value or tight bound for Digit 3
  cryptanalystClues.push({
    title: "INTEL SHARD: FREQUENCY MATRIX",
    text: `Intercepted frequency reveals: Digit 3 is ${d3}. (Encrypted carrier signal locked).`,
    tag: `D3 = ${d3}`
  });

  // Clue 2: Relation between D1 and D2
  if (d2 >= d1) {
    cryptanalystClues.push({
      title: "INTEL SHARD: ALGORITHMIC DIFFERENCE",
      text: `Decrypted military cipher: Digit 2 exceeds Digit 1 by exactly ${d2 - d1} (Digit 2 - Digit 1 = ${d2 - d1}).`,
      tag: `D2 - D1 = ${d2 - d1}`
    });
  } else {
    cryptanalystClues.push({
      title: "INTEL SHARD: ALGORITHMIC DIFFERENCE",
      text: `Decrypted military cipher: Digit 1 exceeds Digit 2 by exactly ${d1 - d2} (Digit 1 - Digit 2 = ${d1 - d2}).`,
      tag: `D1 - D2 = ${d1 - d2}`
    });
  }

  // Clue 3: Serial Code Decryption Matrix
  const serialHasVowel = /[AEIOU]/.test(serial.split('-')[0]);
  const serialLastChar = serial.slice(-1);
  cryptanalystClues.push({
    title: "MANUAL PROTOCOL: SERIAL DECRYPTION",
    text: `Refer to bomb serial [${serial}]: Serial prefix ${serialHasVowel ? 'contains a vowel' : 'has no vowels'}. Verification code: Digit 2 is ${isEven(d2) ? 'EVEN' : 'ODD'}.`,
    tag: `D2 ${isEven(d2) ? 'EVEN' : 'ODD'}`
  });

  // OPERATIVE GAMMA (Signals Overwatch / Support for 3+ players):
  const overwatchClues = [
    {
      title: "SIGNAL SHOCK: PARITY VERIFICATION",
      text: `Parity bit confirms: (Digit 2 + Digit 4) = ${d2 + d4}.`,
      tag: `D2 + D4 = ${d2 + d4}`
    },
    {
      title: "SATELLITE DOWNLINK: DIGIT 1 BOUND",
      text: `High-frequency scanner narrowed Digit 1 to ${d1 >= 5 ? 'RANGE [5 - 9]' : 'RANGE [0 - 4]'}.`,
      tag: `D1 ${d1 >= 5 ? '>= 5' : '< 5'}`
    },
    {
      title: "SECURITY BYPASS HASH",
      text: `Emergency Override: (Digit 1 * Digit 4) mod 10 = ${(d1 * d4) % 10}. Cross-reference with Defuser!`,
      tag: `(D1*D4)%10 = ${(d1 * d4) % 10}`
    }
  ];

  return {
    code: digits.map(String),
    codeString: digits.join(''),
    serialNumber: serial,
    clues: {
      DEFUSER: defuserClues,
      CRYPTANALYST: cryptanalystClues,
      OVERWATCH: overwatchClues
    }
  };
}

/**
 * Socket.IO Real-Time Engine
 */
io.on('connection', (socket) => {
  let currentRoom = null;
  let playerName = `Agent_${socket.id.substring(0, 4).toUpperCase()}`;

  // Log connection
  console.log(`[Socket] Connected: ${socket.id} (${playerName})`);

  // Send initial handshake
  socket.emit('init_client', { socketId: socket.id, defaultName: playerName });

  /**
   * CREATE ROOM
   */
  socket.on('create_room', ({ name, difficulty = 'normal' }) => {
    if (name && name.trim()) playerName = name.trim().slice(0, 16);

    const roomCode = generateRoomCode();
    const timeLimits = { training: 150, normal: 120, hardcore: 75 };
    const maxStrikesMap = { training: 4, normal: 3, hardcore: 2 };

    const room = {
      code: roomCode,
      hostId: socket.id,
      difficulty: difficulty,
      timeLimit: timeLimits[difficulty] || 120,
      timer: timeLimits[difficulty] || 120,
      timerInterval: null,
      status: 'LOBBY', // 'LOBBY' | 'PLAYING' | 'DEFUSED' | 'DETONATED'
      strikes: 0,
      maxStrikes: maxStrikesMap[difficulty] || 3,
      secretDigits: [],
      secretCode: '',
      serialNumber: '',
      keypadBuffer: '',
      cluesData: null,
      players: [
        {
          id: socket.id,
          name: playerName,
          role: 'DEFUSER', // Host defaults to Defuser
          ready: true,
          isHost: true
        }
      ],
      logs: []
    };

    rooms.set(roomCode, room);
    currentRoom = roomCode;
    socket.join(roomCode);

    addRoomLog(room, `Squad room ${roomCode} established by ${playerName}.`);
    broadcastRoomState(roomCode);
    console.log(`[Room Created] ${roomCode} by ${playerName}`);
  });

  /**
   * JOIN ROOM
   */
  socket.on('join_room', ({ roomCode, name }) => {
    if (!roomCode) return socket.emit('error_msg', 'Room code is required.');
    const code = roomCode.trim().toUpperCase();
    const room = rooms.get(code);

    if (!room) {
      return socket.emit('error_msg', `Mission room ${code} not found.`);
    }

    if (room.status === 'PLAYING') {
      return socket.emit('error_msg', `Operation ${code} is currently active in progress.`);
    }

    if (name && name.trim()) playerName = name.trim().slice(0, 16);

    // Auto-assign role based on current squad
    const existingRoles = room.players.map(p => p.role);
    let assignedRole = 'CRYPTANALYST';
    if (!existingRoles.includes('DEFUSER')) assignedRole = 'DEFUSER';
    else if (!existingRoles.includes('CRYPTANALYST')) assignedRole = 'CRYPTANALYST';
    else assignedRole = 'OVERWATCH';

    const newPlayer = {
      id: socket.id,
      name: playerName,
      role: assignedRole,
      ready: false,
      isHost: false
    };

    room.players.push(newPlayer);
    currentRoom = code;
    socket.join(code);

    addRoomLog(room, `Operative ${playerName} joined squad as [${assignedRole}].`);
    broadcastRoomState(code);
    console.log(`[Room Joined] ${code}: ${playerName} as ${assignedRole}`);
  });

  /**
   * ROLE CHANGE REQUEST
   */
  socket.on('change_role', ({ role }) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room || room.status !== 'LOBBY') return;

    const validRoles = ['DEFUSER', 'CRYPTANALYST', 'OVERWATCH'];
    if (!validRoles.includes(role)) return;

    const p = room.players.find(pl => pl.id === socket.id);
    if (p) {
      p.role = role;
      addRoomLog(room, `${p.name} switched specialization to [${role}].`);
      broadcastRoomState(currentRoom);
    }
  });

  /**
   * READY STATUS TOGGLE
   */
  socket.on('toggle_ready', () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room || room.status !== 'LOBBY') return;

    const p = room.players.find(pl => pl.id === socket.id);
    if (p) {
      p.ready = !p.ready;
      broadcastRoomState(currentRoom);
    }
  });

  /**
   * START MISSION / PROTOCOL INITIATION
   */
  socket.on('start_mission', () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room || room.status !== 'LOBBY') return;

    if (room.hostId !== socket.id) {
      return socket.emit('error_msg', 'Only the Squad Commander (Host) can initiate defusal.');
    }

    // Check if at least 1 player is ready (solo training or co-op)
    const mission = generateAsymmetricMission();
    room.secretDigits = mission.code;
    room.secretCode = mission.codeString;
    room.serialNumber = mission.serialNumber;
    room.cluesData = mission.clues;
    room.status = 'PLAYING';
    room.timer = room.timeLimit;
    room.strikes = 0;
    room.keypadBuffer = '';

    addRoomLog(room, `DEFUSAL PROTOCOL INITIATED. Timer locked at ${room.timer}s. Bomb Serial: ${room.serialNumber}`);

    // Start authoritative timer
    clearInterval(room.timerInterval);
    room.timerInterval = setInterval(() => {
      handleTimerTick(room);
    }, 1000);

    // Notify room with state and personalized asymmetric intel
    broadcastGameStart(room);
    console.log(`[Mission Started] Room ${room.code} - Secret code: ${mission.codeString}`);
  });

  /**
   * SYNCHRONIZED KEYPAD INPUT
   */
  socket.on('keypad_input', ({ digit }) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room || room.status !== 'PLAYING') return;

    if (typeof digit !== 'string' || !/^[0-9]$/.test(digit)) return;

    if (room.keypadBuffer.length < 4) {
      room.keypadBuffer += digit;
      io.to(currentRoom).emit('keypad_buffer_update', {
        buffer: room.keypadBuffer,
        action: 'ADD',
        by: playerName,
        digit: digit
      });
    }
  });

  /**
   * KEYPAD BACKSPACE / CLEAR
   */
  socket.on('keypad_clear', () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room || room.status !== 'PLAYING') return;

    if (room.keypadBuffer.length > 0) {
      room.keypadBuffer = '';
      io.to(currentRoom).emit('keypad_buffer_update', {
        buffer: room.keypadBuffer,
        action: 'CLEAR',
        by: playerName
      });
    }
  });

  /**
   * KEYPAD SUBMIT (DEFUSE ATTEMPT)
   */
  socket.on('keypad_submit', () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room || room.status !== 'PLAYING') return;

    if (room.keypadBuffer.length !== 4) {
      return socket.emit('sound_event', { sound: 'error_short' });
    }

    const entered = room.keypadBuffer;
    const correct = room.secretCode;

    if (entered === correct) {
      // SUCCESS: BOMB DEFUSED!
      handleDefusalSuccess(room, playerName);
    } else {
      // FAILURE: STRIKE PENALTY
      handleStrikePenalty(room, playerName, entered);
    }
  });

  /**
   * TACTICAL SQUAD PING / QUICK CHAT
   */
  socket.on('send_tactical_ping', ({ message, type = 'info' }) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    const safeMsg = (message || '').toString().slice(0, 100);
    const logItem = `[${playerName}]: ${safeMsg}`;
    addRoomLog(room, logItem);

    io.to(currentRoom).emit('tactical_ping_received', {
      sender: playerName,
      message: safeMsg,
      type: type,
      timestamp: new Date().toLocaleTimeString()
    });
  });

  /**
   * REMATCH / RETURN TO LOBBY
   */
  socket.on('restart_mission', () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    clearInterval(room.timerInterval);
    room.status = 'LOBBY';
    room.strikes = 0;
    room.timer = room.timeLimit;
    room.keypadBuffer = '';
    room.secretDigits = [];
    room.secretCode = '';

    // Reset player readiness
    room.players.forEach(p => {
      p.ready = (p.id === room.hostId);
    });

    addRoomLog(room, `Operation reset by ${playerName}. Standing by in lobby.`);
    broadcastRoomState(currentRoom);
  });

  /**
   * DISCONNECT HANDLING
   */
  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
    if (currentRoom) {
      const room = rooms.get(currentRoom);
      if (room) {
        room.players = room.players.filter(p => p.id !== socket.id);
        addRoomLog(room, `Operative ${playerName} lost connection.`);

        if (room.players.length === 0) {
          // Cleanup empty room
          clearInterval(room.timerInterval);
          rooms.delete(currentRoom);
          console.log(`[Room Terminated] ${currentRoom} (no active players)`);
        } else {
          // Reassign host if host disconnected
          if (room.hostId === socket.id) {
            room.hostId = room.players[0].id;
            room.players[0].isHost = true;
            addRoomLog(room, `${room.players[0].name} promoted to Squad Commander.`);
          }
          broadcastRoomState(currentRoom);
        }
      }
    }
  });
});

/**
 * Game Timer & Event Handlers
 */
function handleTimerTick(room) {
  room.timer -= 1;

  if (room.timer <= 0) {
    room.timer = 0;
    handleBombDetonation(room, 'TIME_EXPIRED');
    return;
  }

  // Periodic heartbeat broadcast
  io.to(room.code).emit('timer_tick', {
    timer: room.timer,
    strikes: room.strikes,
    maxStrikes: room.maxStrikes
  });
}

function handleStrikePenalty(room, operativeName, enteredCode) {
  room.strikes += 1;
  const timePenalty = 15;
  room.timer = Math.max(0, room.timer - timePenalty);
  room.keypadBuffer = '';

  addRoomLog(room, `STRIKE ${room.strikes}/${room.maxStrikes}! Invalid code [${enteredCode}] submitted by ${operativeName}. (-${timePenalty}s PENALTY)`);

  if (room.strikes >= room.maxStrikes || room.timer <= 0) {
    handleBombDetonation(room, 'STRIKE_LIMIT');
  } else {
    io.to(room.code).emit('strike_event', {
      strikes: room.strikes,
      maxStrikes: room.maxStrikes,
      timer: room.timer,
      by: operativeName,
      penaltySeconds: timePenalty
    });
  }
}

function handleBombDetonation(room, reason) {
  clearInterval(room.timerInterval);
  room.status = 'DETONATED';

  addRoomLog(room, `CRITICAL DETONATION. Reason: ${reason === 'TIME_EXPIRED' ? 'CHRONO RUNOUT' : 'SECURITY OVERLOAD'}. Target code was [${room.secretCode}].`);

  io.to(room.code).emit('mission_result', {
    outcome: 'DETONATED',
    reason: reason,
    secretCode: room.secretCode,
    serialNumber: room.serialNumber,
    strikes: room.strikes,
    timeRemaining: room.timer
  });
}

function handleDefusalSuccess(room, operativeName) {
  clearInterval(room.timerInterval);
  room.status = 'DEFUSED';

  const timeUsed = room.timeLimit - room.timer;
  let rank = 'S';
  if (room.strikes > 0 || room.timer < 30) rank = 'A';
  if (room.strikes > 1 || room.timer < 15) rank = 'B';

  addRoomLog(room, `MISSION SUCCESS! Bomb neutralized by ${operativeName}. Verification code [${room.secretCode}] accepted.`);

  io.to(room.code).emit('mission_result', {
    outcome: 'DEFUSED',
    secretCode: room.secretCode,
    serialNumber: room.serialNumber,
    strikes: room.strikes,
    timeRemaining: room.timer,
    timeTaken: timeUsed,
    rank: rank
  });
}

function addRoomLog(room, message) {
  const time = new Date().toLocaleTimeString();
  const entry = `[${time}] ${message}`;
  room.logs.push(entry);
  if (room.logs.length > 50) room.logs.shift();
  io.to(room.code).emit('log_entry', { entry });
}

function broadcastRoomState(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  io.to(roomCode).emit('room_state_update', {
    code: room.code,
    hostId: room.hostId,
    status: room.status,
    difficulty: room.difficulty,
    timer: room.timer,
    strikes: room.strikes,
    maxStrikes: room.maxStrikes,
    players: room.players,
    logs: room.logs
  });
}

function broadcastGameStart(room) {
  // Give each player personalized clues matching their assigned role
  room.players.forEach(player => {
    let roleClues = room.cluesData[player.role] || room.cluesData.DEFUSER;
    
    // In solo testing, provide all intelligence shards so the player can solve it alone
    if (room.players.length === 1) {
      roleClues = [
        ...room.cluesData.DEFUSER,
        ...room.cluesData.CRYPTANALYST
      ];
    }

    io.to(player.id).emit('mission_started', {
      serialNumber: room.serialNumber,
      role: player.role,
      timer: room.timer,
      strikes: room.strikes,
      maxStrikes: room.maxStrikes,
      clues: roleClues,
      isSolo: room.players.length === 1,
      players: room.players
    });
  });
}

// Start Server
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  CIPHER-SPLIT // REAL-TIME ASYMMETRIC BOMB DEFUSAL `);
  console.log(`  TACTICAL SERVER LISTENING ON PORT ${PORT}           `);
  console.log(`  URL: http://localhost:${PORT}                       `);
  console.log(`====================================================`);
});
