const NEXTBOT_ROSTER = [
  { name: "GLINT", color: "#ff6b6b", accent: "#ffd166", speed: 1.2 },
  { name: "MOTH", color: "#5eead4", accent: "#a7f3d0", speed: 1.45 },
  { name: "STATIC", color: "#f472b6", accent: "#fef08a", speed: 1.35 },
  { name: "GLEANER", color: "#60a5fa", accent: "#fdba74", speed: 1.55 },
  { name: "PULSE", color: "#c084fc", accent: "#fed7aa", speed: 1.15 },
  { name: "VAPOR", color: "#2dd4bf", accent: "#f472b6", speed: 1.25 },
  { name: "PRISM", color: "#fb7185", accent: "#93c5fd", speed: 1.40 },
  { name: "CHROMA", color: "#4ade80", accent: "#fef08a", speed: 1.50 },
  { name: "NEBULA", color: "#818cf8", accent: "#f472b6", speed: 1.30 }

];
const NEXTBOT_TELEGRAPH_FRAMES = 48;
const NEXTBOT_DASH_FRAMES = 58;
const NEXTBOT_DASH_SPEED = 11;
const BATTLE_DURATION = 720;

let nextBots = [];
let nextBotBattle = null;
let nextBotCooldown = 0;
let nextBotBanner = null;

function selectNextBots() {
  const shuffled = NEXTBOT_ROSTER.slice();
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  nextBots = shuffled.slice(0, 2).map(function (definition, index) {
    return Object.assign({}, definition, {
      x: index === 0 ? 80 : WIDTH - 80,
      y: 115 + Math.random() * 95,
      targetX: 70 + Math.random() * (WIDTH - 140),
      targetY: 100 + Math.random() * 170,
      mode: "walk",
      thinkTimer: 110 + Math.random() * 150,
      phaseTimer: 0,
      angle: 0,
      dashVX: 0,
      dashVY: 0
    });
  });
  nextBotBattle = null;
  nextBotCooldown = 0;
  nextBotBanner = null;
}

function isNextBotBattleActive() {
  return nextBotBattle !== null;
}

function updateNextBots() {
  if (nextBotCooldown > 0) nextBotCooldown--;
  if (nextBotBanner) {
    nextBotBanner.timer--;
    if (nextBotBanner.timer <= 0) nextBotBanner = null;
  }

  for (const bot of nextBots) {
    if (bot.mode === "walk") {
      const dx = bot.targetX - bot.x;
      const dy = bot.targetY - bot.y;
      const distance = Math.hypot(dx, dy);
      if (distance > bot.speed) {
        bot.x += dx / distance * bot.speed;
        bot.y += dy / distance * bot.speed;
      } else {
        bot.targetX = 45 + Math.random() * (WIDTH - 90);
        bot.targetY = 95 + Math.random() * 205;
      }
      bot.angle = Math.atan2(paddle.y + paddle.height / 2 - bot.y, paddle.x + paddle.width / 2 - bot.x);
      bot.thinkTimer--;
      if (bot.thinkTimer <= 0 && nextBotCooldown === 0) {
        bot.angle = Math.atan2(paddle.y + paddle.height / 2 - bot.y, paddle.x + paddle.width / 2 - bot.x);
        bot.mode = "telegraph";
        bot.phaseTimer = NEXTBOT_TELEGRAPH_FRAMES;
      }
      continue;
    }

    if (bot.mode === "telegraph") {
      bot.phaseTimer--;
      if (bot.phaseTimer <= 0) {
        bot.mode = "dash";
        bot.phaseTimer = NEXTBOT_DASH_FRAMES;
        bot.dashVX = Math.cos(bot.angle) * NEXTBOT_DASH_SPEED;
        bot.dashVY = Math.sin(bot.angle) * NEXTBOT_DASH_SPEED;
      }
      continue;
    }

    const previousX = bot.x;
    const previousY = bot.y;
    bot.x += bot.dashVX;
    bot.y += bot.dashVY;
    bot.phaseTimer--;
    if (segmentHitsPaddle(previousX, previousY, bot.x, bot.y)) {
      beginNextBotBattle(bot);
      return;
    }
    if (bot.phaseTimer <= 0 || bot.x < -30 || bot.x > WIDTH + 30 || bot.y < -30 || bot.y > HEIGHT + 30) {
      bot.mode = "walk";
      bot.thinkTimer = 115 + Math.random() * 115;
      bot.targetX = 45 + Math.random() * (WIDTH - 90);
      bot.targetY = 95 + Math.random() * 205;
    }
  }
}

