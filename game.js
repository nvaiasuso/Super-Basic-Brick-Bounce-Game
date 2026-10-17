// ============================================================
// BLOCK BREAKER (base game)
//
// game.js  = the canvas, the ball, the paddle, and the game loop
// bricks.js     = where the bricks are and how they are drawn
// collisions.js = what happens when the ball touches things
// ============================================================

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;   // 600
const HEIGHT = canvas.height; // 450


// ------------------------------------------------------------
// THE BALL
// x and y are the top-left corner. vx and vy are how many pixels
// the ball moves each update (vx = sideways, vy = up/down).
// A positive vy means the ball is moving DOWN the screen.
// ------------------------------------------------------------
const BALL_SPEED = 4;
const EXTRA_BALL_COLOR = "#55ff78";
const BASE_PADDLE_WIDTH = 90;
const POWERUP_DROP_CHANCE = 0.12;
const PADDLE_TILT_SPEED = 2;
const MAX_PADDLE_TILT = 35;
const STARTING_LIVES = 3;
const LEVEL_COUNT = 8;
const MULTIBALL_HIT_STREAK = 5;
const SKINS = [
  { label: "Classic", paddle: "#ffffff", ball: "#ffffff", accent: "#ffffff", background: "#000000" },
  { label: "Neon Pink", paddle: "#ff4fd8", ball: "#ff9af3", accent: "#ffd5f5", background: "#140712" },
  { label: "Laser Blue", paddle: "#4fe6ff", ball: "#7ad9ff", accent: "#d9f7ff", background: "#021217" },
  { label: "Sunset Gold", paddle: "#ffd166", ball: "#ffb703", accent: "#fff2b3", background: "#180d00" }
];
const CONTROL_KEYS = {
  left: "arrowleft",
  right: "arrowright",
  tiltLeft: "arrowdown",
  tiltRight: "arrowup"
};
const CONTROL_LABELS = {
  left: "Move left",
  right: "Move right",
  tiltLeft: "Tilt left",
  tiltRight: "Tilt right"
};
let currentSkin = 0;
let extraBalls = [];
let brickHitStreak = 0;
let mola = 0;
let highScore = readHighScore();
let newBest = false;
let aiPaddles = [];
let powerUps = [];
let widePaddleTimer = 0;
let slowBallTimer = 0;
let magnetTimer = 0;
let magnetPlayerId = null;
let powerUpNotice = null;
let lasers = [];
let hitStopFrames = 0;
let screenShakeFrames = 0;
let particles = [];
let brickFlashes = [];
let ballTrail = [];
let simulationFrame = 0;
let lastTiltFrame = -Infinity;
let lastTiltDirection = 0;
let paddleSquashFrames = 0;
let perfectNotice = null;
let comboNotice = null;
let audioContext = null;
let brickSoundBuffer = null;

function readHighScore() {
  try {
    return Number(localStorage.getItem("blockBreakerHighScore")) || 0;
  } catch (error) {
    return 0;
  }
}

function recordHighScore() {
  if (mola <= highScore) return;
  highScore = mola;
  newBest = true;
  try {
    localStorage.setItem("blockBreakerHighScore", String(highScore));
  } catch (error) {
    // Keep the current run playable when storage is unavailable.
  }
}

const ball = {
  x: 0,
  y: 0,
  width: 12,
  height: 12,
  vx: 0,
  vy: 0,
  color: getCurrentSkin().ball
};

function getCurrentSkin() {
  return SKINS[currentSkin % SKINS.length];
}

function applySkin(nextSkinIndex = currentSkin) {
  currentSkin = ((nextSkinIndex % SKINS.length) + SKINS.length) % SKINS.length;
  const skin = getCurrentSkin();
  ball.color = skin.ball;
  paddle.color = skin.paddle;
  paddle.accent = skin.accent;
  if (typeof document !== "undefined") {
    document.documentElement.style.setProperty("--theme-bg", skin.background);
    document.documentElement.style.setProperty("--theme-accent", skin.accent);
    const skinSelect = document.getElementById("skin-select");
    if (skinSelect) {
      skinSelect.value = String(currentSkin);
    }
  }
}

// Put the ball in the center and reset its speed and direction.
function resetBall() {
  ball.x = WIDTH / 2 - ball.width / 2;
  ball.y = HEIGHT / 2 - ball.height / 2;
  ball.previousX = ball.x;
  ball.previousY = ball.y;
  ball.vx = BALL_SPEED;  // right
  ball.vy = BALL_SPEED;  // down
  ball.stuck = false;
  ball.stuckPlayerId = null;
  ball.perfect = false;
  ballTrail = [];
}

function playBrickSound() {
  try {
    const AudioContextType = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextType) return;
    audioContext = audioContext || new AudioContextType();
    if (audioContext.state === "suspended") audioContext.resume();
    if (!brickSoundBuffer) {
      brickSoundBuffer = audioContext.createBuffer(1, Math.floor(audioContext.sampleRate * 0.08), audioContext.sampleRate);
      const samples = brickSoundBuffer.getChannelData(0);
      for (let index = 0; index < samples.length; index++) {
        const fade = 1 - index / samples.length;
        samples[index] = Math.sin(2 * Math.PI * 420 * index / audioContext.sampleRate) * fade;
      }
    }
    const source = audioContext.createBufferSource();
    const gain = audioContext.createGain();
    const playbackRate = Math.min(2, 1 + 0.06 * brickHitStreak);
    source.buffer = brickSoundBuffer;
    source.playbackRate.value = playbackRate;
    gain.gain.setValueAtTime(0.055, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.055);
    source.connect(gain);
    gain.connect(audioContext.destination);
    source.start();
  } catch (error) {
    // Audio is optional; gameplay must remain available if it is blocked.
  }
}

function triggerBrickBreak(brick) {
  const color = brick.color || "#ffffff";
  brickFlashes.push({ x: brick.x, y: brick.y, width: brick.width, height: brick.height, timer: 2 });
  const count = 6 + Math.floor(Math.random() * 5);
  for (let index = 0; index < count; index++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 2.5;
    particles.push({
      x: brick.x + brick.width / 2,
      y: brick.y + brick.height / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2 + Math.random() * 3,
      color: color,
      life: 24,
      maxLife: 24
    });
  }
  hitStopFrames = 2;
  screenShakeFrames = 4;
}

function updateHitEffects() {
  if (hitStopFrames > 0) {
    hitStopFrames--;
    for (const flash of brickFlashes) flash.timer--;
    brickFlashes = brickFlashes.filter(function (flash) { return flash.timer > 0; });
    return true;
  }
  for (const particle of particles) {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vx *= 0.96;
    particle.vy *= 0.96;
    particle.life--;
  }
  particles = particles.filter(function (particle) { return particle.life > 0; });
  for (const flash of brickFlashes) flash.timer--;
  brickFlashes = brickFlashes.filter(function (flash) { return flash.timer > 0; });
  if (screenShakeFrames > 0) screenShakeFrames--;
  if (paddleSquashFrames > 0) paddleSquashFrames--;
  if (perfectNotice && --perfectNotice.timer <= 0) perfectNotice = null;
  if (comboNotice && --comboNotice.timer <= 0) comboNotice = null;
  return false;
}

function spawnExtraBall(sourceBall) {
  const angle = (extraBalls.length % 2 === 0 ? 1 : -1) * Math.PI / 6;
  const sourceSpeed = Math.hypot(sourceBall.vx, sourceBall.vy);
  const speed = sourceSpeed || BALL_SPEED;
  const sourceVx = sourceSpeed ? sourceBall.vx : BALL_SPEED;
  const sourceVy = sourceSpeed ? sourceBall.vy : BALL_SPEED;
  const extraBall = {
    x: sourceBall.x,
    y: sourceBall.y,
    previousX: sourceBall.x,
    previousY: sourceBall.y,
    width: sourceBall.width,
    height: sourceBall.height,
    color: EXTRA_BALL_COLOR,
    vx: sourceVx * Math.cos(angle) - sourceVy * Math.sin(angle),
    vy: sourceVx * Math.sin(angle) + sourceVy * Math.cos(angle)
  };
  const extraSpeed = Math.hypot(extraBall.vx, extraBall.vy);
  extraBall.vx *= speed / extraSpeed;
  extraBall.vy *= speed / extraSpeed;
  extraBalls.push(extraBall);
}

