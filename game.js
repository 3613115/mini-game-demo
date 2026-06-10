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
const heartElements = [...heartsElement.querySelectorAll('.heart')];

const PLAYER_WIDTH = 38;
const PLAYER_HEIGHT = 38;
const PLAYER_BOTTOM = 22;
const LEVEL_DURATION = 20000;
const DASH_COOLDOWN = 2200;
const DASH_TIME = 150;
const DASH_SPEED = 1060;
const BOOST_DURATION = 6500;
const BEST_SCORE_KEY = 'neon-drift-dodge-best-v6';
const LEGACY_BEST_SCORE_KEYS = ['neon-drift-dodge-best-v4', 'neon-drift-dodge-best-v3'];
const MAX_PARTICLES = 120;

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
  hudCache: {},
};

function readStoredNumber(key) {
  try {
    return Number(window.localStorage.getItem(key)) || 0;
  } catch (_error) {
    return 0;
  }
}

function readBestScore() {
  return Math.max(readStoredNumber(BEST_SCORE_KEY), ...LEGACY_BEST_SCORE_KEYS.map(readStoredNumber));
}

function saveBestScore(score) {
  try {
    window.localStorage.setItem(BEST_SCORE_KEY, String(score));
  } catch (_error) {
    // Storage can be unavailable in some privacy modes; the in-memory best still updates.
  }
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

function setTextIfChanged(element, value, cacheKey) {
  const text = String(value);
  if (state.hudCache[cacheKey] !== text) {
    element.textContent = text;
    state.hudCache[cacheKey] = text;
  }
}

function updatePlayerEffects(timestamp = performance.now()) {
  player.classList.toggle('has-shield', state.hasShield);
  player.classList.toggle('has-boost', timestamp < state.speedBoostUntil);
}

function updateHud(timestamp = performance.now()) {
  setTextIfChanged(scoreElement, state.score, 'score');
  setTextIfChanged(bestScoreElement, state.bestScore, 'bestScore');
  setTextIfChanged(levelElement, state.level, 'level');
  setTextIfChanged(comboElement, `x${state.combo}`, 'combo');

  if (state.hudCache.health !== state.health) {
    heartsElement.setAttribute('aria-label', `Health: ${state.health} hearts`);
    heartElements.forEach((heart, index) => {
      heart.classList.toggle('is-empty', index >= state.health);
    });
    state.hudCache.health = state.health;
  }

  setTextIfChanged(shieldStatusElement, state.hasShield ? 'Active' : 'Empty', 'shield');
  updatePlayerEffects(timestamp);

  const boostRemaining = Math.max(0, state.speedBoostUntil - timestamp);
  setTextIfChanged(speedStatusElement, boostRemaining > 0 ? `${Math.ceil(boostRemaining / 1000)}s` : 'Empty', 'boost');

  const dashRemaining = Math.max(0, state.dashReadyAt - timestamp);
  const dashProgress = 1 - clamp(dashRemaining / DASH_COOLDOWN, 0, 1);
  setTextIfChanged(dashStatusElement, dashRemaining === 0 ? 'Ready' : `${Math.ceil(dashRemaining / 1000)}s`, 'dash');

  const meterScale = dashProgress.toFixed(3);
  if (state.hudCache.dashMeter !== meterScale) {
    dashMeterElement.style.transform = `scaleX(${meterScale})`;
    state.hudCache.dashMeter = meterScale;
  }
}

function ensureAudioContext() {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) {
    return null;
  }

  if (!state.audioContext) {
    state.audioContext = new AudioContextConstructor();
  }
  if (state.audioContext.state === 'suspended') {
    state.audioContext.resume();
  }
  return state.audioContext;
}

