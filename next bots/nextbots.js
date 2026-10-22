const NEXTBOT_ROSTER = [
  { name: "GLINT", color: "#ff6b6b", accent: "#ffd166", speed: 1.2 },
  { name: "MOTH", color: "#5eead4", accent: "#a7f3d0", speed: 1.45 },
  { name: "STATIC", color: "#f472b6", accent: "#fef08a", speed: 1.35 },
  { name: "GLEANER", color: "#60a5fa", accent: "#fdba74", speed: 1.55 },
  { name: "PULSE", color: "#c084fc", accent: "#fed7aa", speed: 1.15 },
  { name: "VAPOR", color: "#2dd4bf", accent: "#f472b6", speed: 1.25 },
  { name: "PRISM", color: "#fb7185", accent: "#93c5fd", speed: 1.40 },
  { name: "CHROMA", color: "#4ade80", accent: "#fef08a", speed: 1.50 },
  { name: "NEBULA", color: "#818cf8", accent: "#f472b6", speed: 1.30 },
  { name: "SPECTRUM", color: "#ec4899", accent: "#3b82f6", speed: 1.30 },
  { name: "GLITCH", color: "#10b981", accent: "#f43f5e", speed: 1.65 },
  { name: "COSMOS", color: "#6366f1", accent: "#ec4899", speed: 1.15 },
  { name: "OASIS", color: "#14b8a6", accent: "#f59e0b", speed: 1.25 },
  { name: "MAGMA", color: "#dc2626", accent: "#facc15", speed: 1.50 },
  { name: "QUARTZ", color: "#f472b6", accent: "#c084fc", speed: 1.10 },
  { name: "HYDRA", color: "#06b6d4", accent: "#10b981", speed: 1.40 },
  { name: "ZENITH", color: "#3b82f6", accent: "#a7f3d0", speed: 1.20 },
  { name: "VORTEX", color: "#8b5cf6", accent: "#f472b6", speed: 1.55 },
  { name: "BLAZE", color: "#f97316", accent: "#ef4444", speed: 1.45 },
  { name: "MIRAGE", color: "#0d9488", accent: "#fef08a", speed: 1.35 },
  { name: "NOVA", color: "#ec4899", accent: "#facc15", speed: 1.70 },
  { name: "NEON", color: "#22c55e", accent: "#06b6d4", speed: 1.60 },
  { name: "SHADOW", color: "#64748b", accent: "#94a3b8", speed: 1.05 },
  { name: "SIREN", color: "#df1c5a", accent: "#ffbeb3", speed: 1.38 },
  { name: "TITAN", color: "#4f46e5", accent: "#f472b6", speed: 1.22 },
  { name: "FROST", color: "#38bdf8", accent: "#e2e8f0", speed: 1.12 },
  { name: "TROPIC", color: "#059669", accent: "#fbbf24", speed: 1.28 },
  { name: "STRATA", color: "#78350f", accent: "#fcd34d", speed: 1.00 },
  { name: "VELVET", color: "#be185d", accent: "#6366f1", speed: 0.94 },
  { name: "PANDEMONIUM", color: "#e11d48", accent: "#facc15", speed: 1.82, telegraphFrames: 300 },
  { name: "RUSH", color: "#f97316", accent: "#fb7185", speed: 1.92 },
  { name: "WARDEN", color: "#475569", accent: "#38bdf8", speed: 0.88 },
  { name: "AFTERIMAGE", color: "#a855f7", accent: "#67e8f9", speed: 1.58 }


];
const NEXTBOT_TELEGRAPH_FRAMES = 48;
const NEXTBOT_DASH_FRAMES = 58;
const NEXTBOT_DASH_SPEED = 11;
const BATTLE_DURATION = 720;
const BATTLE_START_RADIUS = 148;
const BATTLE_END_RADIUS = 112;

let nextBots = [];
let nextBotBattle = null;
let nextBotCooldown = 0;
let nextBotBanner = null;
let nextBotAI = false;
let nextBotTeamupTimer = 0;

function makeNextBot(definition, index) {
  return Object.assign({}, definition, {
    x: index % 2 === 0 ? 80 : WIDTH - 80,
    y: 115 + Math.random() * 95,
    targetX: 70 + Math.random() * (WIDTH - 140),
    targetY: 100 + Math.random() * 170,
    mode: "walk",
    thinkTimer: 110 + Math.random() * 150,
    attackQueued: false,
    phaseTimer: 0,
    angle: 0,
    dashVX: 0,
    dashVY: 0
  });
}