function launchStuckBall(targetPaddle = getPaddleForPlayer(ball.stuckPlayerId)) {
  if (!ball.stuck) return;
  if (multiplayerActive && !multiplayerHost) {
    if (ball.stuckPlayerId === multiplayerPlayerId && typeof window.requestLobbyBallLaunch === "function") {
      window.requestLobbyBallLaunch();
    }
    return;
  }
  const launch = reflectFromPaddle(0, BALL_SPEED, targetPaddle.angle);
  const launchSpeed = Math.hypot(launch.vx, launch.vy);
  ball.vx = launch.vx * BALL_SPEED / launchSpeed;
  ball.vy = launch.vy * BALL_SPEED / launchSpeed;
  ball.stuck = false;
  ball.stuckPlayerId = null;
}

function spawnBattleRewardBall() {
  const speed = Math.max(BALL_SPEED, Math.hypot(ball.vx, ball.vy));
  let x = WIDTH / 2 - ball.width / 2;
  let y = HEIGHT * 0.56;
  for (let attempt = 0; attempt < 12; attempt++) {
    x = 18 + Math.random() * (WIDTH - ball.width - 36);
    y = HEIGHT * 0.48 + Math.random() * (HEIGHT * 0.24);
    if (Math.hypot(x - ball.x, y - ball.y) >= 80) break;
  }
  const angle = Math.random() * Math.PI * 2;
  extraBalls.push({
    x: x,
    y: y,
    previousX: x,
    previousY: y,
    width: ball.width,
    height: ball.height,
    color: EXTRA_BALL_COLOR,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed
  });
}

let level = 0;
let lives = STARTING_LIVES;
let gameOver = false;
let gameWon = false;
let invincible = false;
let gameStarted = false;
let multiplayerActive = false;
let multiplayerHost = false;
let multiplayerPlayerId = null;
let multiplayerPlayers = [];
const LOBBY_INTERPOLATION_DELAY_MS = 100;
const LOBBY_SNAPSHOT_BUFFER_SIZE = 5;
let lobbySnapshotBuffer = [];
let lobbySnapshotSequence = 0;
let lobbyInterpolationSnaps = 0;
let lastInterpolationSnapPair = null;


// ------------------------------------------------------------
// THE PADDLE
// ------------------------------------------------------------
const paddle = {
  x: WIDTH / 2 - 45,
  y: HEIGHT - 30,
  width: 90,
  height: 12,
  speed: 6,
  angle: 0,
  color: getCurrentSkin().paddle,
  accent: getCurrentSkin().accent
};


// ------------------------------------------------------------
// THE BRICKS (the list is filled in by makeBricks() in bricks.js)
// ------------------------------------------------------------
let bricks = [];


// ------------------------------------------------------------
// KEYBOARD
// keys["arrowleft"] is true while the left arrow is held down.
// ------------------------------------------------------------
const keys = {};
let autoPlay = false;
let paused = false;
let rebindingControl = null;
let autoAimAngle = 0;
let autoPlanCooldown = 0;
const controlMenu = document.getElementById("control-menu");
const resumeButton = document.getElementById("resume");

function setPaused(value) {
  paused = value;
  controlMenu.hidden = !paused;
  refreshTouchControls();
  for (const key of Object.keys(keys)) {
    keys[key] = false;
  }
}

function formatKey(key) {
  const names = {
    arrowleft: "←",
    arrowright: "→",
    arrowup: "↑",
    arrowdown: "↓",
    " ": "Space"
  };
  return names[key] || key.toUpperCase();
}

function refreshControlButtons() {
  for (const action of Object.keys(CONTROL_KEYS)) {
    const button = document.querySelector('[data-control="' + action + '"]');
    if (button) {
      button.textContent = rebindingControl === action
        ? "Press a key…"
        : formatKey(CONTROL_KEYS[action]);
    }
  }
}

for (const button of document.querySelectorAll("[data-control]")) {
  button.addEventListener("click", function () {
    rebindingControl = button.dataset.control;
    refreshControlButtons();
  });
}

const autoPlayButton = document.getElementById("autoplay");
const adminMenu = document.getElementById("admin-menu");
const adminSkinSelect = document.getElementById("skin-select");
const mainMenu = document.getElementById("main-menu");
const gameInfo = document.getElementById("game-info");
const touchControls = document.getElementById("touch-controls");
const startGameButton = document.getElementById("start-game");
const menuControlsButton = document.getElementById("menu-controls");
const menuAdminButton = document.getElementById("menu-admin");

function refreshTouchControls() {
  if (!touchControls) return;
  touchControls.hidden = !(gameStarted && !paused);
}

function showMainMenu() {
  gameStarted = false;
  paused = false;
  document.body.classList.add("menu-active");
  document.body.classList.remove("game-active");
  mainMenu.hidden = false;
  controlMenu.hidden = true;
  adminMenu.hidden = true;
  canvas.hidden = true;
  refreshTouchControls();
  document.getElementById("control-title").textContent = "Paused — Controls";
  resumeButton.textContent = "Resume";
  for (const key of Object.keys(keys)) {
    keys[key] = false;
  }
}

function openMenuControls() {
  mainMenu.hidden = true;
  adminMenu.hidden = true;
  canvas.hidden = true;
  gameInfo.hidden = true;
  refreshTouchControls()
  gameInfo.hidden = true;
  document.getElementById("control-title").textContent = "Controls";
  resumeButton.textContent = "Back to menu";
  setPaused(true);
}

function beginGame() {
  restartGame();
  gameStarted = true;
  document.body.classList.remove("menu-active");
  document.body.classList.add("game-active");
  mainMenu.hidden = true;
  controlMenu.hidden = true;
  adminMenu.hidden = true;
  canvas.hidden = false;
  gameInfo.hidden = false;
  refreshTouchControls();
  lastTime = performance.now();
}

function setMultiplayerSession(active, isHost = false, playerId = null) {
  multiplayerActive = active;
  multiplayerHost = isHost;
  multiplayerPlayerId = playerId;
  multiplayerPlayers = [];
  lobbySnapshotBuffer = [];
  lobbySnapshotSequence = 0;
  lobbyInterpolationSnaps = 0;
  lastInterpolationSnapPair = null;
  if (!active) {
    paddle.y = HEIGHT - 30;
    paddle.width = BASE_PADDLE_WIDTH;
    paddle.angle = 0;
  }
}

function setMultiplayerPlayers(players) {
  multiplayerPlayers = Array.isArray(players) ? players : [];
  if (!multiplayerActive || multiplayerHost) return;
  const localPlayer = multiplayerPlayers.find(function (player) { return player.id === multiplayerPlayerId; });
  if (!localPlayer) return;
  if (Number.isFinite(localPlayer.y)) paddle.y = localPlayer.y;
  if (Number.isFinite(localPlayer.width)) paddle.width = localPlayer.width;
}

function getPaddleForPlayer(playerId) {
  if (!multiplayerActive || !playerId || playerId === multiplayerPlayerId) return paddle;
  return multiplayerPlayers.find(function (player) {
    return player.id === playerId && !player.ai;
  }) || paddle;
}

function addLobbyAIPlayers(players) {
  const lobbyPlayers = Array.isArray(players) ? players : [];
  aiPaddles = lobbyPlayers.map(function (player, index) {
    const width = 72;
    return {
      x: Math.max(0, Math.min(WIDTH - width, player.x || 0)),
      y: HEIGHT - 58 - (index % 9) * 24,
      width: width,
      height: 10,
      speed: 3.5,
      angle: 0,
      color: player.color || getCurrentSkin().accent,
      assignedBall: ball,
      lobbyAI: true,
      lobbyName: player.name,
      lobbyIndex: index,
      lobbyCount: lobbyPlayers.length
    };
  });
}

