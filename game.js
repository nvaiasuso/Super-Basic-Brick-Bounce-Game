// ============================================================
// BLOCK BREAKER (base game)
//
// game.js  = the canvas, the ball, the paddle, and the game loop
// bricks.js     = where the bricks are and how they are drawn
// collisions.js = what happens when the ball touches things
// ============================================================

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const secretModeImages = [
  "frame0.jpg",
  "images (2).jpeg",
  "IMG_20261109_113728.jpg",
  "IMG_20261109_113726.jpg",
  "IMG_20261109_113725.jpg",
  "IMG_20261109_113721.jpg",
  "IMG_20261109_113719.jpg",
  "IMG_20261109_113716.jpg",
  "IMG_20261109_113714.jpg",
  "IMG_20261109_113712.jpg",
  "IMG_20261109_113710.jpg"
].map(function (source) {
  const image = new Image();
  image.src = new URL(source, document.baseURI).href;
  return image;
});
let secretImageMode = false;
let secretImageSequenceIndex = 0;
let secretImageTextIndex = 0;
let nextSecretSpeechAt = 0;

function drawSecretImage(x, y, width, height, imageIndex = 0) {
  const image = secretModeImages[Math.floor(Math.abs(imageIndex)) % secretModeImages.length];
  if (!image.complete || !image.naturalWidth) return false;
  ctx.drawImage(image, x, y, width, height);
  return true;
}

const textlessMode = document.documentElement.classList.contains("textless");
if (textlessMode) {
  ctx.fillText = function () {};
}

const nativeCanvasFillText = ctx.fillText.bind(ctx);
const nativeCanvasStrokeText = ctx.strokeText.bind(ctx);
const secretTextCanvas = document.createElement("canvas");
const secretTextContext = secretTextCanvas.getContext("2d");
ctx.fillText = function (text, x, y, maxWidth) {
  if (!secretImageMode || textlessMode || !secretTextContext) {
    return Number.isFinite(maxWidth)
      ? nativeCanvasFillText(text, x, y, maxWidth)
      : nativeCanvasFillText(text, x, y);
  }

  const image = secretModeImages[secretImageTextIndex++ % secretModeImages.length];
  if (!image.complete || !image.naturalWidth) {
    return Number.isFinite(maxWidth)
      ? nativeCanvasFillText(text, x, y, maxWidth)
      : nativeCanvasFillText(text, x, y);
  }

  const value = String(text);
  const metrics = ctx.measureText(value);
  const fontSize = Number((ctx.font.match(/(\d+(?:\.\d+)?)px/) || [])[1]) || 14;
  const ascent = Math.ceil(metrics.actualBoundingBoxAscent || fontSize * 0.8);
  const descent = Math.ceil(metrics.actualBoundingBoxDescent || fontSize * 0.25);
  const padding = Math.ceil(Math.max(2, fontSize * 0.16));
  const textWidth = Number.isFinite(maxWidth) ? Math.min(metrics.width, maxWidth) : metrics.width;
  const textHeight = ascent + descent + padding * 2;
  secretTextCanvas.width = Math.max(1, Math.ceil(textWidth + padding * 2));
  secretTextCanvas.height = Math.max(1, textHeight);
  secretTextContext.clearRect(0, 0, secretTextCanvas.width, secretTextCanvas.height);
  secretTextContext.font = ctx.font;
  secretTextContext.textAlign = "left";
  secretTextContext.textBaseline = "alphabetic";
  secretTextContext.direction = ctx.direction;
  secretTextContext.fillStyle = "white";
  if (Number.isFinite(maxWidth)) {
    secretTextContext.fillText(value, padding, padding + ascent, maxWidth);
  } else {
    secretTextContext.fillText(value, padding, padding + ascent);
  }
  secretTextContext.globalCompositeOperation = "source-in";
  secretTextContext.drawImage(image, 0, 0, secretTextCanvas.width, secretTextCanvas.height);
  secretTextContext.globalCompositeOperation = "source-over";

  let left = x - padding;
  if (ctx.textAlign === "center") {
    left = x - secretTextCanvas.width / 2;
  } else if (ctx.textAlign === "right" || ctx.textAlign === "end") {
    left = x - secretTextCanvas.width + padding;
  }
  let baselineOffset = 0;
  if (ctx.textBaseline === "top") baselineOffset = ascent;
  else if (ctx.textBaseline === "hanging") baselineOffset = ascent * 0.8;
  else if (ctx.textBaseline === "middle") baselineOffset = (ascent - descent) / 2;
  else if (ctx.textBaseline === "bottom" || ctx.textBaseline === "ideographic") baselineOffset = -descent;
  ctx.drawImage(secretTextCanvas, left, y - baselineOffset - padding);

  ctx.save();
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = Math.max(2, fontSize * 0.14);
  ctx.lineJoin = "round";
  if (Number.isFinite(maxWidth)) {
    nativeCanvasStrokeText(text, x, y, maxWidth);
  } else {
    nativeCanvasStrokeText(text, x, y);
  }
  ctx.restore();
};

function updateSecretModeSpeech(now) {
  if (!secretImageMode || now < nextSecretSpeechAt) return;
  nextSecretSpeechAt = now + 8000;
  const speech = window.speechSynthesis;
  if (!speech || typeof window.SpeechSynthesisUtterance !== "function" || speech.speaking) return;
  const utterance = new window.SpeechSynthesisUtterance("Fay");
  utterance.pitch = 1.8;
  utterance.rate = 1.35;
  utterance.volume = 0.8;
  speech.speak(utterance);
}

function setSecretImageMode(enabled) {
  secretImageMode = Boolean(enabled);
  secretImageTextIndex = 0;
  nextSecretSpeechAt = performance.now() + 800;
  const button = document.getElementById("secret-image-toggle");
  if (button) {
    button.setAttribute("aria-pressed", String(secretImageMode));
    button.textContent = "Secret photo mode: " + (secretImageMode ? "On" : "Off");
  }
  if (!secretImageMode && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

const WIDTH = canvas.width;
const HEIGHT = canvas.height;


// ------------------------------------------------------------
// THE BALL
// x and y are the top-left corner. vx and vy are how many pixels
// the ball moves each update (vx = sideways, vy = up/down).
// A positive vy means the ball is moving DOWN the screen.
// ------------------------------------------------------------
const BALL_SPEED = 5;
const EXTRA_BALL_COLOR = "#55ff78";
const BASE_PADDLE_WIDTH = 90;
const ADMIN_SPAWN_LIMITS = { balls: 24, bricks: 256, powerUps: 24, lasers: 24, aiPaddles: 8, gunnerBullets: 256 };
const POWERUP_DROP_CHANCE = 0.12;
const GAME_MODES = [
  { label: "Normal", description: "Standard bricks, speed, and power-up odds.", accent: "#ffffff", background: "#000000", ballSpeedMultiplier: 1, powerUpDropChance: 0.12 },
  { label: "Dark", description: "Dark arena with a slightly faster ball.", accent: "#8ec5ff", background: "#02070b", ballSpeedMultiplier: 1.08, powerUpDropChance: 0.14 },
  { label: "Chaos", description: "Fast ball and more frequent power-ups.", accent: "#ff6b6b", background: "#1b0505", ballSpeedMultiplier: 1.28, powerUpDropChance: 0.18 },
  { label: "Neon", description: "Bright arena, faster ball, and extra drops.", accent: "#39ff14", background: "#050b1a", ballSpeedMultiplier: 1.15, powerUpDropChance: 0.16 },
  { label: "Retro", description: "Slower ball and fewer power-up drops.", accent: "#ffd166", background: "#1f1a0c", ballSpeedMultiplier: 0.96, powerUpDropChance: 0.1 },
  { label: "Void", description: "A dark arena with a much faster ball.", accent: "#b38cff", background: "#070912", ballSpeedMultiplier: 1.22, powerUpDropChance: 0.15 },
  { label: "Sunset", description: "Warm colors and frequent power-ups.", accent: "#ff8c69", background: "#220d09", ballSpeedMultiplier: 1.1, powerUpDropChance: 0.17 },
  { label: "Ice", description: "Slower ball for a more deliberate run.", accent: "#7be7ff", background: "#08141b", ballSpeedMultiplier: 0.92, powerUpDropChance: 0.12 },
  { label: "Arena", description: "Quick play with the highest standard drop rate.", accent: "#f4faff", background: "#0d1118", ballSpeedMultiplier: 1.18, powerUpDropChance: 0.2 },
  { label: "Candy", description: "Balanced speed with generous power-ups.", accent: "#ff75d8", background: "#1a0d1e", ballSpeedMultiplier: 1.05, powerUpDropChance: 0.19 },
  { label: "Boss Rush", description: "Every level is a boss encounter.", accent: "#ff4f6d", background: "#18070d", ballSpeedMultiplier: 1.1, powerUpDropChance: 0.16, bossRush: true },
  { label: "Endless", description: "Keep playing past level 100 as layouts cycle.", accent: "#d6ff55", background: "#080d0c", ballSpeedMultiplier: 1, powerUpDropChance: 0.14, endless: true },
  { label: "Swarm", description: "Twice as many nextbots appear as levels advance.", accent: "#55d9ff", background: "#06131a", ballSpeedMultiplier: 1.08, powerUpDropChance: 0.16, nextbotMultiplier: 2 },
  { label: "Inverted", description: "Left and right paddle controls are reversed.", accent: "#ffad55", background: "#15100a", ballSpeedMultiplier: 1, powerUpDropChance: 0.14, reverseControls: true },
  { label: "Laserstorm", description: "Laser hazards appear twice as often.", accent: "#ff4f6d", background: "#18070d", ballSpeedMultiplier: 1.08, powerUpDropChance: 0.16, laserMultiplier: 2 },
  { label: "Glass Cannon", description: "One life, a very fast ball, and plentiful power-ups.", accent: "#f0abfc", background: "#16091b", ballSpeedMultiplier: 1.45, powerUpDropChance: 0.25, startingLives: 1 },
  { label: "Fortress", description: "Normal bricks take two hits; the ball moves slower.", accent: "#67e8f9", background: "#071318", ballSpeedMultiplier: 0.9, powerUpDropChance: 0.14, armoredBricks: true },
  { label: "Overdrive", description: "Very fast ball, extra power-ups, and more nextbots.", accent: "#fb923c", background: "#1b0c05", ballSpeedMultiplier: 1.55, powerUpDropChance: 0.22, nextbotMultiplier: 1.5 },
  { label: "Co-op Swarm", description: "Five lives and larger enemy waves for multiplayer teams.", accent: "#55d9ff", background: "#06131a", ballSpeedMultiplier: 1.05, powerUpDropChance: 0.2, nextbotMultiplier: 2, startingLives: 5 },
  { label: "Co-op Boss Run", description: "Bosses on every stage and five shared team lives.", accent: "#ff8c69", background: "#1b0c05", ballSpeedMultiplier: 1, powerUpDropChance: 0.2, bossRush: true, startingLives: 5 }
];
const PADDLE_TILT_SPEED = 2;
const DASH_DISTANCE = 120;
const PADDLE_JUMP_HEIGHT = 72;
const PADDLE_JUMP_FRAMES = 28;
const PADDLE_JUMP_COOLDOWN = 72;
const MAX_PADDLE_TILT = 35;
const STARTING_LIVES = 3;
let startingLives = STARTING_LIVES;
const LEVEL_COUNT = 100;
let randomEverythingEnabled = false;
let currentTurnSpeed = PADDLE_TILT_SPEED;
let currentDashDistance = DASH_DISTANCE;
let randomRunScoreMultiplier = 1;
let randomRunPowerUpChance = POWERUP_DROP_CHANCE;
let randomRunOriginalStats = null;
let baseBallSpeed = BALL_SPEED;
let basePaddleWidth = BASE_PADDLE_WIDTH;
let powerUpDropsEnabled = true;
let laserDamageEnabled = true;
let bossMinionsEnabled = true;
let adminNextBotSpeedMultiplier = 1;
let bossHealthBoost = 1;
const MULTIBALL_HIT_STREAK = 5;
const SHIELD_DURATION_FRAMES = 300;
const FREEZE_DURATION_FRAMES = 180;
const FREEZE_RADIUS = 190;
const SKINS = [
  { label: "Classic", paddle: "#ffffff", ball: "#ffffff", accent: "#ffffff", background: "#000000" },
  { label: "Neon Pink", paddle: "#ff4fd8", ball: "#ff9af3", accent: "#ffd5f5", background: "#140712" },
  { label: "Laser Blue", paddle: "#4fe6ff", ball: "#7ad9ff", accent: "#d9f7ff", background: "#021217" },
  { label: "Sunset Gold", paddle: "#ffd166", ball: "#ffb703", accent: "#fff2b3", background: "#180d00" }
];
const CONTROL_KEYS = {
  left: "arrowleft",
  right: "arrowright",
  jump: "j",
  tiltLeft: "arrowdown",
  tiltRight: "arrowup"
};
const CONTROL_LABELS = {
  left: "Move left",
  right: "Move right",
  tiltLeft: "Tilt left",
  tiltRight: "Tilt right",
  jump: "Jump"
};
let currentSkin = 0;
let currentMode = 0;
let mobileControlsEnabled = true;
let extraBalls = [];
let brickHitStreak = 0;
let idleBrickFrames = 0;
let idleMemeEnabled = true;
let aimLaserEnabled = false;
let idleMemeHideTimer = null;
let idleMemeFadeTimer = null;
const IDLE_MEME_DELAY_FRAMES = 600;
const idleMeme = document.getElementById("idle-meme");
const idleMemeImage = document.getElementById("idle-meme-image");
let mola = 0;
let highScore = readHighScore();
let newBest = false;
let activeChallenge = null;
let dailyChallenge = null;
let aiPaddles = [];
let adminGunners = [];
let adminGunnerBullets = [];
let powerUps = [];
let widePaddleTimer = 0;
let slowBallTimer = 0;
let fastBallTimer = 0;
let piercingTimer = 0;
let shieldCharges = 0;
let shieldTimer = 0;
let paddleFacingDirection = 1;
let magnetTimer = 0;
let magnetPlayerId = null;
let powerUpNotice = null;
let levelNotice = null;
let lasers = [];
let rockets = [];
let adminMissile = null;
let adminMissileArmed = false;
let adminExplosion = null;
let adminMousePosition = { x: WIDTH / 2, y: HEIGHT / 2 };
let adminSpawnAtCursor = false;
let adminInspectEnabled = false;
let adminDebugEnabled = false;
let inspectedObject = null;
let nextBotLasersEnabled = true;
let enemyShots = [];
let autoAdvanceLevel = true;
let fpsEnabled = false;
let websiteFpsEnabled = false;
let websiteFpsFrameCount = 0;
let websiteFpsSampleStart = 0;
let websiteFps = 0;
let gameFpsFrameCount = 0;
let gameFpsSampleStart = 0;
let gameFps = 0;
let simulationSpeed = 1;
const adminVisibility = {
  blocks: true,
  enemies: true,
  lasers: true,
  nextbots: true,
  balls: true,
  extras: true,
  hitboxes: false,
  trajectory: false,
  paddlePlan: false,
  timers: false,
};
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
  recordDailyChallengeScore();
  if (mola <= highScore) return;
  highScore = mola;
  newBest = true;
  try {
    localStorage.setItem("blockBreakerHighScore", String(highScore));
  } catch (error) {
    // Keep the current run playable when storage is unavailable.
  }
}

const CAREER_RECORDS_KEY = "blockBreakerCareerRecords";
const CAREER_GOALS = { brickHits: 100, powerUps: 10, bosses: 3, levels: 10 };

function readCareerRecords() {
  const records = { brickHits: 0, powerUps: 0, bosses: 0, levels: 0 };
  try {
    const saved = JSON.parse(localStorage.getItem(CAREER_RECORDS_KEY) || "{}");
    for (const key of Object.keys(records)) {
      if (Number.isFinite(saved[key])) records[key] = Math.max(0, saved[key]);
    }
  } catch (error) {
    // Keep an empty career board when storage is unavailable or invalid.
  }
  return records;
}

let careerRecords = readCareerRecords();

function renderCareerRecords() {
  for (const item of document.querySelectorAll("[data-career-stat]")) {
    const stat = item.dataset.careerStat;
    const goal = CAREER_GOALS[stat];
    if (!goal) continue;
    const progress = Math.min(goal, careerRecords[stat]);
    const meter = item.querySelector("meter");
    const output = item.querySelector("output");
    if (meter) meter.value = progress;
    if (output) output.textContent = progress + " / " + goal;
    item.classList.toggle("is-earned", progress >= goal);
  }
}

function recordCareerProgress(stat, amount = 1) {
  if (!Object.prototype.hasOwnProperty.call(CAREER_GOALS, stat) || !Number.isFinite(amount) || amount <= 0) return;
  careerRecords[stat] += amount;
  try {
    localStorage.setItem(CAREER_RECORDS_KEY, JSON.stringify(careerRecords));
  } catch (error) {
    // Keep tracking progress for this page session when storage is unavailable.
  }
  renderCareerRecords();
}

function makeDailyChallenge(dateKey = new Date().toISOString().slice(0, 10)) {
  let seed = Number(dateKey.replace(/-/g, "")) >>> 0;
  const choose = function (length) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed % length;
  };
  const enemyNames = [];
  const roster = typeof NEXTBOT_ROSTER === "undefined" ? [] : NEXTBOT_ROSTER;
  while (enemyNames.length < Math.min(3, roster.length)) {
    const name = roster[choose(roster.length)].name;
    if (!enemyNames.includes(name)) enemyNames.push(name);
  }
  return {
    date: dateKey,
    modeIndex: choose(GAME_MODES.length),
    startLevel: choose(LEVEL_COUNT),
    enemyNames: enemyNames
  };
}

function getDailyChallengeBest(challenge = dailyChallenge) {
  if (!challenge) return 0;
  try {
    return Number(localStorage.getItem("blockBreakerDailyBest:" + challenge.date)) || 0;
  } catch (error) {
    return 0;
  }
}

function updateDailyChallengeDisplay() {
  if (!dailyChallenge) return;
  const mode = GAME_MODES[dailyChallenge.modeIndex];
  const title = document.getElementById("daily-challenge-title");
  const details = document.getElementById("daily-challenge-details");
  const best = document.getElementById("daily-challenge-best");
  if (title) title.textContent = "Daily Challenge / " + dailyChallenge.date;
  if (details) {
    details.textContent = mode.label + " / Level " + (dailyChallenge.startLevel + 1) + " / " +
      (dailyChallenge.enemyNames.length ? "Enemies: " + dailyChallenge.enemyNames.join(", ") : "No nextbots");
  }
  if (best) best.textContent = "Best score: " + getDailyChallengeBest().toLocaleString();
}

function recordDailyChallengeScore() {
  if (!activeChallenge || mola <= getDailyChallengeBest(activeChallenge)) return;
  try {
    localStorage.setItem("blockBreakerDailyBest:" + activeChallenge.date, String(mola));
  } catch (error) {
    // Keep the challenge playable when storage is unavailable.
  }
  if (dailyChallenge && activeChallenge.date === dailyChallenge.date) updateDailyChallengeDisplay();
}

function setupDailyChallenge() {
  dailyChallenge = makeDailyChallenge();
  updateDailyChallengeDisplay();
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

function getCurrentMode() {
  return GAME_MODES[currentMode % GAME_MODES.length];
}

function getModeBallSpeed() {
  return baseBallSpeed * getCurrentMode().ballSpeedMultiplier;
}

function applyMode(nextModeIndex = currentMode) {
  currentMode = ((nextModeIndex % GAME_MODES.length) + GAME_MODES.length) % GAME_MODES.length;
  const mode = getCurrentMode();
  if (typeof document !== "undefined") {
    document.documentElement.style.setProperty("--theme-bg", mode.background);
    document.documentElement.style.setProperty("--theme-accent", mode.accent);
    const modeSelect = document.getElementById("mode-select");
    if (modeSelect) {
      modeSelect.value = String(currentMode);
    }
    if (startModeSelect) {
      startModeSelect.value = String(currentMode);
    }
    updateModeDescriptions(currentMode);
  }
}

function applySkin(nextSkinIndex = currentSkin) {
  currentSkin = ((nextSkinIndex % SKINS.length) + SKINS.length) % SKINS.length;
  const skin = getCurrentSkin();
  ball.color = skin.ball;
  paddle.color = skin.paddle;
  paddle.accent = skin.accent;
  if (typeof document !== "undefined") {
    const mode = getCurrentMode();
    document.documentElement.style.setProperty("--theme-bg", mode.background || skin.background);
    document.documentElement.style.setProperty("--theme-accent", mode.accent || skin.accent);
    const skinSelect = document.getElementById("skin-select");
    if (skinSelect) {
      skinSelect.value = String(currentSkin);
    }
  }
}

// Put the ball in the center and reset its speed and direction.
function resetBall() {
  const survivor = adminBattleMode && multiplayerPlayers.find(function (player) {
    return !player.ai && !multiplayerAdminIds.includes(player.id);
  });
  ball.x = survivor ? survivor.x + survivor.width / 2 - ball.width / 2 : WIDTH / 2 - ball.width / 2;
  ball.y = survivor ? survivor.y - ball.height - 1 : HEIGHT / 2 - ball.height / 2;
  ball.previousX = ball.x;
  ball.previousY = ball.y;
  ball.vx = 0;
  ball.vy = 0;
  ball.stuck = true;
  ball.stuckPlayerId = survivor ? survivor.id : (multiplayerActive && multiplayerHost ? multiplayerPlayerId : null);
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

function playVineBoom() {
  try {
    const AudioContextType = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextType) return;
    audioContext = audioContext || new AudioContextType();
    if (audioContext.state === "suspended") audioContext.resume();
    const startTime = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(110, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(42, startTime + 0.55);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.7, startTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.65);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + 0.66);
  } catch (error) {
    // Audio is optional; the popup remains usable if playback is blocked.
  }
}

function showIdleMeme() {
  if (!idleMeme || isBossFightActive()) return;
  window.clearTimeout(idleMemeHideTimer);
  window.clearTimeout(idleMemeFadeTimer);
  idleMeme.hidden = false;
  idleMeme.classList.remove("is-visible");
  window.requestAnimationFrame(function () {
    idleMeme.classList.add("is-visible");
  });
  playVineBoom();
  idleMemeHideTimer = window.setTimeout(function () {
    idleMeme.classList.remove("is-visible");
    idleMemeFadeTimer = window.setTimeout(function () {
      idleMeme.hidden = true;
    }, 450);
  }, 1000);
}

