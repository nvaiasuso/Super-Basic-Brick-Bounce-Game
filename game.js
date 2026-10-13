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
let aiPaddles = [];

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
}

function spawnExtraBall(sourceBall) {
  const angle = (extraBalls.length % 2 === 0 ? 1 : -1) * Math.PI / 6;
  const speed = Math.hypot(sourceBall.vx, sourceBall.vy);
  const extraBall = {
    x: sourceBall.x,
    y: sourceBall.y,
    previousX: sourceBall.x,
    previousY: sourceBall.y,
    width: sourceBall.width,
    height: sourceBall.height,
    vx: sourceBall.vx * Math.cos(angle) - sourceBall.vy * Math.sin(angle),
    vy: sourceBall.vx * Math.sin(angle) + sourceBall.vy * Math.cos(angle)
  };
  const extraSpeed = Math.hypot(extraBall.vx, extraBall.vy);
  extraBall.vx *= speed / extraSpeed;
  extraBall.vy *= speed / extraSpeed;
  extraBalls.push(extraBall);
}

let level = 0;
let lives = STARTING_LIVES;
let gameOver = false;
let gameWon = false;
let invincible = false;
let gameStarted = false;


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
const startGameButton = document.getElementById("start-game");
const menuControlsButton = document.getElementById("menu-controls");
const menuAdminButton = document.getElementById("menu-admin");

function showMainMenu() {
  gameStarted = false;
  paused = false;
  mainMenu.hidden = false;
  controlMenu.hidden = true;
  adminMenu.hidden = true;
  canvas.hidden = true;
  gameInfo.hidden = true;
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
  document.getElementById("control-title").textContent = "Controls";
  resumeButton.textContent = "Back to menu";
  setPaused(true);
}

function beginGame() {
  restartGame();
  gameStarted = true;
  mainMenu.hidden = true;
  controlMenu.hidden = true;
  adminMenu.hidden = true;
  canvas.hidden = false;
  gameInfo.hidden = false;
  lastTime = performance.now();
}

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
      showMainMenu();
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


// ------------------------------------------------------------
// UPDATE: runs 60 times every second. Move things, then check
// what they touched.
// ------------------------------------------------------------
function update() {
  if (!gameStarted || gameOver || gameWon || paused) {
    return;
  }

  if (isNextBotBattleActive()) {
    updateNextBotBattle();
    return;
  }

  paddle.previousX = paddle.x;
  paddle.previousY = paddle.y;
  paddle.previousAngle = paddle.angle;
  movePaddle();
  updateNextBots();

  updateAiPaddles();

  for (const activeBall of [ball].concat(extraBalls)) {
    moveBall(activeBall);
    bounceOffWalls(activeBall);   // collisions.js
    if (bounceOffPaddle(activeBall, paddle)) {
      // keep the player rebound logic in place before brick checks
    }
    if (bounceOffAiPaddles(activeBall)) {
      // AI paddles bounce the ball too
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
  if (keys[CONTROL_KEYS.tiltRight]) {
    paddle.angle = Math.min(MAX_PADDLE_TILT, paddle.angle + PADDLE_TILT_SPEED);
  }
  if (keys[CONTROL_KEYS.tiltLeft]) {
    paddle.angle = Math.max(-MAX_PADDLE_TILT, paddle.angle - PADDLE_TILT_SPEED);
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
  activeBall.x += activeBall.vx;
  activeBall.y += activeBall.vy;
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

// ------------------------------------------------------------
// DRAW: paints everything on the canvas. Black background,
// white shapes.
// ------------------------------------------------------------
function draw() {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const skin = getCurrentSkin();
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
  ctx.textAlign = "right";
  ctx.fillText("BALLS " + (extraBalls.length + 1), WIDTH - 16, 46);
  if (invincible) {
    ctx.fillStyle = "#ffd166";
    ctx.fillText("INVINCIBLE", WIDTH - 16, 64);
  }

  ctx.fillStyle = "white";
  ctx.save();
  ctx.translate(paddle.x + paddle.width / 2, paddle.y + paddle.height / 2);
  ctx.rotate(paddle.angle * Math.PI / 180);
  ctx.fillStyle = paddle.color || skin.paddle;
  ctx.fillRect(-paddle.width / 2, -paddle.height / 2, paddle.width, paddle.height);
  ctx.restore();
  for (const bot of aiPaddles) {
    ctx.fillStyle = bot.color || skin.accent;
    ctx.fillRect(bot.x, bot.y, bot.width, bot.height);
  }
  for (const activeBall of [ball].concat(extraBalls)) {
    ctx.fillStyle = activeBall.color || skin.ball;
    ctx.fillRect(activeBall.x, activeBall.y, activeBall.width, activeBall.height);
  }

  drawBricks();  // bricks.js
  drawNextBots();

  if (gameOver || gameWon) {
    ctx.fillStyle = "black";
    ctx.fillRect(75, HEIGHT / 2 - 42, WIDTH - 150, 84);
    ctx.strokeStyle = "white";
    ctx.strokeRect(75, HEIGHT / 2 - 42, WIDTH - 150, 84);
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = "24px Courier New";
    ctx.fillText(gameWon ? "ALL LEVELS CLEARED!" : "GAME OVER", WIDTH / 2, HEIGHT / 2 - 5);
    ctx.font = "14px Courier New";
    ctx.fillText("Press R to play again", WIDTH / 2, HEIGHT / 2 + 22);
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
}

function loseLife() {
  if (invincible) return;
  lives--;
  autoPlanCooldown = 0;
  brickHitStreak = 0;
  extraBalls = [];
  if (lives <= 0) {
    gameOver = true;
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
  resetBall();
}

function restartGame() {
  level = 0;
  lives = STARTING_LIVES;
  mola = 0;
  aiPaddles = [];
  gameOver = false;
  gameWon = false;
  setPaused(false);
  paddle.angle = 0;
  autoPlanCooldown = 0;
  brickHitStreak = 0;
  extraBalls = [];
  selectNextBots();
  bricks = makeBricks(level);
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
  requestAnimationFrame(frame);
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