function playSound(type) {
  if (state.muted) {
    return;
  }

  const settings = {
    collect: { wave: 'sine', start: 620, end: 1040, duration: 0.12, volume: 0.09 },
    boost: { wave: 'triangle', start: 520, end: 1240, duration: 0.18, volume: 0.1 },
    shield: { wave: 'triangle', start: 440, end: 880, duration: 0.22, volume: 0.1 },
    hit: { wave: 'sawtooth', start: 150, end: 65, duration: 0.18, volume: 0.13 },
    dash: { wave: 'square', start: 260, end: 520, duration: 0.1, volume: 0.08 },
    over: { wave: 'sawtooth', start: 180, end: 45, duration: 0.55, volume: 0.12 },
  }[type];

  if (!settings) {
    return;
  }

  const context = ensureAudioContext();
  if (!context) {
    return;
  }

  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const filter = context.createBiquadFilter();

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
    hazardDelay: clamp(820 - level * 46, 280, 820),
    orbDelay: clamp(1500 - level * 28, 920, 1500),
    hazardSpeed: 1 + (level - 1) * 0.11,
    waveDelay: clamp(8000 - level * 280, 3900, 8000),
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
  const width = type === 'line' ? randomBetween(72, Math.min(140, gameWidth * 0.32)) : randomBetween(34, 58);
  const height = type === 'line' ? randomBetween(16, 24) : randomBetween(34, 60);
  const x = randomBetween(0, Math.max(1, gameWidth - width));
  const speed = randomBetween(205, 315) * difficulty.hazardSpeed;
  const vx = type === 'diagonal' ? randomChoice([-1, 1]) * randomBetween(58, 100) : 0;
  const wave = type === 'wave' ? { wavePhase: randomBetween(0, Math.PI * 2), waveAmplitude: randomBetween(18, Math.min(40, gameWidth * 0.08)), waveSpeed: randomBetween(4, 7), startX: x } : {};
  spawnHazardAt(x, -height - 8, width, height, speed, `hazard ${type}`, vx, wave);
}

function addWarning(x, width, duration = 850) {
  if (width <= 1) {
    return null;
  }

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
  const count = clamp(4 + Math.floor(state.level / 2), 4, 8);
  const laneWidth = gameWidth / count;
  const gapIndex = Math.floor(Math.random() * count);

  for (let lane = 0; lane < count; lane += 1) {
    if (lane === gapIndex) {
      continue;
    }
    const width = Math.max(28, laneWidth - 12);
    const x = lane * laneWidth + 6;
    spawnHazardAt(x, -50, width, 22, (238 + state.level * 16) * difficulty.hazardSpeed, 'hazard line');
  }
}

function spawnDiagonalWave() {
  const difficulty = getDifficulty();
  const gameWidth = getGameWidth();
  const fromLeft = Math.random() > 0.5;
  const count = clamp(5 + Math.floor(state.level / 2), 5, 9);

  for (let index = 0; index < count; index += 1) {
    const width = 36;
    const x = fromLeft ? index * 56 - 40 : gameWidth - index * 56;
    const y = -70 - index * 44;
    const vx = fromLeft ? 76 : -76;
    spawnHazardAt(x, y, width, 42, (220 + state.level * 13) * difficulty.hazardSpeed, 'hazard diagonal', vx);
  }
}