function beginLobbyGame(isHost, playerId) {
  beginGame();
  setMultiplayerSession(true, isHost, playerId);
}

function endLobbyGame() {
  setMultiplayerSession(false);
  showMainMenu();
}

function getLobbyGameSnapshot() {
  return {
    t: performance.now(),
    level: level,
    lives: lives,
    gameOver: gameOver,
    gameWon: gameWon,
    mola: mola,
    brickHitStreak: brickHitStreak,
    ball: Object.assign({}, ball),
    extraBalls: extraBalls.map(function (activeBall) { return Object.assign({}, activeBall); }),
    bricks: bricks.map(function (brick) { return Object.assign({}, brick); }),
    aiPaddles: aiPaddles.map(function (bot) {
      return { x: bot.x, y: bot.y, width: bot.width, height: bot.height, speed: bot.speed, angle: bot.angle, color: bot.color, lobbyAI: bot.lobbyAI, lobbyName: bot.lobbyName };
    }),
    powerUps: powerUps.map(function (powerUp) { return Object.assign({}, powerUp); }),
    players: multiplayerPlayers.map(function (player) {
      if (player.id !== multiplayerPlayerId) return Object.assign({}, player);
      return Object.assign({}, player, {
        x: paddle.x,
        y: paddle.y,
        width: paddle.width,
        angle: paddle.angle,
        widePaddleTimer: widePaddleTimer
      });
    }),
    lasers: lasers.map(function (laser) { return Object.assign({}, laser); }),
    widePaddleTimer: widePaddleTimer,
    slowBallTimer: slowBallTimer,
    magnetTimer: magnetTimer,
    magnetPlayerId: magnetPlayerId,
    powerUpNotice: powerUpNotice ? Object.assign({}, powerUpNotice) : null,
    nextBotState: getNextBotMultiplayerState()
  };
}

function arrayFromLobbySnapshot(value) {
  if (Array.isArray(value)) return value;
  return value && typeof value === "object" ? Object.values(value) : [];
}

function cloneLobbyList(value) {
  return arrayFromLobbySnapshot(value).map(function (item) { return Object.assign({}, item); });
}

function interpolateLobbyList(olderList, newerList, latestList, fields, amount) {
  const older = arrayFromLobbySnapshot(olderList);
  const newer = arrayFromLobbySnapshot(newerList);
  const latest = cloneLobbyList(latestList);
  if (older.length !== newer.length || newer.length !== latest.length) return cloneLobbyList(newerList);

  return latest.map(function (item, index) {
    const before = older[index];
    const after = newer[index];
    for (const field of fields) {
      if (Number.isFinite(before[field]) && Number.isFinite(after[field])) {
        item[field] = before[field] + (after[field] - before[field]) * amount;
      }
    }
    return item;
  });
}

function interpolateLobbyBricks(olderList, newerList, latestList, amount) {
  const older = arrayFromLobbySnapshot(olderList);
  const newer = arrayFromLobbySnapshot(newerList);
  const latest = cloneLobbyList(latestList);
  if (older.length !== newer.length || newer.length !== latest.length) return cloneLobbyList(newerList);

  return latest.map(function (brick, index) {
    const before = older[index];
    const after = newer[index];
    if (before.type !== "moving" || after.type !== "moving" || brick.type !== "moving") return brick;
    brick.x = before.x + (after.x - before.x) * amount;
    brick.y = before.y + (after.y - before.y) * amount;
    return brick;
  });
}

function interpolateLobbyNextBotState(olderState, newerState, latestState, amount) {
  if (!latestState) return null;
  const result = Object.assign({}, latestState);
  result.bots = interpolateLobbyList(
    olderState && olderState.bots,
    newerState && newerState.bots,
    latestState.bots,
    ["x", "y"],
    amount
  );
  if (olderState && newerState && olderState.battle && newerState.battle && latestState.battle) {
    result.battle = Object.assign({}, latestState.battle);
    for (const field of ["centerX", "centerY", "ballX", "ballY"]) {
      if (Number.isFinite(olderState.battle[field]) && Number.isFinite(newerState.battle[field])) {
        result.battle[field] = olderState.battle[field] + (newerState.battle[field] - olderState.battle[field]) * amount;
      }
    }
  }
  return result;
}

function applyInterpolatedLobbySnapshot(now = performance.now()) {
  if (multiplayerHost || lobbySnapshotBuffer.length === 0) return;
  const newest = lobbySnapshotBuffer[lobbySnapshotBuffer.length - 1];
  const renderTime = now - LOBBY_INTERPOLATION_DELAY_MS;
  let older = lobbySnapshotBuffer[0];
  let newer = older;

  if (lobbySnapshotBuffer.length > 1) {
    if (renderTime >= lobbySnapshotBuffer[lobbySnapshotBuffer.length - 1].receivedAt) {
      older = lobbySnapshotBuffer[lobbySnapshotBuffer.length - 1];
      newer = older;
    } else {
      for (let index = 0; index < lobbySnapshotBuffer.length - 1; index++) {
        const first = lobbySnapshotBuffer[index];
        const second = lobbySnapshotBuffer[index + 1];
        if (renderTime >= first.receivedAt && renderTime <= second.receivedAt) {
          older = first;
          newer = second;
          break;
        }
      }
    }
  }

  const span = newer.receivedAt - older.receivedAt;
  const amount = span > 0 ? Math.max(0, Math.min(1, (renderTime - older.receivedAt) / span)) : 1;
  const oldState = older.state;
  const newState = newer.state;
  const latestState = newest.state;
  const pairKey = older.sequence + ":" + newer.sequence;
  const ballDistance = oldState.ball && newState.ball
    ? Math.hypot(newState.ball.x - oldState.ball.x, newState.ball.y - oldState.ball.y)
    : 0;
  const snapBall = ballDistance > 80;

  if (snapBall && pairKey !== lastInterpolationSnapPair) {
    lobbyInterpolationSnaps++;
    lastInterpolationSnapPair = pairKey;
  }

  level = latestState.level || 0;
  lives = latestState.lives || 0;
  gameOver = Boolean(latestState.gameOver);
  gameWon = Boolean(latestState.gameWon);
  mola = latestState.mola || 0;
  brickHitStreak = latestState.brickHitStreak || 0;
  if (latestState.ball) {
    Object.assign(ball, latestState.ball);
    if (snapBall) {
      ball.x = newState.ball.x;
      ball.y = newState.ball.y;
    } else if (oldState.ball && newState.ball) {
      ball.x = oldState.ball.x + (newState.ball.x - oldState.ball.x) * amount;
      ball.y = oldState.ball.y + (newState.ball.y - oldState.ball.y) * amount;
    }
  }

  if (latestState.players) setMultiplayerPlayers(arrayFromLobbySnapshot(latestState.players));
  extraBalls = interpolateLobbyList(oldState.extraBalls, newState.extraBalls, latestState.extraBalls, ["x", "y"], amount);
  bricks = interpolateLobbyBricks(oldState.bricks, newState.bricks, latestState.bricks, amount);
  aiPaddles = interpolateLobbyList(oldState.aiPaddles, newState.aiPaddles, latestState.aiPaddles, ["x", "y"], amount)
    .map(function (bot) { return Object.assign({ assignedBall: null }, bot); });
  powerUps = interpolateLobbyList(oldState.powerUps, newState.powerUps, latestState.powerUps, ["x", "y"], amount);
  lasers = interpolateLobbyList(oldState.lasers, newState.lasers, latestState.lasers, ["x", "y"], amount);
  widePaddleTimer = latestState.widePaddleTimer || 0;
  slowBallTimer = latestState.slowBallTimer || 0;
  magnetTimer = latestState.magnetTimer || 0;
  magnetPlayerId = latestState.magnetPlayerId || null;
  powerUpNotice = latestState.powerUpNotice ? Object.assign({}, latestState.powerUpNotice) : null;
  setNextBotMultiplayerState(interpolateLobbyNextBotState(oldState.nextBotState, newState.nextBotState, latestState.nextBotState, amount));
}

