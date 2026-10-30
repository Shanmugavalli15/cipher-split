const { io } = require('socket.io-client');

async function testGame() {
  console.log('Connecting Operative 1 (Alpha - Host)...');
  const socket1 = io('http://localhost:3000');
  const socket2 = io('http://localhost:3000');

  await new Promise(res => socket1.on('connect', res));
  await new Promise(res => socket2.on('connect', res));
  console.log('✓ Both operatives connected.');

  let roomCode = '';

  // 1. Host creates room
  socket1.emit('create_room', { name: 'AlphaDefuser', difficulty: 'normal' });

  await new Promise((resolve) => {
    socket1.on('room_state_update', (room) => {
      roomCode = room.code;
      console.log(`✓ Room created with code: ${roomCode}`);
      resolve();
    });
  });

  // 2. Operative 2 joins room
  socket2.emit('join_room', { roomCode: roomCode, name: 'BetaCrypt' });

  await new Promise((resolve) => {
    let pCount = 0;
    socket2.on('room_state_update', (room) => {
      pCount = room.players.length;
      if (pCount === 2) {
        console.log(`✓ Both operatives in room ${roomCode}. Players:`, room.players.map(p => `${p.name} [${p.role}]`).join(', '));
        resolve();
      }
    });
  });

  // 3. Start Mission
  console.log('Initiating mission...');
  let secretCode = '';
  let cluesP1 = [];
  let cluesP2 = [];

  const startPromise = Promise.all([
    new Promise(res => {
      socket1.on('mission_started', (data) => {
        cluesP1 = data.clues;
        console.log(`✓ Operative 1 received role [${data.role}] with ${data.clues.length} asymmetric clues.`);
        res(data);
      });
    }),
    new Promise(res => {
      socket2.on('mission_started', (data) => {
        cluesP2 = data.clues;
        console.log(`✓ Operative 2 received role [${data.role}] with ${data.clues.length} asymmetric clues.`);
        res(data);
      });
    })
  ]);

  socket1.emit('start_mission');
  await startPromise;

  // 4. Test Keypad Buffer Synchronization
  console.log('Testing synchronized keypad buffer...');
  const bufferPromise = new Promise(res => {
    socket2.on('keypad_buffer_update', (data) => {
      if (data.buffer === '7') {
        console.log(`✓ Operative 2 received synchronized keypad buffer: "${data.buffer}" entered by ${data.by}`);
        res();
      }
    });
  });

  socket1.emit('keypad_input', { digit: '7' });
  await bufferPromise;

  // Clear buffer
  socket1.emit('keypad_clear');
  await new Promise(r => setTimeout(r, 200));

  // 5. Test Strike on Invalid Code
  console.log('Testing strike penalty on invalid code...');
  const strikePromise = new Promise(res => {
    socket1.on('strike_event', (strikeData) => {
      console.log(`✓ Strike event received! Strikes: ${strikeData.strikes}/${strikeData.maxStrikes}, Penalty: -${strikeData.penaltySeconds}s`);
      res();
    });
  });

  ['9', '9', '9', '9'].forEach(d => socket1.emit('keypad_input', { digit: d }));
  socket1.emit('keypad_submit');
  await strikePromise;

  // 6. Test Timer Sync
  await new Promise(res => {
    socket2.once('timer_tick', (t) => {
      console.log(`✓ Authoritative timer ticking: ${t.timer}s remaining`);
      res();
    });
  });

  console.log('====================================');
  console.log('ALL REAL-TIME ASYMMETRIC MECHANICS VERIFIED SUCCESSFULLY!');
  console.log('====================================');

  socket1.disconnect();
  socket2.disconnect();
  process.exit(0);
}

testGame().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
