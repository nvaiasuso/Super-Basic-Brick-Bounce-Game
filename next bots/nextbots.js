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
  { name: "AFTERIMAGE", color: "#a855f7", accent: "#67e8f9", speed: 1.58 },
  { name: "SPARK", color: "#facc15", accent: "#fef9c3", speed: 1.78, telegraphFrames: 30 },
  { name: "JUGGERNAUT", color: "#64748b", accent: "#f87171", speed: 0.72, telegraphFrames: 82 },
  { name: "SCREECH", color: "#a3e635", accent: "#fef08a", speed: 1.95, telegraphFrames: 24 },
  { name: "WISP", color: "#e2e8f0", accent: "#c4b5fd", speed: 1.05, telegraphFrames: 68 },
  { name: "CROSSHAIR", color: "#ef4444", accent: "#ffffff", speed: 1.48, telegraphFrames: 38 },
  { name: "RIPTIDE", color: "#06b6d4", accent: "#a5f3fc", speed: 1.62, telegraphFrames: 42 },
  { name: "CINDER", color: "#f97316", accent: "#fde68a", speed: 1.36, telegraphFrames: 56 },
  { name: "LATTICE", color: "#84cc16", accent: "#ecfccb", speed: 1.18, telegraphFrames: 72 },
  { name: "ECHO", color: "#a78bfa", accent: "#f5d0fe", speed: 1.74, telegraphFrames: 28 },
  { name: "BULWARK", color: "#64748b", accent: "#fda4af", speed: 0.82, telegraphFrames: 96 },
  { name: "COMET", color: "#facc15", accent: "#bae6fd", speed: 1.88, telegraphFrames: 22 },
  { name: "MIRROR", color: "#cbd5e1", accent: "#f472b6", speed: 1.42, telegraphFrames: 34 },
  { name: "GRAVITY WELL", color: "#1e293b", accent: "#38bdf8", speed: 1.08, telegraphFrames: 88 },
  { name: "VOLT", color: "#facc15", accent: "#22d3ee", speed: 1.96, telegraphFrames: 20 },
  { name: "THORNS", color: "#15803d", accent: "#bef264", speed: 1.26, telegraphFrames: 62 },
  { name: "MONSOON", color: "#0e7490", accent: "#a5f3fc", speed: 1.52, telegraphFrames: 40 },
  { name: "PHANTOM ARRAY", color: "#334155", accent: "#e879f9", speed: 1.66, telegraphFrames: 26 },
  { name: "SUNSPOT", color: "#ea580c", accent: "#fde047", speed: 1.34, telegraphFrames: 54 },
  { name: "DEADBOLT", color: "#374151", accent: "#f87171", speed: 0.96, telegraphFrames: 78 },
  { name: "MIMIC", color: "#ec4899", accent: "#fef08a", speed: 1.72, telegraphFrames: 32 },
  { name: "TREMOR", color: "#78716c", accent: "#fbbf24", speed: 1.02, telegraphFrames: 92 },
  { name: "BLOOM", color: "#16a34a", accent: "#f0abfc", speed: 1.38, telegraphFrames: 58 },
  { name: "SINGULARITY", color: "#312e81", accent: "#67e8f9", speed: 1.58, telegraphFrames: 36 },
  { name: "RICOCHET", color: "#f97316", accent: "#bfdbfe", speed: 1.88, telegraphFrames: 24 },
  { name: "FIREWALL", color: "#b91c1c", accent: "#fdba74", speed: 1.24, telegraphFrames: 70 },
  { name: "RIFT", description: "Fast attacker with a short warning", color: "#7c3aed", accent: "#67e8f9", speed: 1.78, telegraphFrames: 18 },
  { name: "BULKHEAD", description: "Slow mover with a long warning", color: "#475569", accent: "#fbbf24", speed: 0.72, telegraphFrames: 110 },
  { name: "HUNTER", description: "Quick attacker that tracks players", color: "#be123c", accent: "#fda4af", speed: 1.92, telegraphFrames: 28 },
  { name: "AFTERSHOCK", description: "Heavy attacker with a delayed strike", color: "#a16207", accent: "#fde047", speed: 1.12, telegraphFrames: 84 },
  { name: "LANTERN", description: "Slow scout with a very long warning", color: "#ea580c", accent: "#fef08a", speed: 0.9, telegraphFrames: 132 },
  { name: "QUICKSILVER", description: "High-speed attacker with a short warning", color: "#cbd5e1", accent: "#22d3ee", speed: 2.05, telegraphFrames: 20 },
  { name: "FURNACE", description: "Steady pursuer with a medium warning", color: "#dc2626", accent: "#fdba74", speed: 1.42, telegraphFrames: 58 },
  { name: "SABOTEUR", description: "Erratic attacker with a quick warning", color: "#a3e635", accent: "#fb7185", speed: 1.68, telegraphFrames: 26 },
  { name: "RAPTOR", description: "Fast chaser with a short warning", color: "#16a34a", accent: "#fef08a", speed: 1.88, telegraphFrames: 32 },
  { name: "CLOCKER", description: "Slow attacker with a delayed strike", color: "#0e7490", accent: "#fbbf24", speed: 0.98, telegraphFrames: 104 },
  { name: "NOCTURNE", description: "Silent stalker with a dense warning flicker", color: "#1f2937", accent: "#a78bfa", speed: 1.28, telegraphFrames: 74 },
  { name: "MANTICORE", description: "Heavy hunter with explosive burst timing", color: "#f97316", accent: "#fef08a", speed: 1.52, telegraphFrames: 46 },
  { name: "GAMBIT", description: "Erratic advanced unit that breaks lines at speed", color: "#22c55e", accent: "#f472b6", speed: 1.74, telegraphFrames: 28 },
  { name: "MOURNING", description: "Slow dreadwalker with a long telegraph", color: "#713f12", accent: "#f4d35e", speed: 0.86, telegraphFrames: 122 },
  { name: "MOLTEN", description: "Fiery rear-guard that rushes on a delayed cue", color: "#ef4444", accent: "#fdba74", speed: 1.66, telegraphFrames: 38 }

];
const NEXTBOT_TELEGRAPH_FRAMES = 48;
const NEXTBOT_DASH_FRAMES = 58;
const NEXTBOT_DASH_SPEED = 11;
const BATTLE_DURATION = 300;
const BATTLE_START_RADIUS = 148;
const BATTLE_END_RADIUS = 112;