function applyLobbyGameSnapshot(state) {
  if (!state || multiplayerHost) return;
  lobbySnapshotBuffer.push({ state: state, receivedAt: performance.now(), sequence: lobbySnapshotSequence++ });
  if (lobbySnapshotBuffer.length > LOBBY_SNAPSHOT_BUFFER_SIZE) lobbySnapshotBuffer.shift();
}

window.beginLobbyGame = beginLobbyGame;
window.addLobbyAIPlayers = addLobbyAIPlayers;
window.endLobbyGame = endLobbyGame;
window.setMultiplayerSession = setMultiplayerSession;
window.setMultiplayerPlayers = setMultiplayerPlayers;
window.getLobbyGameSnapshot = getLobbyGameSnapshot;
window.applyLobbyGameSnapshot = applyLobbyGameSnapshot;
window.getLobbyInterpolationDebugState = function () {
  return {
    bufferSize: lobbySnapshotBuffer.length,
    delayMs: LOBBY_INTERPOLATION_DELAY_MS,
    snaps: lobbyInterpolationSnaps
  };
};
window.getGameDebugState = function () {
  return {
    ball: { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy },
    gameOver: gameOver,
    gameWon: gameWon,
    paused: paused,
    hitStopFrames: hitStopFrames,
    level: level,
    lives: lives,
    bricks: bricks.length
  };
};
window.launchLobbyBall = function (playerId) {
  if (multiplayerActive && multiplayerHost && ball.stuck && ball.stuckPlayerId === playerId) {
    launchStuckBall(getPaddleForPlayer(playerId));
  }
};

function toggleAdminMenu() {
  if (!adminMenu) return;
  adminMenu.hidden = !adminMenu.hidden;
}

autoPlayButton.addEventListener("click", function () {
  autoPlay = !autoPlay;
  autoPlayButton.setAttribute("aria-pressed", String(autoPlay));
  autoPlayButton.textContent = autoPlay ? "Auto-play: On" : "Auto-play: Off";
});

resumeButton.addEventListener("click", function () {
  if (gameStarted) {
    setPaused(false);
  } else {
    showMainMenu();
  }
});

startGameButton.addEventListener("click", beginGame);
menuControlsButton.addEventListener("click", openMenuControls);
menuAdminButton.addEventListener("click", function () {
  adminMenu.hidden = !adminMenu.hidden;
});

function refreshInvincibilityButton() {
  const button = document.getElementById("invincibility-toggle");
  if (!button) return;
  button.setAttribute("aria-pressed", String(invincible));
  button.textContent = "Invincibility: " + (invincible ? "On" : "Off");
}

function addAdminBall() {
  spawnExtraBall(ball);
}

function spawnAdminAiPaddle() {
  aiPaddles.push({
    x: 80 + (aiPaddles.length * 60) % (WIDTH - 200),
    y: HEIGHT - 45,
    width: 90,
    height: 12,
    speed: 5,
    angle: 0,
    color: ["#ff4fd8", "#4fe6ff", "#ffd166"][aiPaddles.length % 3],
    assignedBall: null
  });
}

function removeAdminAiPaddle() {
  aiPaddles.pop();
}

function breakNearestBrick() {
  const target = bricks.find(function (brick) {
    return !brick.isKill;
  });
  if (!target) return;
  bricks = bricks.filter(function (brick) {
    return brick !== target;
  });
  dropPowerUp(target);
  mola += 1;
  brickHitStreak = 0;
}

function assignAiBallTargets() {
  const activeBalls = [ball].concat(extraBalls);
  for (let i = 0; i < aiPaddles.length; i++) {
    const bot = aiPaddles[i];
    bot.assignedBall = activeBalls[i % activeBalls.length] || ball;
  }
}

function testAdminTools() {
  for (let i = 0; i < 3; i++) {
    spawnExtraBall(ball);
  }
  for (let i = 0; i < 2; i++) {
    spawnAdminAiPaddle();
  }
  assignAiBallTargets();
}

for (const adminButton of document.querySelectorAll("[data-admin]")) {
  adminButton.addEventListener("click", function () {
    const action = adminButton.dataset.admin;
    if (action === "ball") {
      addAdminBall();
    } else if (action === "break") {
      breakNearestBrick();
    } else if (action === "ai") {
      spawnAdminAiPaddle();
    } else if (action === "kill-ai") {
      removeAdminAiPaddle();
    } else if (action === "test") {
      testAdminTools();
    } else if (action === "invincibility") {
      invincible = !invincible;
      refreshInvincibilityButton();
    } else if (action === "nextbot-ai") {
      setNextBotAI(!isNextBotAIEnabled());
    } else if (action === "spawn-nextbot") {
      spawnNextBot();
    } else if (action === "remove-nextbot") {
      removeNextBot();
    } else if (action === "life") {
      lives++;
      if (gameOver) {
        gameOver = false;
        resetBall();
      }
    } else if (action === "level") {
      gameOver = false;
      advanceLevel();
    } else if (action === "restart") {
      restartGame();
    } else if (action === "menu") {
      if (multiplayerActive && typeof window.leaveLobbySession === "function") {
        window.leaveLobbySession();
      } else {
        showMainMenu();
      }
    }
  });
}

if (adminSkinSelect) {
  adminSkinSelect.addEventListener("change", function () {
    applySkin(Number(adminSkinSelect.value));
  });
}

document.addEventListener("keydown", function (event) {
  const key = event.key.toLowerCase();

  if (key === "escape") {
    event.preventDefault();
    if (rebindingControl) {
      rebindingControl = null;
      refreshControlButtons();
      return;
    }
    if (!gameStarted) {
      if (paused) showMainMenu();
      return;
    }
    setPaused(!paused);
    return;
  }

  if (rebindingControl) {
    event.preventDefault();
    if (!Object.keys(CONTROL_KEYS).some(function (action) {
      return action !== rebindingControl && CONTROL_KEYS[action] === key;
    })) {
      CONTROL_KEYS[rebindingControl] = key;
      rebindingControl = null;
    }
    refreshControlButtons();
    return;
  }

  if (gameStarted && !paused) {
    keys[key] = true;
    if (key === " " && ball.stuck) {
      launchStuckBall();
      event.preventDefault();
    }
  }

  if (event.shiftKey && key === "q") {
    autoPlay = !autoPlay;
    autoPlayButton.setAttribute("aria-pressed", String(autoPlay));
    autoPlayButton.textContent = autoPlay ? "Auto-play: On" : "Auto-play: Off";
  }

  if (event.shiftKey && key === "y") {
    toggleAdminMenu();
    return;
  }

  if (gameStarted && key === "r" && (gameOver || gameWon)) {
    restartGame();
  }

  // Stop the arrow keys from scrolling the page.
  if (event.key.startsWith("Arrow")) {
    event.preventDefault();
  }
});

document.addEventListener("keyup", function (event) {
  keys[event.key.toLowerCase()] = false;
});

function setTouchControlState(controlName, pressed) {
  const boundKey = CONTROL_KEYS[controlName];
  if (!boundKey) return;
  keys[boundKey] = pressed;
  const button = document.querySelector('[data-touch="' + controlName + '"]');
  if (button) {
    button.classList.toggle("is-pressed", pressed);
  }
}

for (const button of document.querySelectorAll("[data-touch]")) {
  button.addEventListener("pointerdown", function (event) {
    event.preventDefault();
    event.stopPropagation();
    setTouchControlState(button.dataset.touch, true);
    button.setPointerCapture(event.pointerId);
  });

  button.addEventListener("pointerup", function (event) {
    event.preventDefault();
    setTouchControlState(button.dataset.touch, false);
    if (typeof button.releasePointerCapture === "function") {
      try {
        button.releasePointerCapture(event.pointerId);
      } catch (error) {
        // Ignore capture release failures after pointer leaves the button.
      }
    }
  });

  button.addEventListener("pointerleave", function () {
    setTouchControlState(button.dataset.touch, false);
  });

  button.addEventListener("pointercancel", function () {
    setTouchControlState(button.dataset.touch, false);
  });
}

