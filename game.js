const gameArea = document.getElementById('gameArea');
const player = document.getElementById('player');
const scoreElement = document.getElementById('score');
const bestScoreElement = document.getElementById('bestScore');
const finalScoreElement = document.getElementById('finalScore');
const finalBestScoreElement = document.getElementById('finalBestScore');
const comboElement = document.getElementById('combo');
const threatLevelElement = document.getElementById('threatLevel');
const heartsElement = document.getElementById('hearts');
const startScreen = document.getElementById('startScreen');
const pauseScreen = document.getElementById('pauseScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const newBestMessage = document.getElementById('newBestMessage');
const startButton = document.getElementById('startButton');
const resumeButton = document.getElementById('resumeButton');
const restartButton = document.getElementById('restartButton');

const BEST_SCORE_KEY = 'neon-drift-dodge-best-score';
const PLAYER_WIDTH = 38;
const PLAYER_HEIGHT = 38;
const PLAYER_BOTTOM = 28;

const hazardTypes = [
  { className: 'normal', width: 34, height: 34, speed: 1, points: 0 },
  { className: 'fast', width: 18, height: 58, speed: 1.55, points: 0 },
  { className: 'large', width: 68, height: 68, speed: 0.68, points: 0 },
];

const orbTypes = [
  { className: 'blue', size: 24, value: 15, speed: 0.92, color: '#23dcff' },
  { className: 'yellow', size: 22, value: 25, speed: 1.05, color: '#ffe46b' },
];

const keys = {
  ArrowLeft: false,
  ArrowRight: false,
  KeyA: false,
  KeyD: false,
};

const state = {
  mode: 'title',
  animationId: null,
  lastFrameTime: 0,
  lastHazardSpawn: 0,
  lastOrbSpawn: 0,
  lastScoreTime: 0,
  startedAt: 0,
  score: 0,
  bestScore: readBestScore(),
  health: 3,
  combo: 1,
  threatLevel: 1,
  playerX: 0,
  playerVelocity: 0,
  invulnerableUntil: 0,
  pausedAt: 0,
  hazards: [],
  orbs: [],
  particles: [],
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function readBestScore() {
  return Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
}

function saveBestScore(score) {
  localStorage.setItem(BEST_SCORE_KEY, String(score));
}

function getGameWidth() {
  return gameArea.clientWidth;
}

function getGameHeight() {
  return gameArea.clientHeight;
}

function getPlayerTop() {
  return getGameHeight() - PLAYER_BOTTOM - PLAYER_HEIGHT;
}

function updateHud() {
  scoreElement.textContent = state.score;
  bestScoreElement.textContent = state.bestScore;
  comboElement.textContent = `x${state.combo}`;
  threatLevelElement.textContent = state.threatLevel;

  [...heartsElement.querySelectorAll('.heart')].forEach((heart, index) => {
    heart.classList.toggle('is-empty', index >= state.health);
  });
  heartsElement.setAttribute('aria-label', `Health: ${state.health} hearts`);
}

function setPlayerPosition() {
  player.style.left = `${state.playerX}px`;
}

function resetPlayerPosition() {
  const halfWidth = PLAYER_WIDTH / 2;
  state.playerX = clamp(getGameWidth() / 2, halfWidth, getGameWidth() - halfWidth);
  state.playerVelocity = 0;
  setPlayerPosition();
}

function getPlayerRect() {
  return {
    left: state.playerX - PLAYER_WIDTH / 2 + 5,
    right: state.playerX + PLAYER_WIDTH / 2 - 5,
    top: getPlayerTop() + 4,
    bottom: getPlayerTop() + PLAYER_HEIGHT - 2,
  };
}

function getItemRect(item) {
  return {
    left: item.x,
    right: item.x + item.width,
    top: item.y,
    bottom: item.y + item.height,
  };
}

function rectanglesOverlap(rectA, rectB) {
  return (
    rectA.left < rectB.right &&
    rectA.right > rectB.left &&
    rectA.top < rectB.bottom &&
    rectA.bottom > rectB.top
  );
}

function getDifficulty(timestamp) {
  const elapsedSeconds = (timestamp - state.startedAt) / 1000;
  const level = Math.floor(elapsedSeconds / 12) + 1;
  return {
    elapsedSeconds,
    level,
    speedMultiplier: 1 + elapsedSeconds * 0.018,
    hazardDelay: Math.max(280, 820 - elapsedSeconds * 18),
    orbDelay: Math.max(680, 1500 - elapsedSeconds * 10),
  };
}

function chooseHazardType() {
  const roll = Math.random();

  if (roll < 0.48) {
    return hazardTypes[0];
  }

  if (roll < 0.78) {
    return hazardTypes[1];
  }

  return hazardTypes[2];
}

function createFallingItem(type, kind) {
  const element = document.createElement('div');
  const width = type.width || type.size;
  const height = type.height || type.size;
  const maxX = Math.max(0, getGameWidth() - width);
  const x = randomBetween(0, maxX);
  const y = -height - 8;

  element.className = kind === 'hazard' ? `hazard ${type.className}` : `orb ${type.className}`;
  element.style.width = `${width}px`;
  element.style.height = `${height}px`;
  element.style.transform = `translate(${x}px, ${y}px)`;
  gameArea.appendChild(element);

  return {
    element,
    kind,
    x,
    y,
    width,
    height,
    speed: type.speed,
    value: type.value || 0,
    color: type.color || '#ff315f',
  };
}

function spawnHazard(timestamp) {
  const difficulty = getDifficulty(timestamp);
  const hazard = createFallingItem(chooseHazardType(), 'hazard');
  hazard.fallSpeed = randomBetween(170, 215) * hazard.speed * difficulty.speedMultiplier;
  state.hazards.push(hazard);
}

function spawnOrb(timestamp) {
  const difficulty = getDifficulty(timestamp);
  const type = Math.random() < 0.68 ? orbTypes[0] : orbTypes[1];
  const orb = createFallingItem(type, 'orb');
  orb.fallSpeed = randomBetween(125, 165) * orb.speed * difficulty.speedMultiplier;
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
  gameArea.querySelectorAll('.hazard, .orb, .particle').forEach((element) => element.remove());
}

function addScore(points) {
  state.score += points;
  if (state.score > state.bestScore) {
    state.bestScore = state.score;
  }
  updateHud();
}

function updatePlayer(deltaSeconds) {
  const moveLeft = keys.ArrowLeft || keys.KeyA;
  const moveRight = keys.ArrowRight || keys.KeyD;
  const direction = Number(moveRight) - Number(moveLeft);
  const acceleration = 2400;
  const friction = direction === 0 ? 0.84 : 0.93;
  const maxSpeed = 560;
  const halfWidth = PLAYER_WIDTH / 2;

  state.playerVelocity += direction * acceleration * deltaSeconds;
  state.playerVelocity *= friction;
  state.playerVelocity = clamp(state.playerVelocity, -maxSpeed, maxSpeed);
  state.playerX += state.playerVelocity * deltaSeconds;

  if (state.playerX < halfWidth || state.playerX > getGameWidth() - halfWidth) {
    state.playerX = clamp(state.playerX, halfWidth, getGameWidth() - halfWidth);
    state.playerVelocity = 0;
  }

  setPlayerPosition();
}

function moveItem(item, deltaSeconds) {
  item.y += item.fallSpeed * deltaSeconds;
  const sway = item.kind === 'orb' ? Math.sin((item.y + item.x) / 34) * 5 : 0;
  item.element.style.transform = `translate(${item.x + sway}px, ${item.y}px)`;
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

function collectOrb(orb) {
  const centerX = orb.x + orb.width / 2;
  const centerY = orb.y + orb.height / 2;
  const earned = orb.value * state.combo;

  addScore(earned);
  state.combo = clamp(state.combo + 1, 1, 9);
  createParticles(centerX, centerY, orb.color, 16, 185);
  updateHud();
  orb.element.remove();
}

function hitPlayer(hazard, timestamp) {
  if (timestamp < state.invulnerableUntil) {
    return;
  }

  state.health -= 1;
  state.combo = 1;
  state.invulnerableUntil = timestamp + 1250;
  createParticles(hazard.x + hazard.width / 2, hazard.y + hazard.height / 2, '#ff315f', 22, 240);

  player.classList.remove('is-hit');
  gameArea.classList.remove('is-shaking');
  void player.offsetWidth;
  player.classList.add('is-hit');
  gameArea.classList.add('is-shaking');
  window.setTimeout(() => gameArea.classList.remove('is-shaking'), 300);

  updateHud();

  if (state.health <= 0) {
    endGame();
  }
}

function updateFallingItems(deltaSeconds, timestamp) {
  const playerRect = getPlayerRect();
  const gameHeight = getGameHeight();

  state.hazards = state.hazards.filter((hazard) => {
    moveItem(hazard, deltaSeconds);

    if (rectanglesOverlap(playerRect, getItemRect(hazard))) {
      hitPlayer(hazard, timestamp);
      hazard.element.remove();
      return false;
    }

    if (hazard.y > gameHeight + hazard.height) {
      hazard.element.remove();
      return false;
    }

    return true;
  });

  state.orbs = state.orbs.filter((orb) => {
    moveItem(orb, deltaSeconds);

    if (rectanglesOverlap(playerRect, getItemRect(orb))) {
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

function updateScoreOverTime(timestamp) {
  if (timestamp - state.lastScoreTime >= 1000) {
    addScore(state.threatLevel);
    state.lastScoreTime = timestamp;
  }
}

function updateDifficulty(timestamp) {
  const difficulty = getDifficulty(timestamp);
  state.threatLevel = difficulty.level;
  updateHud();
  return difficulty;
}

function gameLoop(timestamp) {
  if (state.mode !== 'playing') {
    return;
  }

  if (!state.lastFrameTime) {
    state.lastFrameTime = timestamp;
  }

  const deltaSeconds = Math.min((timestamp - state.lastFrameTime) / 1000, 0.033);
  const difficulty = updateDifficulty(timestamp);
  state.lastFrameTime = timestamp;

  updatePlayer(deltaSeconds);
  updateScoreOverTime(timestamp);

  if (timestamp - state.lastHazardSpawn >= difficulty.hazardDelay) {
    spawnHazard(timestamp);
    state.lastHazardSpawn = timestamp;
  }

  if (timestamp - state.lastOrbSpawn >= difficulty.orbDelay) {
    spawnOrb(timestamp);
    state.lastOrbSpawn = timestamp;
  }

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

function startGame() {
  cancelAnimationFrame(state.animationId);
  clearArena();
  Object.keys(keys).forEach((key) => {
    keys[key] = false;
  });

  const now = performance.now();
  state.mode = 'playing';
  state.lastFrameTime = 0;
  state.lastHazardSpawn = now - 300;
  state.lastOrbSpawn = now;
  state.lastScoreTime = now;
  state.startedAt = now;
  state.score = 0;
  state.health = 3;
  state.combo = 1;
  state.threatLevel = 1;
  state.invulnerableUntil = now + 1200;
  state.pausedAt = 0;
  newBestMessage.hidden = true;
  player.classList.remove('is-hit');
  resetPlayerPosition();
  updateHud();
  hideOverlays();

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
  state.lastScoreTime += pausedDuration;
  state.invulnerableUntil += pausedDuration;
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
  newBestMessage.hidden = !isNewBest;
  updateHud();
  gameOverScreen.classList.add('is-visible');
}

function handleKeyDown(event) {
  if (event.code === 'KeyP') {
    event.preventDefault();
    if (event.repeat) {
      return;
    }
    togglePause();
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

window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);
window.addEventListener('resize', () => {
  resetPlayerPosition();
});
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
resumeButton.addEventListener('click', resumeGame);

bestScoreElement.textContent = state.bestScore;
finalBestScoreElement.textContent = state.bestScore;
resetPlayerPosition();
updateHud();