function segmentHitsPaddle(startX, startY, endX, endY) {
  const padding = 15;
  const left = paddle.x - padding;
  const right = paddle.x + paddle.width + padding;
  const top = paddle.y - padding;
  const bottom = paddle.y + paddle.height + padding;
  let minTime = 0;
  let maxTime = 1;

  for (const edge of [
    { start: startX, delta: endX - startX, min: left, max: right },
    { start: startY, delta: endY - startY, min: top, max: bottom }
  ]) {
    if (Math.abs(edge.delta) < 1e-8) {
      if (edge.start < edge.min || edge.start > edge.max) return false;
      continue;
    }
    const first = (edge.min - edge.start) / edge.delta;
    const second = (edge.max - edge.start) / edge.delta;
    minTime = Math.max(minTime, Math.min(first, second));
    maxTime = Math.min(maxTime, Math.max(first, second));
    if (minTime > maxTime) return false;
  }
  return true;
}

function beginNextBotBattle(bot) {
  const centerX = WIDTH / 2;
  const centerY = HEIGHT / 2;
  const shieldAngle = -Math.PI / 2;
  const radius = 116;
  const ballAngle = shieldAngle;
  nextBotBattle = {
    bot: bot,
    time: 0,
    centerX: centerX,
    centerY: centerY,
    centerVX: 1.15,
    centerVY: 0.82,
    radius: radius,
    shieldAngle: shieldAngle,
    ballX: centerX + Math.cos(ballAngle) * (radius - 35),
    ballY: centerY + Math.sin(ballAngle) * (radius - 35),
    ballVX: Math.cos(ballAngle) * 3.2,
    ballVY: Math.sin(ballAngle) * 3.2
  };
}

function updateNextBotBattle() {
  const battle = nextBotBattle;
  battle.time++;
  battle.radius = 116 - Math.min(1, battle.time / BATTLE_DURATION) * 34;

  if (keys[CONTROL_KEYS.left]) battle.shieldAngle -= 0.14;
  if (keys[CONTROL_KEYS.right]) battle.shieldAngle += 0.14;

  battle.centerX += battle.centerVX;
  battle.centerY += battle.centerVY;
  if (battle.centerX < battle.radius + 16 || battle.centerX > WIDTH - battle.radius - 16) {
    battle.centerVX *= -1;
  }
  if (battle.centerY < battle.radius + 50 || battle.centerY > HEIGHT - battle.radius - 14) {
    battle.centerVY *= -1;
  }

  battle.ballX += battle.ballVX;
  battle.ballY += battle.ballVY;
  const dx = battle.ballX - battle.centerX;
  const dy = battle.ballY - battle.centerY;
  const distance = Math.hypot(dx, dy);
  const ballRadius = 7;
  if (distance >= battle.radius - ballRadius) {
    const impactAngle = Math.atan2(dy, dx);
    const angleDifference = Math.atan2(
      Math.sin(impactAngle - battle.shieldAngle),
      Math.cos(impactAngle - battle.shieldAngle)
    );
    if (Math.abs(angleDifference) > 0.39) {
      finishNextBotBattle(false);
      return;
    }

    const normalX = dx / distance;
    const normalY = dy / distance;
    const relativeVX = battle.ballVX - battle.centerVX;
    const relativeVY = battle.ballVY - battle.centerVY;
    const speedAlongNormal = relativeVX * normalX + relativeVY * normalY;
    battle.ballVX -= 2 * speedAlongNormal * normalX;
    battle.ballVY -= 2 * speedAlongNormal * normalY;
    const speed = Math.hypot(battle.ballVX, battle.ballVY);
    const boostedSpeed = Math.min(6.1, speed + 0.035);
    battle.ballVX *= boostedSpeed / speed;
    battle.ballVY *= boostedSpeed / speed;
    battle.ballX = battle.centerX + normalX * (battle.radius - ballRadius - 1);
    battle.ballY = battle.centerY + normalY * (battle.radius - ballRadius - 1);
  }

  if (battle.time >= BATTLE_DURATION) finishNextBotBattle(true);
}