function spawnNextBot() {
  const available = NEXTBOT_ROSTER.filter(function (definition) {
    return !nextBots.some(function (bot) { return bot.name === definition.name; });
  });
  const roster = available.length > 0 ? available : NEXTBOT_ROSTER;
  const definition = roster[Math.floor(Math.random() * roster.length)];
  const bot = makeNextBot(definition, nextBots.length);
  nextBots.push(bot);
  return bot;
}

function removeNextBot() {
  const removed = nextBots.pop();
  if (removed && nextBotBattle && nextBotBattle.bot === removed) {
    nextBotBattle = null;
  }
  return removed;
}

function selectNextBots() {
  nextBots = [];
  nextBotBattle = null;
  nextBotCooldown = 0;
  nextBotBanner = null;
  nextBotTeamupTimer = 0;
}

function getNextBotMultiplayerState() {
  let battle = null;
  if (nextBotBattle) {
    battle = {
      botName: nextBotBattle.bot.name,
      time: nextBotBattle.time,
      centerX: nextBotBattle.centerX,
      centerY: nextBotBattle.centerY,
      centerVX: nextBotBattle.centerVX,
      centerVY: nextBotBattle.centerVY,
      radius: nextBotBattle.radius,
      shieldAngle: nextBotBattle.shieldAngle,
      ballX: nextBotBattle.ballX,
      ballY: nextBotBattle.ballY,
      ballVX: nextBotBattle.ballVX,
      ballVY: nextBotBattle.ballVY
    };
  }
  return {
    bots: nextBots.map(function (bot) { return Object.assign({}, bot); }),
    battle: battle,
    banner: nextBotBanner ? Object.assign({}, nextBotBanner) : null,
    cooldown: nextBotCooldown,
    ai: nextBotAI,
    teamupTimer: nextBotTeamupTimer
  };
}

function setNextBotMultiplayerState(state) {
  if (!state) return;
  const bots = Array.isArray(state.bots) ? state.bots : Object.values(state.bots || {});
  nextBots = bots.map(function (bot) { return Object.assign({}, bot); });
  nextBotBattle = state.battle ? Object.assign({}, state.battle, {
    bot: nextBots.find(function (bot) { return bot.name === state.battle.botName; }) || { name: state.battle.botName, accent: "#fff" }
  }) : null;
  nextBotBanner = state.banner ? Object.assign({}, state.banner) : null;
  nextBotCooldown = state.cooldown || 0;
  nextBotTeamupTimer = state.teamupTimer || 0;
  if (nextBotAI !== Boolean(state.ai)) setNextBotAI(Boolean(state.ai));
}

function setNextBotsForLevel(currentLevel) {
  const targetCount = currentLevel < 2 ? 0 : Math.floor((currentLevel + 1) / 2);
  while (nextBots.length < targetCount) spawnNextBot();
  while (nextBots.length > targetCount) removeNextBot();
}

function isNextBotBattleActive() {
  return nextBotBattle !== null;
}

function isNextBotAttackActive() {
  return nextBots.some(function (bot) {
    return bot.mode === "telegraph" || bot.mode === "dash";
  });
}

function isNextBotAIEnabled() {
  return nextBotAI;
}

function setNextBotAI(enabled) {
  nextBotAI = enabled;
  const button = document.getElementById("nextbot-ai-toggle");
  if (button) {
    button.setAttribute("aria-pressed", String(nextBotAI));
    button.textContent = "Nextbot AI: " + (nextBotAI ? "On" : "Off");
  }
}

function updateNextBotAI() {
  for (const bot of nextBots) {
    if (bot.mode !== "telegraph" && bot.mode !== "dash") continue;

    const directionX = bot.mode === "dash" ? bot.dashVX / NEXTBOT_DASH_SPEED : Math.cos(bot.angle);
    const directionY = bot.mode === "dash" ? bot.dashVY / NEXTBOT_DASH_SPEED : Math.sin(bot.angle);
    if (Math.abs(directionY) < 1e-6) continue;

    const targetY = paddle.y + paddle.height / 2;
    const distance = (targetY - bot.y) / directionY;
    if (distance < 0) continue;
    const impactX = bot.x + directionX * distance;
    if (impactX < paddle.x - 30 || impactX > paddle.x + paddle.width + 30) continue;

    const safeX = impactX < WIDTH / 2 ? WIDTH - paddle.width : 0;
    const movement = Math.max(-12, Math.min(12, safeX - paddle.x));
    paddle.x = Math.max(0, Math.min(WIDTH - paddle.width, paddle.x + movement));
    return;
  }
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
      if (bot.thinkTimer <= 0) bot.attackQueued = true;
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
      bot.attackQueued = false;
      bot.targetX = 45 + Math.random() * (WIDTH - 90);
      bot.targetY = 95 + Math.random() * 205;
    }
  }

  if (nextBotCooldown > 0) return;
  const activeAttacks = nextBots.filter(function (bot) {
    return bot.mode === "telegraph" || bot.mode === "dash";
  }).length;
  const queuedBot = nextBots.find(function (bot) {
    return bot.mode === "walk" && bot.attackQueued;
  });
  if (!queuedBot) {
    nextBotTeamupTimer = 0;
    return;
  }
  if (activeAttacks === 0) {
    startNextBotAttack(queuedBot);
    nextBotTeamupTimer = 0;
  } else if (activeAttacks === 1) {
    if (nextBotTeamupTimer === 0) nextBotTeamupTimer = 36;
    nextBotTeamupTimer--;
    if (nextBotTeamupTimer <= 0) startNextBotAttack(queuedBot);
  } else {
    nextBotTeamupTimer = 0;
  }
}

