/**
 * CIPHER-SPLIT // Client-Side Game Engine
 * Authoritative Asymmetric Bomb Defusal Terminal
 */

(function () {
  'use strict';

  // Socket.IO Connection
  const socket = io();

  // Web Audio Tactical Sound Synthesizer
  let audioEnabled = true;
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.15) {
    if (!audioEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio context might fail on un-interacted DOM
    }
  }

  const SoundFX = {
    keyPress: () => playTone(880, 'sine', 0.08, 0.1),
    keyClear: () => playTone(320, 'square', 0.12, 0.12),
    keySubmit: () => playTone(1200, 'triangle', 0.15, 0.15),
    timerTick: (urgent = false) => {
      if (urgent) {
        playTone(900, 'sawtooth', 0.08, 0.15);
      } else {
        playTone(600, 'sine', 0.04, 0.05);
      }
    },
    strike: () => {
      playTone(180, 'sawtooth', 0.4, 0.3);
      setTimeout(() => playTone(140, 'sawtooth', 0.4, 0.3), 150);
    },
    victory: () => {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
        setTimeout(() => playTone(f, 'sine', 0.25, 0.2), idx * 120);
      });
    },
    detonation: () => {
      if (!audioEnabled) return;
      try {
        initAudio();
        if (!audioCtx) return;
        // Low frequency noise blast
        const bufferSize = audioCtx.sampleRate * 0.8;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, audioCtx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.8);
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        noise.start();
      } catch (e) {}
    }
  };

  // State Management
  const State = {
    socketId: null,
    playerName: '',
    currentRoom: null,
    isHost: false,
    selectedRole: 'DEFUSER',
    difficulty: 'normal',
    isReady: false,
    timer: 120,
    strikes: 0,
    maxStrikes: 3,
    serialNumber: '',
    myClues: [],
    keypadBuffer: ''
  };

  // DOM Elements
  const DOM = {
    // Top Bar
    connectionStatus: document.getElementById('connection-status'),
    btnSoundToggle: document.getElementById('btn-sound-toggle'),
    soundStateLabel: document.getElementById('sound-state-label'),
    toast: document.getElementById('toast-notification'),

    // Views
    viewLobby: document.getElementById('view-lobby'),
    viewStaging: document.getElementById('view-staging'),
    viewMission: document.getElementById('view-mission'),

    // Lobby
    inputPlayerName: document.getElementById('input-player-name'),
    displayAgentCallsign: document.getElementById('display-agent-callsign'),
    btnCreateRoom: document.getElementById('btn-create-room'),
    inputJoinCode: document.getElementById('input-join-code'),
    btnJoinRoom: document.getElementById('btn-join-room'),
    btnSoloDrill: document.getElementById('btn-solo-drill'),
    diffButtons: document.querySelectorAll('.btn-diff'),

    // Staging Dock
    displayRoomCode: document.getElementById('display-room-code'),
    btnCopyCode: document.getElementById('btn-copy-code'),
    displayDifficulty: document.getElementById('display-difficulty'),
    displayTimeLimit: document.getElementById('display-time-limit'),
    displayMaxStrikes: document.getElementById('display-max-strikes'),
    roleButtons: document.querySelectorAll('.btn-role-opt'),
    rosterList: document.getElementById('roster-list'),
    rosterCount: document.getElementById('roster-count'),
    btnToggleReady: document.getElementById('btn-toggle-ready'),
    readyStatusLabel: document.getElementById('ready-status-label'),
    btnStartMission: document.getElementById('btn-start-mission'),

    // Mission HUD
    hudOperativeName: document.getElementById('hud-operative-name'),
    hudRoleBadge: document.getElementById('hud-role-badge'),
    hudSerialNumber: document.getElementById('hud-serial-number'),
    hudTimer: document.getElementById('hud-timer'),
    hudStrikesContainer: document.getElementById('hud-strikes-container'),

    // Mission Intel
    intelRoleHeadline: document.getElementById('intel-role-headline'),
    cluesContainer: document.getElementById('clues-container'),
    scratchD1: document.getElementById('scratch-d1'),
    scratchD2: document.getElementById('scratch-d2'),
    scratchD3: document.getElementById('scratch-d3'),
    scratchD4: document.getElementById('scratch-d4'),
    pingButtons: document.querySelectorAll('.btn-ping'),

    // Bomb Core & Keypad
    digitSlots: [
      document.getElementById('digit-slot-0'),
      document.getElementById('digit-slot-1'),
      document.getElementById('digit-slot-2'),
      document.getElementById('digit-slot-3')
    ],
    keypadFeedback: document.getElementById('keypad-status-indicator'),
    keyButtons: document.querySelectorAll('.key-btn[data-key]'),
    btnKeyClear: document.getElementById('btn-key-clear'),
    btnKeySubmit: document.getElementById('btn-key-submit'),

    // Comms & Telemetry
    telemetryLogs: document.getElementById('telemetry-logs'),
    chatForm: document.getElementById('chat-form'),
    chatInput: document.getElementById('chat-input'),

    // Modals
    modalDetonated: document.getElementById('modal-detonated'),
    failReasonText: document.getElementById('fail-reason-text'),
    failSecretCode: document.getElementById('fail-secret-code'),
    failSerial: document.getElementById('fail-serial'),
    failStrikes: document.getElementById('fail-strikes'),
    btnRetryFailed: document.getElementById('btn-retry-failed'),

    modalDefused: document.getElementById('modal-defused'),
    winSecretCode: document.getElementById('win-secret-code'),
    winTimeLeft: document.getElementById('win-time-left'),
    winStrikes: document.getElementById('win-strikes'),
    winRank: document.getElementById('win-rank'),
    btnNextMission: document.getElementById('btn-next-mission')
  };

  /**
   * Helper: Show Toast
   */
  function showToast(msg, isError = false) {
    DOM.toast.textContent = msg;
    DOM.toast.className = `cyber-toast show ${isError ? 'error' : ''}`;
    setTimeout(() => {
      DOM.toast.className = 'cyber-toast';
    }, 3200);
  }

  /**
   * Switch Active View Screen
   */
  function switchView(viewName) {
    DOM.viewLobby.classList.remove('active');
    DOM.viewStaging.classList.remove('active');
    DOM.viewMission.classList.remove('active');

    if (viewName === 'lobby') DOM.viewLobby.classList.add('active');
    else if (viewName === 'staging') DOM.viewStaging.classList.add('active');
    else if (viewName === 'mission') DOM.viewMission.classList.add('active');
  }

  /**
   * Format Seconds to MM:SS
   */
  function formatTime(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // =========================================================================
  // SOCKET.IO EVENT HANDLERS
  // =========================================================================

  socket.on('connect', () => {
    DOM.connectionStatus.className = 'status-indicator online';
    DOM.connectionStatus.innerHTML = '<span class="dot"></span> NET: CONNECTED';
  });

  socket.on('disconnect', () => {
    DOM.connectionStatus.className = 'status-indicator';
    DOM.connectionStatus.innerHTML = '<span class="dot" style="background:#ff003c;box-shadow:0 0 8px #ff003c"></span> NET: DISCONNECTED';
    showToast('Telemetry link lost. Reconnecting...', true);
  });

  socket.on('init_client', ({ socketId, defaultName }) => {
    State.socketId = socketId;
    if (!State.playerName) {
      State.playerName = defaultName;
      DOM.inputPlayerName.value = defaultName;
      DOM.displayAgentCallsign.textContent = defaultName;
    }
  });

  socket.on('error_msg', (msg) => {
    showToast(msg, true);
    SoundFX.strike();
  });

  socket.on('sound_event', ({ sound }) => {
    if (sound === 'error_short') SoundFX.strike();
  });

  /**
   * ROOM STATE UPDATE (Lobby / Staging)
   */
  socket.on('room_state_update', (room) => {
    State.currentRoom = room.code;
    State.difficulty = room.difficulty;
    State.timer = room.timer;
    State.strikes = room.strikes;
    State.maxStrikes = room.maxStrikes;

    const me = room.players.find(p => p.id === State.socketId);
    if (me) {
      State.isHost = (room.hostId === State.socketId);
      State.selectedRole = me.role;
      State.isReady = me.ready;
    }

    if (room.status === 'LOBBY') {
      // Close any active outcome modals
      DOM.modalDetonated.classList.remove('active');
      DOM.modalDefused.classList.remove('active');

      renderStagingRoom(room);
      switchView('staging');
    }
  });

  /**
   * MISSION STARTED
   */
  socket.on('mission_started', (data) => {
    State.serialNumber = data.serialNumber;
    State.selectedRole = data.role;
    State.timer = data.timer;
    State.strikes = data.strikes;
    State.maxStrikes = data.maxStrikes;
    State.myClues = data.clues || [];

    // Close any previous modals
    DOM.modalDetonated.classList.remove('active');
    DOM.modalDefused.classList.remove('active');

    // Update HUD
    DOM.hudOperativeName.textContent = State.playerName;
    DOM.hudRoleBadge.textContent = data.role;
    DOM.hudSerialNumber.textContent = data.serialNumber;
    updateTimerDisplay(data.timer);
    updateStrikesDisplay(data.strikes, data.maxStrikes);

    // Update Intel
    DOM.intelRoleHeadline.textContent = `${data.role} DOSSIER ${data.isSolo ? '(SOLO PROTOCOL: COMBINED INTEL)' : ''}`;
    renderClues(data.clues);

    // Reset keypad buffer
    renderKeypadBuffer('');
    DOM.keypadFeedback.textContent = 'AWAITING 4-DIGIT INPUT SEQUENCE';
    DOM.keypadFeedback.style.color = 'var(--neon-amber)';

    // Reset scratchpad
    DOM.scratchD1.value = '';
    DOM.scratchD2.value = '';
    DOM.scratchD3.value = '';
    DOM.scratchD4.value = '';

    switchView('mission');
    SoundFX.victory();
    showToast(`DEFUSAL PROTOCOL ACTIVE. ROLE: ${data.role}`);
  });

  /**
   * SYNCHRONIZED TIMER TICK
   */
  socket.on('timer_tick', ({ timer, strikes, maxStrikes }) => {
    State.timer = timer;
    State.strikes = strikes;
    State.maxStrikes = maxStrikes;
    updateTimerDisplay(timer);
    updateStrikesDisplay(strikes, maxStrikes);

    const urgent = (timer <= 30);
    SoundFX.timerTick(urgent);
  });

  /**
   * SYNCHRONIZED KEYPAD BUFFER UPDATE
   */
  socket.on('keypad_buffer_update', ({ buffer, action, by, digit }) => {
    State.keypadBuffer = buffer;
    renderKeypadBuffer(buffer);

    if (action === 'ADD') {
      SoundFX.keyPress();
      DOM.keypadFeedback.textContent = `[${by}] keyed: ${digit} (${buffer.length}/4)`;
      DOM.keypadFeedback.style.color = 'var(--neon-cyan)';
    } else if (action === 'CLEAR') {
      SoundFX.keyClear();
      DOM.keypadFeedback.textContent = `[${by}] cleared input buffer.`;
      DOM.keypadFeedback.style.color = 'var(--neon-amber)';
    }
  });

  /**
   * STRIKE PENALTY EVENT
   */
  socket.on('strike_event', ({ strikes, maxStrikes, timer, by, penaltySeconds }) => {
    State.strikes = strikes;
    State.maxStrikes = maxStrikes;
    State.timer = timer;

    updateStrikesDisplay(strikes, maxStrikes);
    updateTimerDisplay(timer);
    renderKeypadBuffer('');

    DOM.keypadFeedback.textContent = `STRIKE ${strikes}/${maxStrikes}! INCORRECT CODE BY ${by}! (-${penaltySeconds}s)`;
    DOM.keypadFeedback.style.color = 'var(--neon-crimson)';

    SoundFX.strike();
    showToast(`STRIKE DETECTED! ${strikes}/${maxStrikes}`, true);
  });

  /**
   * MISSION RESULT (VICTORY OR DETONATION)
   */
  socket.on('mission_result', (result) => {
    if (result.outcome === 'DETONATED') {
      SoundFX.detonation();
      DOM.failSecretCode.textContent = result.secretCode;
      DOM.failSerial.textContent = result.serialNumber;
      DOM.failStrikes.textContent = `${result.strikes} STRIKES`;
      DOM.failReasonText.textContent = (result.reason === 'TIME_EXPIRED')
        ? 'DETONATION TRIGGERED: CHRONOMETER REACHED ZERO.'
        : 'DETONATION TRIGGERED: MAXIMUM SECURITY STRIKES REACHED.';
      DOM.modalDetonated.classList.add('active');
    } else if (result.outcome === 'DEFUSED') {
      SoundFX.victory();
      DOM.winSecretCode.textContent = result.secretCode;
      DOM.winTimeLeft.textContent = formatTime(result.timeRemaining);
      DOM.winStrikes.textContent = `${result.strikes} STRIKES`;
      DOM.winRank.textContent = `${result.rank}-RANK`;
      DOM.modalDefused.classList.add('active');
    }
  });

  /**
   * LOG ENTRY & TELEMETRY STREAM
   */
  socket.on('log_entry', ({ entry }) => {
    appendTelemetryLog(entry);
  });

  /**
   * TACTICAL PING RECEIVED
   */
  socket.on('tactical_ping_received', ({ sender, message, timestamp }) => {
    appendTelemetryLog(`[${timestamp}] 📢 ${sender}: "${message}"`, 'chat');
    playTone(750, 'triangle', 0.1, 0.12);
  });

  // =========================================================================
  // UI RENDERING FUNCTIONS
  // =========================================================================

  function renderStagingRoom(room) {
    DOM.displayRoomCode.textContent = room.code;
    DOM.displayDifficulty.textContent = room.difficulty.toUpperCase();
    DOM.displayTimeLimit.textContent = `${room.timeLimit || 120}s`;
    DOM.displayMaxStrikes.textContent = room.maxStrikes || 3;
    DOM.rosterCount.textContent = room.players.length;

    // Render Role Selection Highlights
    DOM.roleButtons.forEach(btn => {
      const role = btn.dataset.role;
      btn.classList.toggle('active', role === State.selectedRole);
    });

    // Render Operatives List
    DOM.rosterList.innerHTML = '';
    room.players.forEach(p => {
      const isYou = (p.id === State.socketId);
      const card = document.createElement('div');
      card.className = `player-card ${isYou ? 'is-you' : ''}`;
      card.innerHTML = `
        <div class="player-card-info">
          <span class="player-name">
            ${p.name} ${isYou ? '<small>(YOU)</small>' : ''}
            ${p.isHost ? '<span class="host-crown" title="Squad Commander">★ HOST</span>' : ''}
          </span>
          <span class="player-role-tag">${p.role}</span>
        </div>
        <span class="player-status-tag ${p.ready ? 'ready' : 'not-ready'}">
          ${p.ready ? 'READY' : 'STANDBY'}
        </span>
      `;
      DOM.rosterList.appendChild(card);
    });

    // Update ready toggle button text
    const me = room.players.find(p => p.id === State.socketId);
    if (me) {
      DOM.readyStatusLabel.textContent = me.ready ? 'READY' : 'STANDBY';
      DOM.btnToggleReady.style.borderColor = me.ready ? 'var(--neon-green)' : 'var(--border-cyan)';
    }

    // Launch button only accessible by host
    if (State.isHost) {
      DOM.btnStartMission.style.display = 'block';
    } else {
      DOM.btnStartMission.style.display = 'none';
    }
  }

  function renderClues(clues) {
    DOM.cluesContainer.innerHTML = '';
    if (!clues || clues.length === 0) {
      DOM.cluesContainer.innerHTML = '<div class="clue-card"><p class="clue-text">No intelligence shards decrypted for this role.</p></div>';
      return;
    }

    clues.forEach((c) => {
      const card = document.createElement('div');
      card.className = 'clue-card';
      card.innerHTML = `
        <div class="clue-header">
          <span class="clue-title">${c.title}</span>
          <span class="clue-tag">${c.tag}</span>
        </div>
        <div class="clue-text">${c.text}</div>
      `;
      DOM.cluesContainer.appendChild(card);
    });
  }

  function renderKeypadBuffer(buffer) {
    for (let i = 0; i < 4; i++) {
      const cell = DOM.digitSlots[i];
      if (i < buffer.length) {
        cell.textContent = buffer[i];
        cell.classList.add('filled');
      } else {
        cell.textContent = '_';
        cell.classList.remove('filled');
      }
    }
  }

  function updateTimerDisplay(seconds) {
    DOM.hudTimer.textContent = formatTime(seconds);
    if (seconds <= 30) {
      DOM.hudTimer.classList.add('urgent');
    } else {
      DOM.hudTimer.classList.remove('urgent');
    }
  }

  function updateStrikesDisplay(strikes, maxStrikes) {
    DOM.hudStrikesContainer.innerHTML = '';
    for (let i = 1; i <= maxStrikes; i++) {
      const slot = document.createElement('span');
      slot.className = `strike-slot ${i <= strikes ? 'active' : ''}`;
      slot.textContent = '⚡';
      slot.title = `Strike ${i} of ${maxStrikes}`;
      DOM.hudStrikesContainer.appendChild(slot);
    }
  }

  function appendTelemetryLog(text, type = 'system') {
    const entry = document.createElement('div');
    entry.className = `telemetry-entry ${type}`;
    if (text.includes('STRIKE')) entry.className = 'telemetry-entry strike';
    if (text.includes('SUCCESS') || text.includes('DEFUSED')) entry.className = 'telemetry-entry success';
    entry.textContent = text;
    DOM.telemetryLogs.appendChild(entry);
    DOM.telemetryLogs.scrollTop = DOM.telemetryLogs.scrollHeight;
  }

  // =========================================================================
  // USER ACTIONS & EVENT LISTENERS
  // =========================================================================

  // Callsign Input
  DOM.inputPlayerName.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    State.playerName = val || 'AGENT';
    DOM.displayAgentCallsign.textContent = State.playerName;
  });

  // Sound Toggle
  DOM.btnSoundToggle.addEventListener('click', () => {
    initAudio();
    audioEnabled = !audioEnabled;
    DOM.soundStateLabel.textContent = audioEnabled ? 'ON' : 'MUTED';
    DOM.btnSoundToggle.querySelector('.icon').textContent = audioEnabled ? '🔊' : '🔇';
    showToast(`Audio synthesized sound: ${audioEnabled ? 'ENABLED' : 'MUTED'}`);
  });

  // Difficulty Selector
  DOM.diffButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      DOM.diffButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      State.difficulty = btn.dataset.diff;
      initAudio();
      SoundFX.keyPress();
    });
  });

  // Create Room
  DOM.btnCreateRoom.addEventListener('click', () => {
    initAudio();
    SoundFX.keyPress();
    socket.emit('create_room', {
      name: State.playerName,
      difficulty: State.difficulty
    });
  });

  // Solo Recon Drill (1-click room create and start)
  DOM.btnSoloDrill.addEventListener('click', () => {
    initAudio();
    SoundFX.keyPress();
    socket.emit('create_room', {
      name: State.playerName,
      difficulty: 'normal'
    });
    // Auto-start after short tick
    setTimeout(() => {
      socket.emit('start_mission');
    }, 400);
  });

  // Join Room
  DOM.btnJoinRoom.addEventListener('click', () => {
    initAudio();
    const code = DOM.inputJoinCode.value.trim().toUpperCase();
    if (!code) {
      showToast('Please enter a 4-character room code.', true);
      return;
    }
    SoundFX.keyPress();
    socket.emit('join_room', {
      roomCode: code,
      name: State.playerName
    });
  });

  // Copy Room Code
  DOM.btnCopyCode.addEventListener('click', () => {
    initAudio();
    const code = DOM.displayRoomCode.textContent;
    if (code && code !== '----') {
      navigator.clipboard.writeText(code).then(() => {
        showToast(`Squad Frequency Code [${code}] copied to clipboard!`);
        SoundFX.keyPress();
      });
    }
  });

  // Role Selection
  DOM.roleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      initAudio();
      const role = btn.dataset.role;
      State.selectedRole = role;
      socket.emit('change_role', { role });
      SoundFX.keyPress();
    });
  });

  // Toggle Readiness
  DOM.btnToggleReady.addEventListener('click', () => {
    initAudio();
    socket.emit('toggle_ready');
    SoundFX.keyPress();
  });

  // Start Mission
  DOM.btnStartMission.addEventListener('click', () => {
    initAudio();
    SoundFX.keySubmit();
    socket.emit('start_mission');
  });

  // Keypad Number Buttons
  DOM.keyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      initAudio();
      const digit = btn.dataset.key;
      socket.emit('keypad_input', { digit });
    });
  });

  // Keypad Clear
  DOM.btnKeyClear.addEventListener('click', () => {
    initAudio();
    socket.emit('keypad_clear');
  });

  // Keypad Submit / Execute Defusal
  DOM.btnKeySubmit.addEventListener('click', () => {
    initAudio();
    socket.emit('keypad_submit');
  });

  // Scratchpad Auto-Tab & Helper
  [DOM.scratchD1, DOM.scratchD2, DOM.scratchD3, DOM.scratchD4].forEach((input, idx, arr) => {
    input.addEventListener('input', (e) => {
      initAudio();
      if (e.target.value.length === 1 && idx < arr.length - 1) {
        arr[idx + 1].focus();
      }
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && idx > 0) {
        arr[idx - 1].focus();
      }
    });
  });

  // Quick Tactical Pings
  DOM.pingButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      initAudio();
      const pingText = btn.dataset.ping;
      socket.emit('send_tactical_ping', { message: pingText, type: 'alert' });
    });
  });

  // Tactical Chat Transmission
  DOM.chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    initAudio();
    const msg = DOM.chatInput.value.trim();
    if (msg) {
      socket.emit('send_tactical_ping', { message: msg, type: 'chat' });
      DOM.chatInput.value = '';
    }
  });

  // Retry / Next Mission Handlers
  DOM.btnRetryFailed.addEventListener('click', () => {
    initAudio();
    socket.emit('restart_mission');
  });

  DOM.btnNextMission.addEventListener('click', () => {
    initAudio();
    socket.emit('restart_mission');
  });

  // Keyboard Event Listener for Bomb Keypad
  window.addEventListener('keydown', (e) => {
    // If typing in input fields (chat or callsign), ignore keypad shortcuts
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      return;
    }

    initAudio();

    if (/^[0-9]$/.test(e.key)) {
      socket.emit('keypad_input', { digit: e.key });
      // Add visual key press animation
      const btn = document.querySelector(`.key-btn[data-key="${e.key}"]`);
      if (btn) {
        btn.classList.add('active-press');
        setTimeout(() => btn.classList.remove('active-press'), 120);
      }
    } else if (e.key === 'Backspace') {
      socket.emit('keypad_clear');
      DOM.btnKeyClear.classList.add('active-press');
      setTimeout(() => DOM.btnKeyClear.classList.remove('active-press'), 120);
    } else if (e.key === 'Enter') {
      socket.emit('keypad_submit');
      DOM.btnKeySubmit.classList.add('active-press');
      setTimeout(() => DOM.btnKeySubmit.classList.remove('active-press'), 120);
    }
  });

  // Initialize Default View
  switchView('lobby');

})();