let nextBots = [];
let nextBotBattle = null;
let nextBotCooldown = 0;
let nextBotBanner = null;
let nextBotAI = false;
let nextBotAimAtBall = false;
let nextBotAttacksPaused = false;
let nextBotTeamupTimer = 0;

function makeNextBot(definition, index) {
  return Object.assign({}, definition, {
    x: index % 2 === 0 ? 80 : WIDTH - 80,
    y: 115 + Math.random() * 95,
    targetX: 70 + Math.random() * (WIDTH - 140),
    targetY: 100 + Math.random() * 170,
    mode: "walk",
    thinkTimer: definition.name === "PANDEMONIUM" ? 1 : 110 + Math.random() * 150,
    attackQueued: false,
    health: 1,
    maxHealth: 1,
    phaseTimer: 0,
    angle: 0,
    dashVX: 0,
    dashVY: 0,
    gunCooldown: 60 + Math.random() * 90
  });
}

function spawnNextBot(name) {
  if (name) {
    const selected = NEXTBOT_ROSTER.find(function (definition) { return definition.name === name; });
    if (selected) {
      const bot = makeNextBot(selected, nextBots.length);
      nextBots.push(bot);
      return bot;
    }
  }
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

function clearBossMinions() {
  if (nextBotBattle && nextBotBattle.bot.bossMinion) nextBotBattle = null;
  nextBots = nextBots.filter(function (bot) { return !bot.bossMinion; });
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
      playerId: nextBotBattle.playerId,
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
    aimAtBall: nextBotAimAtBall,
    attacksPaused: nextBotAttacksPaused,
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
  if (nextBotAimAtBall !== Boolean(state.aimAtBall)) setNextBotAimAtBall(Boolean(state.aimAtBall));
  if (nextBotAttacksPaused !== Boolean(state.attacksPaused)) setNextBotAttacksPaused(Boolean(state.attacksPaused));
}

function setNextBotsForLevel(currentLevel) {
  if (currentLevel === LEVEL_COUNT - 1) {
    selectNextBots();
    return;
  }
  const modeMultiplier = typeof getCurrentMode === "function" ? getCurrentMode().nextbotMultiplier || 1 : 1;
  const targetCount = currentLevel < 2 ? 0 : Math.floor((currentLevel + 1) / 2 * modeMultiplier);
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

function isNextBotAimAtBall() {
  return nextBotAimAtBall;
}

function setNextBotAimAtBall(enabled) {
  nextBotAimAtBall = enabled;
  const button = document.getElementById("nextbot-aim-toggle");
  if (button) {
    button.setAttribute("aria-pressed", String(nextBotAimAtBall));
    button.textContent = "Nextbot aim: " + (nextBotAimAtBall ? "Ball" : "Paddle");
  }
}

function setNextBotAttacksPaused(paused) {
  nextBotAttacksPaused = paused;
  if (paused) {
    for (const bot of nextBots) {
      bot.mode = "walk";
      bot.phaseTimer = 0;
      bot.attackQueued = false;
    }
  }
  const button = document.getElementById("nextbot-wait-toggle");
  if (button) {
    button.setAttribute("aria-pressed", String(nextBotAttacksPaused));
    button.textContent = "Nextbot attacks: " + (nextBotAttacksPaused ? "Paused" : "On");
  }
}

function getNextBotPlayerTargets() {
  const targets = [];
  const localIsAdmin = adminBattleMode && multiplayerAdminIds.includes(multiplayerPlayerId);
  if (!localIsAdmin) targets.push({ id: multiplayerPlayerId, paddle: paddle });
  if (multiplayerActive) {
    for (const player of multiplayerPlayers) {
      if (player.ai || player.id === multiplayerPlayerId || (adminBattleMode && multiplayerAdminIds.includes(player.id))) continue;
      targets.push({ id: player.id, paddle: player });
    }
  }
  return targets;
}

function getNextBotAimTarget(bot) {
  if (nextBotAimAtBall && !ball.stuck) {
    return { x: ball.x + ball.width / 2, y: ball.y + ball.height / 2 };
  }
  const targets = getNextBotPlayerTargets();
  const nearest = targets.reduce(function (closest, target) {
    if (!closest) return target;
    return Math.hypot(target.paddle.x - bot.x, target.paddle.y - bot.y) <
      Math.hypot(closest.paddle.x - bot.x, closest.paddle.y - bot.y) ? target : closest;
  }, null);
  const targetPaddle = nearest ? nearest.paddle : paddle;
  return { x: targetPaddle.x + targetPaddle.width / 2, y: targetPaddle.y + targetPaddle.height / 2 };
}

function setNextBotAI(enabled) {
  nextBotAI = enabled;
  const button = document.getElementById("nextbot-ai-toggle");
  if (button) {
    button.setAttribute("aria-pressed", String(nextBotAI));
    button.textContent = "Nextbot AI: " + (nextBotAI ? "On" : "Off");
  }
}

function updateNextBots() {
  if (nextBotCooldown > 0) nextBotCooldown--;
  if (nextBotBanner) {
    nextBotBanner.timer--;
    if (nextBotBanner.timer <= 0) nextBotBanner = null;
  }

  for (const bot of nextBots) {
    if (bot.frozenTimer > 0) {
      bot.frozenTimer--;
      continue;
    }

    if (bot.mode === "walk") {
      const aimTarget = getNextBotAimTarget(bot);
      const dx = bot.targetX - bot.x;
      const dy = bot.targetY - bot.y;
      const distance = Math.hypot(dx, dy);
      const moveSpeed = bot.speed * adminNextBotSpeedMultiplier;
      if (distance > moveSpeed) {
        bot.x += dx / distance * moveSpeed;
        bot.y += dy / distance * moveSpeed;
      } else {
        bot.targetX = 45 + Math.random() * (WIDTH - 90);
        bot.targetY = 95 + Math.random() * 205;
      }
      bot.angle = Math.atan2(aimTarget.y - bot.y, aimTarget.x - bot.x);
      if (!nextBotAttacksPaused) {
        bot.thinkTimer--;
        if (bot.thinkTimer <= 0) bot.attackQueued = true;
      }
      continue;
    }

    if (bot.mode === "telegraph") {
      bot.phaseTimer--;
      if (bot.phaseTimer <= 0) {
        bot.mode = "dash";
        bot.phaseTimer = NEXTBOT_DASH_FRAMES;
        bot.dashVX = Math.cos(bot.angle) * NEXTBOT_DASH_SPEED * adminNextBotSpeedMultiplier;
        bot.dashVY = Math.sin(bot.angle) * NEXTBOT_DASH_SPEED * adminNextBotSpeedMultiplier;
      }
      continue;
    }

    const previousX = bot.x;
    const previousY = bot.y;
    bot.x += bot.dashVX;
    bot.y += bot.dashVY;
    bot.phaseTimer--;
    const hitTarget = getNextBotPlayerTargets().find(function (target) {
      return segmentHitsPaddle(previousX, previousY, bot.x, bot.y, target.paddle);
    });
    if (hitTarget) {
      beginNextBotBattle(bot, hitTarget.id);
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

  if (nextBotAttacksPaused || nextBotCooldown > 0) return;
  const activeAttacks = nextBots.filter(function (bot) {
    return !(bot.frozenTimer > 0) && (bot.mode === "telegraph" || bot.mode === "dash");
  }).length;
  const queuedBot = nextBots.filter(function (bot) {
    return !(bot.frozenTimer > 0) && bot.mode === "walk" && bot.attackQueued;
  }).sort(function (first, second) {
    if (first.name === "PANDEMONIUM") return -1;
    if (second.name === "PANDEMONIUM") return 1;
    return 0;
  })[0];
  if (!queuedBot) {
    nextBotTeamupTimer = 0;
    return;
  }
  if (activeAttacks === 0) {
    startNextBotAttack(queuedBot);
    nextBotTeamupTimer = 0;
  } else if (activeAttacks < 3) {
    if (nextBotTeamupTimer === 0) nextBotTeamupTimer = 36;
    nextBotTeamupTimer--;
    if (nextBotTeamupTimer <= 0) startNextBotAttack(queuedBot);
  } else {
    nextBotTeamupTimer = 0;
  }
}

function startNextBotAttack(bot) {
  const aimTarget = getNextBotAimTarget(bot);
  bot.angle = Math.atan2(aimTarget.y - bot.y, aimTarget.x - bot.x);
  bot.mode = "telegraph";
  bot.phaseTimer = bot.telegraphFrames || NEXTBOT_TELEGRAPH_FRAMES;
  bot.attackQueued = false;
}

function triggerNextBotAttack() {
  if (nextBotAttacksPaused) return false;
  const bot = nextBots.find(function (candidate) {
    return candidate.mode === "walk" && !(candidate.frozenTimer > 0) && !candidate.attackQueued;
  });
  if (!bot) return false;
  bot.thinkTimer = 0;
  bot.attackQueued = true;
  nextBotCooldown = 0;
  return true;
}

if (typeof populateAdminNextBotSelect === "function") populateAdminNextBotSelect();

function segmentHitsPaddle(startX, startY, endX, endY, targetPaddle = paddle) {
  if (shieldTimer > 0) return false;
  const padding = 15;
  const left = targetPaddle.x - padding;
  const right = targetPaddle.x + targetPaddle.width + padding;
  const top = targetPaddle.y - padding;
  const bottom = targetPaddle.y + targetPaddle.height + padding;
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

function beginNextBotBattle(bot, playerId = null) {
  if (nextBotBattle) return;
  const centerX = WIDTH / 2;
  const centerY = HEIGHT / 2;
  const shieldAngle = -Math.PI / 2;
  const radius = BATTLE_START_RADIUS;
  const ballAngle = shieldAngle;
  nextBotBattle = {
    bot: bot,
    playerId: multiplayerActive ? playerId : null,
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

  if (nextBotAI || autoPlay || (localTestMode && (localTestCpu[0] || localTestCpu[1]))) {
    steerBattleShieldAI(battle);
  } else if (multiplayerActive && battle.playerId && battle.playerId !== multiplayerPlayerId && !localTestMode) {
    const participant = multiplayerPlayers.find(function (player) { return player.id === battle.playerId; });
    if (participant && participant.left) battle.shieldAngle -= 0.14;
    if (participant && participant.right) battle.shieldAngle += 0.14;
  } else {
    const leftPressed = localTestMode && battle.playerId === "local-test-player-2" ? keys.a : keys[CONTROL_KEYS.left];
    const rightPressed = localTestMode && battle.playerId === "local-test-player-2" ? keys.d : keys[CONTROL_KEYS.right];
    if (leftPressed) battle.shieldAngle -= 0.14;
    if (rightPressed) battle.shieldAngle += 0.14;
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
  if (impactTime < 0) return;
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
  const battle = nextBotBattle;
  const defeatedBot = battle.bot;
  nextBotBattle = null;
  nextBotCooldown = 360;
  nextBotBanner = {
    text: won ? defeatedBot.name + " REPELLED - EXTRA BALL" : (invincible ? "CAUGHT! INVINCIBILITY SAVED YOU" : "CAUGHT! LIFE LOST"),
    timer: 110,
    playerId: battle.playerId
  };
  for (const bot of nextBots) {
    if (!(bot.frozenTimer > 0) && (bot.mode === "telegraph" || bot.mode === "dash")) {
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
    ctx.fillStyle = bot.frozenTimer > 0 ? "#8be9ff" : bot.color;
    ctx.shadowColor = bot.frozenTimer > 0 ? "#8be9ff" : "transparent";
    ctx.shadowBlur = bot.frozenTimer > 0 ? 14 : 0;
    ctx.fillRect(-11, -14, 22, 28);
    ctx.fillStyle = "#080808";
    ctx.fillRect(-7, -7, 4, 4);
    ctx.fillRect(3, -7, 4, 4);
    ctx.fillStyle = bot.accent;
    ctx.fillRect(-7, 4, 14, 3);
    ctx.fillStyle = "#242424";
    ctx.fillRect(7, -2, 13, 4);
    ctx.restore();

    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = "10px Courier New";
    ctx.fillText(bot.name, centerX, centerY - 20);
    if (bot.frozenTimer > 0) {
      ctx.fillStyle = "#8be9ff";
      ctx.font = "bold 9px Courier New";
      ctx.fillText("FROZEN " + Math.ceil(bot.frozenTimer / 60) + "s", centerX, centerY - 33);
    } else if (bot.mode === "telegraph") {
      ctx.fillStyle = bot.accent;
      ctx.font = "bold 10px Courier New";
      ctx.fillText("ATTACK IN " + (bot.phaseTimer / 60).toFixed(1) + "s", centerX, centerY - 33);
    } else if (bot.attackQueued) {
      ctx.fillStyle = "#ffd166";
      ctx.font = "bold 9px Courier New";
      ctx.fillText("ATTACK QUEUED", centerX, centerY - 33);
    }
  }

  const queuedCount = nextBots.filter(function (bot) { return bot.attackQueued && !(bot.frozenTimer > 0); }).length;
  if (queuedCount > 0) {
    ctx.fillStyle = "#ffd166";
    ctx.textAlign = "center";
    ctx.font = "bold 13px Courier New";
    ctx.fillText("NEXTBOT ATTACK QUEUED: " + queuedCount, WIDTH / 2, 46);
  }

  const showBattle = nextBotBattle && (!multiplayerActive || nextBotBattle.playerId === multiplayerPlayerId);
  const showBanner = nextBotBanner && (!multiplayerActive || !nextBotBanner.playerId || nextBotBanner.playerId === multiplayerPlayerId);
  if (showBattle) drawNextBotBattle();
  if (showBanner) {
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = "14px Courier New";
    ctx.fillText(nextBotBanner.text, WIDTH / 2, HEIGHT / 2);
  }
}

function drawNextBotBattle() {
  const battle = nextBotBattle;
  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
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