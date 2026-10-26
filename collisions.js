// ============================================================
// collisions.js: what happens when the ball touches something
//
// To "bounce", we flip the ball's speed:
//   hit something sideways -> vx = -vx
//   hit something above or below -> vy = -vy
// ============================================================

// Returns true if two rectangles (like the ball and a brick) overlap.
function boxesTouch(a, b) {
  if (b.type === "boss") {
    const centerX = b.x + b.width / 2;
    const centerY = b.y + b.height / 2;
    const radiusX = b.width * 0.34 + a.width / 2;
    const radiusY = b.height * 0.38 + a.height / 2;
    const normalizedX = (a.x + a.width / 2 - centerX) / radiusX;
    const normalizedY = (a.y + a.height / 2 - centerY) / radiusY;
    return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
  }
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function reflectFromPaddle(vx, vy, angle) {
  const radians = angle * Math.PI / 180;
  const normalX = Math.sin(radians);
  const normalY = -Math.cos(radians);
  const speedAlongNormal = vx * normalX + vy * normalY;

  return {
    vx: vx - 2 * speedAlongNormal * normalX,
    vy: vy - 2 * speedAlongNormal * normalY
  };
}


// The ball bounces off the left, right, and top walls.
// (The bottom is not a wall: falling off the bottom costs a life.)
function bounceOffWalls(activeBall) {
  if (activeBall.x < 0) {
    activeBall.x = 0;
    activeBall.vx = -activeBall.vx;
  }
  if (activeBall.x + activeBall.width > WIDTH) {
    activeBall.x = WIDTH - activeBall.width;
    activeBall.vx = -activeBall.vx;
  }
  if (activeBall.y < 0) {
    activeBall.y = 0;
    activeBall.vy = -activeBall.vy;
  }
}


// Collide against a paddle's rotated top face and reflect the ball
// across that face's normal, matching the paddle's visible angle.
function bounceOffPaddle(activeBall, targetPaddle = paddle) {
  const radians = (targetPaddle.angle || 0) * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const radius = activeBall.width / 2;
  const paddleCenterX = targetPaddle.x + targetPaddle.width / 2;
  const paddleCenterY = targetPaddle.y + targetPaddle.height / 2;
  const previousPaddleCenterX = (targetPaddle.previousX === undefined ? targetPaddle.x : targetPaddle.previousX) + targetPaddle.width / 2;
  const previousPaddleCenterY = (targetPaddle.previousY === undefined ? targetPaddle.y : targetPaddle.previousY) + targetPaddle.height / 2;
  const previousRadians = (targetPaddle.previousAngle === undefined ? targetPaddle.angle || 0 : targetPaddle.previousAngle) * Math.PI / 180;
  const previousCos = Math.cos(previousRadians);
  const previousSin = Math.sin(previousRadians);
  const centerX = activeBall.x + radius;
  const centerY = activeBall.y + radius;
  const previousWorldX = (activeBall.previousX === undefined ? activeBall.x - activeBall.vx : activeBall.previousX) + radius - previousPaddleCenterX;
  const previousWorldY = (activeBall.previousY === undefined ? activeBall.y - activeBall.vy : activeBall.previousY) + radius - previousPaddleCenterY;
  const dx = centerX - paddleCenterX;
  const dy = centerY - paddleCenterY;
  const previousLocalX = previousWorldX * previousCos + previousWorldY * previousSin;
  const previousLocalY = -previousWorldX * previousSin + previousWorldY * previousCos;
  const localX = dx * cos + dy * sin;
  const localY = -dx * sin + dy * cos;
  const deltaX = localX - previousLocalX;
  const deltaY = localY - previousLocalY;
  const halfWidth = targetPaddle.width / 2 + radius;
  const halfHeight = targetPaddle.height / 2 + radius;
  let entryTime = 0;
  let exitTime = 1;
  let normalLocalX = 0;
  let normalLocalY = 0;

  for (const axis of [
    { previous: previousLocalX, delta: deltaX, extent: halfWidth, x: true },
    { previous: previousLocalY, delta: deltaY, extent: halfHeight, x: false }
  ]) {
    if (Math.abs(axis.delta) < 1e-8) {
      if (axis.previous < -axis.extent || axis.previous > axis.extent) return false;
      continue;
    }

    const nearTime = (-axis.extent - axis.previous) / axis.delta;
    const farTime = (axis.extent - axis.previous) / axis.delta;
    const axisEntry = Math.min(nearTime, farTime);
    const axisExit = Math.max(nearTime, farTime);
    if (axisEntry > entryTime) {
      entryTime = axisEntry;
      const normal = axis.delta > 0 ? -1 : 1;
      normalLocalX = axis.x ? normal : 0;
      normalLocalY = axis.x ? 0 : normal;
    }
    exitTime = Math.min(exitTime, axisExit);
  }

  if (entryTime < 0 || entryTime > 1 || entryTime > exitTime) return false;

  const normalX = normalLocalX * cos - normalLocalY * sin;
  const normalY = normalLocalX * sin + normalLocalY * cos;
  const speedAlongNormal = activeBall.vx * normalX + activeBall.vy * normalY;
  if (speedAlongNormal >= 0) return false;

  const impactX = previousLocalX + deltaX * entryTime;
  const impactY = previousLocalY + deltaY * entryTime;
  const impactWorldX = paddleCenterX + impactX * cos - impactY * sin;
  const impactWorldY = paddleCenterY + impactX * sin + impactY * cos;
  const reflected = {
    vx: activeBall.vx - 2 * speedAlongNormal * normalX,
    vy: activeBall.vy - 2 * speedAlongNormal * normalY
  };
  const reflectedSpeed = Math.hypot(reflected.vx, reflected.vy);

  activeBall.x = impactWorldX - radius + normalX * 0.5;
  activeBall.y = impactWorldY - radius + normalY * 0.5;
  activeBall.vx = reflected.vx * BALL_SPEED / reflectedSpeed;
  activeBall.vy = reflected.vy * BALL_SPEED / reflectedSpeed;
  activeBall.previousX = activeBall.x;
  activeBall.previousY = activeBall.y;
  return true;
}

function breakBrickAt(index, activeBall, triggerNeighbors = true) {
  const brick = bricks[index];
  if (!brick || brick.isKill || brick.hidden) return;
  triggerBrickBreak(brick);
  if (brick.type !== "boss") dropPowerUp(brick);
  brickHitStreak++;
  const scoreMultiplier = activeBall.perfect ? 2 : 1;
  activeBall.perfect = false;
  mola += 10 * brickHitStreak * scoreMultiplier;
  recordHighScore();
  playBrickSound();
  if (brickHitStreak > 1) {
    comboNotice = { text: "x" + brickHitStreak + " COMBO", timer: 36 };
  }
  if (brickHitStreak >= MULTIBALL_HIT_STREAK) {
    brickHitStreak = 0;
    spawnExtraBall(activeBall);
  }

  if (brick.type === "boss") {
    brick.hp--;
    if (brick.hp > 0 && brick.hp % 3 === 0) dropBossKillbrick(brick);
    if (brick.hp > 0) return;
    dropPowerUp(brick);
  }

  if (brick.type === "regenerating") {
    brick.hidden = true;
    brick.respawnAt = simulationFrame + 480;
    brick.hp = brick.maxHp || 1;
    brick.damaged = false;
  } else {
    bricks.splice(index, 1);
  }

  if (triggerNeighbors && brick.type === "explosive") {
    const centerX = brick.x + brick.width / 2;
    const centerY = brick.y + brick.height / 2;
    const neighbors = [];
    for (let neighborIndex = 0; neighborIndex < bricks.length; neighborIndex++) {
      const neighbor = bricks[neighborIndex];
      if (neighbor.isKill || neighbor.hidden) continue;
      const dx = Math.abs(neighbor.x + neighbor.width / 2 - centerX);
      const dy = Math.abs(neighbor.y + neighbor.height / 2 - centerY);
      if (dx <= brick.width + 8 && dy <= brick.height + 8 && (dx > 0 || dy > 0)) {
        neighbors.push(neighbor);
      }
    }
    for (const neighbor of neighbors) {
      const neighborIndex = bricks.indexOf(neighbor);
      if (neighborIndex >= 0) breakBrickAt(neighborIndex, activeBall, false);
    }
  }
}

function bounceOffBricks(activeBall) {
  for (let i = 0; i < bricks.length; i++) {
    const brick = bricks[i];

    if (brick.hidden || !boxesTouch(activeBall, brick)) {
      continue;
    }

    if (brick.isKill) {
      if (activeBall === ball) {
        loseLife();
        return true;
      }
      extraBalls = extraBalls.filter(function (extraBall) {
        return extraBall !== activeBall;
      });
      return false;
    }

    const overlapX = Math.min(activeBall.x + activeBall.width, brick.x + brick.width) - Math.max(activeBall.x, brick.x);
    const overlapY = Math.min(activeBall.y + activeBall.height, brick.y + brick.height) - Math.max(activeBall.y, brick.y);

    if (overlapX < overlapY) {
      activeBall.vx = -activeBall.vx;
      if (activeBall.x < brick.x) {
        activeBall.x = brick.x - activeBall.width;
      } else {
        activeBall.x = brick.x + brick.width;
      }
    } else {
      activeBall.vy = -activeBall.vy;
      if (activeBall.y < brick.y) {
        activeBall.y = brick.y - activeBall.height;
      } else {
        activeBall.y = brick.y + brick.height;
      }
    }

    if (brick.type === "armored" && brick.hp > 1) {
      brick.hp--;
      brick.damaged = true;
      break;
    }
    breakBrickAt(i, activeBall);
    break;
  }
}

function projectToPaddle(source, sourceBricks, targetPaddleY = paddle.y) {
  const projectedBall = {
    x: source.x,
    y: source.y,
    width: source.width,
    height: source.height,
    vx: source.vx,
    vy: source.vy
  };
  const projectedBricks = sourceBricks.map(function (brick) {
    return Object.assign({}, brick);
  });

  for (let step = 0; step < 500; step++) {
    projectedBall.x += projectedBall.vx;
    projectedBall.y += projectedBall.vy;

    for (const brick of projectedBricks) {
      if (brick.type === "moving") {
        brick.x = brick.originX + Math.sin((simulationFrame + step) * 0.035 + brick.movePhase) * brick.moveAmplitude;
      } else if (brick.type === "sweeper") {
        brick.x = brick.originX + Math.sin((simulationFrame + step) * 0.028 + brick.movePhase) * brick.moveAmplitude;
      } else if (brick.type === "boss") {
        brick.x = brick.originX + Math.sin((simulationFrame + step) * 0.022 + brick.movePhase) * brick.moveAmplitude;
        brick.y = brick.originY + Math.sin((simulationFrame + step) * 0.037 + brick.movePhase) * 7;
      }
    }

    if (projectedBall.x < 0 || projectedBall.x + projectedBall.width > WIDTH) {
      projectedBall.vx = -projectedBall.vx;
      projectedBall.x = Math.max(0, Math.min(WIDTH - projectedBall.width, projectedBall.x));
    }
    if (projectedBall.y < 0) {
      projectedBall.y = 0;
      projectedBall.vy = Math.abs(projectedBall.vy);
    }

    let hit = false;
    for (let i = 0; i < projectedBricks.length; i++) {
      const brick = projectedBricks[i];
      if (brick.hidden) continue;
      if (!boxesTouch(projectedBall, brick)) continue;
      if (brick.isKill) {
        return {
          x: WIDTH / 2,
          vx: BALL_SPEED,
          vy: BALL_SPEED,
          hazard: true,
          steps: step + 1
        };
      }

      const overlapX = Math.min(projectedBall.x + projectedBall.width, brick.x + brick.width) - Math.max(projectedBall.x, brick.x);
      const overlapY = Math.min(projectedBall.y + projectedBall.height, brick.y + brick.height) - Math.max(projectedBall.y, brick.y);
      if (overlapX < overlapY) {
        projectedBall.vx = -projectedBall.vx;
        projectedBall.x = projectedBall.x < brick.x ? brick.x - projectedBall.width : brick.x + brick.width;
      } else {
        projectedBall.vy = -projectedBall.vy;
        projectedBall.y = projectedBall.y < brick.y ? brick.y - projectedBall.height : brick.y + brick.height;
      }
      if ((brick.type === "boss" || brick.type === "armored") && (brick.hp || 1) > 1) {
        brick.hp--;
      } else {
        projectedBricks.splice(i, 1);
      }
      hit = true;
      break;
    }

    if (hit) continue;
    if (projectedBall.vy > 0 && projectedBall.y + projectedBall.height >= targetPaddleY) {
      return {
        x: projectedBall.x + projectedBall.width / 2,
        vx: projectedBall.vx,
        vy: projectedBall.vy,
        hazard: false,
        steps: step + 1
      };
    }
  }

  return { x: WIDTH / 2, vx: source.vx, vy: source.vy, hazard: false, steps: 500 };
}

function scoreAutoShot(startX, angle, incomingVX, incomingVY) {
  const reflected = reflectFromPaddle(incomingVX, incomingVY, angle);
  const reflectedSpeed = Math.hypot(reflected.vx, reflected.vy);
  const shotBall = {
    x: startX - ball.width / 2,
    y: paddle.y - ball.height - 1,
    width: ball.width,
    height: ball.height,
    vx: reflected.vx * BALL_SPEED / reflectedSpeed,
    vy: reflected.vy * BALL_SPEED / reflectedSpeed
  };
  if (shotBall.vy >= 0) return -1000;
  const remaining = bricks.map(function (brick) {
    return Object.assign({}, brick);
  });
  let broken = 0;
  let extraThreat = 0;

  for (let step = 0; step < 180; step++) {
    shotBall.x += shotBall.vx;
    shotBall.y += shotBall.vy;
    if (shotBall.x < 0 || shotBall.x + shotBall.width > WIDTH) {
      shotBall.vx = -shotBall.vx;
      shotBall.x = Math.max(0, Math.min(WIDTH - shotBall.width, shotBall.x));
    }
    if (shotBall.y < 0) {
      shotBall.y = 0;
      shotBall.vy = Math.abs(shotBall.vy);
    }

    extraThreat = extraBalls.reduce(function (total, extraBall) {
      const ballCenterX = extraBall.x + extraBall.width / 2;
      const ballCenterY = extraBall.y + extraBall.height / 2;
      if (ballCenterY < paddle.y) {
        return total - Math.abs(ballCenterX - startX) * 0.25;
      }
      return total - Math.max(0, HEIGHT - ballCenterY) * 0.05;
    }, 0);

    for (let i = 0; i < remaining.length; i++) {
      const brick = remaining[i];
      if (brick.hidden) continue;
      if (!boxesTouch(shotBall, brick)) continue;
      if (brick.isKill) return broken * 10 - 100;

      const overlapX = Math.min(shotBall.x + shotBall.width, brick.x + brick.width) - Math.max(shotBall.x, brick.x);
      const overlapY = Math.min(shotBall.y + shotBall.height, brick.y + brick.height) - Math.max(shotBall.y, brick.y);
      if (overlapX < overlapY) {
        shotBall.vx = -shotBall.vx;
        shotBall.x = shotBall.x < brick.x ? brick.x - shotBall.width : brick.x + brick.width;
      } else {
        shotBall.vy = -shotBall.vy;
        shotBall.y = shotBall.y < brick.y ? brick.y - shotBall.height : brick.y + brick.height;
      }
      remaining.splice(i, 1);
      broken++;
      break;
    }
  }

  return broken * 10 + extraThreat;
}

function planAutoPlay() {
  const projections = [ball].concat(extraBalls).map(function (activeBall) {
    return { activeBall: activeBall, landing: projectToPaddle(activeBall, bricks) };
  });
  const whiteProjection = projections.find(function (entry) { return entry.activeBall === ball; });
  const greenProjection = projections.filter(function (entry) { return entry.activeBall !== ball; })
    .reduce(function (soonest, candidate) {
      return !soonest || candidate.landing.steps < soonest.landing.steps ? candidate : soonest;
    }, null);
  let chosenProjection = whiteProjection;
  const whiteFramesAfterGreen = greenProjection
    ? whiteProjection.landing.steps - greenProjection.landing.steps
    : -1;
  const canCatchGreenSafely = greenProjection &&
    !greenProjection.landing.hazard &&
    !whiteProjection.landing.hazard &&
    greenProjection.landing.steps + 12 < whiteProjection.landing.steps &&
    Math.abs(greenProjection.landing.x - (paddle.x + paddle.width / 2)) <=
      paddle.speed * greenProjection.landing.steps + paddle.width / 2 &&
    Math.abs(whiteProjection.landing.x - greenProjection.landing.x) <=
      paddle.speed * whiteFramesAfterGreen + paddle.width / 2;
  if (canCatchGreenSafely) {
    chosenProjection = greenProjection;
  }
  const projection = chosenProjection.landing;
  const targetX = Math.max(paddle.width / 2, Math.min(WIDTH - paddle.width / 2, projection.x));
  const targetFrames = projection.steps;
  let powerUpTarget = null;

  for (const powerUp of powerUps) {
    const framesToCatch = (paddle.y - powerUp.y - powerUp.height) / powerUp.speed;
    if (framesToCatch <= 0 || framesToCatch >= targetFrames - 8) continue;
    const powerUpX = powerUp.x + powerUp.width / 2;
    const paddleCenterX = paddle.x + paddle.width / 2;
    if (Math.abs(powerUpX - paddleCenterX) > paddle.speed * framesToCatch + paddle.width / 2) continue;
    if (framesToCatch >= whiteProjection.landing.steps - 8 ||
        Math.abs(whiteProjection.landing.x - powerUpX) >
          paddle.speed * (whiteProjection.landing.steps - framesToCatch) + paddle.width / 2) continue;
    if (!powerUpTarget || framesToCatch < powerUpTarget.frames) {
      powerUpTarget = { x: powerUpX, frames: framesToCatch };
    }
  }

  const catchX = powerUpTarget
    ? Math.max(paddle.width / 2, Math.min(WIDTH - paddle.width / 2, powerUpTarget.x))
    : targetX;
  let bestAngle = 0;
  let bestScore = -Infinity;

  for (let angle = -MAX_PADDLE_TILT; angle <= MAX_PADDLE_TILT; angle += 5) {
    const score = scoreAutoShot(catchX, angle, projection.vx, projection.vy);
    if (score > bestScore) {
      bestScore = score;
      bestAngle = angle;
    }
  }

  return {
    x: catchX,
    angle: bestAngle
  };
}