function spawnWavePattern() {
  const difficulty = getDifficulty();
  const gameWidth = getGameWidth();
  const count = clamp(6 + Math.floor(state.level / 2), 6, 10);
  const spacing = gameWidth / count;

  for (let index = 0; index < count; index += 1) {
    const size = 32;
    const x = index * spacing + spacing / 2 - size / 2;
    const y = -70 - Math.sin(index * 0.9) * 45 - index * 18;
    spawnHazardAt(x, y, size, size, (210 + state.level * 14) * difficulty.hazardSpeed, 'hazard wave', 0, {
      wavePhase: index * 0.85,
      waveAmplitude: Math.min(26, gameWidth * 0.07),
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
    const width = Math.max(30, laneWidth - 10);
    const x = lane * laneWidth + 5;
    spawnHazardAt(x, -58, width, 26, (250 + state.level * 18) * difficulty.hazardSpeed, 'hazard line');
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
  const lanes = clamp(5 + Math.floor(state.level / 2), 5, 7);
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
  const orb = createFallingItem(`orb ${type}`, randomBetween(8, Math.max(8, gameWidth - size - 8)), -size - 8, size, size, randomBetween(130, 172) * difficulty.hazardSpeed, {
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
  const acceleration = boostActive ? 3450 : 2750;
  const deceleration = boostActive ? 4300 : 3700;
  const maxSpeed = boostActive ? 690 : 560;
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
    state.dashUntil = 0;
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
  createParticles(state.playerX, getGameHeight() - PLAYER_BOTTOM, '#23dcff', 12, 240);
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
      item.x = clamp(item.x, -item.width * 0.5, getGameWidth() - item.width * 0.5);
    }
  }

  item.renderX = item.x + (item.kind === 'orb' ? Math.sin((item.y + item.x) / 34) * 5 : 0);
  item.element.style.transform = `translate(${item.renderX}px, ${item.y}px)`;
}

function getPlayerRect() {
  return {
    x: state.playerX - PLAYER_WIDTH / 2 + 7,
    y: getGameHeight() - PLAYER_BOTTOM - PLAYER_HEIGHT + 8,
    width: PLAYER_WIDTH - 14,
    height: PLAYER_HEIGHT - 12,
  };
}

function getItemRect(item) {
  return { x: item.renderX ?? item.x, y: item.y, width: item.width, height: item.height };
}

function rectanglesOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function circlesOverlap(a, b) {
  const ax = a.x + a.width / 2;
  const ay = a.y + a.height / 2;
  const bx = b.x + b.width / 2;
  const by = b.y + b.height / 2;
  const radius = Math.min(a.width, a.height) * 0.4 + Math.min(b.width, b.height) * 0.4;
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

function trimParticles() {
  while (state.particles.length > MAX_PARTICLES) {
    const particle = state.particles.shift();
    particle.element.remove();
  }
}

function createParticles(x, y, color, count, power) {
  const availableSlots = Math.max(0, MAX_PARTICLES - state.particles.length);
  const particleCount = Math.min(count, availableSlots || Math.ceil(count / 2));

  for (let index = 0; index < particleCount; index += 1) {
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

  trimParticles();
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

    const lifeRatio = clamp(particle.life / particle.maxLife, 0, 1);
    particle.element.style.opacity = String(lifeRatio);
    particle.element.style.transform = `translate(${particle.x}px, ${particle.y}px) scale(${clamp(lifeRatio, 0.25, 1)})`;
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

function collectOrb(orb, timestamp) {
  const centerX = (orb.renderX ?? orb.x) + orb.width / 2;
  const centerY = orb.y + orb.height / 2;

  if (orb.orbType === 'shield') {
    state.hasShield = true;
    addScore(35 * getMultiplier());
    addComboStep(1);
    createParticles(centerX, centerY, orb.color, 20, 200);
    playSound('shield');
  } else if (orb.orbType === 'speed') {
    state.speedBoostUntil = timestamp + BOOST_DURATION;
    addScore(orb.value * getMultiplier());
    addComboStep(2);
    createParticles(centerX, centerY, orb.color, 22, 230);
    playSound('boost');
  } else {
    const earned = orb.value * getMultiplier();
    addScore(earned);
    addComboStep(1);
    createParticles(centerX, centerY, orb.color, 14, 170);
    playSound('collect');
  }

  updateHud(timestamp);
  orb.element.remove();
}

function triggerHitFeedback(x, y, timestamp, color = '#ff315f') {
  state.invulnerableUntil = timestamp + 1300;
  createParticles(x, y, color, 24, 260);
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

  const hitX = (hazard.renderX ?? hazard.x) + hazard.width / 2;
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
      collectOrb(orb, timestamp);
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

  if (timestamp - state.lastShieldSpawn >= 14000) {
    if (Math.random() > 0.4) {
      spawnOrb('shield');
    }
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

function resetInput() {
  Object.keys(keys).forEach((key) => { keys[key] = false; });
}

function resetRunState(now) {
  cancelAnimationFrame(state.animationId);
  window.clearInterval(state.countdownTimer);
  countdownElement.hidden = true;
  countdownElement.classList.remove('is-subtle');
  clearArena();
  resetInput();

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
  state.hudCache = {};
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
  state.lastHazardSpawn = now - 150;
  state.lastOrbSpawn = now;
  state.lastShieldSpawn = now;
  state.lastScoreTime = now;
  state.lastWaveTime = now + 1400;
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
  state.playerVelocity = 0;
  resetInput();
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
  resetInput();
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
  muteButton.setAttribute('aria-label', state.muted ? 'Sound muted' : 'Sound on');

  if (state.muted && state.audioContext?.state === 'running') {
    state.audioContext.suspend();
  }
}

window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);
window.addEventListener('blur', resetInput);
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