// ------------------------------------------------------------
// UPDATE: runs 60 times every second. Move things, then check
// what they touched.
// ------------------------------------------------------------
function update() {
  if (!gameStarted || paused) {
    return;
  }

  if (multiplayerActive && !multiplayerHost) {
    applyInterpolatedLobbySnapshot();
    if (!gameOver && !gameWon) {
      paddle.previousX = paddle.x;
      paddle.previousY = paddle.y;
      paddle.previousAngle = paddle.angle;
      movePaddle();
    }
    if (typeof window.updateLobbyPaddle === "function") window.updateLobbyPaddle(paddle.x, paddle.angle, paddle.width);
    return;
  }

  if (gameOver || gameWon) return;

  simulationFrame++;
  if (updateHitEffects()) return;

  if (isNextBotBattleActive()) {
    updateNextBotBattle();
    return;
  }

  paddle.previousX = paddle.x;
  paddle.previousY = paddle.y;
  paddle.previousAngle = paddle.angle;
  movePaddle();
  if (multiplayerActive && typeof window.updateLobbyPaddle === "function") window.updateLobbyPaddle(paddle.x, paddle.angle, paddle.width);
  if (isNextBotAIEnabled()) updateNextBotAI();
  updateNextBots();
  updateTemporaryPowerUps();
  updatePowerUps();
  updateSpecialBricks();
  if (updateLasers()) return;

  updateAiPaddles();

  for (const activeBall of [ball].concat(extraBalls)) {
    if (activeBall === ball && activeBall.stuck) {
      const stuckPaddle = getPaddleForPlayer(activeBall.stuckPlayerId);
      activeBall.x = stuckPaddle.x + stuckPaddle.width / 2 - activeBall.width / 2;
      activeBall.y = stuckPaddle.y - activeBall.height - 1;
      continue;
    }
    moveBall(activeBall);
    bounceOffWalls(activeBall);   // collisions.js
    if (bounceOffPaddle(activeBall, paddle)) {
      paddleSquashFrames = 6;
      if (magnetTimer > 0 && !autoPlay && activeBall === ball && (!magnetPlayerId || magnetPlayerId === multiplayerPlayerId)) {
        ball.stuck = true;
        ball.stuckPlayerId = multiplayerPlayerId;
        ball.vx = 0;
        ball.vy = 0;
      }
      const impactSide = Math.sign(activeBall.x + activeBall.width / 2 - (paddle.x + paddle.width / 2));
      if (simulationFrame - lastTiltFrame <= 4 && impactSide !== 0 && lastTiltDirection === impactSide) {
        activeBall.vx *= 1.1;
        activeBall.vy *= 1.1;
        activeBall.perfect = true;
        perfectNotice = { timer: 48 };
      }
    }
    if (bounceOffAiPaddles(activeBall)) {
      // AI paddles bounce the ball too
    }
    const remotePaddleHit = multiplayerActive ? bounceOffMultiplayerPaddles(activeBall) : null;
    if (remotePaddleHit && magnetTimer > 0 && !autoPlay && activeBall === ball && remotePaddleHit === magnetPlayerId) {
      ball.stuck = true;
      ball.stuckPlayerId = remotePaddleHit;
      ball.vx = 0;
      ball.vy = 0;
    }
    if (bounceOffBricks(activeBall)) {
      return;
    }

    if (activeBall.y > HEIGHT) {
      if (activeBall === ball) {
        loseLife();
        return;
      }
      extraBalls = extraBalls.filter(function (extraBall) {
        return extraBall !== activeBall;
      });
    }
  }

  if (!bricks.some(function (brick) { return !brick.isKill; })) {
    advanceLevel();
  }
}

function movePaddle() {
  const startingAngle = paddle.angle;
  if (keys[CONTROL_KEYS.tiltRight]) {
    paddle.angle = Math.min(MAX_PADDLE_TILT, paddle.angle + PADDLE_TILT_SPEED);
  }
  if (keys[CONTROL_KEYS.tiltLeft]) {
    paddle.angle = Math.max(-MAX_PADDLE_TILT, paddle.angle - PADDLE_TILT_SPEED);
  }
  if (paddle.angle !== startingAngle) {
    lastTiltFrame = simulationFrame;
    lastTiltDirection = Math.sign(paddle.angle - startingAngle);
  }

  if (autoPlay) {
    if (autoPlanCooldown-- <= 0) {
      const plan = planAutoPlay();
      autoAimAngle = plan.angle;
      paddle.autoTargetX = plan.x;
      autoPlanCooldown = 4;
    }
    paddle.angle = autoAimAngle;
    const targetX = paddle.autoTargetX - paddle.width / 2;
    paddle.x += Math.sign(targetX - paddle.x) * Math.min(paddle.speed, Math.abs(targetX - paddle.x));
  }

  if (!autoPlay && keys[CONTROL_KEYS.left]) {
    paddle.x = paddle.x - paddle.speed;
  }
  if (!autoPlay && keys[CONTROL_KEYS.right]) {
    paddle.x = paddle.x + paddle.speed;
  }

  // Keep the paddle on the screen.
  if (paddle.x < 0) {
    paddle.x = 0;
  }
  if (paddle.x + paddle.width > WIDTH) {
    paddle.x = WIDTH - paddle.width;
  }
}

function moveBall(activeBall) {
  activeBall.previousX = activeBall.x;
  activeBall.previousY = activeBall.y;
  if (activeBall === ball) {
    ballTrail.push({ x: activeBall.x + activeBall.width / 2, y: activeBall.y + activeBall.height / 2 });
    if (ballTrail.length > 8) ballTrail.shift();
  }
  const attackScale = isNextBotAttackActive() ? 0.68 : 1;
  const powerUpScale = slowBallTimer > 0 ? 0.7 : 1;
  activeBall.x += activeBall.vx * attackScale * powerUpScale;
  activeBall.y += activeBall.vy * attackScale * powerUpScale;
}

function dropPowerUp(brick) {
  if (Math.random() > POWERUP_DROP_CHANCE) return;
  const kinds = [
    { type: "wide", label: "W", color: "#4fe6ff" },
    { type: "slow", label: "S", color: "#ffd166" },
    { type: "magnet", label: "M", color: "#ff75d8" },
    { type: "multi", label: "+", color: EXTRA_BALL_COLOR },
    { type: "life", label: "1UP", color: "#ff6b6b" }
  ];
  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  powerUps.push({
    x: brick.x + brick.width / 2 - 11,
    y: brick.y + brick.height / 2 - 11,
    width: 22,
    height: 22,
    speed: 2.4,
    type: kind.type,
    label: kind.label,
    color: kind.color
  });
}

function dropBossKillbrick(brick) {
  bricks.push({
    x: brick.x + Math.random() * Math.max(1, brick.width - 24),
    y: brick.y + brick.height,
    width: 24,
    height: 14,
    isKill: true,
    type: "kill",
    falling: true,
    fallSpeed: 1.8,
    color: "#ffffff"
  });
}

function updateSpecialBricks() {
  for (let index = bricks.length - 1; index >= 0; index--) {
    const brick = bricks[index];
    if (brick.hidden && simulationFrame >= brick.respawnAt) {
      brick.hidden = false;
      brick.hp = brick.maxHp || 1;
      brick.damaged = false;
    }
    if (brick.type === "moving") {
      brick.x = brick.originX + Math.sin(simulationFrame * 0.035 + brick.movePhase) * brick.moveAmplitude;
    }
    if (brick.falling) {
      brick.y += brick.fallSpeed;
      if (brick.y > HEIGHT) bricks.splice(index, 1);
    }
  }
}