function finishNextBotBattle(won) {
  const defeatedBot = nextBotBattle.bot;
  nextBotBattle = null;
  nextBotCooldown = 360;
  nextBotBanner = {
    text: won ? defeatedBot.name + " REPELLED - EXTRA BALL" : (invincible ? "CAUGHT! INVINCIBILITY SAVED YOU" : "CAUGHT! LIFE LOST"),
    timer: 110
  };
  for (const bot of nextBots) {
    bot.mode = "walk";
    bot.thinkTimer = 130 + Math.random() * 100;
  }

  if (won) {
    mola++;
    spawnExtraBall(ball);
  } else {
    loseLife();
  }
}

function drawNextBots() {
  for (const bot of nextBots) {
    const centerX = bot.x;
    const centerY = bot.y;
    if (bot.mode === "telegraph" || bot.mode === "dash") {
      const beamLength = Math.hypot(WIDTH, HEIGHT);
      const endX = centerX + Math.cos(bot.angle) * beamLength;
      const endY = centerY + Math.sin(bot.angle) * beamLength;
      ctx.save();
      ctx.strokeStyle = bot.mode === "telegraph" ? "#ff6b6b" : bot.accent;
      ctx.globalAlpha = bot.mode === "telegraph" ? 0.35 + Math.sin(Date.now() / 75) * 0.2 : 0.8;
      ctx.lineWidth = bot.mode === "telegraph" ? 2 : 4;
      ctx.setLineDash(bot.mode === "telegraph" ? [8, 7] : []);
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(bot.angle);
    ctx.fillStyle = bot.color;
    ctx.fillRect(-11, -14, 22, 28);
    ctx.fillStyle = "#080808";
    ctx.fillRect(-7, -7, 4, 4);
    ctx.fillRect(3, -7, 4, 4);
    ctx.fillStyle = bot.accent;
    ctx.fillRect(-7, 4, 14, 3);
    ctx.restore();

    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = "10px Courier New";
    ctx.fillText(bot.name, centerX, centerY - 20);
  }

  if (nextBotBattle) drawNextBotBattle();
  if (nextBotBanner) {
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = "14px Courier New";
    ctx.fillText(nextBotBanner.text, WIDTH / 2, HEIGHT / 2);
  }
}

function drawNextBotBattle() {
  const battle = nextBotBattle;
  ctx.fillStyle = "rgba(0, 0, 0, 0.88)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.textAlign = "center";
  ctx.fillStyle = battle.bot.accent;
  ctx.font = "bold 19px Courier New";
  ctx.fillText("" + battle.bot.name + " // CONTAINMENT", WIDTH / 2, 29);
  ctx.fillStyle = "white";
  ctx.font = "13px Courier New";
  ctx.fillText("ROTATE SHIELD  |  " + ((BATTLE_DURATION - battle.time) / 60).toFixed(1) + "s", WIDTH / 2, 49);

  ctx.beginPath();
  ctx.arc(battle.centerX, battle.centerY, battle.radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(battle.centerX, battle.centerY, battle.radius, battle.shieldAngle - 0.39, battle.shieldAngle + 0.39);
  ctx.strokeStyle = battle.bot.accent;
  ctx.lineWidth = 12;
  ctx.lineCap = "square";
  ctx.stroke();
  ctx.lineCap = "butt";

  ctx.beginPath();
  ctx.arc(battle.ballX, battle.ballY, 7, 0, Math.PI * 2);
  ctx.fillStyle = "white";
  ctx.fill();
}