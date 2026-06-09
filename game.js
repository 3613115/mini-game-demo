const gameArea = document.getElementById('gameArea');
const player = document.getElementById('player');
const scoreElement = document.getElementById('score');
const finalScoreElement = document.getElementById('finalScore');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');

const keys = {
  ArrowLeft: false,
  ArrowRight: false,
};

const state = {
  isRunning: false,
  animationId: null,
  lastFrameTime: 0,
  lastScoreTime: 0,
  lastSpawnTime: 0,
  score: 0,
  playerX: 0,
  playerSpeed: 420,
  blockSpeed: 155,
  spawnDelay: 840,
  blocks: [],
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getGameWidth() {
  return gameArea.clientWidth;
}

function getGameHeight() {
  return gameArea.clientHeight;
}

function setPlayerPosition() {
  player.style.left = `${state.playerX}px`;
}

function resetPlayerPosition() {
  state.playerX = getGameWidth() / 2;
  setPlayerPosition();
}

function createBlock() {
  const block = document.createElement('div');
  const size = 30 + Math.random() * 28;
  const maxX = getGameWidth() - size;

  block.className = 'block';
  block.style.width = `${size}px`;
  block.style.height = `${size}px`;
  block.style.left = `${Math.random() * maxX}px`;
  block.style.top = `${-size}px`;

  gameArea.appendChild(block);
  state.blocks.push({ element: block, y: -size, size });
}

function removeBlocks() {
  state.blocks.forEach((block) => block.element.remove());
  gameArea.querySelectorAll('.block').forEach((block) => block.remove());
  state.blocks = [];
}

function updateScore(timestamp) {
  if (timestamp - state.lastScoreTime >= 1000) {
    state.score += 1;
    state.blockSpeed += 8;
    state.spawnDelay = Math.max(360, state.spawnDelay - 18);
    state.lastScoreTime = timestamp;
    scoreElement.textContent = state.score;
  }
}

function updatePlayer(deltaSeconds) {
  const playerHalfWidth = player.offsetWidth / 2;
  const minX = playerHalfWidth;
  const maxX = getGameWidth() - playerHalfWidth;

  if (keys.ArrowLeft) {
    state.playerX -= state.playerSpeed * deltaSeconds;
  }

  if (keys.ArrowRight) {
    state.playerX += state.playerSpeed * deltaSeconds;
  }

  state.playerX = clamp(state.playerX, minX, maxX);
  setPlayerPosition();
}

function rectanglesOverlap(rectA, rectB) {
  return (
    rectA.left < rectB.right &&
    rectA.right > rectB.left &&
    rectA.top < rectB.bottom &&
    rectA.bottom > rectB.top
  );
}

function checkCollision(blockElement) {
  return rectanglesOverlap(player.getBoundingClientRect(), blockElement.getBoundingClientRect());
}

function updateBlocks(deltaSeconds) {
  const gameHeight = getGameHeight();

  state.blocks = state.blocks.filter((block) => {
    block.y += state.blockSpeed * deltaSeconds;
    block.element.style.top = `${block.y}px`;

    if (checkCollision(block.element)) {
      endGame();
      return false;
    }

    if (block.y > gameHeight + block.size) {
      block.element.remove();
      return false;
    }

    return true;
  });
}

function gameLoop(timestamp) {
  if (!state.isRunning) {
    return;
  }

  if (!state.lastFrameTime) {
    state.lastFrameTime = timestamp;
  }

  const deltaSeconds = Math.min((timestamp - state.lastFrameTime) / 1000, 0.033);
  state.lastFrameTime = timestamp;

  updatePlayer(deltaSeconds);
  updateScore(timestamp);

  if (timestamp - state.lastSpawnTime >= state.spawnDelay) {
    createBlock();
    state.lastSpawnTime = timestamp;
  }

  updateBlocks(deltaSeconds);

  if (!state.isRunning) {
    return;
  }

  state.animationId = requestAnimationFrame(gameLoop);
}

function startGame() {
  state.isRunning = true;
  state.score = 0;
  state.blockSpeed = 155;
  state.spawnDelay = 840;
  state.lastFrameTime = 0;
  state.lastScoreTime = performance.now();
  state.lastSpawnTime = performance.now();
  scoreElement.textContent = '0';
  finalScoreElement.textContent = '0';
  removeBlocks();
  resetPlayerPosition();
  startScreen.classList.remove('is-visible');
  gameOverScreen.classList.remove('is-visible');
  state.animationId = requestAnimationFrame(gameLoop);
}

function endGame() {
  if (!state.isRunning) {
    return;
  }

  state.isRunning = false;
  cancelAnimationFrame(state.animationId);
  finalScoreElement.textContent = state.score;
  gameOverScreen.classList.add('is-visible');
}

function handleKeyDown(event) {
  if (event.key in keys) {
    event.preventDefault();
    keys[event.key] = true;
  }
}

function handleKeyUp(event) {
  if (event.key in keys) {
    event.preventDefault();
    keys[event.key] = false;
  }
}

window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);
window.addEventListener('resize', () => {
  resetPlayerPosition();
});
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);

resetPlayerPosition();