function applyPowerUp(powerUp, catcherId = multiplayerPlayerId) {
  if (powerUp.type === "wide") {
    const targetPaddle = getPaddleForPlayer(catcherId);
    const center = targetPaddle.x + targetPaddle.width / 2;
    targetPaddle.width = Math.min(145, BASE_PADDLE_WIDTH + 45);
    targetPaddle.x = Math.max(0, Math.min(WIDTH - targetPaddle.width, center - targetPaddle.width / 2));
    if (targetPaddle === paddle) widePaddleTimer = 600;
    else targetPaddle.widePaddleTimer = 600;
    powerUpNotice = { text: "WIDE PADDLE", timer: 100, color: powerUp.color };
  } else if (powerUp.type === "slow") {
    slowBallTimer = 480;
    powerUpNotice = { text: "SLOW BALL", timer: 100, color: powerUp.color };
  } else if (powerUp.type === "magnet") {
    magnetTimer = 600;
    magnetPlayerId = catcherId || null;
    powerUpNotice = { text: "MAGNET", timer: 100, color: powerUp.color };
  } else if (powerUp.type === "multi") {
    if (extraBalls.length < 5) spawnExtraBall(ball);
    powerUpNotice = { text: "MULTIBALL", timer: 100, color: powerUp.color };
  } else if (powerUp.type === "life") {
    lives = Math.min(STARTING_LIVES + 3, lives + 1);
    powerUpNotice = { text: "+1 LIFE", timer: 100, color: powerUp.color };
  }
}

function updatePowerUps() {
  for (let index = powerUps.length - 1; index >= 0; index--) {
    const powerUp = powerUps[index];
    powerUp.y += powerUp.speed;
    let catcherId = multiplayerActive ? multiplayerPlayerId : null;
    let caught = powerUp.x < paddle.x + paddle.width &&
      powerUp.x + powerUp.width > paddle.x &&
      powerUp.y < paddle.y + paddle.height &&
      powerUp.y + powerUp.height > paddle.y;
    if (!caught && multiplayerActive && multiplayerHost) {
      for (const player of multiplayerPlayers) {
        if (player.id === multiplayerPlayerId || player.ai) continue;
        const playerY = Number.isFinite(player.y) ? player.y : paddle.y - 30;
        if (powerUp.x < player.x + player.width &&
            powerUp.x + powerUp.width > player.x &&
            powerUp.y < playerY + paddle.height &&
            powerUp.y + powerUp.height > playerY) {
          caught = true;
          catcherId = player.id;
          break;
        }
      }
    }
    if (caught) {
      applyPowerUp(powerUp, catcherId);
      powerUps.splice(index, 1);
    } else if (powerUp.y > HEIGHT) {
      powerUps.splice(index, 1);
    }
  }
}

function updateTemporaryPowerUps() {
  if (widePaddleTimer > 0 && --widePaddleTimer === 0) {
    const center = paddle.x + paddle.width / 2;
    paddle.width = BASE_PADDLE_WIDTH;
    paddle.x = Math.max(0, Math.min(WIDTH - paddle.width, center - paddle.width / 2));
  }
  if (multiplayerActive && multiplayerHost) {
    for (const player of multiplayerPlayers) {
      if (player.id === multiplayerPlayerId || player.ai || (player.widePaddleTimer || 0) <= 0) continue;
      player.widePaddleTimer--;
      if (player.widePaddleTimer === 0) {
        const center = player.x + player.width / 2;
        player.width = BASE_PADDLE_WIDTH;
        player.x = Math.max(0, Math.min(WIDTH - player.width, center - player.width / 2));
      }
    }
  }
  if (slowBallTimer > 0) slowBallTimer--;
  if (magnetTimer > 0 && --magnetTimer === 0) {
    if (ball.stuck) launchStuckBall(getPaddleForPlayer(ball.stuckPlayerId));
    magnetPlayerId = null;
  }
  if (powerUpNotice && --powerUpNotice.timer <= 0) powerUpNotice = null;
}

function createLevelLasers(currentLevel) {
  if (currentLevel < 3) return [];
  const count = Math.min(3, Math.floor((currentLevel - 1) / 2));
  return Array.from({ length: count }, function (_, index) {
    return {
      x: 60 + Math.random() * (WIDTH - 120),
      mode: "idle",
      timer: 110 + index * 100 + Math.random() * 90,
      hitRegistered: false
    };
  });
}

function updateLasers() {
  for (const laser of lasers) {
    if (laser.mode === "idle") {
      if (--laser.timer <= 0) {
        laser.mode = "warning";
        laser.timer = 54;
        laser.hitRegistered = false;
      }
    } else if (laser.mode === "warning") {
      if (--laser.timer <= 0) {
        laser.mode = "firing";
        laser.timer = 18;
      }
    } else if (--laser.timer <= 0) {
      laser.mode = "idle";
      laser.timer = 130 + Math.random() * 120;
    }

    if (laser.mode === "firing" && !laser.hitRegistered) {
      laser.hitRegistered = true;
      if (!invincible && laser.x >= paddle.x && laser.x <= paddle.x + paddle.width) {
        loseLife();
        return true;
      }
      const beamWidth = 7;
      const hitMainBall = ball.x < laser.x + beamWidth && ball.x + ball.width > laser.x - beamWidth;
      if (!invincible && hitMainBall) {
        loseLife();
        return true;
      }
      extraBalls = extraBalls.filter(function (activeBall) {
        return activeBall.x >= laser.x + beamWidth || activeBall.x + activeBall.width <= laser.x - beamWidth;
      });
    }
  }
  return false;
}