function startNextBotAttack(bot) {
  bot.angle = Math.atan2(paddle.y + paddle.height / 2 - bot.y, paddle.x + paddle.width / 2 - bot.x);
  bot.mode = "telegraph";
  bot.phaseTimer = bot.telegraphFrames || NEXTBOT_TELEGRAPH_FRAMES;
  bot.attackQueued = false;
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
  const radius = BATTLE_START_RADIUS;
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
  battle.radius = BATTLE_START_RADIUS - Math.min(1, battle.time / BATTLE_DURATION) * (BATTLE_START_RADIUS - BATTLE_END_RADIUS);

  if (nextBotAI || autoPlay) {
    steerBattleShieldAI(battle);
  } else {
    if (keys[CONTROL_KEYS.left]) battle.shieldAngle -= 0.14;
    if (keys[CONTROL_KEYS.right]) battle.shieldAngle += 0.14;
    if (multiplayerHost) {
      for (const player of multiplayerPlayers) {
        if (player.left) battle.shieldAngle -= 0.14;
        if (player.right) battle.shieldAngle += 0.14;
      }
      if (aiPaddles.some(function (bot) { return bot.lobbyAI; })) {
        const targetAngle = Math.atan2(battle.ballY - battle.centerY, battle.ballX - battle.centerX);
        const difference = Math.atan2(Math.sin(targetAngle - battle.shieldAngle), Math.cos(targetAngle - battle.shieldAngle));
        battle.shieldAngle += Math.max(-0.025, Math.min(0.025, difference));
      }
    }
  }

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

function steerBattleShieldAI(battle) {
  const relativeX = battle.ballX - battle.centerX;
  const relativeY = battle.ballY - battle.centerY;
  const relativeVX = battle.ballVX - battle.centerVX;
  const relativeVY = battle.ballVY - battle.centerVY;
  const velocitySquared = relativeVX * relativeVX + relativeVY * relativeVY;
  if (velocitySquared < 1e-8) return;

  const radius = battle.radius - 7;
  const b = 2 * (relativeX * relativeVX + relativeY * relativeVY);
  const c = relativeX * relativeX + relativeY * relativeY - radius * radius;
  const discriminant = b * b - 4 * velocitySquared * c;
  if (discriminant < 0) return;

  const impactTime = (-b + Math.sqrt(discriminant)) / (2 * velocitySquared);
  const impactX = relativeX + relativeVX * impactTime;
  const impactY = relativeY + relativeVY * impactTime;
  const impactAngle = Math.atan2(impactY, impactX);
  const angleDifference = Math.atan2(
    Math.sin(impactAngle - battle.shieldAngle),
    Math.cos(impactAngle - battle.shieldAngle)
  );
  battle.shieldAngle += Math.max(-0.2, Math.min(0.2, angleDifference));
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
    if (bot.mode === "telegraph" || bot.mode === "dash") {
      bot.mode = "walk";
      bot.attackQueued = true;
    }
    if (bot === defeatedBot) {
      bot.thinkTimer = 130 + Math.random() * 100;
      bot.attackQueued = false;
    }
  }

  if (won) {
    mola++;
    spawnBattleRewardBall();
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
    if (bot.mode === "telegraph") {
      ctx.fillStyle = bot.accent;
      ctx.font = "bold 10px Courier New";
      ctx.fillText("ATTACK IN " + (bot.phaseTimer / 60).toFixed(1) + "s", centerX, centerY - 33);
    } else if (bot.attackQueued) {
      ctx.fillStyle = "#ffd166";
      ctx.font = "bold 9px Courier New";
      ctx.fillText("ATTACK QUEUED", centerX, centerY - 33);
    }
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
  ctx.fillText((nextBotAI ? "AI SHIELD" : "LEFT / RIGHT: SHIELD") + "  |  " + ((BATTLE_DURATION - battle.time) / 60).toFixed(1) + "s", WIDTH / 2, 49);

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