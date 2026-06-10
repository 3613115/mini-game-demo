const gameArea = document.getElementById('gameArea');
const player = document.getElementById('player');
const scoreElement = document.getElementById('score');
const bestScoreElement = document.getElementById('bestScore');
const levelElement = document.getElementById('level');
const comboElement = document.getElementById('combo');
const heartsElement = document.getElementById('hearts');
const shieldStatusElement = document.getElementById('shieldStatus');
const speedStatusElement = document.getElementById('speedStatus');
const dashStatusElement = document.getElementById('dashStatus');
const dashMeterElement = document.getElementById('dashMeter');
const countdownElement = document.getElementById('countdown');
const startScreen = document.getElementById('startScreen');
const pauseScreen = document.getElementById('pauseScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreElement = document.getElementById('finalScore');
const finalBestScoreElement = document.getElementById('finalBestScore');
const finalLevelElement = document.getElementById('finalLevel');
const newBestMessage = document.getElementById('newBestMessage');
const levelToastElement = document.getElementById('levelToast');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const resumeButton = document.getElementById('resumeButton');
const muteButton = document.getElementById('muteButton');

const PLAYER_WIDTH = 38;
const PLAYER_HEIGHT = 38;
const PLAYER_BOTTOM = 22;
const LEVEL_DURATION = 20000;
const DASH_COOLDOWN = 2200;
const DASH_TIME = 150;
const DASH_SPEED = 1120;
const BOOST_DURATION = 6500;
const BEST_SCORE_KEY = 'neon-drift-dodge-best-v4';
const LEGACY_BEST_SCORE_KEY = 'neon-drift-dodge-best-v3';

const keys = {
  ArrowLeft: false,
  ArrowRight: false,
  KeyA: false,
  KeyD: false,
};

const state = {
  mode: 'title',
  animationId: 0,
  countdownTimer: 0,
  countdownValue: 3,
  playerX: 0,
  playerVelocity: 0,
  lastDirection: 1,
  score: 0,
  bestScore: readBestScore(),
  health: 3,
  combo: 1,
  level: 1,
  hasShield: false,
  speedBoostUntil: 0,
  dodgeStreak: 0,
  hazards: [],
  orbs: [],
  particles: [],
  warnings: [],
  pendingWaves: [],
  lastFrameTime: 0,
  startedAt: 0,
  lastHazardSpawn: 0,
  lastOrbSpawn: 0,
  lastShieldSpawn: 0,
  lastScoreTime: 0,
  lastWaveTime: 0,
  invulnerableUntil: 0,
  dashReadyAt: 0,
  dashUntil: 0,
  dashDirection: 1,
  pausedAt: 0,
  muted: false,
  audioContext: null,
};

function readBestScore() {
  return Number(localStorage.getItem(BEST_SCORE_KEY)) || Number(localStorage.getItem(LEGACY_BEST_SCORE_KEY)) || 0;
}

function saveBestScore(score) {
  localStorage.setItem(BEST_SCORE_KEY, String(score));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomChoice(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function getGameWidth() {
  return gameArea.clientWidth;
}

function getGameHeight() {
  return gameArea.clientHeight;
}

function setPlayerPosition() {
  player.style.transform = `translate(${state.playerX - PLAYER_WIDTH / 2}px, 0)`;
}

function resetPlayerPosition() {
  state.playerX = getGameWidth() / 2;
  state.playerVelocity = 0;
  setPlayerPosition();
}

function updateHud(timestamp = performance.now()) {
  scoreElement.textContent = state.score;
  bestScoreElement.textContent = state.bestScore;
  levelElement.textContent = state.level;
  comboElement.textContent = `x${state.combo}`;
  heartsElement.setAttribute('aria-label', `Health: ${state.health} hearts`);
  [...heartsElement.querySelectorAll('.heart')].forEach((heart, index) => {
    heart.classList.toggle('is-empty', index >= state.health);
  });

  shieldStatusElement.textContent = state.hasShield ? 'Active' : 'Empty';
  player.classList.toggle('has-shield', state.hasShield);

  const boostRemaining = Math.max(0, state.speedBoostUntil - timestamp);
  speedStatusElement.textContent = boostRemaining > 0 ? `${Math.ceil(boostRemaining / 1000)}s` : 'Empty';
  player.classList.toggle('has-boost', boostRemaining > 0);

  const dashRemaining = Math.max(0, state.dashReadyAt - timestamp);
  const dashProgress = 1 - clamp(dashRemaining / DASH_COOLDOWN, 0, 1);
  dashStatusElement.textContent = dashRemaining === 0 ? 'Ready' : `${Math.ceil(dashRemaining / 1000)}s`;
  dashMeterElement.style.transform = `scaleX(${dashProgress})`;
}

function ensureAudioContext() {
  if (!state.audioContext) {
    state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (state.audioContext.state === 'suspended') {
    state.audioContext.resume();
  }
}

function playSound(type) {
  if (state.muted) {
    return;
  }

  ensureAudioContext();
  const context = state.audioContext;
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const filter = context.createBiquadFilter();

  const settings = {
    collect: { wave: 'sine', start: 620, end: 1040, duration: 0.12, volume: 0.09 },
    boost: { wave: 'triangle', start: 520, end: 1240, duration: 0.18, volume: 0.1 },
    shield: { wave: 'triangle', start: 440, end: 880, duration: 0.22, volume: 0.1 },
    hit: { wave: 'sawtooth', start: 150, end: 65, duration: 0.18, volume: 0.13 },
    dash: { wave: 'square', start: 260, end: 520, duration: 0.1, volume: 0.08 },
    over: { wave: 'sawtooth', start: 180, end: 45, duration: 0.55, volume: 0.12 },
  }[type];

  oscillator.type = settings.wave;
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1800, now);
  oscillator.frequency.setValueAtTime(settings.start, now);
  oscillator.frequency.exponentialRampToValueAtTime(settings.end, now + settings.duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(settings.volume, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + settings.duration);

  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + settings.duration + 0.03);
}

function getDifficulty() {
  const level = state.level;
  return {
    hazardDelay: clamp(780 - level * 52, 250, 780),
    orbDelay: clamp(1550 - level * 35, 900, 1550),
    hazardSpeed: 1 + (level - 1) * 0.13,
    waveDelay: clamp(7600 - level * 320, 3600, 7600),
  };
}

function createFallingItem(className, x, y, width, height, fallSpeed, extra = {}) {
  const element = document.createElement('div');
  element.className = className;
  element.style.width = `${width}px`;
  element.style.height = `${height}px`;
  element.style.transform = `translate(${x}px, ${y}px)`;
  gameArea.appendChild(element);
  return { element, x, y, width, height, fallSpeed, vx: 0, ...extra };
}

function spawnHazardAt(x, y, width, height, speed, className = 'hazard block', vx = 0, extra = {}) {
  const hazard = createFallingItem(className, x, y, width, height, speed, { kind: 'hazard', vx, scored: false, ...extra });
  state.hazards.push(hazard);
  return hazard;
}

function spawnSingleHazard() {
  const difficulty = getDifficulty();
  const gameWidth = getGameWidth();
  const type = randomChoice(['block', 'line', 'diagonal', 'wave']);
  const width = type === 'line' ? randomBetween(80, 150) : randomBetween(34, 62);
  const height = type === 'line' ? randomBetween(16, 26) : randomBetween(34, 66);
  const x = randomBetween(0, Math.max(1, gameWidth - width));
  const speed = randomBetween(210, 330) * difficulty.hazardSpeed;
  const vx = type === 'diagonal' ? randomChoice([-1, 1]) * randomBetween(65, 115) : 0;
  const wave = type === 'wave' ? { wavePhase: randomBetween(0, Math.PI * 2), waveAmplitude: randomBetween(22, 46), waveSpeed: randomBetween(4, 7), startX: x } : {};
  spawnHazardAt(x, -height - 8, width, height, speed, `hazard ${type}`, vx, wave);
}

function addWarning(x, width, duration = 850) {
  const warning = document.createElement('div');
  warning.className = 'warning-lane';
  warning.style.left = `${x}px`;
  warning.style.width = `${width}px`;
  gameArea.appendChild(warning);
  const item = { element: warning, removeAt: performance.now() + duration };
  state.warnings.push(item);
  return item;
}

function spawnLineWave() {
  const difficulty = getDifficulty();
  const gameWidth = getGameWidth();
  const count = clamp(4 + Math.floor(state.level / 2), 4, 9);
  const laneWidth = gameWidth / count;
  const gapIndex = Math.floor(Math.random() * count);

  for (let lane = 0; lane < count; lane += 1) {
    if (lane === gapIndex) {
      continue;
    }
    const width = Math.max(30, laneWidth - 10);
    const x = lane * laneWidth + 5;
    spawnHazardAt(x, -50, width, 24, (250 + state.level * 18) * difficulty.hazardSpeed, 'hazard line');
  }
}

function spawnDiagonalWave() {
  const difficulty = getDifficulty();
  const gameWidth = getGameWidth();
  const fromLeft = Math.random() > 0.5;
  const count = clamp(5 + Math.floor(state.level / 2), 5, 10);

  for (let index = 0; index < count; index += 1) {
    const width = 38;
    const x = fromLeft ? index * 58 - 40 : gameWidth - index * 58;
    const y = -70 - index * 42;
    const vx = fromLeft ? 84 : -84;
    spawnHazardAt(x, y, width, 44, (230 + state.level * 14) * difficulty.hazardSpeed, 'hazard diagonal', vx);
  }
}

function spawnWavePattern() {
  const difficulty = getDifficulty();
  const gameWidth = getGameWidth();
  const count = clamp(6 + Math.floor(state.level / 2), 6, 11);
  const spacing = gameWidth / count;

  for (let index = 0; index < count; index += 1) {
    const size = 34;
    const x = index * spacing + spacing / 2 - size / 2;
    const y = -70 - Math.sin(index * 0.9) * 45 - index * 18;
    spawnHazardAt(x, y, size, size, (220 + state.level * 16) * difficulty.hazardSpeed, 'hazard wave', 0, {
      wavePhase: index * 0.85,
      waveAmplitude: 30,
      waveSpeed: 5,
      startX: x,
    });
  }
}

function spawnGapWave(lanes, gapIndex) {
  const difficulty = getDifficulty();
  const gameWidth = getGameWidth();
  const laneWidth = gameWidth / lanes;

  for (let lane = 0; lane < lanes; lane += 1) {
    if (lane === gapIndex) {
      continue;
    }
    const width = Math.max(32, laneWidth - 8);
    const x = lane * laneWidth + 4;
    spawnHazardAt(x, -58, width, 28, (265 + state.level * 20) * difficulty.hazardSpeed, 'hazard line');
  }
}

function scheduleWave(spawnFunction, delay) {
  state.pendingWaves.push({
    executeAt: performance.now() + delay,
    spawnFunction,
  });
}

function spawnGapWaveWithWarning() {
  const gameWidth = getGameWidth();
  const lanes = clamp(5 + Math.floor(state.level / 2), 5, 8);
  const laneWidth = gameWidth / lanes;
  const gapIndex = Math.floor(Math.random() * lanes);
  const gapX = gapIndex * laneWidth;

  addWarning(0, gapX, 900);
  addWarning(gapX + laneWidth, Math.max(0, gameWidth - gapX - laneWidth), 900);
  scheduleWave(() => spawnGapWave(lanes, gapIndex), 850);
}

function spawnDangerWave() {
  if (state.level < 2) {
    spawnLineWave();
    return;
  }

  const pattern = randomChoice(['line', 'diagonal', 'gap', 'wave']);
  if (pattern === 'diagonal') {
    addWarning(0, getGameWidth(), 750);
    scheduleWave(spawnDiagonalWave, 700);
  } else if (pattern === 'gap') {
    spawnGapWaveWithWarning();
  } else if (pattern === 'wave') {
    addWarning(0, getGameWidth(), 750);
    scheduleWave(spawnWavePattern, 700);
  } else {
    addWarning(0, getGameWidth(), 750);
    scheduleWave(spawnLineWave, 700);
  }
}

function spawnOrb(kind = null) {
  const difficulty = getDifficulty();
  const gameWidth = getGameWidth();
  const type = kind || randomChoice(['energy', 'energy', 'bonus', 'speed']);
  const size = type === 'shield' ? 30 : type === 'bonus' ? 24 : type === 'speed' ? 26 : 22;
  const orb = createFallingItem(`orb ${type}`, randomBetween(6, gameWidth - size - 6), -size - 8, size, size, randomBetween(135, 180) * difficulty.hazardSpeed, {
    kind: 'orb',
    orbType: type,
    value: type === 'bonus' ? 40 : type === 'speed' ? 30 : 20,
    color: type === 'shield' ? '#44ffc8' : type === 'speed' ? '#b967ff' : type === 'bonus' ? '#23dcff' : '#ffe46b',
  });
  state.orbs.push(orb);
}

function removeElementList(list) {
  list.forEach((item) => item.element.remove());
  list.length = 0;
}

function clearArena() {
  removeElementList(state.hazards);
  removeElementList(state.orbs);
  removeElementList(state.particles);
  removeElementList(state.warnings);
  state.pendingWaves.length = 0;
  gameArea.querySelectorAll('.hazard, .orb, .particle, .warning-lane').forEach((element) => element.remove());
  levelToastElement.hidden = true;
  levelToastElement.classList.remove('is-visible');
}

function addScore(points) {
  state.score += Math.round(points);
  state.bestScore = Math.max(state.bestScore, state.score);
  updateHud();
}

function getMultiplier() {
  return clamp(state.combo, 1, 12);
}

function addComboStep(amount = 1) {
  state.combo = clamp(state.combo + amount, 1, 12);
}

function updatePlayer(deltaSeconds, timestamp) {
  const moveLeft = keys.ArrowLeft || keys.KeyA;
  const moveRight = keys.ArrowRight || keys.KeyD;
  const direction = Number(moveRight) - Number(moveLeft);
  const boostActive = timestamp < state.speedBoostUntil;
  const acceleration = boostActive ? 3600 : 2850;
  const deceleration = boostActive ? 4200 : 3600;
  const maxSpeed = boostActive ? 720 : 580;
  const halfWidth = PLAYER_WIDTH / 2;

  if (direction !== 0) {
    state.lastDirection = direction;
  }

  if (timestamp < state.dashUntil) {
    state.playerVelocity = state.dashDirection * DASH_SPEED;
  } else {
    player.classList.remove('is-dashing');
    if (direction !== 0) {
      state.playerVelocity += direction * acceleration * deltaSeconds;
    } else if (state.playerVelocity > 0) {
      state.playerVelocity = Math.max(0, state.playerVelocity - deceleration * deltaSeconds);
    } else if (state.playerVelocity < 0) {
      state.playerVelocity = Math.min(0, state.playerVelocity + deceleration * deltaSeconds);
    }
    state.playerVelocity = clamp(state.playerVelocity, -maxSpeed, maxSpeed);
  }

  state.playerX += state.playerVelocity * deltaSeconds;

  if (state.playerX < halfWidth || state.playerX > getGameWidth() - halfWidth) {
    state.playerX = clamp(state.playerX, halfWidth, getGameWidth() - halfWidth);
    state.playerVelocity = 0;
  }

  setPlayerPosition();
}

function startDash(timestamp) {
  if (state.mode !== 'playing' || timestamp < state.dashReadyAt) {
    return;
  }

  state.dashDirection = state.lastDirection || 1;
  state.dashUntil = timestamp + DASH_TIME;
  state.dashReadyAt = timestamp + DASH_COOLDOWN;
  player.classList.add('is-dashing');
  createParticles(state.playerX, getGameHeight() - PLAYER_BOTTOM, '#23dcff', 14, 260);
  playSound('dash');
  updateHud(timestamp);
}

function moveItem(item, deltaSeconds) {
  item.y += item.fallSpeed * deltaSeconds;
  item.x += (item.vx || 0) * deltaSeconds;

  if (item.waveAmplitude) {
    item.x = item.startX + Math.sin(item.y / 52 + item.wavePhase) * item.waveAmplitude;
  }

  if (item.kind === 'hazard' && item.vx) {
    if (item.x < -item.width * 0.5 || item.x > getGameWidth() - item.width * 0.5) {
      item.vx *= -1;
    }
  }

  const sway = item.kind === 'orb' ? Math.sin((item.y + item.x) / 34) * 5 : 0;
  item.element.style.transform = `translate(${item.x + sway}px, ${item.y}px)`;
}

function getPlayerRect() {
  return {
    x: state.playerX - PLAYER_WIDTH / 2 + 6,
    y: getGameHeight() - PLAYER_BOTTOM - PLAYER_HEIGHT + 7,
    width: PLAYER_WIDTH - 12,
    height: PLAYER_HEIGHT - 10,
  };
}

function getItemRect(item) {
  return { x: item.x, y: item.y, width: item.width, height: item.height };
}

function rectanglesOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function circlesOverlap(a, b) {
  const ax = a.x + a.width / 2;
  const ay = a.y + a.height / 2;
  const bx = b.x + b.width / 2;
  const by = b.y + b.height / 2;
  const radius = Math.min(a.width, a.height) * 0.42 + Math.min(b.width, b.height) * 0.42;
  return Math.hypot(ax - bx, ay - by) < radius;
}

function playerCollidesWith(item) {
  const playerRect = getPlayerRect();
  const itemRect = getItemRect(item);
  if (!rectanglesOverlap(playerRect, itemRect)) {
    return false;
  }
  return item.kind === 'orb' || circlesOverlap(playerRect, itemRect);
}

function createParticles(x, y, color, count, power) {
  for (let index = 0; index < count; index += 1) {
    const particle = document.createElement('div');
    const angle = randomBetween(0, Math.PI * 2);
    const speed = randomBetween(power * 0.45, power);
    const size = randomBetween(4, 10);

    particle.className = 'particle';
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.background = color;
    particle.style.boxShadow = `0 0 14px ${color}`;
    particle.style.transform = `translate(${x}px, ${y}px)`;
    gameArea.appendChild(particle);

    state.particles.push({
      element: particle,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: randomBetween(0.35, 0.75),
      maxLife: 0.75,
    });
  }
}

function updateParticles(deltaSeconds) {
  state.particles = state.particles.filter((particle) => {
    particle.life -= deltaSeconds;
    particle.x += particle.vx * deltaSeconds;
    particle.y += particle.vy * deltaSeconds;
    particle.vy += 180 * deltaSeconds;

    if (particle.life <= 0) {
      particle.element.remove();
      return false;
    }

    particle.element.style.opacity = String(clamp(particle.life / particle.maxLife, 0, 1));
    particle.element.style.transform = `translate(${particle.x}px, ${particle.y}px) scale(${clamp(particle.life / particle.maxLife, 0.25, 1)})`;
    return true;
  });
}

function updateWarnings(timestamp) {
  state.warnings = state.warnings.filter((warning) => {
    if (timestamp >= warning.removeAt) {
      warning.element.remove();
      return false;
    }
    return true;
  });
}

function updatePendingWaves(timestamp) {
  state.pendingWaves = state.pendingWaves.filter((wave) => {
    if (timestamp >= wave.executeAt) {
      wave.spawnFunction();
      return false;
    }
    return true;
  });
}

function collectOrb(orb) {
  const centerX = orb.x + orb.width / 2;
  const centerY = orb.y + orb.height / 2;

  if (orb.orbType === 'shield') {
    state.hasShield = true;
    addScore(35 * getMultiplier());
    addComboStep(1);
    createParticles(centerX, centerY, orb.color, 22, 210);
    playSound('shield');
  } else if (orb.orbType === 'speed') {
    state.speedBoostUntil = performance.now() + BOOST_DURATION;
    addScore(orb.value * getMultiplier());
    addComboStep(2);
    createParticles(centerX, centerY, orb.color, 24, 245);
    playSound('boost');
  } else {
    const earned = orb.value * getMultiplier();
    addScore(earned);
    addComboStep(1);
    createParticles(centerX, centerY, orb.color, 16, 185);
    playSound('collect');
  }

  updateHud();
  orb.element.remove();
}

function triggerHitFeedback(x, y, timestamp, color = '#ff315f') {
  state.invulnerableUntil = timestamp + 1300;
  createParticles(x, y, color, 26, 280);
  player.classList.remove('is-hit');
  gameArea.classList.remove('is-shaking');
  void player.offsetWidth;
  player.classList.add('is-hit');
  gameArea.classList.add('is-shaking');
  window.setTimeout(() => gameArea.classList.remove('is-shaking'), 440);
  window.setTimeout(() => {
    if (performance.now() >= state.invulnerableUntil) {
      player.classList.remove('is-hit');
    }
  }, 1320);
}

function hitPlayer(hazard, timestamp) {
  if (timestamp < state.invulnerableUntil) {
    return;
  }

  const hitX = hazard.x + hazard.width / 2;
  const hitY = hazard.y + hazard.height / 2;

  if (state.hasShield) {
    state.hasShield = false;
    state.combo = 1;
    state.dodgeStreak = 0;
    triggerHitFeedback(hitX, hitY, timestamp, '#44ffc8');
    playSound('shield');
    updateHud(timestamp);
    return;
  }

  state.health -= 1;
  state.combo = 1;
  state.dodgeStreak = 0;
  triggerHitFeedback(hitX, hitY, timestamp);
  playSound('hit');
  updateHud(timestamp);

  if (state.health <= 0) {
    endGame();
  }
}

function updateFallingItems(deltaSeconds, timestamp) {
  const playerRect = getPlayerRect();
  const gameHeight = getGameHeight();

  state.hazards = state.hazards.filter((hazard) => {
    moveItem(hazard, deltaSeconds);

    if (playerCollidesWith(hazard)) {
      hitPlayer(hazard, timestamp);
      hazard.element.remove();
      return false;
    }

    if (!hazard.scored && hazard.y > playerRect.y + playerRect.height) {
      hazard.scored = true;
      state.dodgeStreak += 1;
      if (state.dodgeStreak % 4 === 0) {
        addComboStep(1);
        addScore(8 * getMultiplier());
      }
    }

    if (hazard.y > gameHeight + hazard.height) {
      hazard.element.remove();
      return false;
    }

    return true;
  });

  state.orbs = state.orbs.filter((orb) => {
    moveItem(orb, deltaSeconds);

    if (playerCollidesWith(orb)) {
      collectOrb(orb);
      return false;
    }

    if (orb.y > gameHeight + orb.height) {
      orb.element.remove();
      return false;
    }

    return true;
  });
}

function updateLevel(timestamp) {
  const nextLevel = Math.floor((timestamp - state.startedAt) / LEVEL_DURATION) + 1;
  if (nextLevel !== state.level) {
    state.level = nextLevel;
    addScore(100 * state.level);
    showLevelToast();
  }
}

function showLevelToast() {
  levelToastElement.textContent = `Level ${state.level}`;
  levelToastElement.hidden = false;
  levelToastElement.classList.remove('is-visible');
  void levelToastElement.offsetWidth;
  levelToastElement.classList.add('is-visible');
  window.setTimeout(() => {
    levelToastElement.classList.remove('is-visible');
    if (state.mode !== 'playing') {
      levelToastElement.hidden = true;
    }
  }, 1200);
}

function updateScoreOverTime(timestamp) {
  if (timestamp - state.lastScoreTime >= 1000) {
    addScore(state.level * getMultiplier());
    state.lastScoreTime = timestamp;
  }
}

function gameLoop(timestamp) {
  if (state.mode !== 'playing') {
    return;
  }

  if (!state.lastFrameTime) {
    state.lastFrameTime = timestamp;
  }

  const deltaSeconds = Math.min((timestamp - state.lastFrameTime) / 1000, 0.033);
  const difficulty = getDifficulty();
  state.lastFrameTime = timestamp;

  updateLevel(timestamp);
  updatePlayer(deltaSeconds, timestamp);
  updateScoreOverTime(timestamp);
  updateHud(timestamp);

  if (timestamp - state.lastHazardSpawn >= difficulty.hazardDelay) {
    spawnSingleHazard();
    state.lastHazardSpawn = timestamp;
  }

  if (timestamp - state.lastWaveTime >= difficulty.waveDelay) {
    spawnDangerWave();
    state.lastWaveTime = timestamp;
  }

  if (timestamp - state.lastOrbSpawn >= difficulty.orbDelay) {
    spawnOrb();
    state.lastOrbSpawn = timestamp;
  }

  if (timestamp - state.lastShieldSpawn >= 14000 && Math.random() > 0.4) {
    spawnOrb('shield');
    state.lastShieldSpawn = timestamp;
  }

  updateWarnings(timestamp);
  updatePendingWaves(timestamp);
  updateFallingItems(deltaSeconds, timestamp);
  updateParticles(deltaSeconds);

  if (state.mode === 'playing') {
    state.animationId = requestAnimationFrame(gameLoop);
  }
}

function hideOverlays() {
  startScreen.classList.remove('is-visible');
  pauseScreen.classList.remove('is-visible');
  gameOverScreen.classList.remove('is-visible');
}

function beginCountdown() {
  hideOverlays();
  state.mode = 'countdown';
  state.countdownValue = 3;
  countdownElement.hidden = false;
  countdownElement.classList.remove('is-subtle');
  countdownElement.textContent = '3';

  window.clearInterval(state.countdownTimer);
  state.countdownTimer = window.setInterval(() => {
    state.countdownValue -= 1;
    if (state.countdownValue > 0) {
      countdownElement.classList.remove('is-subtle');
      countdownElement.textContent = String(state.countdownValue);
      return;
    }

    if (state.countdownValue === 0) {
      countdownElement.textContent = 'oeeco';
      countdownElement.classList.add('is-subtle');
      return;
    }

    window.clearInterval(state.countdownTimer);
    countdownElement.hidden = true;
    countdownElement.classList.remove('is-subtle');
    startPlaying();
  }, 760);
}

function resetRunState(now) {
  cancelAnimationFrame(state.animationId);
  window.clearInterval(state.countdownTimer);
  clearArena();
  Object.keys(keys).forEach((key) => { keys[key] = false; });

  state.lastFrameTime = 0;
  state.lastHazardSpawn = now;
  state.lastOrbSpawn = now;
  state.lastShieldSpawn = now;
  state.lastScoreTime = now;
  state.lastWaveTime = now + 1500;
  state.startedAt = now;
  state.score = 0;
  state.health = 3;
  state.combo = 1;
  state.level = 1;
  state.hasShield = false;
  state.speedBoostUntil = 0;
  state.dodgeStreak = 0;
  state.invulnerableUntil = now + 1200;
  state.dashReadyAt = now;
  state.dashUntil = 0;
  state.pausedAt = 0;
  newBestMessage.hidden = true;
  player.classList.remove('is-hit', 'is-dashing', 'has-shield', 'has-boost');
  gameArea.classList.remove('is-shaking');
  resetPlayerPosition();
  updateHud(now);
}

function startGame() {
  ensureAudioContext();
  const now = performance.now();
  resetRunState(now);
  beginCountdown();
}

function startPlaying() {
  const now = performance.now();
  state.mode = 'playing';
  state.startedAt = now;
  state.lastHazardSpawn = now - 250;
  state.lastOrbSpawn = now;
  state.lastShieldSpawn = now;
  state.lastScoreTime = now;
  state.lastWaveTime = now + 1200;
  state.invulnerableUntil = now + 1200;
  state.lastFrameTime = 0;
  state.animationId = requestAnimationFrame(gameLoop);
}

function pauseGame() {
  if (state.mode !== 'playing') {
    return;
  }

  state.mode = 'paused';
  state.pausedAt = performance.now();
  cancelAnimationFrame(state.animationId);
  pauseScreen.classList.add('is-visible');
}

function resumeGame() {
  if (state.mode !== 'paused') {
    return;
  }

  const now = performance.now();
  const pausedDuration = now - state.pausedAt;

  state.startedAt += pausedDuration;
  state.lastHazardSpawn += pausedDuration;
  state.lastOrbSpawn += pausedDuration;
  state.lastShieldSpawn += pausedDuration;
  state.lastScoreTime += pausedDuration;
  state.lastWaveTime += pausedDuration;
  state.invulnerableUntil += pausedDuration;
  state.dashReadyAt += pausedDuration;
  state.dashUntil += pausedDuration;
  state.speedBoostUntil += pausedDuration;
  state.warnings.forEach((warning) => { warning.removeAt += pausedDuration; });
  state.pendingWaves.forEach((wave) => { wave.executeAt += pausedDuration; });
  state.pausedAt = 0;
  state.mode = 'playing';
  state.lastFrameTime = 0;
  pauseScreen.classList.remove('is-visible');
  state.animationId = requestAnimationFrame(gameLoop);
}

function togglePause() {
  if (state.mode === 'playing') {
    pauseGame();
  } else if (state.mode === 'paused') {
    resumeGame();
  }
}

function endGame() {
  if (state.mode === 'gameover') {
    return;
  }

  state.mode = 'gameover';
  cancelAnimationFrame(state.animationId);
  playSound('over');

  const previousBest = readBestScore();
  const isNewBest = state.score > previousBest;
  if (isNewBest) {
    state.bestScore = state.score;
    saveBestScore(state.bestScore);
  } else {
    state.bestScore = Math.max(previousBest, state.bestScore);
  }

  finalScoreElement.textContent = state.score;
  finalBestScoreElement.textContent = state.bestScore;
  finalLevelElement.textContent = state.level;
  newBestMessage.hidden = !isNewBest;
  updateHud();
  gameOverScreen.classList.add('is-visible');
}

function handleKeyDown(event) {
  if (event.code === 'KeyP') {
    event.preventDefault();
    if (!event.repeat) togglePause();
    return;
  }

  if (event.code === 'Space') {
    event.preventDefault();
    if (!event.repeat) startDash(performance.now());
    return;
  }

  if (event.code in keys) {
    event.preventDefault();
    keys[event.code] = true;
  }
}

function handleKeyUp(event) {
  if (event.code in keys) {
    event.preventDefault();
    keys[event.code] = false;
  }
}

function toggleMute() {
  state.muted = !state.muted;
  muteButton.textContent = state.muted ? 'Muted' : 'Sound On';
  muteButton.setAttribute('aria-pressed', String(state.muted));
}

window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);
window.addEventListener('resize', () => {
  state.playerX = clamp(state.playerX || getGameWidth() / 2, PLAYER_WIDTH / 2, getGameWidth() - PLAYER_WIDTH / 2);
  setPlayerPosition();
});
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
resumeButton.addEventListener('click', resumeGame);
muteButton.addEventListener('click', toggleMute);

bestScoreElement.textContent = state.bestScore;
finalBestScoreElement.textContent = state.bestScore;
resetPlayerPosition();
updateHud();