function drawPowerUps() {
  for (const powerUp of powerUps) {
    ctx.save();
    ctx.translate(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = powerUp.color;
    ctx.shadowColor = powerUp.color;
    ctx.shadowBlur = 10;
    ctx.fillRect(-powerUp.width / 2, -powerUp.height / 2, powerUp.width, powerUp.height);
    ctx.restore();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.font = "bold 9px Courier New";
    ctx.fillText(powerUp.label, powerUp.x + powerUp.width / 2, powerUp.y + 14);
  }
}

function drawLasers() {
  for (const laser of lasers) {
    if (laser.mode === "idle") continue;
    ctx.save();
    ctx.strokeStyle = laser.mode === "warning" ? "#ff3030" : "#ff4d2e";
    ctx.shadowColor = "#ff2020";
    ctx.shadowBlur = laser.mode === "warning" ? 9 : 22;
    ctx.globalAlpha = laser.mode === "warning" ? 0.55 + Math.sin(Date.now() / 60) * 0.35 : 1;
    ctx.lineWidth = laser.mode === "warning" ? 3 : 13;
    ctx.beginPath();
    ctx.moveTo(laser.x, 0);
    ctx.lineTo(laser.x, HEIGHT);
    ctx.stroke();
    if (laser.mode === "firing") {
      ctx.strokeStyle = "#fff2df";
      ctx.shadowBlur = 0;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();
  }
}

function updateAiPaddles() {
  const activeBalls = [ball].concat(extraBalls);
  for (const bot of aiPaddles) {
    let target = bot.assignedBall && activeBalls.includes(bot.assignedBall) ? bot.assignedBall : null;
    if (!target) {
      let bestDistance = Infinity;
      for (const activeBall of activeBalls) {
        const distance = Math.abs((activeBall.x + activeBall.width / 2) - (bot.x + bot.width / 2));
        if (distance < bestDistance) {
          target = activeBall;
          bestDistance = distance;
        }
      }
    }

    if (!target) continue;

    if (bot.lobbyAI) {
      let targetX = target.x + target.width / 2;
      if (target.vy > 0) {
        const framesToPaddle = Math.max(0, (bot.y - target.y) / target.vy);
        const span = WIDTH - target.width;
        const foldedX = ((target.x + target.vx * framesToPaddle) % (span * 2) + span * 2) % (span * 2);
        targetX = foldedX > span ? span * 2 - foldedX : foldedX;
        targetX += target.width / 2;
      }
      const formationSlot = bot.lobbyIndex % 6;
      targetX += (formationSlot - 2.5) * 58;
      targetX = Math.max(bot.width / 2, Math.min(WIDTH - bot.width / 2, targetX));
      bot.previousX = bot.x;
      bot.previousY = bot.y;
      const dx = targetX - (bot.x + bot.width / 2);
      bot.x += Math.sign(dx) * Math.min(bot.speed, Math.abs(dx));
      bot.x = Math.max(0, Math.min(WIDTH - bot.width, bot.x));
      continue;
    }

    const mainBallDistance = Math.abs((ball.x + ball.width / 2) - (bot.x + bot.width / 2));
    const nearestDistance = Math.min(...activeBalls.map(function (activeBall) {
      return Math.abs((activeBall.x + activeBall.width / 2) - (bot.x + bot.width / 2));
    }));
    if (ball && ball.y >= 0 && mainBallDistance <= nearestDistance + 12) {
      target = ball;
    }

    bot.previousX = bot.x;
    bot.previousY = bot.y;
    const targetX = target.x + target.width / 2;
    const dx = targetX - (bot.x + bot.width / 2);
    bot.x += Math.sign(dx) * Math.min(bot.speed, Math.abs(dx));
    const minX = 0;
    const maxX = WIDTH - bot.width;
    bot.x = Math.max(minX, Math.min(maxX, bot.x));
  }
}

function bounceOffAiPaddles(activeBall) {
  for (const bot of aiPaddles) {
    if (bounceOffPaddle(activeBall, bot)) {
      return true;
    }
  }
  return false;
}

function bounceOffMultiplayerPaddles(activeBall) {
  for (const player of multiplayerPlayers) {
    if (player.id === multiplayerPlayerId || player.ai) continue;
    const remotePaddle = {
      x: player.x,
      y: Number.isFinite(player.y) ? player.y : paddle.y - 30,
      width: Number.isFinite(player.width) ? player.width : BASE_PADDLE_WIDTH,
      height: paddle.height,
      angle: Number.isFinite(player.angle) ? player.angle : 0,
      previousX: Number.isFinite(player.previousX) ? player.previousX : player.x,
      previousY: Number.isFinite(player.previousY) ? player.previousY : (Number.isFinite(player.y) ? player.y : paddle.y - 30),
      previousAngle: Number.isFinite(player.previousAngle) ? player.previousAngle : (Number.isFinite(player.angle) ? player.angle : 0)
    };
    if (bounceOffPaddle(activeBall, remotePaddle)) return player.id;
  }
  return null;
}

// ------------------------------------------------------------
// DRAW: paints everything on the canvas. Black background,
// white shapes.
// ------------------------------------------------------------
function draw() {
  const skin = getCurrentSkin();
  ctx.fillStyle = skin.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.save();
  if (screenShakeFrames > 0) {
    ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
  }

  ctx.strokeStyle = "rgba(255, 255, 255, 0.035)";
  ctx.lineWidth = 1;
  for (let x = 24; x < WIDTH; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }
  for (let y = 24; y < HEIGHT; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }

  ctx.fillStyle = "white";
  ctx.font = "16px Courier New";
  ctx.textAlign = "left";
  ctx.fillText("LEVEL " + (level + 1) + " / " + LEVEL_COUNT, 16, 24);
  ctx.textAlign = "right";
  ctx.fillText("LIVES " + lives, WIDTH - 16, 24);
  ctx.textAlign = "left";
  ctx.font = "13px Courier New";
  ctx.fillText("BRICK STREAK " + brickHitStreak + "/" + MULTIBALL_HIT_STREAK, 16, 46);
  ctx.fillText("MOLA " + mola, 16, 64);
  if (widePaddleTimer > 0 || slowBallTimer > 0 || magnetTimer > 0) {
    ctx.textAlign = "center";
    ctx.font = "10px Courier New";
    const active = [];
    if (widePaddleTimer > 0) active.push("WIDE " + Math.ceil(widePaddleTimer / 60) + "s");
    if (slowBallTimer > 0) active.push("SLOW " + Math.ceil(slowBallTimer / 60) + "s");
    if (magnetTimer > 0) active.push("MAGNET " + Math.ceil(magnetTimer / 60) + "s");
    ctx.fillText(active.join("  "), WIDTH / 2, 44);
  }
  ctx.textAlign = "right";
  ctx.fillText("BALLS " + (extraBalls.length + 1), WIDTH - 16, 46);
  if (slowBallTimer > 0 || isNextBotAttackActive()) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffd166";
    ctx.fillText(isNextBotAttackActive() ? "NEXTBOT SLOW-MO" : "SLOW BALL", WIDTH / 2, 24);
  }
  if (invincible) {
    ctx.fillStyle = "#ffd166";
    ctx.fillText("INVINCIBLE", WIDTH - 16, 64);
  }

  ctx.fillStyle = "white";
  ctx.save();
  ctx.translate(paddle.x + paddle.width / 2, paddle.y + paddle.height / 2);
  ctx.rotate(paddle.angle * Math.PI / 180);
  const squashEase = paddleSquashFrames > 0 ? Math.sin((paddleSquashFrames / 6) * Math.PI / 2) : 0;
  const squash = 1 + squashEase * 0.15;
  ctx.scale(squash, 1 - squashEase * 0.2);
  ctx.fillStyle = paddle.color || skin.paddle;
  ctx.fillRect(-paddle.width / 2, -paddle.height / 2, paddle.width, paddle.height);
  ctx.restore();
  if (multiplayerActive) {
    for (const player of multiplayerPlayers) {
      if (player.id === multiplayerPlayerId || player.ai) continue;
      const playerY = Number.isFinite(player.y) ? player.y : paddle.y - 30;
      const playerWidth = Number.isFinite(player.width) ? player.width : BASE_PADDLE_WIDTH;
      ctx.save();
      ctx.translate(player.x + playerWidth / 2, playerY + paddle.height / 2);
      ctx.rotate((player.angle || 0) * Math.PI / 180);
      ctx.fillStyle = player.color || skin.accent;
      ctx.fillRect(-playerWidth / 2, -paddle.height / 2, playerWidth, paddle.height);
      ctx.restore();
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.font = "10px Courier New";
      ctx.fillText(player.name || "PLAYER", player.x + playerWidth / 2, playerY - 6);
    }
  }
  for (const bot of aiPaddles) {
    ctx.fillStyle = bot.color || skin.accent;
    ctx.fillRect(bot.x, bot.y, bot.width, bot.height);
    if (bot.lobbyName) {
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.font = "10px Courier New";
      ctx.fillText(bot.lobbyName, bot.x + bot.width / 2, bot.y - 5);
    }
  }
  if (ballTrail.length) {
    ballTrail.forEach(function (position, index) {
      ctx.globalAlpha = 0.5 * ((index + 1) / ballTrail.length);
      ctx.fillStyle = skin.ball;
      ctx.beginPath();
      ctx.arc(position.x, position.y, ball.width * 0.32, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
  for (const activeBall of [ball].concat(extraBalls)) {
    const ballColor = activeBall === ball ? (activeBall.color || skin.ball) : EXTRA_BALL_COLOR;
    ctx.fillStyle = ballColor;
    ctx.shadowColor = ballColor;
    ctx.shadowBlur = activeBall === ball ? 7 : 13;
    ctx.fillRect(activeBall.x, activeBall.y, activeBall.width, activeBall.height);
  }
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";

  drawBricks();  // bricks.js
  for (const flash of brickFlashes) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(flash.x, flash.y, flash.width, flash.height);
  }
  for (const particle of particles) {
    ctx.globalAlpha = particle.life / particle.maxLife;
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  }
  ctx.globalAlpha = 1;
  drawPowerUps();
  drawLasers();
  drawNextBots();
  if (powerUpNotice) {
    ctx.fillStyle = powerUpNotice.color;
    ctx.textAlign = "center";
    ctx.font = "bold 14px Courier New";
    ctx.fillText(powerUpNotice.text, WIDTH / 2, 90);
  }
  if (perfectNotice) {
    ctx.fillStyle = "#fff176";
    ctx.textAlign = "center";
    ctx.font = "bold 12px Courier New";
    ctx.fillText("PERFECT", WIDTH / 2, paddle.y - 22 - (48 - perfectNotice.timer) * 0.35);
  }
  if (comboNotice) {
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "bold 12px Courier New";
    ctx.fillText(comboNotice.text, WIDTH / 2, 82 - (36 - comboNotice.timer) * 0.4);
  }

  if (gameOver || gameWon) {
    ctx.fillStyle = "black";
    ctx.fillRect(75, HEIGHT / 2 - 55, WIDTH - 150, 110);
    ctx.strokeStyle = "white";
    ctx.strokeRect(75, HEIGHT / 2 - 55, WIDTH - 150, 110);
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = "24px Courier New";
    ctx.fillText(gameWon ? "ALL LEVELS CLEARED!" : "GAME OVER", WIDTH / 2, HEIGHT / 2 - 25);
    ctx.font = "13px Courier New";
    ctx.fillText("SCORE " + mola + "   BEST " + highScore, WIDTH / 2, HEIGHT / 2 + 2);
    ctx.fillStyle = newBest ? "#fff176" : "#ffffff";
    ctx.fillText(newBest ? "NEW BEST" : "Press R to play again", WIDTH / 2, HEIGHT / 2 + 25);
    if (newBest) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "11px Courier New";
      ctx.fillText("Press R to play again", WIDTH / 2, HEIGHT / 2 + 43);
    }
  } else if (paused) {
    ctx.fillStyle = "black";
    ctx.fillRect(150, HEIGHT / 2 - 35, WIDTH - 300, 70);
    ctx.strokeStyle = "white";
    ctx.strokeRect(150, HEIGHT / 2 - 35, WIDTH - 300, 70);
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = "24px Courier New";
    ctx.fillText("PAUSED", WIDTH / 2, HEIGHT / 2 - 4);
    ctx.font = "14px Courier New";
    ctx.fillText("Press Escape to resume", WIDTH / 2, HEIGHT / 2 + 20);
  }
  ctx.restore();
}

function loseLife() {
  if (invincible) return;
  lives--;
  autoPlanCooldown = 0;
  brickHitStreak = 0;
  extraBalls = [];
  if (lives <= 0) {
    gameOver = true;
    brickHitStreak = 0;
  } else {
    resetBall();
  }
}

function advanceLevel() {
  if (level + 1 >= LEVEL_COUNT) {
    gameWon = true;
    return;
  }
  level++;
  bricks = makeBricks(level);
  setNextBotsForLevel(level);
  lasers = createLevelLasers(level);
  powerUps = [];
  resetBall();
}

function restartGame() {
  level = 0;
  lives = STARTING_LIVES;
  mola = 0;
  newBest = false;
  aiPaddles = [];
  gameOver = false;
  gameWon = false;
  setPaused(false);
  paddle.angle = 0;
  autoPlanCooldown = 0;
  brickHitStreak = 0;
  extraBalls = [];
  powerUps = [];
  widePaddleTimer = 0;
  slowBallTimer = 0;
  magnetTimer = 0;
  magnetPlayerId = null;
  powerUpNotice = null;
  hitStopFrames = 0;
  screenShakeFrames = 0;
  particles = [];
  brickFlashes = [];
  paddleSquashFrames = 0;
  perfectNotice = null;
  comboNotice = null;
  paddle.width = BASE_PADDLE_WIDTH;
  selectNextBots();
  bricks = makeBricks(level);
  setNextBotsForLevel(level);
  lasers = createLevelLasers(level);
  resetBall();
}

window.addEventListener("load", function () {
  refreshControlButtons();
  applySkin(currentSkin);
});


// ------------------------------------------------------------
// THE GAME LOOP
// The browser calls frame() every time it is ready to draw.
// Some screens are faster than others, so we make sure update()
// always runs exactly 60 times per second on every computer.
// ------------------------------------------------------------
const STEP = 1000 / 60;
let lastTime = 0;
let leftover = 0;

function frame(now) {
  leftover = leftover + (now - lastTime);
  lastTime = now;

  // If the tab was hidden for a while, don't try to catch up.
  if (leftover > 250) {
    leftover = 250;
  }

  while (leftover >= STEP) {
    update();
    leftover = leftover - STEP;
  }

  draw();
  drawTitleDemo();
  requestAnimationFrame(frame);
}

const titleDemoCanvas = document.getElementById("title-demo");
const titleDemoContext = titleDemoCanvas ? titleDemoCanvas.getContext("2d") : null;
const titleDemo = {
  initialized: false,
  ball: { x: 300, y: 130, width: 10, height: 10, vx: 3.4, vy: -3.6 },
  paddleX: 255,
  bricks: []
};

function drawTitleDemo() {
  if (!titleDemoContext || mainMenu.hidden) return;
  const demoContext = titleDemoContext;
  const demoWidth = titleDemoCanvas.width;
  const demoHeight = titleDemoCanvas.height;
  if (!titleDemo.initialized) {
    titleDemo.bricks = makeBricks(0).map(function (brick) {
      return Object.assign({}, brick, { y: brick.y - 48 });
    });
    titleDemo.initialized = true;
  }

  const activeBall = titleDemo.ball;
  const landingY = demoHeight - 24;
  let framesToLand = activeBall.vy > 0 ? (landingY - activeBall.y) / activeBall.vy : 0;
  let predictedX = activeBall.x + Math.max(0, framesToLand) * activeBall.vx;
  const wallSpan = demoWidth - activeBall.width;
  predictedX = ((predictedX % (wallSpan * 2)) + wallSpan * 2) % (wallSpan * 2);
  if (predictedX > wallSpan) predictedX = wallSpan * 2 - predictedX;
  const targetPaddleX = predictedX - 45;
  titleDemo.paddleX += Math.max(-5, Math.min(5, targetPaddleX - titleDemo.paddleX));

  activeBall.x += activeBall.vx;
  activeBall.y += activeBall.vy;
  if (activeBall.x < 0 || activeBall.x + activeBall.width > demoWidth) activeBall.vx *= -1;
  if (activeBall.y < 0) activeBall.vy = Math.abs(activeBall.vy);
  for (let index = titleDemo.bricks.length - 1; index >= 0; index--) {
    const brick = titleDemo.bricks[index];
    if (boxesTouch(activeBall, brick)) {
      titleDemo.bricks.splice(index, 1);
      activeBall.vy *= -1;
      break;
    }
  }
  if (activeBall.y + activeBall.height >= landingY) {
    activeBall.vy = -Math.abs(activeBall.vy);
    activeBall.y = landingY - activeBall.height;
  }
  if (!titleDemo.bricks.length) titleDemo.bricks = makeBricks(0);

  demoContext.fillStyle = "#05070a";
  demoContext.fillRect(0, 0, demoWidth, demoHeight);
  for (const brick of titleDemo.bricks) {
    demoContext.fillStyle = brick.color;
    demoContext.fillRect(brick.x, brick.y, brick.width, brick.height);
    demoContext.fillStyle = "rgba(255,255,255,0.7)";
    demoContext.fillRect(brick.x + 1, brick.y, brick.width - 2, 1);
  }
  demoContext.fillStyle = "#ffffff";
  demoContext.fillRect(activeBall.x, activeBall.y, activeBall.width, activeBall.height);
  demoContext.fillRect(titleDemo.paddleX, landingY + 4, 90, 8);
}

function start() {
  bricks = makeBricks(level);  // bricks.js
  resetBall();
  selectNextBots();
  lastTime = performance.now();
  requestAnimationFrame(frame);
}

// Wait until all three script files have loaded, then start.
window.addEventListener("load", start);