function hideIdleMeme() {
  if (!idleMeme) return;
  window.clearTimeout(idleMemeHideTimer);
  window.clearTimeout(idleMemeFadeTimer);
  idleMeme.hidden = true;
  idleMeme.classList.remove("is-visible");
}

function isBossFightActive() {
  const bossBrickActive = Array.isArray(bricks) && bricks.some(function (brick) {
    return brick.type === "boss" && !brick.hidden;
  });
  const nextBotArenaActive = typeof isNextBotBattleActive === "function" && isNextBotBattleActive();
  return bossBrickActive || nextBotArenaActive;
}

if (idleMemeImage) {
  idleMemeImage.addEventListener("error", function () {
    idleMeme.classList.add("is-fallback");
  });
  if (idleMemeImage.complete && idleMemeImage.naturalWidth === 0) {
    idleMeme.classList.add("is-fallback");
  }
}

function triggerBrickBreak(brick) {
  const bossHit = brick.type === "boss";
  const color = brick.color || "#ffffff";
  brickFlashes.push({ x: brick.x, y: brick.y, width: brick.width, height: brick.height, timer: 2 });
  const count = (bossHit ? 18 : 6) + Math.floor(Math.random() * (bossHit ? 12 : 5));
  for (let index = 0; index < count; index++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (bossHit ? 2 : 1) + Math.random() * (bossHit ? 5 : 2.5);
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
  hitStopFrames = bossHit ? 0 : 2;
  screenShakeFrames = bossHit ? 12 : 4;
}

function consumeAdminToolsWithWitherStorm(boss) {
  if (boss.adminAssimilated) return;
  boss.adminAssimilated = true;
  const toggles = Array.from(adminMenu.querySelectorAll("button[aria-pressed], [data-view-toggle]"), function (button) {
    return {
      label: button.textContent.trim(),
      enabled: button.getAttribute("aria-pressed") === "true"
    };
  });
  boss.adminPowers = {
    toggles: toggles,
    enabledToggleCount: toggles.filter(function (toggle) { return toggle.enabled; }).length,
    actions: Array.from(adminMenu.querySelectorAll("[data-admin]"), function (button) { return button.dataset.admin; }),
    controls: Array.from(adminMenu.querySelectorAll("input, select"), function (control) {
      return {
        id: control.id,
        value: control.value,
        checked: control.type === "checkbox" ? control.checked : null
      };
    }),
    ballSpeed: baseBallSpeed,
    paddleSpeed: paddle.speed,
    paddleWidth: paddle.width,
    lives: lives,
    simulationSpeed: simulationSpeed,
    nextbotSpeed: adminNextBotSpeedMultiplier,
    bossHealthBoost: bossHealthBoost,
    bossMinionLimit: adminBossMinionLimit,
    enemyMultiplier: getCurrentMode().nextbotMultiplier || 1,
    enemySpawnSelection: document.getElementById("admin-nextbot-select").value,
    blockSpawnSelection: document.getElementById("admin-brick-select").value,
    powerUpSpawnSelection: document.getElementById("admin-powerup-select").value
  };
  boss.adminAttackTimer = 75;
  boss.width = Math.min(WIDTH - 32, 640);
  boss.height = 270;
  boss.originX = (WIDTH - boss.width) / 2;
  boss.originY = 34;
  boss.x = boss.originX;
  boss.y = boss.originY;
  boss.moveAmplitude = 18;
  levelNotice = { text: "ADMIN PANEL CONSUMED // ALL CONTROLS HIJACKED", timer: 210 };
  hitStopFrames = 8;
  screenShakeFrames = 48;

  const panelWasOpen = !adminMenu.hidden;
  const canvasBounds = canvas.getBoundingClientRect();
  const bounds = panelWasOpen ? adminMenu.getBoundingClientRect() : {
    left: canvasBounds.left + canvasBounds.width - 208,
    top: canvasBounds.top + 44,
    width: 188,
    height: 104
  };
  const echo = panelWasOpen ? adminMenu.cloneNode(true) : document.createElement("div");
  echo.removeAttribute("id");
  echo.removeAttribute("hidden");
  echo.setAttribute("aria-hidden", "true");
  echo.classList.remove("admin-battle-dock");
  echo.classList.add("admin-panel-echo");
  if (!panelWasOpen) {
    echo.classList.add("admin-panel-echo-compact");
    const title = document.createElement("strong");
    title.textContent = "ADMIN TOOLS // ALL SYSTEMS";
    const contents = document.createElement("p");
    contents.textContent = "ENEMY SPAWNS // TOGGLES // GAME CONTROLS";
    echo.append(title, contents);
  }
  echo.style.left = bounds.left + "px";
  echo.style.top = bounds.top + "px";
  echo.style.width = bounds.width + "px";
  echo.style.height = bounds.height + "px";
  echo.style.maxWidth = bounds.width + "px";
  echo.style.maxHeight = "none";
  echo.style.resize = "none";
  echo.style.transform = "none";
  echo.style.margin = "0";
  echo.style.setProperty("--consume-x", (canvasBounds.left + canvasBounds.width * (boss.x + boss.width / 2) / WIDTH - bounds.left - bounds.width / 2) + "px");
  echo.style.setProperty("--consume-y", (canvasBounds.top + canvasBounds.height * (boss.y + boss.height / 2) / HEIGHT - bounds.top - bounds.height / 2) + "px");
  echo.addEventListener("animationend", function () { echo.remove(); }, { once: true });
  document.body.append(echo);
  if (panelWasOpen) {
    adminMenu.hidden = true;
    const adminBattleButton = document.getElementById("admin-battle-toggle");
    if (adminBattleButton) adminBattleButton.setAttribute("aria-pressed", "false");
  }
}

function spawnAdminGunner() {
  const index = adminGunners.length;
  adminGunners.push({
    x: 36 + (index * 47) % (WIDTH - 72),
    y: HEIGHT - 88 - Math.floor(index / 16) * 28,
    fireCooldown: 18 + index % 36,
    facing: 1
  });
}

function updateAdminGunners() {
  for (const gunner of adminGunners) {
    if (gunner.fireCooldown > 0) {
      gunner.fireCooldown--;
      continue;
    }

    let target = null;
    let targetType = "nextbot";
    let targetDistance = Infinity;
    for (const bot of nextBots) {
      const distance = Math.hypot(bot.x - gunner.x, bot.y - gunner.y);
      if (distance < targetDistance) {
        target = bot;
        targetDistance = distance;
      }
    }
    if (!target) {
      targetType = "brick";
      for (const brick of bricks) {
        if (brick.isKill || brick.hidden) continue;
        const distance = Math.hypot(brick.x + brick.width / 2 - gunner.x, brick.y + brick.height / 2 - gunner.y);
        if (distance < targetDistance) {
          target = brick;
          targetDistance = distance;
        }
      }
    }
    if (target && adminGunnerBullets.length < ADMIN_SPAWN_LIMITS.gunnerBullets) {
      const targetX = targetType === "brick" ? target.x + target.width / 2 : target.x;
      const targetY = targetType === "brick" ? target.y + target.height / 2 : target.y;
      const angle = Math.atan2(targetY - gunner.y, targetX - gunner.x);
      gunner.facing = Math.cos(angle) >= 0 ? 1 : -1;
      adminGunnerBullets.push({
        x: gunner.x + gunner.facing * 12,
        y: gunner.y - 12,
        vx: Math.cos(angle) * 7,
        vy: Math.sin(angle) * 7,
        targetType: targetType,
        life: 120
      });
    }
    gunner.fireCooldown = 48;
  }

  for (let bulletIndex = adminGunnerBullets.length - 1; bulletIndex >= 0; bulletIndex--) {
    const bullet = adminGunnerBullets[bulletIndex];
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;
    bullet.life--;
    let hit = false;
    if (bullet.targetType === "nextbot") {
      const botIndex = nextBots.findIndex(function (bot) {
        return Math.hypot(bot.x - bullet.x, bot.y - bullet.y) <= 20;
      });
      if (botIndex >= 0) {
        const [defeatedBot] = nextBots.splice(botIndex, 1);
        if (nextBotBattle && nextBotBattle.bot === defeatedBot) {
          nextBotBattle = null;
          nextBotBanner = { text: defeatedBot.name + " ELIMINATED BY GUNNER", timer: 110 };
          nextBotCooldown = 180;
        }
        hit = true;
      }
    } else {
      const brickIndex = bricks.findIndex(function (brick) {
        return !brick.isKill && !brick.hidden &&
          bullet.x >= brick.x && bullet.x <= brick.x + brick.width &&
          bullet.y >= brick.y && bullet.y <= brick.y + brick.height;
      });
      if (brickIndex >= 0) {
        breakBrickAt(brickIndex, Object.assign({}, ball, { perfect: false }));
        hit = true;
      }
    }
    if (hit || bullet.life <= 0 || bullet.x < 0 || bullet.x > WIDTH || bullet.y < 0 || bullet.y > HEIGHT) {
      adminGunnerBullets.splice(bulletIndex, 1);
    }
  }
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
  const defaultSpeed = getModeBallSpeed();
  const speed = sourceSpeed || defaultSpeed;
  const sourceVx = sourceSpeed ? sourceBall.vx : defaultSpeed;
  const sourceVy = sourceSpeed ? sourceBall.vy : defaultSpeed;
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

function launchStuckBall(targetPaddle = getPaddleForPlayer(ball.stuckPlayerId), playerId = null) {
  if (adminBattleAdmin && multiplayerHost && playerId !== ball.stuckPlayerId) return;
  if (!ball.stuck) return;
  if (multiplayerActive && !multiplayerHost) {
    if (ball.stuckPlayerId === multiplayerPlayerId && typeof window.requestLobbyBallLaunch === "function") {
      window.requestLobbyBallLaunch();
    }
    return;
  }
  const speed = getModeBallSpeed();
  const launch = reflectFromPaddle(0, speed, targetPaddle.angle);
  const launchSpeed = Math.hypot(launch.vx, launch.vy);
  ball.vx = launch.vx * speed / launchSpeed;
  ball.vy = launch.vy * speed / launchSpeed;
  ball.stuck = false;
  ball.lastPaddlePlayerId = playerId || ball.stuckPlayerId || multiplayerPlayerId;
  ball.stuckPlayerId = null;
}

function autoLaunchStuckBallIfEnabled() {
  if (!autoPlay || !ball.stuck) {
    autoLaunchRequestOwner = null;
    return;
  }
  const ownerId = ball.stuckPlayerId;
  if (multiplayerActive && !multiplayerHost && ownerId !== multiplayerPlayerId) {
    autoLaunchRequestOwner = null;
    return;
  }
  const now = performance.now();
  if (autoLaunchRequestOwner === ownerId && now - autoLaunchRequestAt < 500) return;
  autoLaunchRequestOwner = ownerId;
  autoLaunchRequestAt = now;
  launchStuckBall(getPaddleForPlayer(ownerId), ownerId);
}

function spawnBattleRewardBall() {
  const speed = Math.max(getModeBallSpeed(), Math.hypot(ball.vx, ball.vy));
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
let lives = startingLives;
let gameOver = false;
let gameWon = false;
let invincible = false;
let gameStarted = false;
let multiplayerActive = false;
let multiplayerHost = false;
let localTestMode = false;
let localTestCpu = [false, false];
let localTestPreviousAutoPlay = false;
let adminBattleMode = false;
let adminBattleAdmin = false;
let multiplayerMode = "coop";
let multiplayerScores = {};
let multiplayerAdminIds = [];
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
  accent: getCurrentSkin().accent,
  jumpBaseY: HEIGHT - 30,
  jumpFrames: 0,
  jumpCooldown: 0,
  jumpKeyWasDown: false
};
paddle.knownStuff = {
  balls: [], powerUps: [], lasers: [], nextBots: [],
  targetX: paddle.x + paddle.width / 2,
  summary: "Waiting for the first prediction update.",
  calculation: "Projects at 60 simulation steps per second and checks walls and brick collisions."
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
let lastShiftResetTime = 0;
let paused = false;
let rebindingControl = null;
let autoAimAngle = 0;
let autoPlanCooldown = 0;
let autoLaunchRequestOwner = null;
let autoLaunchRequestAt = 0;
const controlMenu = document.getElementById("control-menu");
const resumeButton = document.getElementById("resume");
const customKeybinds = {};
const customKeybindShift = {};
let pendingKeybindAction = null;

function normalizeHotkeyName(key) {
  if (!key) return "";
  const normalized = String(key).toLowerCase();
  if (normalized === " ") return " ";
  if (normalized === "arrowleft") return "arrowleft";
  if (normalized === "arrowright") return "arrowright";
  if (normalized === "arrowup") return "arrowup";
  if (normalized === "arrowdown") return "arrowdown";
  return normalized;
}

function formatHotkeyName(key) {
  const normalized = normalizeHotkeyName(key || "");
  const labels = {
    " ": "Space",
    arrowleft: "←",
    arrowright: "→",
    arrowup: "↑",
    arrowdown: "↓",
    enter: "Enter",
    escape: "Esc"
  };
  if (labels[normalized]) return labels[normalized];
  return normalized ? normalized.toUpperCase() : "";
}

function setCustomHotkey(action, key, shiftKey = false) {
  customKeybinds[action] = normalizeHotkeyName(key);
  customKeybindShift[action] = Boolean(shiftKey);
  const actionButton = document.querySelector('[data-hotkey-action="' + action + '"]');
  if (actionButton) {
    const hotkey = customKeybinds[action];
    const label = actionButton.dataset.hotkeyLabel || actionButton.textContent.replace(/\s*\([A-Za-z0-9←→↑↓\s]+\)$/, "");
    actionButton.dataset.hotkeyLabel = label;
    const modifier = customKeybindShift[action] ? "Shift+" : "";
    actionButton.textContent = hotkey ? label + " (" + modifier + formatHotkeyName(hotkey) + ")" : label;
  }
}

function assignRightClickHotkey(button) {
  button.addEventListener("contextmenu", function (event) {
    event.preventDefault();
    pendingKeybindAction = button.dataset.hotkeyAction;
    const label = button.dataset.hotkeyLabel || button.textContent.replace(/\s*\([A-Za-z0-9←→↑↓\s]+\)$/, "");
    button.dataset.hotkeyLabel = label;
    button.textContent = label + " (Press key…)";
  });
}

for (const hotkeyButton of document.querySelectorAll("[data-hotkey-action]")) {
  const action = hotkeyButton.dataset.hotkeyAction;
  const defaultKey = action === "toggle-fullscreen" ? "f" : action === "lobby-add-ai" ? "a" : action === "lobby-start" ? "enter" : action === "start-game" ? "s" : null;
  if (defaultKey) setCustomHotkey(action, defaultKey, action === "toggle-fullscreen");
  assignRightClickHotkey(hotkeyButton);
}

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
const adminModeSelect = document.getElementById("mode-select");
const adminPanelModeSelect = document.getElementById("admin-panel-mode-select");
const startModeSelect = document.getElementById("start-mode-select");
const startModeDescription = document.getElementById("start-mode-description");
const settingsModeDescription = document.getElementById("settings-mode-description");
const adminPanelModeDescription = document.getElementById("admin-panel-mode-description");
const adminLevelSelect = document.getElementById("admin-level-select");
const mainMenu = document.getElementById("main-menu");
const gameInfo = document.getElementById("game-info");
const touchControls = document.getElementById("touch-controls");
const touchLaunchButton = document.getElementById("touch-launch");
const startGameButton = document.getElementById("start-game");
const menuControlsButton = document.getElementById("menu-controls");
const menuAdminButton = document.getElementById("menu-admin");

function populateModeOptions() {
  for (const select of [startModeSelect, adminModeSelect, adminPanelModeSelect]) {
    if (!select) continue;
    select.replaceChildren();
    GAME_MODES.forEach(function (mode, index) {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = mode.label;
      select.append(option);
    });
  }
}

function updateModeDescriptions(selectedIndex = currentMode) {
  const mode = GAME_MODES[selectedIndex] || GAME_MODES[0];
  if (startModeDescription) startModeDescription.textContent = mode.description;
  if (settingsModeDescription) settingsModeDescription.textContent = mode.description;
  if (adminPanelModeDescription) adminPanelModeDescription.textContent = mode.description;
}

populateModeOptions();
if (startModeSelect) {
  startModeSelect.addEventListener("change", function () {
    updateModeDescriptions(Number(startModeSelect.value));
  });
}
updateModeDescriptions();

if (adminLevelSelect) {
  adminLevelSelect.replaceChildren();
  for (let index = 0; index < LEVEL_COUNT; index++) {
    const option = document.createElement("option");
    option.value = String(index + 1);
    option.textContent = "Level " + (index + 1);
    adminLevelSelect.append(option);
  }
}

function refreshAdminVisibilityButtons() {
  const allVisible = Object.values(adminVisibility).every(Boolean);
  for (const button of document.querySelectorAll("[data-view-toggle]")) {
    const view = button.dataset.viewToggle;
    if (view === "all") {
      button.textContent = allVisible ? "Hide all" : "Show all";
      button.setAttribute("aria-pressed", String(allVisible));
    } else {
      const visible = adminVisibility[view];
      button.textContent = button.dataset.viewLabel + ": " + (visible ? "On" : "Off");
      button.setAttribute("aria-pressed", String(visible));
    }
  }
}

function sendRemoteAdminCommand(command) {
  if (!multiplayerActive || multiplayerHost) return false;
  if (multiplayerAdminIds.includes(multiplayerPlayerId) && typeof window.sendLobbyAdminCommand === "function") {
    window.sendLobbyAdminCommand(command);
  }
  return true;
}

function setSimulationSpeed(value) {
  const speed = Number(value);
  if (![1, 2, 3, 5, 10, 20].includes(speed)) return;
  simulationSpeed = speed;
  for (const speedButton of document.querySelectorAll("[data-speed-toggle]")) {
    speedButton.setAttribute("aria-pressed", String(Number(speedButton.dataset.speedToggle) === simulationSpeed));
  }
}

for (const button of document.querySelectorAll("[data-view-toggle]")) {
  const view = button.dataset.viewToggle;
  if (view !== "all") button.dataset.viewLabel = button.textContent.replace(/: (On|Off)$/, "");
  button.addEventListener("click", function () {
    if (view === "all") {
      const showAll = !Object.values(adminVisibility).every(Boolean);
      for (const key of Object.keys(adminVisibility)) adminVisibility[key] = showAll;
    } else {
      adminVisibility[view] = !adminVisibility[view];
    }
    refreshAdminVisibilityButtons();
  });
}
refreshAdminVisibilityButtons();

for (const button of document.querySelectorAll("[data-speed-toggle]")) {
  button.addEventListener("click", function () {
    const speed = Number(button.dataset.speedToggle);
    if (sendRemoteAdminCommand({ type: "speed", value: speed })) return;
    setSimulationSpeed(speed);
  });
}

function readMobileSetting() {
  try {
    const value = localStorage.getItem("blockBreakerMobileControls");
    if (value === null) return isTouchDevice();
    return value === "true";
  } catch (error) {
    return isTouchDevice();
  }
}

function isTouchDevice() {
  return navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
}

function refreshTouchControls() {
  if (!touchControls) return;
  touchControls.hidden = !(gameStarted && !paused && mobileControlsEnabled);
}

function refreshTouchLaunchButton() {
  if (!touchLaunchButton) return;
  touchLaunchButton.disabled = !ball.stuck || (multiplayerActive && ball.stuckPlayerId !== multiplayerPlayerId);
}

function refreshMobileControlsButton() {
  const button = document.getElementById("mobile-controls-toggle");
  if (!button) return;
  button.setAttribute("aria-pressed", String(mobileControlsEnabled));
  button.textContent = "Mobile Controls: " + (mobileControlsEnabled ? "On" : "Off");
}

function showMainMenu() {
  gameStarted = false;
  paused = false;
  activeChallenge = null;
  if (adminModeSelect) adminModeSelect.disabled = false;
  document.body.classList.add("menu-active");
  document.body.classList.remove("game-active");
  mainMenu.hidden = false;
  controlMenu.hidden = true;
  adminMenu.hidden = true;
  document.body.classList.remove("admin-battle-host");
  adminMenu.classList.remove("admin-battle-dock");
  document.getElementById("admin-battle-toggle").hidden = true;
  canvas.hidden = true;
  refreshTouchControls();
  document.getElementById("control-title").textContent = "Paused — Settings";
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
  document.getElementById("control-title").textContent = "Settings";
  resumeButton.textContent = "Back to menu";
  setPaused(true);
}

function beginGame(randomRun = false, chosenMode = currentMode, challenge = null) {
  activeChallenge = challenge;
  applyMode(chosenMode);
  if (adminModeSelect) adminModeSelect.disabled = Boolean(challenge);
  if (randomRun && !randomEverythingEnabled) {
    randomRunOriginalStats = {
      ballSpeed: baseBallSpeed,
      paddleSpeed: paddle.speed,
      turnSpeed: currentTurnSpeed,
      dashDistance: currentDashDistance
    };
  } else if (!randomRun && randomEverythingEnabled && randomRunOriginalStats) {
    baseBallSpeed = randomRunOriginalStats.ballSpeed;
    paddle.speed = randomRunOriginalStats.paddleSpeed;
    currentTurnSpeed = randomRunOriginalStats.turnSpeed;
    currentDashDistance = randomRunOriginalStats.dashDistance;
    randomRunOriginalStats = null;
  }
  randomEverythingEnabled = randomRun;
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

function refreshLocalTestCpuButtons() {
  for (let index = 0; index < localTestCpu.length; index++) {
    const button = document.getElementById(index === 0 ? "test-p1-cpu" : "test-p2-cpu");
    button.setAttribute("aria-pressed", String(localTestCpu[index]));
    button.textContent = "P" + (index + 1) + " CPU: " + (localTestCpu[index] ? "On" : "Off");
  }
}

function startLocalMultiplayerTest() {
  localTestMode = true;
  localTestCpu = [false, false];
  localTestPreviousAutoPlay = autoPlay;
  autoPlay = false;
  autoPlayButton.setAttribute("aria-pressed", "false");
  autoPlayButton.textContent = "Auto-play: Off";
  setMultiplayerSession(true, true, "local-test-player-1", false);
  paddle.x = WIDTH / 2 - 115;
  paddle.y = HEIGHT - 30;
  multiplayerPlayers = [{
    id: "local-test-player-2",
    name: "PLAYER 2",
    host: false,
    ai: false,
    x: WIDTH / 2 + 25,
    previousX: WIDTH / 2 + 25,
    y: HEIGHT - 30,
    previousY: HEIGHT - 30,
    width: 90,
    angle: 0,
    previousAngle: 0,
    speed: 6,
    height: paddle.height,
    color: "#55d9ff",
    jumpBaseY: HEIGHT - 30,
    jumpFrames: 0,
    jumpCooldown: 0,
    jumpKeyWasDown: false
  }];
  beginGame(true);
  document.getElementById("local-test-controls").hidden = false;
  document.getElementById("multiplayer-status").hidden = false;
  document.getElementById("multiplayer-status").textContent = "Local test: P1 uses arrows and J; P2 moves with A/D, tilts with Q/E, and jumps with W.";
  refreshLocalTestCpuButtons();
}

function stopLocalMultiplayerTest() {
  if (!localTestMode) return;
  localTestMode = false;
  localTestCpu = [false, false];
  setMultiplayerSession(false);
  multiplayerPlayers = [];
  autoPlay = localTestPreviousAutoPlay;
  autoPlayButton.setAttribute("aria-pressed", String(autoPlay));
  autoPlayButton.textContent = autoPlay ? "Auto-play: On" : "Auto-play: Off";
  document.getElementById("local-test-controls").hidden = true;
  document.getElementById("multiplayer-status").hidden = true;
  showMainMenu();
}

function toggleLocalTestCpu(playerIndex) {
  if (!localTestMode) return;
  localTestCpu[playerIndex] = !localTestCpu[playerIndex];
  refreshLocalTestCpuButtons();
}

function setMultiplayerSession(active, isHost = false, playerId = null, isAdminBattle = false) {
  multiplayerActive = active;
  multiplayerHost = isHost;
  adminBattleMode = active && isAdminBattle;
  adminBattleAdmin = adminBattleMode && multiplayerAdminIds.includes(playerId);
  multiplayerPlayerId = playerId;
  if (adminBattleAdmin) paddle.y = HEIGHT + 100;
  const adminBattleToggle = document.getElementById("admin-battle-toggle");
  adminBattleToggle.hidden = !active || !multiplayerAdminIds.includes(playerId);
  adminBattleToggle.setAttribute("aria-pressed", "false");
  adminMenu.hidden = true;
  adminMenu.classList.toggle("admin-battle-dock", adminBattleAdmin && isHost);
  document.body.classList.toggle("admin-battle-host", adminBattleAdmin && isHost);
  multiplayerPlayers = [];
  multiplayerScores = {};
  lobbySnapshotBuffer = [];
  lobbySnapshotSequence = 0;
  lobbyInterpolationSnaps = 0;
  lastInterpolationSnapPair = null;
  if (!active) {
    paddle.y = HEIGHT - 30;
    paddle.width = basePaddleWidth;
    paddle.angle = 0;
    multiplayerMode = "coop";
    multiplayerAdminIds = [];
  }
}

function setMultiplayerPlayers(players) {
  multiplayerPlayers = Array.isArray(players) ? players : [];
  if (!multiplayerActive) return;
  if (multiplayerHost && (multiplayerMode === "versus" || multiplayerMode === "free-for-all")) {
    for (const player of multiplayerPlayers) {
      if (typeof multiplayerScores[player.id] !== "number") multiplayerScores[player.id] = 0;
    }
  }
  if (multiplayerHost) {
    if (adminBattleMode) {
      for (const player of multiplayerPlayers) {
        if (multiplayerAdminIds.includes(player.id)) player.y = HEIGHT + 100;
      }
    }
    if (adminBattleMode && ball.stuck) {
      const survivor = multiplayerPlayers.find(function (player) {
        return !player.ai && !multiplayerAdminIds.includes(player.id);
      });
      if (survivor) {
        ball.stuckPlayerId = survivor.id;
        ball.x = survivor.x + survivor.width / 2 - ball.width / 2;
        ball.y = survivor.y - ball.height - 1;
        ball.previousX = ball.x;
        ball.previousY = ball.y;
      }
    }
    return;
  }
  if (adminBattleAdmin) {
    paddle.y = HEIGHT + 100;
    return;
  }
  const localPlayer = multiplayerPlayers.find(function (player) { return player.id === multiplayerPlayerId; });
  if (!localPlayer) return;
  if (Number.isFinite(localPlayer.y)) paddle.y = localPlayer.y;
  if (Number.isFinite(localPlayer.width)) paddle.width = localPlayer.width;
}

function getPaddleForPlayer(playerId) {
  if (!multiplayerActive || !playerId || playerId === multiplayerPlayerId) return paddle;
  const player = multiplayerPlayers.find(function (entry) {
    return entry.id === playerId && !entry.ai;
  });
  return player || aiPaddles.find(function (bot) { return bot.lobbyPlayerId === playerId; }) || paddle;
}

function addLobbyAIPlayers(players) {
  const lobbyPlayers = Array.isArray(players) ? players : [];
  aiPaddles = lobbyPlayers.map(function (player, index) {
    const width = basePaddleWidth;
    return {
      x: Math.max(0, Math.min(WIDTH - width, player.x || 0)),
      y: paddle.y,
      width: width,
      height: paddle.height,
      speed: paddle.speed,
      angle: 0,
      color: player.color || getCurrentSkin().accent,
      assignedBall: ball,
      lobbyAI: true,
      lobbyPlayerId: player.id,
      lobbyName: player.name,
      lobbyIndex: index,
      lobbyCount: lobbyPlayers.length
    };
  });
}

function recordMultiplayerScore(playerId, points) {
  if (!multiplayerActive || !multiplayerHost ||
      (multiplayerMode !== "versus" && multiplayerMode !== "free-for-all") ||
      typeof playerId !== "string" || !Number.isFinite(points) || points <= 0) return;
  multiplayerScores[playerId] = (multiplayerScores[playerId] || 0) + points;
}

function beginLobbyGame(isHost, playerId, isAdminBattle = false, adminIds = [], mode = "coop") {
  multiplayerAdminIds = Array.isArray(adminIds) ? adminIds : [];
  multiplayerMode = ["coop", "survival", "boss-rush", "versus", "free-for-all"].includes(mode) ? mode : "coop";
  multiplayerScores = {};
  setMultiplayerSession(true, isHost, playerId, isAdminBattle);
  if (isHost) {
    let selectedMode = Number(startModeSelect ? startModeSelect.value : currentMode);
    if (multiplayerMode === "survival") selectedMode = GAME_MODES.findIndex(function (gameMode) { return gameMode.label === "Co-op Swarm"; });
    if (multiplayerMode === "boss-rush") selectedMode = GAME_MODES.findIndex(function (gameMode) { return gameMode.label === "Co-op Boss Run"; });
    applyMode(selectedMode);
  }
  beginGame(false);
}

function endLobbyGame() {
  setMultiplayerSession(false);
  showMainMenu();
}

function getLobbyGameSnapshot() {
  return {
    t: performance.now(),
    mode: currentMode,
    gameSettings: {
      ballSpeed: baseBallSpeed,
      paddleSpeed: paddle.speed,
      paddleWidth: basePaddleWidth,
      startingLives: startingLives,
      nextBotSpeed: adminNextBotSpeedMultiplier,
      bossHealthBoost: bossHealthBoost,
      powerUpDrops: powerUpDropsEnabled,
      laserDamage: laserDamageEnabled,
      bossMinions: bossMinionsEnabled
    },
    level: level,
    lives: lives,
    gameOver: gameOver,
    gameWon: gameWon,
    mola: mola,
    multiplayerMode: multiplayerMode,
    multiplayerScores: Object.assign({}, multiplayerScores),
    brickHitStreak: brickHitStreak,
    ball: Object.assign({}, ball),
    extraBalls: extraBalls.map(function (activeBall) { return Object.assign({}, activeBall); }),
      enemyShots: enemyShots.map(function (shot) { return Object.assign({}, shot); }),
    rockets: rockets.map(function (rocket) {
      return { x: rocket.x, y: rocket.y, targetIndex: nextBots.indexOf(rocket.target), speed: rocket.speed };
    }),
    bricks: bricks.map(function (brick) { return Object.assign({}, brick); }),
    aiPaddles: aiPaddles.map(function (bot) {
      return { x: bot.x, y: bot.y, width: bot.width, height: bot.height, speed: bot.speed, angle: bot.angle, color: bot.color, lobbyAI: bot.lobbyAI, lobbyName: bot.lobbyName };
    }),
    adminGunners: adminGunners.map(function (gunner) { return Object.assign({}, gunner); }),
    adminGunnerBullets: adminGunnerBullets.map(function (bullet) { return Object.assign({}, bullet); }),
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
    levelNotice: levelNotice ? Object.assign({}, levelNotice) : null,
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

  if (Number.isInteger(latestState.mode) && latestState.mode !== currentMode) applyMode(latestState.mode);
  if (latestState.gameSettings) applyAdminGameSettings(latestState.gameSettings);
  level = latestState.level || 0;
  lives = latestState.lives || 0;
  gameOver = Boolean(latestState.gameOver);
  gameWon = Boolean(latestState.gameWon);
  mola = latestState.mola || 0;
  if (latestState.multiplayerScores && typeof latestState.multiplayerScores === "object") {
    multiplayerScores = Object.assign({}, latestState.multiplayerScores);
  }
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
  enemyShots = interpolateLobbyList(oldState.enemyShots || [], newState.enemyShots || [], latestState.enemyShots || [], ["x", "y"], amount);
  bricks = interpolateLobbyBricks(oldState.bricks, newState.bricks, latestState.bricks, amount);
  aiPaddles = interpolateLobbyList(oldState.aiPaddles, newState.aiPaddles, latestState.aiPaddles, ["x", "y"], amount)
    .map(function (bot) { return Object.assign({ assignedBall: null }, bot); });
  adminGunners = interpolateLobbyList(oldState.adminGunners || [], newState.adminGunners || [], latestState.adminGunners || [], ["x", "y"], amount);
  adminGunnerBullets = interpolateLobbyList(oldState.adminGunnerBullets || [], newState.adminGunnerBullets || [], latestState.adminGunnerBullets || [], ["x", "y"], amount);
  powerUps = interpolateLobbyList(oldState.powerUps, newState.powerUps, latestState.powerUps, ["x", "y"], amount);
  lasers = interpolateLobbyList(oldState.lasers, newState.lasers, latestState.lasers, ["x", "y"], amount);
  widePaddleTimer = latestState.widePaddleTimer || 0;
  slowBallTimer = latestState.slowBallTimer || 0;
  magnetTimer = latestState.magnetTimer || 0;
  magnetPlayerId = latestState.magnetPlayerId || null;
  powerUpNotice = latestState.powerUpNotice ? Object.assign({}, latestState.powerUpNotice) : null;
  levelNotice = latestState.levelNotice ? Object.assign({}, latestState.levelNotice) : null;
  setNextBotMultiplayerState(interpolateLobbyNextBotState(oldState.nextBotState, newState.nextBotState, latestState.nextBotState, amount));
  rockets = interpolateLobbyList(oldState.rockets || [], newState.rockets || [], latestState.rockets || [], ["x", "y"], amount)
    .map(function (rocket) { return Object.assign(rocket, { target: nextBots[rocket.targetIndex] }); })
    .filter(function (rocket) { return rocket.target; });
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
  const activeBoss = bricks.find(function (brick) { return brick.type === "boss" && !brick.hidden; });
  return {
    ball: { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy },
    gameOver: gameOver,
    gameWon: gameWon,
    paused: paused,
    hitStopFrames: hitStopFrames,
    level: level,
    lives: lives,
    simulationFrame: simulationFrame,
    simulationSpeed: simulationSpeed,
    entities: {
      bricks: bricks.length,
      balls: 1 + extraBalls.length,
      nextbots: nextBots.length,
      powerUps: powerUps.length,
      lasers: lasers.length,
      enemyShots: enemyShots.length
    },
    boss: activeBoss ? {
      name: activeBoss.bossName,
      hp: activeBoss.hp,
      maxHp: activeBoss.maxHp,
      phase: activeBoss.isFinalBoss ? FINAL_BOSS_PHASES[(activeBoss.phase || 1) - 1] : null
    } : null
  };
};

function refreshAdminDebugReadout() {
  const output = document.getElementById("admin-debug-readout");
  if (!output || !adminDebugEnabled) return;
  const state = window.getGameDebugState();
  const entityCounts = state.entities;
  const bossStatus = state.boss ? state.boss.name + " " + state.boss.hp + "/" + state.boss.maxHp + (state.boss.phase ? " [" + state.boss.phase + "]" : "") : "none";
  const text = "LV " + (state.level + 1) + " | FRAME " + state.simulationFrame + " | BALLS " + entityCounts.balls + " | BLOCKS " + entityCounts.bricks + " | NEXTBOTS " + entityCounts.nextbots + " | POWERUPS " + entityCounts.powerUps + " | LASERS " + entityCounts.lasers + " | SHOTS " + entityCounts.enemyShots + " | BOSS " + bossStatus;
  if (output.textContent !== text) output.textContent = text;
}
window.launchLobbyBall = function (playerId) {
  if (multiplayerActive && multiplayerHost && ball.stuck && ball.stuckPlayerId === playerId) {
    launchStuckBall(getPaddleForPlayer(playerId), playerId);
  }
};

function toggleAdminMenu() {
  if (!adminMenu) return;
  if (multiplayerActive && !multiplayerAdminIds.includes(multiplayerPlayerId)) return;
  adminMenu.hidden = !adminMenu.hidden;
  const button = document.getElementById("admin-battle-toggle");
  if (button && multiplayerAdminIds.includes(multiplayerPlayerId)) button.setAttribute("aria-pressed", String(!adminMenu.hidden));
}

function toggleSecretImageMode() {
  if (multiplayerActive && !multiplayerAdminIds.includes(multiplayerPlayerId)) return;
  setSecretImageMode(!secretImageMode);
  levelNotice = { text: secretImageMode ? "SECRET PHOTO MODE ON" : "SECRET PHOTO MODE OFF", timer: 120 };
}

document.getElementById("secret-image-toggle").addEventListener("click", toggleSecretImageMode);

document.getElementById("admin-close").addEventListener("click", function () {
  adminMenu.hidden = true;
  const button = document.getElementById("admin-battle-toggle");
  if (button && multiplayerAdminIds.includes(multiplayerPlayerId)) button.setAttribute("aria-pressed", "false");
});

const adminTitlebar = document.getElementById("admin-titlebar");
let adminPanelDrag = null;
adminTitlebar.addEventListener("pointerdown", function (event) {
  if (event.target.closest("button")) return;
  const bounds = adminMenu.getBoundingClientRect();
  adminPanelDrag = { pointerId: event.pointerId, offsetX: event.clientX - bounds.left, offsetY: event.clientY - bounds.top };
  adminMenu.style.left = bounds.left + "px";
  adminMenu.style.top = bounds.top + "px";
  adminMenu.style.right = "auto";
  adminMenu.style.transform = "none";
  adminTitlebar.setPointerCapture(event.pointerId);
});
adminTitlebar.addEventListener("pointermove", function (event) {
  if (!adminPanelDrag || adminPanelDrag.pointerId !== event.pointerId) return;
  const bounds = adminMenu.getBoundingClientRect();
  const left = Math.max(0, Math.min(window.innerWidth - bounds.width, event.clientX - adminPanelDrag.offsetX));
  const top = Math.max(0, Math.min(window.innerHeight - Math.min(bounds.height, 48), event.clientY - adminPanelDrag.offsetY));
  adminMenu.style.left = left + "px";
  adminMenu.style.top = top + "px";
});
adminTitlebar.addEventListener("pointerup", function (event) {
  if (adminPanelDrag && adminPanelDrag.pointerId === event.pointerId) adminPanelDrag = null;
});
adminTitlebar.addEventListener("pointercancel", function () { adminPanelDrag = null; });

function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      const target = document.documentElement || document.body;
      if (target && target.requestFullscreen) {
        target.requestFullscreen();
      }
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  } catch (error) {
    // Fullscreen is optional; ignore unsupported browser behavior.
  }
}

autoPlayButton.addEventListener("click", function () {
  autoPlay = !autoPlay;
  autoPlayButton.setAttribute("aria-pressed", String(autoPlay));
  autoPlayButton.textContent = autoPlay ? "Auto-play: On" : "Auto-play: Off";
});

const mobileControlsButton = document.getElementById("mobile-controls-toggle");
if (mobileControlsButton) {
  mobileControlsButton.addEventListener("click", function () {
    mobileControlsEnabled = !mobileControlsEnabled;
    try {
      localStorage.setItem("blockBreakerMobileControls", String(mobileControlsEnabled));
    } catch (error) {
      // Ignore storage errors and keep the in-memory toggle live.
    }
    refreshMobileControlsButton();
    refreshTouchControls();
  });
}

resumeButton.addEventListener("click", function () {
  if (gameStarted) {
    setPaused(false);
  } else {
    showMainMenu();
  }
});

startGameButton.addEventListener("click", function () {
  const chosenMode = Number(startModeSelect ? startModeSelect.value : currentMode);
  beginGame(false, chosenMode);
});
document.getElementById("start-daily-challenge").addEventListener("click", function () {
  if (!dailyChallenge) setupDailyChallenge();
  beginGame(false, dailyChallenge.modeIndex, dailyChallenge);
});
document.getElementById("random-game").addEventListener("click", function () {
  const chosenMode = Number(startModeSelect ? startModeSelect.value : currentMode);
  beginGame(true, chosenMode);
});
document.getElementById("local-multiplayer-test").addEventListener("click", startLocalMultiplayerTest);
document.getElementById("test-p1-cpu").addEventListener("click", function () { toggleLocalTestCpu(0); });
document.getElementById("test-p2-cpu").addEventListener("click", function () { toggleLocalTestCpu(1); });
document.getElementById("exit-local-test").addEventListener("click", stopLocalMultiplayerTest);
menuControlsButton.addEventListener("click", openMenuControls);
menuAdminButton.addEventListener("click", function () {
  toggleAdminMenu();
});

document.getElementById("admin-battle-toggle").addEventListener("click", toggleAdminMenu);

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

function drawAdminGunners() {
  for (const gunner of adminGunners) {
    ctx.save();
    ctx.translate(gunner.x, gunner.y);
    ctx.fillStyle = "#d6ff55";
    ctx.fillRect(-7, -5, 14, 23);
    ctx.beginPath();
    ctx.arc(0, -13, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#20261a";
    ctx.fillRect(-4, 17, 4, 10);
    ctx.fillRect(1, 17, 4, 10);
    ctx.fillStyle = "#e8edf0";
    ctx.fillRect(gunner.facing * 5, -12, gunner.facing * 13, 4);
    ctx.restore();
  }
  ctx.save();
  ctx.fillStyle = "#fff176";
  ctx.shadowColor = "#fff176";
  ctx.shadowBlur = 9;
  for (const bullet of adminGunnerBullets) {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
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

function spawnAdminBrick() {
  const brickTypeSelect = document.getElementById("admin-brick-select");
  const type = brickTypeSelect ? brickTypeSelect.value : "normal";
  const colors = {
    normal: "#54c8ff",
    command: "#50664c",
    armored: "#9292a0",
    explosive: "#ff8b45",
    moving: "#69d8c4",
    regenerating: "#a986ef",
    sweeper: "#ffffff",
    kill: "#ffffff"
  };
  const brick = {
    x: adminSpawnAtCursor ? Math.max(0, Math.min(WIDTH - 58, adminMousePosition.x - 29)) : 20 + Math.random() * (WIDTH - 78),
    y: adminSpawnAtCursor ? Math.max(62, Math.min(300, adminMousePosition.y - 10)) : 92 + Math.random() * 90,
    width: 58,
    height: 20,
    isKill: type === "kill" || type === "sweeper",
    adminSpawned: true,
    type: type,
    color: colors[type] || colors.normal
  };
  if (type === "armored") {
    brick.hp = 3;
    brick.maxHp = 3;
  }
  if (type === "command") {
    brick.hp = 5;
    brick.maxHp = 5;
  }
  if (type === "regenerating") {
    brick.hp = 1;
    brick.maxHp = 1;
  }
  if (type === "moving" || type === "sweeper") {
    brick.originX = brick.x;
    brick.moveAmplitude = type === "sweeper" ? 40 : 20;
    brick.movePhase = Math.random() * Math.PI * 2;
  }
  bricks.push(brick);
}

function spawnAdminPowerUp() {
  const kinds = [
    { type: "wide", label: "W", color: "#4fe6ff" },
    { type: "slow", label: "S", color: "#ffd166" },
    { type: "magnet", label: "M", color: "#ff75d8" },
    { type: "multi", label: "+", color: EXTRA_BALL_COLOR },
    { type: "life", label: "1UP", color: "#ff6b6b" },
    { type: "shield", label: "SH", color: "#7be7ff" },
    { type: "fast", label: "F", color: "#ff9f43" },
    { type: "pierce", label: "P", color: "#ffd166" },
    { type: "freeze", label: "ICE", color: "#8be9ff" },
    { type: "rocket", label: "RKT", color: "#ffca3a" },
    { type: "dash", label: "DASH", color: "#fb923c" },
    { type: "cache", label: "+500", color: "#d6ff55" }
  ];
  const selectedKind = document.getElementById("admin-powerup-select").value;
  const kind = selectedKind === "random"
    ? kinds[Math.floor(Math.random() * kinds.length)]
    : kinds.find(function (item) { return item.type === selectedKind; }) || kinds[0];
  powerUps.push({
    x: adminSpawnAtCursor ? Math.max(0, Math.min(WIDTH - 22, adminMousePosition.x - 11)) : Math.random() * (WIDTH - 22),
    y: adminSpawnAtCursor ? Math.max(40, Math.min(HEIGHT - 80, adminMousePosition.y - 11)) : 100,
    width: 22,
    height: 22,
    speed: 2.4,
    type: kind.type,
    label: kind.label,
    color: kind.color
  });
}

function spawnAdminBoss(selectedBoss = 0) {
  const boss = makeBossBrick(selectedBoss, Math.max(9, level));
  if (adminSpawnAtCursor) {
    boss.x = Math.max(0, Math.min(WIDTH - boss.width, adminMousePosition.x - boss.width / 2));
    boss.y = Math.max(50, Math.min(HEIGHT / 2 - boss.height, adminMousePosition.y - boss.height / 2));
    boss.originX = boss.x;
    boss.originY = boss.y;
  }
  boss.adminSpawned = true;
  bricks.push(boss);
}

function spawnAdminFinalBoss() {
  gameOver = false;
  gameWon = false;
  level = LEVEL_COUNT - 1;
  bricks = makeBricks(level);
  setNextBotsForLevel(level);
  enemyShots = [];
  powerUps = [];
  lasers = [];
  paddle.width = 56;
  paddle.x = Math.max(0, Math.min(WIDTH - paddle.width, paddle.x + (BASE_PADDLE_WIDTH - paddle.width) / 2));
  levelNotice = { text: "FINAL ENCOUNTER // WITHER STORM // NO NEXTBOTS", timer: 180 };
  resetBall();
}

function advanceAdminBossPhase() {
  let boss = bricks.find(function (brick) { return brick.isFinalBoss; });
  if (!boss) {
    spawnAdminFinalBoss();
    boss = bricks.find(function (brick) { return brick.isFinalBoss; });
  }
  boss.phase = boss.phase >= 3 ? 1 : boss.phase + 1;
  boss.hp = boss.phase === 1 ? boss.maxHp : boss.phase === 2 ? Math.floor(boss.maxHp * 0.65) : Math.floor(boss.maxHp / 3);
  boss.phaseTimer = 90;
  levelNotice = { text: "WITHER STORM // " + FINAL_BOSS_PHASES[boss.phase - 1], timer: 150 };
}

function spawnAdminLaser() {
  spawnAdminLaserAt(40 + Math.random() * (WIDTH - 80));
}

function spawnAdminLaserAt(x) {
  lasers.push({
    x: Math.max(8, Math.min(WIDTH - 8, x)),
    mode: "warning",
    timer: 54,
    hitRegistered: false
  });
}

function launchAdminMissile() {
  adminMissileArmed = false;
  adminMissile = {
    x: paddle.x + paddle.width / 2,
    y: paddle.y,
    targetX: adminMousePosition.x,
    targetY: adminMousePosition.y,
    timer: 300,
    speed: 8
  };
  const status = document.getElementById("missile-status");
  status.textContent = "Missile launched. Keep moving the pointer to guide it.";
  status.hidden = false;
}

function armAdminMissile() {
  adminMissileArmed = true;
  adminMenu.hidden = true;
  const adminButton = document.getElementById("admin-battle-toggle");
  if (adminButton && adminBattleAdmin) adminButton.setAttribute("aria-pressed", "false");
  const status = document.getElementById("missile-status");
  status.textContent = "Move your pointer over the game to launch the missile.";
  status.hidden = false;
}

function explodeAdminMissile(x, y) {
  const radius = 76;
  const within = function (targetX, targetY) { return Math.hypot(targetX - x, targetY - y) <= radius; };
  const removedBots = nextBots.filter(function (bot) { return within(bot.x, bot.y); });
  nextBots = nextBots.filter(function (bot) { return !within(bot.x, bot.y); });
  if (nextBotBattle && removedBots.some(function (bot) { return bot === nextBotBattle.bot; })) {
    nextBotBattle = null;
  }
  bricks = bricks.filter(function (brick) {
    const nearestX = Math.max(brick.x, Math.min(x, brick.x + brick.width));
    const nearestY = Math.max(brick.y, Math.min(y, brick.y + brick.height));
    if (!within(nearestX, nearestY)) return true;
    if (brick.hp > 1) {
      brick.hp--;
      return true;
    }
    return false;
  });
  aiPaddles = aiPaddles.filter(function (bot) {
    return !within(bot.x + bot.width / 2, bot.y + bot.height / 2);
  });
  lasers = lasers.filter(function (laser) { return Math.abs(laser.x - x) > radius; });
  enemyShots = enemyShots.filter(function (shot) { return !within(shot.x, shot.y); });
  adminExplosion = { x: x, y: y, radius: radius, timer: 24 };
  adminMissile = null;
  const status = document.getElementById("missile-status");
  status.textContent = "Missile exploded.";
  assignAiBallTargets();
}

function updateAdminMissile() {
  if (adminExplosion && --adminExplosion.timer <= 0) {
    adminExplosion = null;
    if (!adminMissileArmed) document.getElementById("missile-status").hidden = true;
  }
  if (!adminMissile) return;
  adminMissile.targetX = adminMousePosition.x;
  adminMissile.targetY = adminMousePosition.y;
  const dx = adminMissile.targetX - adminMissile.x;
  const dy = adminMissile.targetY - adminMissile.y;
  const distance = Math.hypot(dx, dy);
  adminMissile.timer--;
  if (distance <= adminMissile.speed + 8 || adminMissile.timer <= 0) {
    explodeAdminMissile(adminMissile.x, adminMissile.y);
    return;
  }
  adminMissile.x += dx / distance * adminMissile.speed;
  adminMissile.y += dy / distance * adminMissile.speed;
}

function drawAdminMissile() {
  if (adminMissile) {
    ctx.save();
    ctx.translate(adminMissile.x, adminMissile.y);
    ctx.rotate(Math.atan2(adminMissile.targetY - adminMissile.y, adminMissile.targetX - adminMissile.x));
    ctx.fillStyle = "#ffd166";
    ctx.shadowColor = "#ff6b35";
    ctx.shadowBlur = 14;
    ctx.fillRect(-10, -4, 20, 8);
    ctx.restore();
  }
  if (adminExplosion) {
    const progress = 1 - adminExplosion.timer / 24;
    ctx.save();
    ctx.globalAlpha = 1 - progress;
    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(adminExplosion.x, adminExplosion.y, adminExplosion.radius * progress, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.shadowBlur = 0;
}

function setObjectInspectorEnabled(enabled) {
  adminInspectEnabled = enabled;
  const button = document.getElementById("object-inspect-toggle");
  if (button) {
    button.setAttribute("aria-pressed", String(enabled));
    button.textContent = "Object inspection: " + (enabled ? "On" : "Off");
  }
  if (!enabled) {
    inspectedObject = null;
    document.getElementById("object-inspector").hidden = true;
  }
}

function inspectAt(x, y) {
  const rectHit = function (item, itemX, itemY, width, height) {
    return x >= itemX && x <= itemX + width && y >= itemY && y <= itemY + height;
  };
  for (const bot of nextBots.slice().reverse()) {
    if (Math.hypot(x - bot.x, y - bot.y) <= 20) return { type: "nextbot", entity: bot };
  }
  for (const brick of bricks.slice().reverse()) {
    if (!brick.hidden && rectHit(brick, brick.x, brick.y, brick.width, brick.height)) return { type: "brick", entity: brick };
  }
  for (const bot of aiPaddles.slice().reverse()) {
    if (rectHit(bot, bot.x, bot.y, bot.width, bot.height)) return { type: "AI paddle", entity: bot };
  }
  if (rectHit(paddle, paddle.x, paddle.y, paddle.width, paddle.height)) return { type: "paddle", entity: paddle };
  for (const activeBall of [ball].concat(extraBalls)) {
    if (rectHit(activeBall, activeBall.x, activeBall.y, activeBall.width, activeBall.height)) return { type: "ball", entity: activeBall };
  }
  return null;
}

function describeInspectedObject() {
  const selection = inspectedObject;
  if (!selection || (selection.type === "nextbot" && !nextBots.includes(selection.entity)) ||
      (selection.type === "brick" && !bricks.includes(selection.entity)) ||
      (selection.type === "AI paddle" && !aiPaddles.includes(selection.entity)) ||
      (selection.type === "ball" && selection.entity !== ball && !extraBalls.includes(selection.entity))) {
    return null;
  }
  const entity = selection.entity;
  let title = selection.type;
  let health = "N/A";
  let size = "N/A";
  let intent = "No active action";
  let thinking = "Idle";
  let calculation = "Uses the object's current game state.";
  let canFreeze = false;
  if (selection.type === "nextbot") {
    title = entity.name;
    health = (entity.health || 1) + "/" + (entity.maxHealth || 1);
    size = "22 x 28";
    intent = nextBotAimAtBall ? "Attacking the ball" : "Attacking the paddle";
    thinking = entity.frozenTimer > 0 ? "Frozen for " + Math.ceil(entity.frozenTimer / 60) + "s" :
      entity.mode === "telegraph" ? "Winding up an attack (" + entity.phaseTimer + " frames)" :
        entity.mode === "dash" ? "Dashing toward its target" : "Choosing a route; attack in " + Math.max(0, Math.ceil(entity.thinkTimer / 60)) + "s";
    canFreeze = true;
  } else if (selection.type === "brick") {
    title = entity.type || (entity.isKill ? "Hazard brick" : "Brick");
    health = entity.isKill ? "Hazard" : (entity.hp || 1) + "/" + (entity.maxHp || entity.hp || 1);
    size = Math.round(entity.width) + " x " + Math.round(entity.height);
    intent = entity.isKill ? "Damages the player on contact" : "Blocks and damages the ball";
    thinking = entity.type === "moving" || entity.type === "sweeper" ? "Moving hazard pattern" : "Stationary";
  } else if (selection.type === "ball") {
    title = entity === ball ? "Main ball" : "Extra ball";
    health = "Player lives: " + lives;
    size = entity.width + " x " + entity.height;
    intent = entity.stuck ? "Waiting to launch" : "Moving at " + Math.hypot(entity.vx, entity.vy).toFixed(1) + " px/frame";
    thinking = entity.stuck ? "Attached to paddle" : "Bouncing off walls, paddle, and bricks";
  } else if (selection.type === "AI paddle") {
    size = Math.round(entity.width) + " x " + Math.round(entity.height);
    health = "N/A";
    intent = entity.aiIntent || "Track an assigned ball";
    thinking = entity.aiCalculation || "Choosing the closest active ball";
    calculation = entity.knownStuff ? entity.knownStuff.calculation : thinking;
  } else {
    size = Math.round(entity.width) + " x " + Math.round(entity.height);
    health = "Player lives: " + lives;
    if (autoPlay) {
      intent = "Autoplay: intercept the ball and avoid hazards";
      thinking = "Target X " + Math.round(paddle.autoTargetX || paddle.x + paddle.width / 2) + "; predicted angle " + Math.round(autoAimAngle) + " degrees";
    } else if (localTestMode && localTestCpu[0]) {
      intent = "CPU tracking the main ball";
      thinking = "Move toward ball center X " + Math.round(ball.x + ball.width / 2);
    } else {
      intent = "Catch and return the main ball";
      thinking = "Controlled by player input";
    }
    if (paddle.knownStuff) {
      thinking += "; " + paddle.knownStuff.summary;
      calculation = paddle.knownStuff.calculation;
    }
  }
  return { title: title, health: health, size: size, intent: intent, thinking: thinking, calculation: calculation, canFreeze: canFreeze };
}

function refreshObjectInspector() {
  if (!inspectedObject) return;
  const details = describeInspectedObject();
  const panel = document.getElementById("object-inspector");
  if (!details) {
    panel.hidden = true;
    inspectedObject = null;
    return;
  }
  document.getElementById("inspector-title").textContent = details.title;
  const list = document.getElementById("inspector-details");
  list.replaceChildren();
  for (const [label, value] of [["Health", details.health], ["Size", details.size], ["Attacking / intended for", details.intent], ["Thinking / doing", details.thinking], ["Calculation", details.calculation]]) {
    const row = document.createElement("div");
    row.textContent = label + ": " + value;
    list.append(row);
  }
  document.getElementById("inspector-freeze").disabled = !details.canFreeze;
  panel.hidden = false;
}

function drawInspectorHighlight() {
  if (!adminInspectEnabled || !inspectedObject) return;
  const entity = inspectedObject.entity;
  let x = entity.x;
  let y = entity.y;
  let width = entity.width;
  let height = entity.height;
  if (inspectedObject.type === "nextbot") {
    x -= 12;
    y -= 14;
    width = 24;
    height = 28;
  }
  ctx.save();
  ctx.strokeStyle = "#7be7ff";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 3]);
  ctx.strokeRect(x - 3, y - 3, width + 6, height + 6);
  ctx.restore();
}

function drawAdminHitboxes() {
  ctx.save();
  ctx.strokeStyle = "rgba(255, 80, 110, 0.9)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.save();
  ctx.translate(paddle.x + paddle.width / 2, paddle.y + paddle.height / 2);
  ctx.rotate(paddle.angle * Math.PI / 180);
  ctx.strokeRect(-paddle.width / 2, -paddle.height / 2, paddle.width, paddle.height);
  ctx.restore();
  for (const activeBall of [ball].concat(extraBalls)) {
    ctx.strokeRect(activeBall.x, activeBall.y, activeBall.width, activeBall.height);
  }
  for (const brick of bricks) {
    if (!brick.hidden) ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
  }
  for (const bot of aiPaddles) {
    ctx.save();
    ctx.translate(bot.x + bot.width / 2, bot.y + bot.height / 2);
    ctx.rotate((bot.angle || 0) * Math.PI / 180);
    ctx.strokeRect(-bot.width / 2, -bot.height / 2, bot.width, bot.height);
    ctx.restore();
  }
  for (const bot of nextBots) {
    ctx.strokeRect(bot.x - 12, bot.y - 14, 24, 28);
  }
  for (const powerUp of powerUps) ctx.strokeRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
  for (const shot of enemyShots) {
    ctx.beginPath();
    ctx.arc(shot.x, shot.y, shot.radius || 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const laser of lasers) ctx.strokeRect(laser.x - 7, 0, 14, HEIGHT);
  for (const rocket of rockets) ctx.strokeRect(rocket.x - 10, rocket.y - 3, 20, 6);
  if (adminMissile) ctx.strokeRect(adminMissile.x - 10, adminMissile.y - 4, 20, 8);
  ctx.restore();
}

  function drawKnownTrajectories() {
    const knownStuff = paddle.knownStuff;
    if (!knownStuff) return;
    for (const prediction of knownStuff.balls) {
      if (prediction.path.length < 2) continue;
      ctx.save();
      ctx.strokeStyle = prediction.hazard ? "#ff5b67" : prediction.label === "Main ball" ? "#7be7ff" : "#55ff78";
      ctx.fillStyle = ctx.strokeStyle;
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(prediction.path[0].x, prediction.path[0].y);
      for (let index = 1; index < prediction.path.length; index++) {
        ctx.lineTo(prediction.path[index].x, prediction.path[index].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(prediction.landingX, paddle.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "10px Courier New";
      ctx.textAlign = "center";
      ctx.fillText(Math.ceil(prediction.framesToLanding / 60) + "s", prediction.landingX, paddle.y - 10);
      if (prediction.shotPath && prediction.shotPath.length > 1) {
        ctx.strokeStyle = prediction.shotPath.hazard ? "#ff5b67" : "#ffd166";
        ctx.fillStyle = ctx.strokeStyle;
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.moveTo(prediction.shotPath[0].x, prediction.shotPath[0].y);
        for (let index = 1; index < prediction.shotPath.length; index++) {
          ctx.lineTo(prediction.shotPath[index].x, prediction.shotPath[index].y);
        }
        ctx.stroke();
        const shotEnd = prediction.shotPath[prediction.shotPath.length - 1];
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(shotEnd.x, shotEnd.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  for (const bot of aiPaddles) {
    if (!bot.knownStuff) continue;
    for (const prediction of bot.knownStuff.balls) {
      if (prediction.path.length < 2) continue;
      ctx.save();
      ctx.strokeStyle = prediction.hazard ? "#ff5b67" : "#55d9ff";
      ctx.globalAlpha = 0.65;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(prediction.path[0].x, prediction.path[0].y);
      for (let index = 1; index < prediction.path.length; index++) {
        ctx.lineTo(prediction.path[index].x, prediction.path[index].y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawPaddlePlan() {
    const targetX = paddle.knownStuff && paddle.knownStuff.targetX;
    if (!Number.isFinite(targetX)) return;
    ctx.save();
    ctx.strokeStyle = "#ffd166";
    ctx.fillStyle = "#ffd166";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 5]);
    ctx.beginPath();
    ctx.moveTo(paddle.x + paddle.width / 2, paddle.y - 4);
    ctx.lineTo(targetX, paddle.y - 4);
    ctx.lineTo(targetX, 76);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(targetX, paddle.y - 4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "10px Courier New";
    ctx.textAlign = "center";
    ctx.fillText("TARGET X " + Math.round(targetX), targetX, paddle.y - 17);
    for (const bot of aiPaddles) {
      if (!bot.knownStuff || !Number.isFinite(bot.knownStuff.targetX)) continue;
      ctx.strokeStyle = "#55d9ff";
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(bot.x + bot.width / 2, bot.y - 4);
      ctx.lineTo(bot.knownStuff.targetX, bot.y - 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawThreatTimers() {
    const knownStuff = paddle.knownStuff;
    if (!knownStuff) return;
    ctx.save();
    ctx.font = "bold 9px Courier New";
    ctx.textAlign = "center";
    for (const laser of knownStuff.lasers) {
      ctx.fillStyle = laser.phase === "firing" ? "#ff6b6b" : "#ffd166";
      ctx.fillText(laser.nextPhase.toUpperCase() + " IN " + laser.secondsToChange.toFixed(1) + "s", Math.max(50, Math.min(WIDTH - 50, laser.x)), HEIGHT - 18);
    }
    for (const bot of knownStuff.nextBots) {
      ctx.fillStyle = bot.mode === "frozen" ? "#7be7ff" : "#ffd166";
      const text = bot.mode === "frozen" ? "FROZEN" : bot.mode === "paused" ? "ATTACK PAUSED" : bot.mode === "dash" ? "ATTACKING" : "ATTACK " + bot.secondsUntilAttack.toFixed(1) + "s";
      ctx.fillText(text, bot.x, bot.y - 44);
    }
    ctx.restore();
  }

  canvas.addEventListener("pointermove", function (event) {
  const rect = canvas.getBoundingClientRect();
  adminMousePosition = {
    x: Math.max(0, Math.min(WIDTH, (event.clientX - rect.left) * WIDTH / rect.width)),
    y: Math.max(0, Math.min(HEIGHT, (event.clientY - rect.top) * HEIGHT / rect.height))
  };
  if (adminMissileArmed) launchAdminMissile();
});

canvas.addEventListener("click", function () {
  if (!adminInspectEnabled) return;
  inspectedObject = inspectAt(adminMousePosition.x, adminMousePosition.y);
  refreshObjectInspector();
});

document.getElementById("inspector-close").addEventListener("click", function () {
  inspectedObject = null;
  document.getElementById("object-inspector").hidden = true;
});
document.getElementById("inspector-freeze").addEventListener("click", function () {
  if (inspectedObject && inspectedObject.type === "nextbot") {
    inspectedObject.entity.frozenTimer = FREEZE_DURATION_FRAMES * 2;
    refreshObjectInspector();
  }
});
document.getElementById("inspector-laser").addEventListener("click", function () {
  spawnAdminLaserAt(paddle.x + paddle.width / 2);
});

function spawnAdminEverything() {
  addAdminBall();
  spawnAdminBrick();
  spawnAdminPowerUp();
  spawnAdminLaser();
  spawnAdminAiPaddle();
  spawnAdminGunner();
  spawnAdminBoss();
  const nextBotSelect = document.getElementById("admin-nextbot-select");
  spawnNextBot(nextBotSelect && nextBotSelect.value !== "random" ? nextBotSelect.value : undefined);
}

function clearAdminSpawnedObjects() {
  extraBalls = [];
  powerUps = [];
  lasers = [];
  aiPaddles = [];
  adminGunners = [];
  adminGunnerBullets = [];
  bricks = bricks.filter(function (brick) { return !brick.adminSpawned; });
  selectNextBots();
  assignAiBallTargets();
}

function refreshIdleMemeButton() {
  const button = document.getElementById("idle-meme-toggle");
  if (!button) return;
  button.setAttribute("aria-pressed", String(idleMemeEnabled));
  button.textContent = "Idle meme: " + (idleMemeEnabled ? "On" : "Off");
}

function refreshAimLaserButton() {
  const button = document.getElementById("aim-laser-toggle");
  if (!button) return;
  button.setAttribute("aria-pressed", String(aimLaserEnabled));
  button.textContent = "Aim laser: " + (aimLaserEnabled ? "On" : "Off");
}

function populateAdminNextBotSelect() {
  const select = document.getElementById("admin-nextbot-select");
  if (!select || typeof NEXTBOT_ROSTER === "undefined") return;
  for (const bot of NEXTBOT_ROSTER) {
    const option = document.createElement("option");
    option.value = bot.name;
    option.textContent = bot.name + " (" + bot.speed.toFixed(2) + "x, " + ((bot.telegraphFrames || 48) / 60).toFixed(1) + "s)";
    select.append(option);
  }
  select.addEventListener("change", refreshAdminNextBotDetails);
  refreshAdminNextBotDetails();
}

function refreshAdminNextBotDetails() {
  const details = document.getElementById("admin-nextbot-details");
  const select = document.getElementById("admin-nextbot-select");
  if (!details || !select || typeof NEXTBOT_ROSTER === "undefined") return;
  const bot = NEXTBOT_ROSTER.find(function (entry) { return entry.name === select.value; });
  details.textContent = bot
    ? (bot.description || "Standard nextbot") + " / speed " + bot.speed.toFixed(2) + "x / warning " + ((bot.telegraphFrames || 48) / 60).toFixed(1) + "s"
    : "Choose a nextbot to see its speed and warning time.";
}

function applyAdminBallSpeed(value) {
  const nextSpeed = Math.max(3, Math.min(20, Number(value) || BALL_SPEED));
  const speedScale = nextSpeed / baseBallSpeed;
  baseBallSpeed = nextSpeed;
  for (const activeBall of [ball].concat(extraBalls)) {
    if (activeBall.stuck) continue;
    activeBall.vx *= speedScale;
    activeBall.vy *= speedScale;
  }
}

function applyAdminGameSettings(settings) {
  if (!settings) return;
  if (Number.isFinite(settings.ballSpeed) && settings.ballSpeed > 0) applyAdminBallSpeed(settings.ballSpeed);
  if (Number.isFinite(settings.paddleSpeed)) paddle.speed = Math.max(2, Math.min(12, settings.paddleSpeed));
  if (Number.isFinite(settings.paddleWidth)) {
    const center = paddle.x + paddle.width / 2;
    basePaddleWidth = Math.max(50, Math.min(160, settings.paddleWidth));
    paddle.width = basePaddleWidth;
    paddle.x = Math.max(0, Math.min(WIDTH - paddle.width, center - paddle.width / 2));
  }
  if (Number.isFinite(settings.startingLives)) startingLives = Math.max(1, Math.min(10, settings.startingLives));
  if (Number.isFinite(settings.nextBotSpeed)) adminNextBotSpeedMultiplier = Math.max(0.5, Math.min(2.5, settings.nextBotSpeed));
  if (Number.isFinite(settings.bossHealthBoost)) bossHealthBoost = Math.max(1, Math.min(100, settings.bossHealthBoost));
  if (typeof settings.powerUpDrops === "boolean") powerUpDropsEnabled = settings.powerUpDrops;
  if (typeof settings.laserDamage === "boolean") laserDamageEnabled = settings.laserDamage;
  if (typeof settings.bossMinions === "boolean") bossMinionsEnabled = settings.bossMinions;
  refreshAdminVariableControls();
}

function refreshAdminVariableControls() {
  const values = {
    "admin-ball-speed": [baseBallSpeed, "admin-ball-speed-value", String(baseBallSpeed)],
    "admin-paddle-speed": [paddle.speed, "admin-paddle-speed-value", String(paddle.speed)],
    "admin-paddle-width": [basePaddleWidth, "admin-paddle-width-value", String(basePaddleWidth)],
    "admin-lives": [lives, "admin-lives-value", String(lives)],
    "admin-nextbot-speed": [adminNextBotSpeedMultiplier, "admin-nextbot-speed-value", adminNextBotSpeedMultiplier.toFixed(1) + "x"],
    "admin-boss-health": [bossHealthBoost, "admin-boss-health-value", bossHealthBoost.toFixed(1) + "x"]
  };
  for (const id of Object.keys(values)) {
    const input = document.getElementById(id);
    const output = document.getElementById(values[id][1]);
    if (input) input.value = String(values[id][0]);
    if (output) output.value = values[id][2];
  }
}

function setupAdminVariableControls() {
  const ballSpeed = document.getElementById("admin-ball-speed");
  const paddleSpeed = document.getElementById("admin-paddle-speed");
  const paddleWidth = document.getElementById("admin-paddle-width");
  const livesInput = document.getElementById("admin-lives");
  const nextBotSpeed = document.getElementById("admin-nextbot-speed");
  const bossHealth = document.getElementById("admin-boss-health");
  ballSpeed.addEventListener("input", function () {
    if (sendRemoteAdminCommand({ type: "setting", key: "ballSpeed", value: Number(ballSpeed.value) })) return;
    applyAdminBallSpeed(ballSpeed.value);
    refreshAdminVariableControls();
  });
  paddleSpeed.addEventListener("input", function () {
    if (sendRemoteAdminCommand({ type: "setting", key: "paddleSpeed", value: Number(paddleSpeed.value) })) return;
    paddle.speed = Number(paddleSpeed.value);
    refreshAdminVariableControls();
  });
  paddleWidth.addEventListener("input", function () {
    if (sendRemoteAdminCommand({ type: "setting", key: "paddleWidth", value: Number(paddleWidth.value) })) return;
    const center = paddle.x + paddle.width / 2;
    basePaddleWidth = Number(paddleWidth.value);
    paddle.width = basePaddleWidth;
    paddle.x = Math.max(0, Math.min(WIDTH - paddle.width, center - paddle.width / 2));
    refreshAdminVariableControls();
  });
  livesInput.addEventListener("input", function () {
    if (sendRemoteAdminCommand({ type: "setting", key: "startingLives", value: Number(livesInput.value) })) return;
    startingLives = Number(livesInput.value);
    lives = startingLives;
    if (lives > 0) gameOver = false;
    refreshAdminVariableControls();
  });
  nextBotSpeed.addEventListener("input", function () {
    if (sendRemoteAdminCommand({ type: "setting", key: "nextBotSpeed", value: Number(nextBotSpeed.value) })) return;
    adminNextBotSpeedMultiplier = Number(nextBotSpeed.value);
    refreshAdminVariableControls();
  });
  bossHealth.addEventListener("input", function () {
    if (sendRemoteAdminCommand({ type: "setting", key: "bossHealthBoost", value: Number(bossHealth.value) })) return;
    bossHealthBoost = Number(bossHealth.value);
    refreshAdminVariableControls();
  });
  refreshAdminVariableControls();
}

function setWebsiteFpsEnabled(enabled) {
  websiteFpsEnabled = enabled;
  const button = document.getElementById("website-fps-toggle");
  const display = document.getElementById("website-fps-display");
  if (button) {
    button.setAttribute("aria-pressed", String(websiteFpsEnabled));
    button.textContent = "Website FPS: " + (websiteFpsEnabled ? "On" : "Off");
  }
  for (const adminButton of document.querySelectorAll('[data-admin="website-fps"]')) {
    adminButton.setAttribute("aria-pressed", String(websiteFpsEnabled));
    adminButton.textContent = "Website FPS: " + (websiteFpsEnabled ? "On" : "Off");
  }
  if (display) display.hidden = !websiteFpsEnabled;
}

function refreshAdminToggle(action, enabled, label) {
  const button = document.querySelector('[data-admin="' + action + '"]');
  if (!button) return;
  button.setAttribute("aria-pressed", String(enabled));
  button.textContent = label + ": " + (enabled ? "On" : "Off");
}

setupAdminVariableControls();
document.getElementById("website-fps-toggle").addEventListener("click", function () {
  setWebsiteFpsEnabled(!websiteFpsEnabled);
});

function assignAiBallTargets() {
  const activeBalls = [ball].concat(extraBalls);
  for (let i = 0; i < aiPaddles.length; i++) {
    const bot = aiPaddles[i];
    bot.assignedBall = activeBalls[i % activeBalls.length] || ball;
  }
}

function testAdminTools() {
  for (let i = 0; i < 3; i++) {
    addAdminBall();
  }
  for (let i = 0; i < 2; i++) {
    spawnAdminAiPaddle();
  }
  assignAiBallTargets();
}

const repeatAdminActions = new Set(["ball", "spawn-brick", "spawn-powerup", "spawn-laser", "break", "ai", "kill-ai", "spawn-nextbot", "spawn-gunner", "spawn-boss-0", "spawn-boss-1", "spawn-boss-2", "spawn-boss-3", "spawn-boss-4", "spawn-boss-5", "spawn-boss-6", "spawn-boss-7", "spawn-boss-8", "spawn-boss-9", "spawn-boss-10", "spawn-boss-11", "spawn-boss-12", "spawn-boss-13", "spawn-boss-14", "spawn-boss-15", "spawn-boss-16", "spawn-boss-17", "spawn-boss-18", "spawn-boss-19", "spawn-boss-20", "spawn-boss-21", "spawn-boss-22", "spawn-boss-23", "spawn-boss-24", "spawn-boss-25", "spawn-boss-26", "spawn-boss-27", "spawn-boss-28", "spawn-boss-29", "remove-nextbot", "life", "repair-bricks", "clear-boss-minions", "full-heal", "max-shield", "spawn-boss-wave", "spawn-elite-wave", "drop-powerups", "clear-projectiles"]);
const adminRepeatCount = document.getElementById("admin-repeat-count");
const adminRepeatStatus = document.getElementById("admin-repeat-status");

async function openAdminUrlFromFile() {
  const status = document.getElementById("admin-url-status");
  const newTab = window.open("about:blank", "_blank");
  if (!newTab) {
    status.textContent = "The new tab was blocked. Allow pop-ups and try again.";
    return;
  }
  newTab.opener = null;
  status.textContent = "Reading admin-url.txt…";

  let response;
  let contents;
  try {
    response = await fetch("admin-url.txt", { cache: "no-store" });
    if (!response.ok) {
      status.textContent = "Could not read admin-url.txt (HTTP " + response.status + ").";
      newTab.close();
      return;
    }
    contents = await response.text();
  } catch (error) {
    console.error("Could not read admin-url.txt", error);
    status.textContent = "Could not read admin-url.txt. Make sure the game is served by a web server.";
    newTab.close();
    return;
  }

  const urlLine = contents.split(/\r?\n/).map(function (line) {
    return line.trim();
  }).find(function (line) {
    return line && !line.startsWith("#");
  });
  if (!urlLine) {
    status.textContent = "Add a URL to admin-url.txt first.";
    newTab.close();
    return;
  }

  let targetUrl;
  try {
    targetUrl = new URL(urlLine);
  } catch (error) {
    status.textContent = "The URL in admin-url.txt is invalid.";
    newTab.close();
    return;
  }
  if (targetUrl.protocol !== "https:" && targetUrl.protocol !== "http:") {
    status.textContent = "Only http:// and https:// URLs can be opened.";
    newTab.close();
    return;
  }

  newTab.location.replace(targetUrl.href);
  status.textContent = "Opened " + targetUrl.href;
}

function runAdminAction(action, remoteAuthorized = false) {
  if (multiplayerActive && !remoteAuthorized && !multiplayerAdminIds.includes(multiplayerPlayerId)) return;
  if (action === "launch-ball") {
    if (ball.stuck) launchStuckBall(getPaddleForPlayer(ball.stuckPlayerId), ball.stuckPlayerId);
  } else if (action === "clear-board") {
    bricks = bricks.filter(function (brick) { return brick.isKill; });
  } else if (action === "repair-bricks") {
    for (const brick of bricks) {
      if (!brick.hidden && brick.maxHp && brick.hp !== undefined) {
        brick.hp = Math.max(brick.hp, brick.maxHp);
      }
    }
    powerUpNotice = { text: "ARENA REPAIRED", timer: 90, color: "#7be7ff" };
  } else if (action === "clear-nextbots") {
    selectNextBots();
    enemyShots = [];
    rockets = [];
  } else if (action === "clear-projectiles") {
    lasers = [];
    enemyShots = [];
    adminGunnerBullets = [];
    rockets = [];
    powerUpNotice = { text: "PROJECTILES CLEARED", timer: 90, color: "#7be7ff" };
  } else if (action === "clear-boss-minions") {
    clearBossMinions();
    powerUpNotice = { text: "BOSS MINIONS REMOVED", timer: 90, color: "#ffd166" };
  } else if (action === "restore-lives") {
    lives = Math.max(STARTING_LIVES, startingLives);
    if (gameOver) {
      gameOver = false;
      resetBall();
    }
  } else if (action === "max-lives") {
    startingLives = 99;
    lives = 99;
    if (gameOver) {
      gameOver = false;
      resetBall();
    }
    powerUpNotice = { text: "MAX LIVES", timer: 90, color: "#7ef29a" };
  } else if (action === "full-heal") {
    lives = Math.max(startingLives, 9);
    if (paddle) {
      paddle.width = basePaddleWidth;
      paddle.x = Math.max(0, Math.min(WIDTH - paddle.width, paddle.x));
    }
    if (gameOver) {
      gameOver = false;
      resetBall();
    }
    powerUpNotice = { text: "FULL RECOVERY", timer: 90, color: "#7ef29a" };
  } else if (action === "max-shield") {
    shieldTimer = 3600;
    powerUpNotice = { text: "SHIELD MAXED", timer: 90, color: "#7be7ff" };
  } else if (action === "full-cleanup") {
    bricks = bricks.filter(function (brick) { return brick.isKill; });
    lasers = [];
    enemyShots = [];
    adminGunnerBullets = [];
    rockets = [];
    nextBots = [];
    nextBotBattle = null;
    powerUpNotice = { text: "FULL CLEANUP", timer: 90, color: "#ffd166" };
  } else if (action === "retry-level") {
    if (gameStarted) resetCurrentLevel();
    else startLevel(level);
  } else if (action === "previous-level") {
    if (level > 0) {
      gameOver = false;
      gameWon = false;
      startLevel(level - 1);
    }
  } else if (action === "add-score") {
    mola += 1000;
    recordHighScore();
    powerUpNotice = { text: "+1000 SCORE", timer: 100, color: "#d6ff55" };
  } else if (action === "clear-hazards") {
    bricks = bricks.filter(function (brick) { return !brick.isKill; });
    lasers = [];
    enemyShots = [];
    adminGunnerBullets = [];
    powerUpNotice = { text: "HAZARDS CLEARED", timer: 90, color: "#7be7ff" };
  } else if (action === "rescue-ball") {
    gameOver = false;
    gameWon = false;
    lives = Math.max(1, lives);
    resetBall();
    powerUpNotice = { text: "BALL RESCUED", timer: 90, color: "#7be7ff" };
  } else if (action === "heal-boss" || action === "damage-boss") {
    const boss = bricks.find(function (brick) { return brick.type === "boss" && !brick.hidden; });
    if (boss) {
      const amount = Math.max(1, Math.floor(boss.maxHp * 0.25));
      boss.hp = action === "heal-boss" ? Math.min(boss.maxHp, boss.hp + amount) : Math.max(0, boss.hp - amount);
      if (boss.hp <= 0) bricks = bricks.filter(function (brick) { return brick !== boss; });
      powerUpNotice = { text: action === "heal-boss" ? "BOSS REPAIRED" : "BOSS DAMAGED", timer: 90, color: "#ff8c69" };
    } else if (adminRepeatStatus) {
      adminRepeatStatus.textContent = "There is no active boss.";
    }
  } else if (action === "spawn-boss-wave") {
    const wave = [0, 3, 7, 12, 18, 23];
    for (let index = 0; index < wave.length; index++) {
      spawnAdminBoss(wave[index] % BOSS_VARIANTS.length);
    }
    powerUpNotice = { text: "BOSS WAVE SPAWNED", timer: 90, color: "#ffd166" };
  } else if (action === "spawn-random-nextbot") {
    spawnNextBot();
    powerUpNotice = { text: "RANDOM NEXTBOT", timer: 90, color: "#7be7ff" };
  } else if (action === "spawn-enemy-range") {
    const min = Math.max(2, Math.min(8, Math.floor(level / 4) + 2));
    const max = Math.min(14, min + 4);
    const count = Math.floor(Math.random() * (max - min + 1)) + min;
    for (let index = 0; index < count; index++) {
      spawnNextBot();
    }
    powerUpNotice = { text: "ENEMY RANGE SPAWNED", timer: 90, color: "#7be7ff" };
  } else if (action === "spawn-random-boss") {
    spawnAdminBoss(Math.floor(Math.random() * BOSS_VARIANTS.length));
    powerUpNotice = { text: "RANDOM BOSS", timer: 90, color: "#ffd166" };
  } else if (action === "spawn-elite-wave") {
    const wave = [4, 8, 14, 19, 27, 29];
    for (let index = 0; index < wave.length; index++) {
      spawnAdminBoss(wave[index] % BOSS_VARIANTS.length);
    }
    powerUpNotice = { text: "ELITE WAVE SPAWNED", timer: 90, color: "#ff8c69" };
  } else if (action === "drop-powerups") {
    for (let index = 0; index < 7; index++) {
      spawnAdminPowerUp();
    }
    powerUpNotice = { text: "POWER-UP BURST", timer: 90, color: "#d6ff55" };
  } else if (action === "reset-score") {
    mola = 0;
    newBest = false;
    powerUpNotice = { text: "RUN SCORE RESET", timer: 90, color: "#d6ff55" };
  } else if (action === "open-url-from-file") {
    openAdminUrlFromFile();
  } else if (action === "ball") {
    addAdminBall();
  } else if (action === "spawn-brick") {
    spawnAdminBrick();
  } else if (action === "spawn-powerup") {
    spawnAdminPowerUp();
  } else if (action === "spawn-laser") {
    spawnAdminLaser();
  } else if (action === "laser-paddle") {
    spawnAdminLaserAt(paddle.x + paddle.width / 2);
  } else if (action === "spawn-missile") {
    armAdminMissile();
  } else if (action.startsWith("spawn-boss-")) {
    spawnAdminBoss(Number(action.slice("spawn-boss-".length)));
  } else if (action === "spawn-final-boss") {
    spawnAdminFinalBoss();
  } else if (action === "boss-phase") {
    advanceAdminBossPhase();
  } else if (action === "debug") {
    adminDebugEnabled = !adminDebugEnabled;
    const debugOutput = document.getElementById("admin-debug-readout");
    const debugButton = document.getElementById("admin-debug-toggle");
    debugOutput.hidden = !adminDebugEnabled;
    debugButton.setAttribute("aria-pressed", String(adminDebugEnabled));
    debugButton.textContent = "Debug readout: " + (adminDebugEnabled ? "On" : "Off");
    refreshAdminDebugReadout();
  } else if (action === "spawn-all") {
    spawnAdminEverything();
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
  } else if (action === "nextbot-waits") {
    setNextBotAttacksPaused(!nextBotAttacksPaused);
  } else if (action === "nextbot-lasers") {
    nextBotLasersEnabled = !nextBotLasersEnabled;
    refreshAdminToggle(action, nextBotLasersEnabled, "Lasers hit nextbots");
  } else if (action === "nextbot-aim") {
    setNextBotAimAtBall(!isNextBotAimAtBall());
  } else if (action === "inspect") {
    setObjectInspectorEnabled(!adminInspectEnabled);
  } else if (action === "aim-laser") {
    aimLaserEnabled = !aimLaserEnabled;
    refreshAimLaserButton();
  } else if (action === "spawn-cursor") {
    adminSpawnAtCursor = !adminSpawnAtCursor;
    const button = document.querySelector('[data-admin="spawn-cursor"]');
    button.setAttribute("aria-pressed", String(adminSpawnAtCursor));
    button.textContent = "Spawn at cursor: " + (adminSpawnAtCursor ? "On" : "Off");
  } else if (action === "laser-damage") {
    laserDamageEnabled = !laserDamageEnabled;
    refreshAdminToggle(action, laserDamageEnabled, "Laser damage");
  } else if (action === "powerup-drops") {
    powerUpDropsEnabled = !powerUpDropsEnabled;
    refreshAdminToggle(action, powerUpDropsEnabled, "Power-up drops");
  } else if (action === "boss-minions") {
    bossMinionsEnabled = !bossMinionsEnabled;
    refreshAdminToggle(action, bossMinionsEnabled, "Boss minions");
  } else if (action === "idle-meme") {
    idleMemeEnabled = !idleMemeEnabled;
    if (!idleMemeEnabled && idleMeme) {
      window.clearTimeout(idleMemeHideTimer);
      window.clearTimeout(idleMemeFadeTimer);
      idleMeme.hidden = true;
      idleMeme.classList.remove("is-visible");
    }
    refreshIdleMemeButton();
  } else if (action === "show-meme") {
    showIdleMeme();
  } else if (action === "hide-balls") {
    adminVisibility.balls = !adminVisibility.balls;
    const button = document.querySelector('[data-admin="hide-balls"]');
    button.setAttribute("aria-pressed", String(adminVisibility.balls));
    button.textContent = "Ball visibility: " + (adminVisibility.balls ? "On" : "Off");
  } else if (action === "auto-advance") {
    autoAdvanceLevel = !autoAdvanceLevel;
    const button = document.getElementById("auto-advance-toggle");
    button.setAttribute("aria-pressed", String(autoAdvanceLevel));
    button.textContent = "Auto-advance: " + (autoAdvanceLevel ? "On" : "Off");
  } else if (action === "fps") {
    fpsEnabled = !fpsEnabled;
    const button = document.getElementById("fps-toggle");
    button.setAttribute("aria-pressed", String(fpsEnabled));
    button.textContent = "Game FPS: " + (fpsEnabled ? "On" : "Off");
  } else if (action === "website-fps") {
    setWebsiteFpsEnabled(!websiteFpsEnabled);
  } else if (action === "spawn-nextbot") {
    const nextBotSelect = document.getElementById("admin-nextbot-select");
    const spawnedBot = spawnNextBot(nextBotSelect && nextBotSelect.value !== "random" ? nextBotSelect.value : undefined);
    if (adminSpawnAtCursor && spawnedBot) {
      spawnedBot.x = adminMousePosition.x;
      spawnedBot.y = adminMousePosition.y;
      spawnedBot.targetX = adminMousePosition.x;
      spawnedBot.targetY = adminMousePosition.y;
    }
    if (!spawnedBot && adminRepeatStatus) {
      adminRepeatStatus.textContent = "Nextbot limit reached (" + nextBots.length + "). Increase the limit or remove a nextbot.";
    }
  } else if (action === "spawn-gunner") {
    spawnAdminGunner();
    if (adminRepeatStatus) adminRepeatStatus.textContent = "Friendly gunners: " + adminGunners.length + ". Right-click to spawn a batch.";
  } else if (action === "nextbot-wave") {
    let spawned = 0;
    for (let index = 0; index < 8; index++) {
      if (spawnNextBot()) spawned++;
    }
    if (adminRepeatStatus) adminRepeatStatus.textContent = "Spawned " + spawned + " nextbots; " + nextBots.length + " active.";
  } else if (action === "nextbot-attack") {
    const started = triggerNextBotAttack();
    if (adminRepeatStatus) adminRepeatStatus.textContent = started ? "Nextbot attack queued." : "No available nextbot, or attacks are paused.";
  } else if (action === "remove-nextbot") {
    removeNextBot();
  } else if (action === "clear-balls") {
    extraBalls = [];
    assignAiBallTargets();
  } else if (action === "clear-powerups") {
    powerUps = [];
  } else if (action === "clear-lasers") {
    lasers = [];
  } else if (action === "clear-ai") {
    aiPaddles = [];
  } else if (action === "clear-spawned") {
    clearAdminSpawnedObjects();
  } else if (action === "life") {
    lives++;
    if (gameOver) {
      gameOver = false;
      resetBall();
    }
  } else if (action === "level") {
    gameOver = false;
    advanceLevel();
  } else if (action === "skip-level") {
    const selectedLevel = Number(adminLevelSelect && adminLevelSelect.value);
    if (Number.isInteger(selectedLevel) && selectedLevel >= 1 && selectedLevel <= LEVEL_COUNT) {
      gameOver = false;
      gameWon = false;
      startLevel(selectedLevel - 1);
    }
  } else if (action === "restart") {
    restartGame();
  } else if (action === "menu") {
    if (localTestMode) {
      stopLocalMultiplayerTest();
    } else if (multiplayerActive && typeof window.leaveLobbySession === "function") {
      window.leaveLobbySession();
    } else {
      showMainMenu();
    }
  }
}

const remoteAdminActions = new Set(Array.from(document.querySelectorAll("#admin-menu [data-admin]"), function (button) {
  return button.dataset.admin;
}));

function getRemoteAdminToolOptions() {
  return {
    brickType: document.getElementById("admin-brick-select").value,
    powerUp: document.getElementById("admin-powerup-select").value,
    nextBot: document.getElementById("admin-nextbot-select").value,
    level: document.getElementById("admin-level-select").value,
    mouseX: adminMousePosition.x,
    mouseY: adminMousePosition.y
  };
}

function setRemoteAdminSelect(id, value) {
  const select = document.getElementById(id);
  const optionValue = String(value);
  if (select && Array.from(select.options).some(function (option) { return option.value === optionValue; })) {
    select.value = optionValue;
  }
}

window.runRemoteAdminCommand = function (adminId, command) {
  if (!multiplayerHost || !multiplayerAdminIds.includes(adminId) || !command || typeof command !== "object") return;
  if (command.type === "tool") {
    if (!remoteAdminActions.has(command.action)) return;
    const options = command.options || {};
    setRemoteAdminSelect("admin-brick-select", options.brickType);
    setRemoteAdminSelect("admin-powerup-select", options.powerUp);
    setRemoteAdminSelect("admin-nextbot-select", options.nextBot);
    setRemoteAdminSelect("admin-level-select", options.level);
    if (Number.isFinite(options.mouseX) && Number.isFinite(options.mouseY)) {
      adminMousePosition = {
        x: Math.max(0, Math.min(WIDTH, options.mouseX)),
        y: Math.max(0, Math.min(HEIGHT, options.mouseY))
      };
    }
    runAdminAction(command.action, true);
  } else if (command.type === "repeat" && remoteAdminActions.has(command.action) && repeatAdminActions.has(command.action)) {
    const count = Number.isInteger(command.count) ? Math.max(1, Math.min(100, command.count)) : 1;
    const options = command.options || {};
    setRemoteAdminSelect("admin-brick-select", options.brickType);
    setRemoteAdminSelect("admin-powerup-select", options.powerUp);
    setRemoteAdminSelect("admin-nextbot-select", options.nextBot);
    setRemoteAdminSelect("admin-level-select", options.level);
    for (let index = 0; index < count; index++) runAdminAction(command.action, true);
  } else if (command.type === "setting" && Number.isFinite(command.value)) {
    const settings = {};
    if (["ballSpeed", "paddleSpeed", "paddleWidth", "startingLives", "nextBotSpeed", "bossHealthBoost"].includes(command.key)) {
      settings[command.key] = command.value;
      applyAdminGameSettings(settings);
      if (command.key === "startingLives") {
        lives = startingLives;
        if (lives > 0) gameOver = false;
        refreshAdminVariableControls();
      }
    }
  } else if (command.type === "speed") {
    setSimulationSpeed(command.value);
  } else if (command.type === "mode" && Number.isInteger(command.value) && command.value >= 0 && command.value < GAME_MODES.length) {
    applyMode(command.value);
  } else if (command.type === "skin" && Number.isInteger(command.value) && command.value >= 0 && command.value < SKINS.length) {
    applySkin(command.value);
  }
};

for (const adminButton of document.querySelectorAll("#admin-menu button")) {
  adminButton.addEventListener("click", function () {
    if (!adminButton.dataset.admin) return;
    if (sendRemoteAdminCommand({ type: "tool", action: adminButton.dataset.admin, options: getRemoteAdminToolOptions() })) return;
    runAdminAction(adminButton.dataset.admin);
  });
  adminButton.addEventListener("pointerdown", function (event) {
    if (event.button !== 2) return;
    event.preventDefault();
    const action = adminButton.dataset.admin;
    if (!repeatAdminActions.has(action)) return;
    const requestedCount = Number(adminRepeatCount && adminRepeatCount.value);
    const count = Number.isInteger(requestedCount) ? Math.max(1, Math.min(100, requestedCount)) : 25;
    if (sendRemoteAdminCommand({ type: "repeat", action: action, count: count, options: getRemoteAdminToolOptions() })) return;
    const startingBotCount = nextBots.length;
    if (adminRepeatCount) adminRepeatCount.value = String(count);
    for (let index = 0; index < count; index++) runAdminAction(action);
    if (adminRepeatStatus) {
      const botCount = action === "spawn-nextbot" ? "; spawned " + (nextBots.length - startingBotCount) + " (" + nextBots.length + " active)" : "";
      adminRepeatStatus.textContent = adminButton.textContent.trim() + " ran " + count + " times" + botCount + ".";
    }
  });
  adminButton.addEventListener("contextmenu", function (event) {
    event.preventDefault();
  });
}

if (adminSkinSelect) {
  adminSkinSelect.addEventListener("change", function () {
    if (sendRemoteAdminCommand({ type: "skin", value: Number(adminSkinSelect.value) })) return;
    applySkin(Number(adminSkinSelect.value));
  });
}

if (adminModeSelect) {
  adminModeSelect.addEventListener("change", function () {
    if (sendRemoteAdminCommand({ type: "mode", value: Number(adminModeSelect.value) })) return;
    applyMode(Number(adminModeSelect.value));
    if (gameStarted && !randomEverythingEnabled && (!multiplayerActive || multiplayerHost)) {
      setNextBotsForLevel(level);
    }
  });
}

if (adminPanelModeSelect) {
  adminPanelModeSelect.addEventListener("change", function () {
    if (sendRemoteAdminCommand({ type: "mode", value: Number(adminPanelModeSelect.value) })) return;
    applyMode(Number(adminPanelModeSelect.value));
    if (gameStarted && !randomEverythingEnabled && (!multiplayerActive || multiplayerHost)) setNextBotsForLevel(level);
  });
}

document.addEventListener("keydown", function (event) {
  const key = normalizeHotkeyName(event.key);

  if (pendingKeybindAction) {
    const capturedAction = pendingKeybindAction;
    event.preventDefault();
    pendingKeybindAction = null;
    setCustomHotkey(capturedAction, key || "", event.shiftKey);
    return;
  }

  const target = event.target;
  const typing = target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
  if (typing) secretImageSequenceIndex = 0;
  if (!typing) {
    if (event.shiftKey && key === "y") {
      if (!event.repeat) toggleAdminMenu();
      secretImageSequenceIndex = 1;
      event.preventDefault();
      return;
    }
    if (secretImageSequenceIndex > 0) {
      if (!event.shiftKey && key === String(secretImageSequenceIndex)) {
        secretImageSequenceIndex++;
        event.preventDefault();
        if (secretImageSequenceIndex === 5) {
          setSecretImageMode(!secretImageMode);
          secretImageSequenceIndex = 0;
          levelNotice = { text: secretImageMode ? "SECRET PHOTO MODE ON" : "SECRET PHOTO MODE OFF", timer: 120 };
        }
        return;
      }
      secretImageSequenceIndex = 0;
    }
  }

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

  if (gameStarted && event.shiftKey && key === "r") {
    event.preventDefault();
    if (event.repeat) return;
    const now = performance.now();
    if (now - lastShiftResetTime <= 1100) {
      lastShiftResetTime = 0;
      if (multiplayerActive && !multiplayerHost && typeof window.requestLobbyReset === "function") {
        window.requestLobbyReset();
      } else {
        resetCurrentLevel();
      }
    } else {
      lastShiftResetTime = now;
      levelNotice = { text: "PRESS SHIFT+R AGAIN TO RESET THIS LEVEL", timer: 90 };
    }
    return;
  }

  if (customKeybinds["toggle-fullscreen"] && key === customKeybinds["toggle-fullscreen"] && Boolean(event.shiftKey) === Boolean(customKeybindShift["toggle-fullscreen"])) {
    event.preventDefault();
    toggleFullscreen();
    return;
  }

  if (customKeybinds["start-game"] && key === customKeybinds["start-game"] && Boolean(event.shiftKey) === Boolean(customKeybindShift["start-game"]) && !gameStarted) {
    event.preventDefault();
    beginGame();
    return;
  }

  if (customKeybinds["lobby-start"] && key === customKeybinds["lobby-start"] && Boolean(event.shiftKey) === Boolean(customKeybindShift["lobby-start"]) && lobbyHost && lobbyActive && !lobbyStarted) {
    event.preventDefault();
    if (lobbySocket && lobbySocket.readyState === WebSocket.OPEN) {
      lobbySocket.send(JSON.stringify({ type: "start" }));
    }
    return;
  }

  if (customKeybinds["lobby-add-ai"] && key === customKeybinds["lobby-add-ai"] && Boolean(event.shiftKey) === Boolean(customKeybindShift["lobby-add-ai"]) && lobbyHost && lobbyActive) {
    event.preventDefault();
    if (lobbySocket && lobbySocket.readyState === WebSocket.OPEN) {
      lobbySocket.send(JSON.stringify({ type: "add-ai", name: (lobbyAINameInput && lobbyAINameInput.value.trim()) || "CPU" }));
      if (lobbyAINameInput) lobbyAINameInput.value = "";
    }
    return;
  }

  if (customKeybinds["toggle-admin"] && key === customKeybinds["toggle-admin"] && Boolean(event.shiftKey) === Boolean(customKeybindShift["toggle-admin"])) {
    event.preventDefault();
    toggleAdminMenu();
    return;
  }

  if (customKeybinds["toggle-autoplay"] && key === customKeybinds["toggle-autoplay"] && Boolean(event.shiftKey) === Boolean(customKeybindShift["toggle-autoplay"])) {
    event.preventDefault();
    autoPlay = !autoPlay;
    autoPlayButton.setAttribute("aria-pressed", String(autoPlay));
    autoPlayButton.textContent = autoPlay ? "Auto-play: On" : "Auto-play: Off";
    return;
  }

  if (customKeybinds["toggle-mobile-controls"] && key === customKeybinds["toggle-mobile-controls"] && Boolean(event.shiftKey) === Boolean(customKeybindShift["toggle-mobile-controls"])) {
    event.preventDefault();
    mobileControlsEnabled = !mobileControlsEnabled;
    try {
      localStorage.setItem("blockBreakerMobileControls", String(mobileControlsEnabled));
    } catch (error) {
      // Ignore storage errors and keep the in-memory toggle live.
    }
    refreshMobileControlsButton();
    refreshTouchControls();
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
    if (key === CONTROL_KEYS.left) paddleFacingDirection = -1;
    if (key === CONTROL_KEYS.right) paddleFacingDirection = 1;
    keys[key] = true;
    if (key === "t" && !event.repeat && !gameOver && !gameWon) {
      rokets();
      event.preventDefault();
    }
    if (!event.repeat && !gameOver && !gameWon) {
      if (key === "g") {
        shield();
        event.preventDefault();
      } else if (key === "f") {
        dash();
        event.preventDefault();
      } else if (key === "b") {
        freeze();
        event.preventDefault();
      }
    }
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

const fullscreenButton = document.getElementById("fullscreen-toggle");
if (fullscreenButton) {
  fullscreenButton.addEventListener("click", toggleFullscreen);
}

const mainMenuFullscreenButton = document.getElementById("menu-fullscreen");
if (mainMenuFullscreenButton) {
  mainMenuFullscreenButton.addEventListener("click", toggleFullscreen);
}

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

if (touchLaunchButton) {
  touchLaunchButton.addEventListener("click", function () {
    launchStuckBall();
  });
}

// ------------------------------------------------------------
// UPDATE: runs 60 times every second. Move things, then check
// what they touched.
// ------------------------------------------------------------
function update() {
  refreshObjectInspector();
  refreshTouchLaunchButton();
  if (!gameStarted || paused) {
    return;
  }

  if (multiplayerActive && !multiplayerHost) {
    applyInterpolatedLobbySnapshot();
    if (!gameOver && !gameWon) autoLaunchStuckBallIfEnabled();
    if (!gameOver && !gameWon && !adminBattleAdmin) {
      paddle.previousX = paddle.x;
      paddle.previousY = paddle.y;
      paddle.previousAngle = paddle.angle;
      movePaddle();
    }
    if (!adminBattleAdmin && typeof window.updateLobbyPaddle === "function") window.updateLobbyPaddle(paddle.x, paddle.angle, paddle.width, keys[CONTROL_KEYS.left], keys[CONTROL_KEYS.right]);
    return;
  }

  if (gameOver || gameWon) return;

  autoLaunchStuckBallIfEnabled();
  simulationFrame++;
  if (simulationFrame % 6 === 0) updatePaddleKnownStuff();
  if (isBossFightActive()) {
    idleBrickFrames = 0;
    if (idleMeme && !idleMeme.hidden) hideIdleMeme();
  } else if (idleMemeEnabled && ++idleBrickFrames >= IDLE_MEME_DELAY_FRAMES) {
    idleBrickFrames = 0;
    showIdleMeme();
  }
  if (updateHitEffects()) return;
  if (shieldTimer > 0) shieldTimer--;

  if (isNextBotBattleActive()) {
    updateNextBotBattle();
    if (isNextBotBattleActive()) return;
  }

  if (!adminBattleAdmin) {
    paddle.previousX = paddle.x;
    paddle.previousY = paddle.y;
    paddle.previousAngle = paddle.angle;
    if (localTestMode && localTestCpu[0]) moveTestCpuPaddle(paddle);
    else movePaddle();
    if (multiplayerActive && typeof window.updateLobbyPaddle === "function") window.updateLobbyPaddle(paddle.x, paddle.angle, paddle.width, keys[CONTROL_KEYS.left], keys[CONTROL_KEYS.right]);
    if (randomEverythingEnabled) updatePaddleJump(paddle, CONTROL_KEYS.jump);
  }
  if (localTestMode) updateLocalTestPaddle();
  if (autoPlay || isNextBotAIEnabled()) movePaddleAwayFromLasers(paddle);
  updateNextBots();
  updateAdminGunners();
  if (randomEverythingEnabled) updateNextBotShots();
  if (updateEnemyShots()) return;
  updateRockets();
  updateAdminMissile();
  updateTemporaryPowerUps();
  updatePowerUps();
  updateSpecialBricks();
  if (updateLasers()) return;

  updateAiPaddles();
  if (localTestMode && ball.stuck &&
    ((ball.stuckPlayerId === "local-test-player-1" && localTestCpu[0]) ||
     (ball.stuckPlayerId === "local-test-player-2" && localTestCpu[1]))) {
    launchStuckBall(getPaddleForPlayer(ball.stuckPlayerId), ball.stuckPlayerId);
  }

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
    const aiPaddleHit = bounceOffAiPaddles(activeBall);
    if (aiPaddleHit && magnetTimer > 0 && activeBall === ball && aiPaddleHit === magnetPlayerId) {
      ball.stuck = true;
      ball.stuckPlayerId = aiPaddleHit;
      ball.vx = 0;
      ball.vy = 0;
    }
    if (aiPaddleHit) {
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

  if (autoAdvanceLevel && !bricks.some(function (brick) { return !brick.isKill && !brick.hidden; })) {
    advanceLevel();
  }
}

function updatePaddleKnownStuff() {
  const activeBalls = [ball].concat(extraBalls);
  const balls = activeBalls.map(function (activeBall, index) {
    const prediction = activeBall.stuck || Math.hypot(activeBall.vx, activeBall.vy) < 0.01
      ? { x: activeBall.x + activeBall.width / 2, steps: 0, hazard: false, path: [] }
      : projectToPaddle(activeBall, bricks, paddle.y, { includePath: adminVisibility.trajectory });
    return {
      label: index === 0 ? "Main ball" : "Extra ball " + index,
      x: activeBall.x + activeBall.width / 2,
      y: activeBall.y + activeBall.height / 2,
      vx: activeBall.vx,
      vy: activeBall.vy,
      landingX: prediction.x,
      framesToLanding: prediction.steps,
      hazard: prediction.hazard,
      path: prediction.path || [],
      shotPath: adminVisibility.trajectory && !prediction.hazard && !activeBall.stuck
        ? projectPaddleShot(prediction, paddle)
        : []
    };
  });
  const powerUpsKnown = powerUps.map(function (powerUp) {
    return {
      label: powerUp.label || powerUp.type,
      x: powerUp.x + powerUp.width / 2,
      y: powerUp.y + powerUp.height / 2,
      framesToPaddle: Math.max(0, Math.ceil((paddle.y - powerUp.y - powerUp.height) / powerUp.speed))
    };
  });
  const lasersKnown = lasers.map(function (laser) {
    const nextPhase = laser.mode === "idle" ? "warning" : laser.mode === "warning" ? "firing" : "idle";
    return {
      x: laser.x,
      phase: laser.mode,
      nextPhase: nextPhase,
      framesToChange: Math.max(0, laser.timer),
      secondsToChange: Math.max(0, laser.timer / 60)
    };
  });
  const nextBotsKnown = nextBots.map(function (bot) {
    const isPaused = nextBotAttacksPaused && bot.frozenTimer <= 0;
    const remainingAttackFrames = bot.mode === "telegraph" ? bot.phaseTimer : bot.mode === "dash" ? 0 : bot.thinkTimer;
    const framesUntilAttack = isPaused ? null : bot.frozenTimer > 0
      ? bot.frozenTimer + remainingAttackFrames
      : bot.mode === "telegraph" ? bot.phaseTimer
        : bot.mode === "dash" ? 0
          : bot.attackQueued ? Math.max(nextBotCooldown, nextBotTeamupTimer) : bot.thinkTimer + nextBotCooldown;
    return {
      name: bot.name,
      x: bot.x,
      y: bot.y,
      mode: bot.frozenTimer > 0 ? "frozen" : isPaused ? "paused" : bot.mode,
      framesUntilAttack: framesUntilAttack,
      secondsUntilAttack: Number.isFinite(framesUntilAttack) ? framesUntilAttack / 60 : null
    };
  });
  const mainBall = balls[0];
  const targetX = autoPlay && Number.isFinite(paddle.autoTargetX) ? paddle.autoTargetX : mainBall && mainBall.landingX;
  const nearestThreat = nextBotsKnown.filter(function (bot) { return bot.mode !== "frozen" && bot.mode !== "paused"; })
    .sort(function (first, second) { return first.framesUntilAttack - second.framesUntilAttack; })[0];
  paddle.knownStuff = {
    frame: simulationFrame,
    balls: balls,
    powerUps: powerUpsKnown,
    lasers: lasersKnown,
    nextBots: nextBotsKnown,
    targetX: Number.isFinite(targetX) ? targetX : paddle.x + paddle.width / 2,
    targetReason: autoPlay ? "autoplay interception plan" : "predicted main-ball landing",
    predictedAngle: autoPlay ? autoAimAngle : paddle.angle,
    calculation: "Projects at 60 simulation steps per second; checks wall reflections and brick collisions each step, then estimates landing time and reachability from paddle speed.",
    summary: "Main ball lands near X " + Math.round(mainBall ? mainBall.landingX : paddle.x + paddle.width / 2) +
      " in " + Math.ceil(mainBall ? mainBall.framesToLanding / 60 : 0) + "s; " +
      lasersKnown.length + " laser timers, " + nextBotsKnown.length + " nextbot timers" +
      (nearestThreat ? "; next attack in " + nearestThreat.secondsUntilAttack.toFixed(1) + "s" : nextBotAttacksPaused ? "; nextbot attacks paused" : "")
  };
}

function movePaddle() {
  const startingAngle = paddle.angle;
  if (keys[CONTROL_KEYS.tiltRight]) {
    paddle.angle = Math.min(MAX_PADDLE_TILT, paddle.angle + currentTurnSpeed);
  }
  if (keys[CONTROL_KEYS.tiltLeft]) {
    paddle.angle = Math.max(-MAX_PADDLE_TILT, paddle.angle - currentTurnSpeed);
  }
  if (paddle.angle !== startingAngle) {
    lastTiltFrame = simulationFrame;
    lastTiltDirection = Math.sign(paddle.angle - startingAngle);
  }

  if (autoPlay) {
    if (autoPlanCooldown-- <= 0) {
      const plan = planAutoPlay(paddle);
      autoAimAngle = plan.angle;
      paddle.autoTargetX = plan.x;
      autoPlanCooldown = 4;
    }
    paddle.angle = autoAimAngle;
    const targetX = dodgeLaserTarget(paddle.autoTargetX, paddle) - paddle.width / 2;
    paddle.x += Math.sign(targetX - paddle.x) * Math.min(paddle.speed, Math.abs(targetX - paddle.x));
  }

  const horizontalDirection = getCurrentMode().reverseControls ? -1 : 1;
  if (!autoPlay && keys[CONTROL_KEYS.left]) {
    paddleFacingDirection = -horizontalDirection;
    paddle.x -= paddle.speed * horizontalDirection;
  }
  if (!autoPlay && keys[CONTROL_KEYS.right]) {
    paddleFacingDirection = horizontalDirection;
    paddle.x += paddle.speed * horizontalDirection;
  }

  // Keep the paddle on the screen.
  if (paddle.x < 0) {
    paddle.x = 0;
  }
  if (paddle.x + paddle.width > WIDTH) {
    paddle.x = WIDTH - paddle.width;
  }
}

function moveTestCpuPaddle(targetPaddle) {
  if (targetPaddle.cpuPlanCooldown > 0) {
    targetPaddle.cpuPlanCooldown--;
  } else {
    const plan = planAutoPlay(targetPaddle);
    targetPaddle.autoTargetX = plan.x;
    targetPaddle.angle = plan.angle;
    targetPaddle.cpuPlanCooldown = 4;
  }
  const targetX = dodgeLaserTarget(targetPaddle.autoTargetX, targetPaddle) - targetPaddle.width / 2;
  targetPaddle.x += Math.sign(targetX - targetPaddle.x) * Math.min(targetPaddle.speed || paddle.speed, Math.abs(targetX - targetPaddle.x));
  targetPaddle.x = Math.max(0, Math.min(WIDTH - targetPaddle.width, targetPaddle.x));
}

function updateLocalTestPaddle() {
  const player = multiplayerPlayers.find(function (entry) { return entry.id === "local-test-player-2"; });
  if (!player) return;
  player.previousX = player.x;
  player.previousY = player.y;
  player.previousAngle = player.angle;
  if (localTestCpu[1]) {
    moveTestCpuPaddle(player);
  } else {
    if (keys.a) player.x -= player.speed;
    if (keys.d) player.x += player.speed;
    if (keys.q) player.angle = Math.max(-MAX_PADDLE_TILT, player.angle - currentTurnSpeed);
    if (keys.e) player.angle = Math.min(MAX_PADDLE_TILT, player.angle + currentTurnSpeed);
    player.x = Math.max(0, Math.min(WIDTH - player.width, player.x));
  }
  updatePaddleJump(player, "w");
}

function updatePaddleJump(targetPaddle, jumpKey) {
  if (targetPaddle.jumpCooldown > 0) targetPaddle.jumpCooldown--;
  if (keys[jumpKey] && !targetPaddle.jumpKeyWasDown && targetPaddle.jumpCooldown === 0) {
    targetPaddle.jumpFrames = PADDLE_JUMP_FRAMES;
    targetPaddle.jumpCooldown = PADDLE_JUMP_COOLDOWN;
  }
  targetPaddle.jumpKeyWasDown = Boolean(keys[jumpKey]);
  targetPaddle.previousY = targetPaddle.y;
  if (targetPaddle.jumpFrames > 0) {
    const progress = 1 - targetPaddle.jumpFrames / PADDLE_JUMP_FRAMES;
    targetPaddle.y = targetPaddle.jumpBaseY - Math.sin(progress * Math.PI) * PADDLE_JUMP_HEIGHT;
    targetPaddle.jumpFrames--;
  } else {
    targetPaddle.y = targetPaddle.jumpBaseY;
  }
}

function getEnemyShotTargets() {
  const targets = [];
  if (!adminBattleAdmin) targets.push(paddle);
  for (const player of multiplayerPlayers) {
    if (player.id === multiplayerPlayerId || player.ai || (adminBattleMode && multiplayerAdminIds.includes(player.id))) continue;
    targets.push({
      x: player.x,
      y: Number.isFinite(player.y) ? player.y : HEIGHT - 30,
      width: Number.isFinite(player.width) ? player.width : BASE_PADDLE_WIDTH,
      height: paddle.height
    });
  }
  return targets;
}

function updateNextBotShots() {
  const targets = getEnemyShotTargets();
  if (targets.length === 0) return;
  for (const bot of nextBots) {
    if (bot.frozenTimer > 0) continue;
    if (!Number.isFinite(bot.gunCooldown)) bot.gunCooldown = randomInteger(45, 110);
    if (--bot.gunCooldown > 0) continue;
    bot.gunCooldown = randomInteger(75, 135);
    const target = targets.reduce(function (nearest, candidate) {
      return Math.abs(candidate.x + candidate.width / 2 - bot.x) < Math.abs(nearest.x + nearest.width / 2 - bot.x)
        ? candidate
        : nearest;
    });
    const dx = target.x + target.width / 2 - bot.x;
    const dy = target.y - bot.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const speed = randomInteger(4, 6);
    enemyShots.push({ x: bot.x, y: bot.y, vx: dx / distance * speed, vy: dy / distance * speed, radius: 5 });
  }
}

function updateEnemyShots() {
  for (let index = enemyShots.length - 1; index >= 0; index--) {
    const shot = enemyShots[index];
    shot.x += shot.vx;
    shot.y += shot.vy;
    if (shot.x < -12 || shot.x > WIDTH + 12 || shot.y < -12 || shot.y > HEIGHT + 12) {
      enemyShots.splice(index, 1);
      continue;
    }
    const hit = getEnemyShotTargets().some(function (target) {
      return shot.x + shot.radius > target.x && shot.x - shot.radius < target.x + target.width &&
        shot.y + shot.radius > target.y && shot.y - shot.radius < target.y + target.height;
    });
    if (hit) {
      enemyShots.splice(index, 1);
      loseLife();
      return true;
    }
  }
  return false;
}

function drawEnemyShots() {
  ctx.save();
  ctx.fillStyle = "#ff4057";
  ctx.shadowColor = "#ff4057";
  ctx.shadowBlur = 12;
  for (const shot of enemyShots) {
    ctx.beginPath();
    ctx.arc(shot.x, shot.y, shot.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function moveBall(activeBall) {
  activeBall.previousX = activeBall.x;
  activeBall.previousY = activeBall.y;
  if (activeBall === ball) {
    ballTrail.push({ x: activeBall.x + activeBall.width / 2, y: activeBall.y + activeBall.height / 2 });
    if (ballTrail.length > 8) ballTrail.shift();
  }
  const attackScale = activeBall === ball && !multiplayerActive
    ? isNextBotBattleActive() ? 0.45 : (isNextBotAttackActive() ? 0.68 : 1)
    : 1;
  const powerUpScale = slowBallTimer > 0 ? 0.7 : 1;
  const speedBoostScale = fastBallTimer > 0 ? 1.25 : 1;
  activeBall.x += activeBall.vx * attackScale * powerUpScale * speedBoostScale;
  activeBall.y += activeBall.vy * attackScale * powerUpScale * speedBoostScale;
}

function dropPowerUp(brick) {
  const dropChance = randomEverythingEnabled ? randomRunPowerUpChance : getCurrentMode().powerUpDropChance;
  if (!powerUpDropsEnabled || Math.random() > dropChance) return;
  const kinds = [
    { type: "wide", label: "W", color: "#4fe6ff" },
    { type: "slow", label: "S", color: "#ffd166" },
    { type: "magnet", label: "M", color: "#ff75d8" },
    { type: "multi", label: "+", color: EXTRA_BALL_COLOR },
    { type: "life", label: "1UP", color: "#ff6b6b" },
    { type: "shield", label: "SH", color: "#7be7ff" },
    { type: "fast", label: "F", color: "#ff9f43" },
    { type: "pierce", label: "P", color: "#ffd166" },
    { type: "freeze", label: "ICE", color: "#8be9ff" },
    { type: "rocket", label: "RKT", color: "#ffca3a" },
    { type: "dash", label: "DASH", color: "#fb923c" },
    { type: "cache", label: "+500", color: "#d6ff55" }
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
    } else if (brick.type === "sweeper") {
      brick.x = brick.originX + Math.sin(simulationFrame * 0.028 + brick.movePhase) * brick.moveAmplitude;
    }
    if (brick.type === "boss") {
      brick.x = brick.originX + Math.sin(simulationFrame * 0.022 + brick.movePhase) * brick.moveAmplitude;
      brick.y = brick.originY + Math.sin(simulationFrame * 0.037 + brick.movePhase) * 7;
      const finalBoss = brick.isFinalBoss;
      if (finalBoss) {
        brick.phase = finalBossPhaseForHealth(brick);
        brick.minionInterval = brick.phase === 1 ? 165 : brick.phase === 2 ? 115 : 75;
        brick.minionLimit = brick.phase === 1 ? 3 : brick.phase === 2 ? 5 : 7;
        if (brick.hp <= brick.maxHp * 0.2) consumeAdminToolsWithWitherStorm(brick);
        if (brick.phase > 1 && --brick.phaseTimer <= 0) {
          dropBossKillbrick(brick);
          if (brick.phase === 3) dropBossKillbrick(brick);
          brick.phaseTimer = brick.phase === 2 ? 150 : 90;
        }
      }
      if (brick.adminAssimilated && --brick.adminAttackTimer <= 0) {
        brick.adminAttackCount = (brick.adminAttackCount || 0) + 1;
        const enemyBurst = brick.adminPowers ? Math.max(1, Math.min(4, Math.ceil(brick.adminPowers.enemyMultiplier))) : 1;
        for (let shot = 0; shot < enemyBurst; shot++) dropBossKillbrick(brick);
        if (brick.adminAttackCount % 3 === 0) {
          spawnAdminLaserAt(paddle.x + paddle.width / 2);
        }
        const enabledToggleCount = brick.adminPowers ? brick.adminPowers.enabledToggleCount : 0;
        brick.adminAttackTimer = Math.max(34, 96 - enabledToggleCount * 4);
      }
      if (bossMinionsEnabled && !brick.isWitherStorm && brick.hp <= brick.maxHp * 0.8 && --brick.minionTimer <= 0) {
        const minionCount = nextBots.filter(function (bot) { return bot.bossMinion; }).length;
        if (minionCount < brick.minionLimit) {
          const minion = spawnNextBot();
          if (minion) minion.bossMinion = true;
        }
        brick.minionTimer = brick.minionInterval;
      }
    }
    if (brick.falling) {
      brick.y += brick.fallSpeed;
      if (brick.y > HEIGHT) bricks.splice(index, 1);
    }
  }
}

function applyPowerUp(powerUp, catcherId = multiplayerPlayerId) {
  recordCareerProgress("powerUps");
  if (powerUp.type === "wide") {
    const targetPaddle = getPaddleForPlayer(catcherId);
    const center = targetPaddle.x + targetPaddle.width / 2;
    targetPaddle.width = Math.min(215, basePaddleWidth + 45);
    targetPaddle.x = Math.max(0, Math.min(WIDTH - targetPaddle.width, center - targetPaddle.width / 2));
    if (targetPaddle === paddle) widePaddleTimer = 300;
    else targetPaddle.widePaddleTimer = 300;
    powerUpNotice = { text: "WIDE PADDLE", timer: 100, color: powerUp.color };
  } else if (powerUp.type === "slow") {
    slowBallTimer = 300;
    powerUpNotice = { text: "SLOW BALL", timer: 100, color: powerUp.color };
  } else if (powerUp.type === "magnet") {
    magnetTimer = 300;
    magnetPlayerId = catcherId || null;
    const targetPaddle = getPaddleForPlayer(catcherId);
    if (targetPaddle.lobbyAI) targetPaddle.magnetReleaseTimer = 45;
    powerUpNotice = { text: "MAGNET", timer: 100, color: powerUp.color };
  } else if (powerUp.type === "multi") {
    spawnExtraBall(ball);
    powerUpNotice = { text: "MULTIBALL", timer: 100, color: powerUp.color };
  } else if (powerUp.type === "life") {
    lives = Math.min(STARTING_LIVES + 3, lives + 1);
    powerUpNotice = { text: "+1 LIFE", timer: 100, color: powerUp.color };
  } else if (powerUp.type === "shield") {
    shieldCharges = Math.min(3, shieldCharges + 1);
    powerUpNotice = { text: "SHIELD CHARGE", timer: 100, color: powerUp.color };
  } else if (powerUp.type === "fast") {
    fastBallTimer = 300;
    powerUpNotice = { text: "SPEED BOOST", timer: 100, color: powerUp.color };
  } else if (powerUp.type === "pierce") {
    piercingTimer = 300;
    powerUpNotice = { text: "PIERCING CHARGE // 3X BOSS DAMAGE", timer: 120, color: powerUp.color };
  } else if (powerUp.type === "freeze") {
    freeze(getPaddleForPlayer(catcherId));
  } else if (powerUp.type === "rocket") {
    fireRocket(getPaddleForPlayer(catcherId));
  } else if (powerUp.type === "dash") {
    dash(getPaddleForPlayer(catcherId));
  } else if (powerUp.type === "cache") {
    mola += 500;
    recordHighScore();
    powerUpNotice = { text: "+500 SCORE", timer: 100, color: powerUp.color };
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
    if (!caught && multiplayerActive && multiplayerHost) {
      for (const bot of aiPaddles) {
        if (!bot.lobbyAI) continue;
        if (powerUp.x < bot.x + bot.width &&
            powerUp.x + powerUp.width > bot.x &&
            powerUp.y < bot.y + bot.height &&
            powerUp.y + powerUp.height > bot.y) {
          caught = true;
          catcherId = bot.lobbyPlayerId;
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
    paddle.width = basePaddleWidth;
    paddle.x = Math.max(0, Math.min(WIDTH - paddle.width, center - paddle.width / 2));
  }
  if (multiplayerActive && multiplayerHost) {
    for (const player of multiplayerPlayers) {
      if (player.id === multiplayerPlayerId || player.ai || (player.widePaddleTimer || 0) <= 0) continue;
      player.widePaddleTimer--;
      if (player.widePaddleTimer === 0) {
        const center = player.x + player.width / 2;
        player.width = basePaddleWidth;
        player.x = Math.max(0, Math.min(WIDTH - player.width, center - player.width / 2));
      }
    }
    for (const bot of aiPaddles) {
      if (!bot.lobbyAI || (bot.widePaddleTimer || 0) <= 0) continue;
      if (--bot.widePaddleTimer === 0) {
        const center = bot.x + bot.width / 2;
        bot.width = basePaddleWidth;
        bot.x = Math.max(0, Math.min(WIDTH - bot.width, center - bot.width / 2));
      }
    }
  }
  if (slowBallTimer > 0) slowBallTimer--;
  if (fastBallTimer > 0) fastBallTimer--;
  if (piercingTimer > 0) piercingTimer--;
  if (magnetTimer > 0 && --magnetTimer === 0) {
    if (ball.stuck) launchStuckBall(getPaddleForPlayer(ball.stuckPlayerId));
    magnetPlayerId = null;
  }
  if (powerUpNotice && --powerUpNotice.timer <= 0) powerUpNotice = null;
  if (levelNotice && --levelNotice.timer <= 0) levelNotice = null;
}

function createLevelLasers(currentLevel) {
  if (currentLevel < 2) return [];
  const baseCount = currentLevel === 2 ? 1 : Math.min(8, 2 + Math.floor((currentLevel - 3) / 2));
  const count = Math.ceil(baseCount * (getCurrentMode().laserMultiplier || 1));
  return Array.from({ length: count }, function (_, index) {
    return {
      x: 60 + Math.random() * (WIDTH - 120),
      mode: "idle",
      timer: 110 + index * 100 + Math.random() * 90,
      hitRegistered: false
    };
  });
}

function dodgeLaserTarget(targetCenterX, targetPaddle) {
  const activeLasers = lasers.filter(function (laser) {
    return laser.mode === "warning" || laser.mode === "firing";
  });
  if (activeLasers.length === 0) return targetCenterX;

  const halfWidth = targetPaddle.width / 2;
  const candidates = [targetCenterX];
  for (const laser of activeLasers) {
    candidates.push(laser.x - targetPaddle.width - 18 + halfWidth);
    candidates.push(laser.x + 18 + halfWidth);
  }

  let safestTarget = targetCenterX;
  let bestScore = Infinity;
  for (const candidate of candidates) {
    const centerX = Math.max(halfWidth, Math.min(WIDTH - halfWidth, candidate));
    const intersectsLaser = activeLasers.some(function (laser) {
      return Math.abs(centerX - laser.x) <= halfWidth + 12;
    });
    const score = Math.abs(centerX - targetCenterX) + (intersectsLaser ? WIDTH * 2 : 0);
    if (score < bestScore) {
      safestTarget = centerX;
      bestScore = score;
    }
  }
  return safestTarget;
}

function movePaddleAwayFromLasers(targetPaddle) {
  const safeCenterX = dodgeLaserTarget(targetPaddle.x + targetPaddle.width / 2, targetPaddle);
  const targetX = safeCenterX - targetPaddle.width / 2;
  targetPaddle.x += Math.sign(targetX - targetPaddle.x) *
    Math.min(targetPaddle.speed, Math.abs(targetX - targetPaddle.x));
  targetPaddle.x = Math.max(0, Math.min(WIDTH - targetPaddle.width, targetPaddle.x));
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
      const beamWidth = 7;
      const hitMainBall = ball.x < laser.x + beamWidth && ball.x + ball.width > laser.x - beamWidth;
      extraBalls = extraBalls.filter(function (activeBall) {
        return activeBall.x >= laser.x + beamWidth || activeBall.x + activeBall.width <= laser.x - beamWidth;
      });
      if (nextBotLasersEnabled && typeof nextBots !== "undefined") {
        const removedBots = nextBots.filter(function (bot) {
          return bot.x + 12 >= laser.x - beamWidth && bot.x - 12 <= laser.x + beamWidth;
        });
        nextBots = nextBots.filter(function (bot) {
          return bot.x + 12 < laser.x - beamWidth || bot.x - 12 > laser.x + beamWidth;
        });
        if (nextBotBattle && removedBots.some(function (bot) { return bot === nextBotBattle.bot; })) {
          nextBotBattle = null;
          nextBotBanner = { text: "LASER DESTROYED THE NEXTBOT", timer: 110 };
        }
      }
      if (laserDamageEnabled && !invincible && laser.x >= paddle.x - 6 && laser.x <= paddle.x + paddle.width + 6) {
        loseLife();
        return true;
      }
      if (laserDamageEnabled && !invincible && hitMainBall) {
        loseLife();
        return true;
      }
    }
  }
  return false;
}

function fireRocket(targetPaddle = paddle) {
  if (!nextBots.length) {
    powerUpNotice = { text: "NO NEXTBOTS IN RANGE", timer: 80, color: "#ffca3a" };
    return;
  }
  const rocket = {
    x: targetPaddle.x + targetPaddle.width / 2,
    y: targetPaddle.y,
    target: null,
    speed: 6
  };
  rocket.target = nextBots.reduce(function (nearest, bot) {
    const distanceToBot = Math.hypot(bot.x - rocket.x, bot.y - rocket.y);
    const distanceToNearest = Math.hypot(nearest.x - rocket.x, nearest.y - rocket.y);
    return distanceToBot < distanceToNearest ? bot : nearest;
  });
  rockets.push(rocket);
}

function shield() {
  shieldTimer = SHIELD_DURATION_FRAMES;
  if (nextBotBattle) {
    const attacker = nextBotBattle.bot;
    nextBotBattle = null;
    attacker.mode = "walk";
    attacker.phaseTimer = 0;
    attacker.attackQueued = false;
    attacker.thinkTimer = 90;
  }
  powerUpNotice = { text: "SHIELD ACTIVE", timer: 100, color: "#7be7ff" };
}

function dash(targetPaddle = paddle) {
  const direction = targetPaddle === paddle ? paddleFacingDirection : targetPaddle.left ? -1 : 1;
  const destinationX = targetPaddle.x + direction * currentDashDistance;
  targetPaddle.x = Math.max(0, Math.min(WIDTH - targetPaddle.width, destinationX));
  powerUpNotice = { text: "DASH", timer: 35, color: "#ffd166" };
}

function freeze(targetPaddle = paddle) {
  const playerCenterX = targetPaddle.x + targetPaddle.width / 2;
  const playerCenterY = targetPaddle.y + targetPaddle.height / 2;
  let frozenCount = 0;
  for (const bot of nextBots) {
    if (Math.hypot(bot.x - playerCenterX, bot.y - playerCenterY) <= FREEZE_RADIUS) {
      bot.frozenTimer = FREEZE_DURATION_FRAMES;
      frozenCount++;
    }
  }
  powerUpNotice = {
    text: frozenCount ? "ENEMIES FROZEN: " + frozenCount : "NO ENEMIES NEARBY",
    timer: 100,
    color: "#8be9ff"
  };
}

function updateRockets() {
  for (let rocketIndex = rockets.length - 1; rocketIndex >= 0; rocketIndex--) {
    const rocket = rockets[rocketIndex];
    if (!nextBots.includes(rocket.target)) {
      rockets.splice(rocketIndex, 1);
      continue;
    }

    const horizontalDistance = rocket.target.x - rocket.x;
    const verticalDistance = rocket.target.y - rocket.y;
    const distanceToTarget = Math.hypot(horizontalDistance, verticalDistance);
    if (distanceToTarget <= rocket.speed + 14) {
      nextBots = nextBots.filter(function (bot) { return bot !== rocket.target; });
      if (nextBotBattle && nextBotBattle.bot === rocket.target) {
        nextBotBattle = null;
        nextBotBanner = { text: "ROCKET DESTROYED THE NEXTBOT", timer: 110 };
      }
      rockets.splice(rocketIndex, 1);
      continue;
    }

    rocket.x += horizontalDistance / distanceToTarget * rocket.speed;
    rocket.y += verticalDistance / distanceToTarget * rocket.speed;
  }
}

function drawRockets() {
  for (const rocket of rockets) {
    ctx.save();
    ctx.translate(rocket.x, rocket.y);
    ctx.rotate(Math.atan2(rocket.target.y - rocket.y, rocket.target.x - rocket.x));
    ctx.fillStyle = "#ffca3a";
    ctx.shadowColor = "#ff6b35";
    ctx.shadowBlur = 12;
    ctx.fillRect(-10, -3, 20, 6);
    ctx.restore();
  }
  ctx.shadowBlur = 0;
}

function drawPowerUps() {
  for (const powerUp of powerUps) {
    ctx.save();
    ctx.translate(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2);
    ctx.rotate(Math.PI / 4);
    if (secretImageMode && drawSecretImage(-powerUp.width / 2, -powerUp.height / 2, powerUp.width, powerUp.height, powerUp.x)) {
      ctx.restore();
      continue;
    }
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
    if (bot.lobbyAI && ball.stuck && ball.stuckPlayerId === bot.lobbyPlayerId) {
      bot.magnetReleaseTimer = (bot.magnetReleaseTimer || 45) - 1;
      if (bot.magnetReleaseTimer <= 0) launchStuckBall(bot, bot.lobbyPlayerId);
      continue;
    }
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
      bot.y = paddle.y;
      moveTestCpuPaddle(bot);
      bot.aiIntent = "Shift+Q smart interception and shot planning";
      bot.aiCalculation = "Uses the same ball, power-up, hazard, and shot-angle planner as auto-play.";
      bot.knownStuff = {
        balls: [],
        targetX: bot.autoTargetX,
        summary: bot.aiIntent,
        calculation: bot.aiCalculation
      };
      continue;
    }

    const mainBallDistance = Math.abs((ball.x + ball.width / 2) - (bot.x + bot.width / 2));
    const nearestDistance = Math.min(...activeBalls.map(function (activeBall) {
      return Math.abs((activeBall.x + activeBall.width / 2) - (bot.x + bot.width / 2));
    }));
    if (ball && ball.y >= 0 && mainBallDistance <= nearestDistance + 12) {
      target = ball;
    }

    bot.aiIntent = target === ball ? "Intercept the main ball" : "Intercept an extra ball";
    bot.aiCalculation = "Target center X " + Math.round(target.x + target.width / 2) + "; speed " + (bot.speed || paddle.speed) + " px/frame";
    bot.knownStuff = {
      balls: [],
      targetX: target.x + target.width / 2,
      summary: bot.aiIntent,
      calculation: bot.aiCalculation
    };

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
      return bot.lobbyAI ? bot.lobbyPlayerId : true;
    }
  }
  return false;
}

function bounceOffMultiplayerPaddles(activeBall) {
  for (const player of multiplayerPlayers) {
    if (player.id === multiplayerPlayerId || player.ai || (adminBattleMode && player.host)) continue;
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
  if (!secretImageMode || !drawSecretImage(0, 0, WIDTH, HEIGHT)) {
    ctx.fillStyle = skin.background;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
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
  const levelLabel = getCurrentMode().endless ? "LEVEL " + (level + 1) + " / ENDLESS" : "LEVEL " + (level + 1) + " / " + LEVEL_COUNT;
  ctx.fillText(levelLabel + " | " + getCurrentMode().label.toUpperCase(), 16, 24);
  ctx.textAlign = "right";
  ctx.fillText("LIVES " + lives, WIDTH - 16, 24);
  ctx.textAlign = "left";
  ctx.font = "13px Courier New";
  ctx.fillText("BRICK STREAK " + brickHitStreak + "/" + MULTIBALL_HIT_STREAK, 16, 46);
  ctx.fillText("MOLA " + mola, 16, 64);
  if (simulationSpeed !== 1) {
    ctx.fillStyle = "#ffd166";
    ctx.textAlign = "center";
    ctx.fillText("SIMULATION " + simulationSpeed + "x", WIDTH / 2, 64);
  }
  if (widePaddleTimer > 0 || slowBallTimer > 0 || magnetTimer > 0 || fastBallTimer > 0 || shieldCharges > 0 || shieldTimer > 0) {
    ctx.textAlign = "center";
    ctx.font = "10px Courier New";
    const active = [];
    if (widePaddleTimer > 0) active.push("WIDE " + Math.ceil(widePaddleTimer / 60) + "s");
    if (slowBallTimer > 0) active.push("SLOW " + Math.ceil(slowBallTimer / 60) + "s");
    if (magnetTimer > 0) active.push("MAGNET " + Math.ceil(magnetTimer / 60) + "s");
    if (fastBallTimer > 0) active.push("FAST " + Math.ceil(fastBallTimer / 60) + "s");
    if (shieldCharges > 0) active.push("SHIELD x" + shieldCharges);
    if (shieldTimer > 0) active.push("SHIELD " + Math.ceil(shieldTimer / 60) + "s");
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
  if (fpsEnabled) {
    ctx.fillStyle = "#7be7ff";
    ctx.textAlign = "right";
    ctx.fillText("GAME " + gameFps + " FPS", WIDTH - 16, 84);
  }
  const activeNextBotAttacks = nextBots.filter(function (bot) {
    return !(bot.frozenTimer > 0) && (bot.mode === "telegraph" || bot.mode === "dash");
  }).length;
  ctx.fillStyle = "#ff8c69";
  ctx.textAlign = "left";
  ctx.fillText("NEXTBOTS " + nextBots.length + " | ATTACKING " + activeNextBotAttacks, 16, 84);
  if (!autoAdvanceLevel && !bricks.some(function (brick) { return !brick.isKill && !brick.hidden; })) {
    ctx.fillStyle = "#ffd166";
    ctx.textAlign = "center";
    ctx.fillText("LEVEL CLEAR - AUTO-ADVANCE OFF", WIDTH / 2, 84);
  }
  ctx.fillStyle = "white";
  ctx.save();
  ctx.translate(paddle.x + paddle.width / 2, paddle.y + paddle.height / 2);
  ctx.rotate(paddle.angle * Math.PI / 180);
  const squashEase = paddleSquashFrames > 0 ? Math.sin((paddleSquashFrames / 6) * Math.PI / 2) : 0;
  const squash = 1 + squashEase * 0.15;
  ctx.scale(squash, 1 - squashEase * 0.2);
  ctx.fillStyle = paddle.color || skin.paddle;
  if (!secretImageMode || !drawSecretImage(-paddle.width / 2, -paddle.height / 2, paddle.width, paddle.height, 1)) {
    ctx.fillRect(-paddle.width / 2, -paddle.height / 2, paddle.width, paddle.height);
  }
  ctx.restore();
  if (shieldTimer > 0) {
    ctx.save();
    ctx.strokeStyle = "#7be7ff";
    ctx.globalAlpha = 0.55 + Math.sin(Date.now() / 90) * 0.2;
    ctx.lineWidth = 3;
    ctx.shadowColor = "#7be7ff";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.ellipse(paddle.x + paddle.width / 2, paddle.y + paddle.height / 2, paddle.width * 0.62, 28, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (multiplayerActive) {
    for (const player of multiplayerPlayers) {
      if (player.id === multiplayerPlayerId || player.ai || (adminBattleMode && player.host)) continue;
      const playerY = Number.isFinite(player.y) ? player.y : paddle.y - 30;
      const playerWidth = Number.isFinite(player.width) ? player.width : BASE_PADDLE_WIDTH;
      ctx.save();
      ctx.translate(player.x + playerWidth / 2, playerY + paddle.height / 2);
      ctx.rotate((player.angle || 0) * Math.PI / 180);
      ctx.fillStyle = player.color || skin.accent;
      if (!secretImageMode || !drawSecretImage(-playerWidth / 2, -paddle.height / 2, playerWidth, paddle.height, player.x)) {
        ctx.fillRect(-playerWidth / 2, -paddle.height / 2, playerWidth, paddle.height);
      }
      ctx.restore();
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.font = "10px Courier New";
      ctx.fillText(player.name || "PLAYER", player.x + playerWidth / 2, playerY - 6);
    }
  }
  if (adminVisibility.enemies) {
    for (const bot of aiPaddles) {
      ctx.fillStyle = bot.color || skin.accent;
      if (!secretImageMode || !drawSecretImage(bot.x, bot.y, bot.width, bot.height, bot.x)) {
        ctx.fillRect(bot.x, bot.y, bot.width, bot.height);
      }
      if (bot.lobbyName) {
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.font = "10px Courier New";
        ctx.fillText(bot.lobbyName, bot.x + bot.width / 2, bot.y - 5);
      }
    }
    if (adminVisibility.enemies) drawAdminGunners();
  }
  if (adminVisibility.balls && adminVisibility.extras && ballTrail.length) {
    ballTrail.forEach(function (position, index) {
      ctx.globalAlpha = 0.5 * ((index + 1) / ballTrail.length);
      ctx.fillStyle = skin.ball;
      ctx.beginPath();
      ctx.arc(position.x, position.y, ball.width * 0.32, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
  if (adminVisibility.balls) {
    for (const activeBall of [ball].concat(extraBalls)) {
      const ballColor = activeBall === ball ? (activeBall.color || skin.ball) : EXTRA_BALL_COLOR;
      ctx.fillStyle = ballColor;
      ctx.shadowColor = ballColor;
      ctx.shadowBlur = activeBall === ball ? 7 : 13;
      if (!secretImageMode || !drawSecretImage(activeBall.x, activeBall.y, activeBall.width, activeBall.height, activeBall.x)) {
        ctx.fillRect(activeBall.x, activeBall.y, activeBall.width, activeBall.height);
      }
    }
  }
  if (aimLaserEnabled && (ball.stuck || Math.hypot(ball.vx, ball.vy) > 0)) {
    const startX = ball.x + ball.width / 2;
    const startY = ball.y + ball.height / 2;
    const directionX = ball.stuck ? Math.sin(paddle.angle * Math.PI / 180) : ball.vx;
    const directionY = ball.stuck ? -Math.cos(paddle.angle * Math.PI / 180) : ball.vy;
    const scaleX = directionX > 0 ? (WIDTH - startX) / directionX : directionX < 0 ? -startX / directionX : Infinity;
    const scaleY = directionY > 0 ? (HEIGHT - startY) / directionY : directionY < 0 ? -startY / directionY : Infinity;
    const distance = Math.min(scaleX, scaleY);
    ctx.save();
    ctx.strokeStyle = "#ff4f6d";
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + directionX * distance, startY + directionY * distance);
    ctx.stroke();
    ctx.restore();
  }
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";

  if (adminVisibility.blocks || adminVisibility.enemies) drawBricks();  // bricks.js
  if (adminVisibility.extras) {
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
  }
  if (adminVisibility.lasers) drawLasers();
  if (adminVisibility.nextbots) drawNextBots();
  if (adminVisibility.enemies) drawEnemyShots();
  if (adminVisibility.extras) drawRockets();
  if (adminVisibility.extras) drawAdminMissile();
    drawInspectorHighlight();
  if (adminVisibility.hitboxes) drawAdminHitboxes();
  if (adminVisibility.trajectory) drawKnownTrajectories();
  if (adminVisibility.paddlePlan) drawPaddlePlan();
  if (adminVisibility.timers) drawThreatTimers();
  if (adminVisibility.extras && powerUpNotice) {
    ctx.fillStyle = powerUpNotice.color;
    ctx.textAlign = "center";
    ctx.font = "bold 14px Courier New";
    ctx.fillText(powerUpNotice.text, WIDTH / 2, 90);
  }
  if (adminVisibility.extras && levelNotice) {
    ctx.fillStyle = "#fff176";
    ctx.textAlign = "center";
    ctx.font = "bold 14px Courier New";
    ctx.fillText(levelNotice.text, WIDTH / 2, 112);
  }
  if (adminVisibility.extras && perfectNotice) {
    ctx.fillStyle = "#fff176";
    ctx.textAlign = "center";
    ctx.font = "bold 12px Courier New";
    ctx.fillText("PERFECT", WIDTH / 2, paddle.y - 22 - (48 - perfectNotice.timer) * 0.35);
  }
  if (adminVisibility.extras && comboNotice) {
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
    const resultTitle = gameWon
      ? activeChallenge ? "CHALLENGE CLEARED!" : "ALL LEVELS CLEARED!"
      : activeChallenge ? "CHALLENGE OVER" : "GAME OVER";
    ctx.fillText(resultTitle, WIDTH / 2, HEIGHT / 2 - 25);
    ctx.font = "13px Courier New";
    const displayedBest = activeChallenge ? getDailyChallengeBest(activeChallenge) : highScore;
    ctx.fillText("SCORE " + mola + "   BEST " + displayedBest, WIDTH / 2, HEIGHT / 2 + 2);
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
  if (shieldCharges > 0) {
    shieldCharges--;
    extraBalls = [];
    resetBall();
    powerUpNotice = { text: "SHIELD SAVED YOU", timer: 100, color: "#7be7ff" };
    return;
  }
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
  recordCareerProgress("levels");
  if (activeChallenge) {
    gameWon = true;
    recordDailyChallengeScore();
    return;
  }
  if (level + 1 >= LEVEL_COUNT && !getCurrentMode().endless) {
    gameWon = true;
    return;
  }
  startLevel(level + 1);
}

function randomInteger(minimum, maximum) {
  return minimum + Math.floor(Math.random() * (maximum - minimum + 1));
}

function makeRandomRunBricks() {
  const columns = BRICK_COLUMNS;
  const rows = randomInteger(3, 7);
  const totalWidth = columns * BRICK_WIDTH + (columns - 1) * BRICK_GAP;
  const left = (WIDTH - totalWidth) / 2;
  const generated = [];

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      if (Math.random() > 0.72) continue;
      const roll = Math.random();
      const type = roll < 0.05 ? "kill"
        : roll < 0.10 ? "sweeper"
          : roll < 0.20 ? "armored"
            : roll < 0.27 ? "explosive"
              : roll < 0.34 ? "moving"
                : roll < 0.40 ? "regenerating" : "normal";
      const brick = {
        x: left + column * (BRICK_WIDTH + BRICK_GAP),
        y: BRICKS_TOP + row * (BRICK_HEIGHT + BRICK_GAP),
        width: BRICK_WIDTH,
        height: BRICK_HEIGHT,
        type: type,
        isKill: type === "kill" || type === "sweeper",
        color: type === "kill" || type === "sweeper" ? "#ffffff" : BRICK_ROW_COLORS[row % BRICK_ROW_COLORS.length]
      };
      if (type === "armored") {
        brick.hp = randomInteger(2, 5);
        brick.maxHp = brick.hp;
        brick.color = "#9292a0";
      } else if (type === "regenerating") {
        brick.hp = 1;
        brick.maxHp = 1;
        brick.color = "#a986ef";
      } else if (type === "explosive") {
        brick.color = "#ff8b45";
      } else if (type === "moving" || type === "sweeper") {
        brick.originX = brick.x;
        brick.moveAmplitude = randomInteger(14, 54);
        brick.movePhase = Math.random() * Math.PI * 2;
      }
      generated.push(brick);
    }
  }

  if (generated.length === 0) {
    generated.push({ x: left, y: BRICKS_TOP, width: BRICK_WIDTH, height: BRICK_HEIGHT, type: "normal", isKill: false, color: BRICK_ROW_COLORS[0] });
  }
  if (Math.random() < 0.28) {
    const boss = makeBricks(BOSS_LEVELS[randomInteger(0, BOSS_LEVELS.length - 2)])[0];
    boss.hp = randomInteger(16, 90);
    boss.maxHp = boss.hp;
    boss.minionInterval = randomInteger(120, 330);
    boss.minionTimer = boss.minionInterval;
    generated.push(boss);
  }
  return generated;
}

function randomizeRunStats() {
  baseBallSpeed = randomInteger(3, 9);
  paddle.speed = randomInteger(3, 11);
  currentTurnSpeed = randomInteger(1, 5);
  currentDashDistance = randomInteger(60, 240);
  randomRunScoreMultiplier = randomInteger(1, 5);
  randomRunPowerUpChance = randomInteger(8, 40) / 100;
}

function startLevel(nextLevel) {
  level = nextLevel;
  if (activeChallenge) level = activeChallenge.startLevel;
  const targetPaddleWidth = level === LEVEL_COUNT - 1 ? 56
    : widePaddleTimer > 0 ? Math.min(215, basePaddleWidth + 45) : basePaddleWidth;
  const paddleCenter = paddle.x + paddle.width / 2;
  paddle.width = targetPaddleWidth;
  paddle.x = Math.max(0, Math.min(WIDTH - paddle.width, paddleCenter - paddle.width / 2));
  if (activeChallenge) {
    bricks = makeBricks(level);
    selectNextBots();
    for (const enemyName of activeChallenge.enemyNames) spawnNextBot(enemyName);
    lasers = createLevelLasers(level);
  } else if (level === LEVEL_COUNT - 1) {
    bricks = makeBricks(level);
    clearBossMinions();
    setNextBotsForLevel(level);
    lasers = createLevelLasers(level);
  } else if (randomEverythingEnabled) {
    randomizeRunStats();
    bricks = makeRandomRunBricks();
    selectNextBots();
    const enemyCount = randomInteger(0, 5);
    for (let index = 0; index < enemyCount; index++) spawnNextBot();
    lasers = createLevelLasers(randomInteger(0, 14));
  } else {
    bricks = getCurrentMode().bossRush
      ? makeBricks(BOSS_LEVELS[level % BOSS_LEVELS.length])
      : makeBricks(level);
    clearBossMinions();
    setNextBotsForLevel(level);
    lasers = createLevelLasers(level);
  }
  if (getCurrentMode().armoredBricks) {
    for (const brick of bricks) {
      if (brick.isKill || (brick.type && brick.type !== "normal") || brick.hp) continue;
      brick.type = "armored";
      brick.hp = 2;
      brick.maxHp = 2;
      brick.color = "#9292a0";
    }
  }
  enemyShots = [];
  powerUps = [];
  const features = [];
  if (randomEverythingEnabled) features.push("SPD " + baseBallSpeed + " TURN " + currentTurnSpeed + " DASH " + currentDashDistance + " MOLA x" + randomRunScoreMultiplier);
  if (level >= 2) features.push(level === 2 ? "NEXTBOTS START" : "NEXTBOTS ACTIVE");
  if (level === 2) features.push("LASERS START");
  else if (level > 2) features.push(lasers.length + " LASERS ACTIVE");
  if (bricks[0] && bricks[0].type === "boss") features.push(bricks[0].bossName);
  if (level === LEVEL_COUNT - 1) features.push("NO NEXTBOTS // SMALL PADDLE // FINAL BOSS");
  levelNotice = {
    text: "LEVEL " + (level + 1) + " START" + (features.length ? " // " + features.join(" // ") : ""),
    timer: 150
  };
  resetBall();
}

function restartGame() {
  level = activeChallenge ? activeChallenge.startLevel : 0;
  lives = randomEverythingEnabled ? randomInteger(2, 6) : (getCurrentMode().startingLives || startingLives);
  mola = 0;
  newBest = false;
  aiPaddles = [];
  adminGunners = [];
  adminGunnerBullets = [];
  gameOver = false;
  gameWon = false;
  simulationFrame = 0;
  enemyShots = [];
  lasers = [];
  rockets = [];
  adminMissile = null;
  adminMissileArmed = false;
  ballTrail = [];
  setPaused(false);
  paddle.angle = 0;
  autoPlanCooldown = 0;
  autoLaunchRequestOwner = null;
  autoLaunchRequestAt = 0;
  brickHitStreak = 0;
  extraBalls = [];
  powerUps = [];
  levelNotice = null;
  widePaddleTimer = 0;
  slowBallTimer = 0;
  fastBallTimer = 0;
  piercingTimer = 0;
  shieldCharges = 0;
  shieldTimer = 0;
  paddleFacingDirection = 1;
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
  paddle.width = basePaddleWidth;
  selectNextBots();
  startLevel(level);
}

function resetCurrentLevel() {
  if (!gameStarted) return;
  const currentLevel = level;
  gameOver = false;
  gameWon = false;
  lives = Math.max(1, lives);
  extraBalls = [];
  powerUps = [];
  enemyShots = [];
  adminMissile = null;
  adminMissileArmed = false;
  widePaddleTimer = 0;
  slowBallTimer = 0;
  fastBallTimer = 0;
  piercingTimer = 0;
  shieldCharges = 0;
  shieldTimer = 0;
  magnetTimer = 0;
  magnetPlayerId = null;
  powerUpNotice = null;
  brickHitStreak = 0;
  autoPlanCooldown = 0;
  paddle.angle = 0;
  selectNextBots();
  setPaused(false);
  startLevel(currentLevel);
}

window.resetCurrentLevel = resetCurrentLevel;

window.addEventListener("load", function () {
  mobileControlsEnabled = readMobileSetting();
  document.body.classList.toggle("touch-device", isTouchDevice());
  refreshControlButtons();
  refreshMobileControlsButton();
  applyMode(currentMode);
  applySkin(currentSkin);
  refreshTouchControls();
  setupDailyChallenge();
  renderCareerRecords();
  if (startModeSelect) startModeSelect.value = String(currentMode);
});


// ------------------------------------------------------------
// THE GAME LOOP
// The browser calls frame() every time it is ready to draw.
// Some screens are faster than others, so we make sure update()
// always runs exactly 60 times per second on every computer.
// ------------------------------------------------------------
const STEP = 1000 / 60;
const MAX_SIMULATION_STEPS_PER_FRAME = 12;
let lastTime = 0;
let leftover = 0;
let lastLobbySnapshotSentAt = 0;
let backgroundTicker = null;

function ensureBackgroundTicker() {
  if (!document.hidden) {
    if (backgroundTicker) {
      window.clearInterval(backgroundTicker);
      backgroundTicker = null;
    }
    return;
  }
  if (backgroundTicker) return;
  backgroundTicker = window.setInterval(function () {
    if (!gameStarted || paused || !document.hidden) return;
    const now = performance.now();
    if (!lastTime) lastTime = now;
    const elapsed = Math.min(250, Math.max(0, now - lastTime));
    leftover += elapsed * simulationSpeed;
    lastTime = now;
    let steps = 0;
    while (leftover >= STEP && steps < MAX_SIMULATION_STEPS_PER_FRAME) {
      update();
      leftover -= STEP;
      steps++;
    }
    if (gameStarted && !paused) draw();
  }, 1000 / 30);
}

document.addEventListener("visibilitychange", ensureBackgroundTicker);

function frame(now) {
  updateSecretModeSpeech(now);
  websiteFpsFrameCount++;
  if (websiteFpsSampleStart === 0) websiteFpsSampleStart = now;
  const websiteElapsed = now - websiteFpsSampleStart;
  if (websiteElapsed >= 500) {
    websiteFps = Math.round(websiteFpsFrameCount * 1000 / websiteElapsed);
    websiteFpsFrameCount = 0;
    websiteFpsSampleStart = now;
    const websiteFpsDisplay = document.getElementById("website-fps-display");
    if (websiteFpsDisplay) websiteFpsDisplay.textContent = "WEB " + websiteFps + " FPS";
  }
  leftover = leftover + Math.min(Math.max(0, now - lastTime), 250) * simulationSpeed;
  lastTime = now;

  // If the tab was hidden for a while, don't try to catch up.
  const maxAccumulatedTime = STEP * MAX_SIMULATION_STEPS_PER_FRAME;
  if (leftover > maxAccumulatedTime) {
    leftover = maxAccumulatedTime;
  }

  let simulationSteps = 0;
  while (leftover >= STEP && simulationSteps < MAX_SIMULATION_STEPS_PER_FRAME) {
    update();
    simulationSteps++;
    if (gameStarted && !paused) gameFpsFrameCount++;
    leftover = leftover - STEP;
  }
  refreshAdminDebugReadout();

  if (gameFpsSampleStart === 0) gameFpsSampleStart = now;
  const gameElapsed = now - gameFpsSampleStart;
  if (gameElapsed >= 500) {
    gameFps = Math.round(gameFpsFrameCount * 1000 / gameElapsed);
    gameFpsFrameCount = 0;
    gameFpsSampleStart = now;
  }

  if (multiplayerActive && multiplayerHost && now - lastLobbySnapshotSentAt >= 1000 / 30) {
    if (typeof window.publishLobbyGameSnapshot === "function" && window.publishLobbyGameSnapshot()) {
      lastLobbySnapshotSentAt = now;
    }
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
