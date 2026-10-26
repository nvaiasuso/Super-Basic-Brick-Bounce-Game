// ============================================================
// bricks.js: where the bricks are, and how they are drawn
// ============================================================

const BRICK_COLUMNS = 8;
const BRICK_WIDTH = 58;
const BRICK_HEIGHT = 20;
const BRICK_GAP = 8;
const BRICKS_TOP = 62;
const BOSS_VARIANTS = [
  { name: "BROOD QUEEN", palette: ["#ff758f", "#9b4dff", "#32105e"], damagedPalette: ["#ffb000", "#f43f5e", "#7f1d1d"], glow: "#bb66ff", eyes: "#62f5ff", damagedEyes: "#fff176", minionInterval: 240, minionLimit: 2 },
  { name: "IRON WARDEN", palette: ["#94a3b8", "#475569", "#111827"], damagedPalette: ["#facc15", "#dc2626", "#450a0a"], glow: "#38bdf8", eyes: "#a7f3d0", damagedEyes: "#fff176", minionInterval: 300, minionLimit: 1 },
  { name: "VOID SERPENT", palette: ["#2dd4bf", "#0e7490", "#082f49"], damagedPalette: ["#fb7185", "#7c3aed", "#2e1065"], glow: "#5eead4", eyes: "#fef08a", damagedEyes: "#fff176", minionInterval: 210, minionLimit: 2 },
  { name: "FROST ENGINE", palette: ["#bae6fd", "#2563eb", "#172554"], damagedPalette: ["#f97316", "#dc2626", "#431407"], glow: "#60a5fa", eyes: "#ffffff", damagedEyes: "#fff176", minionInterval: 270, minionLimit: 2 },
  { name: "NEXUS PRIME", palette: ["#f0abfc", "#db2777", "#500724"], damagedPalette: ["#fde047", "#ea580c", "#431407"], glow: "#f472b6", eyes: "#86efac", damagedEyes: "#fff176", minionInterval: 180, minionLimit: 2 }
];

const LEVEL_LAYOUTS = [
  [
    "########",
    "########",
    "########",
    "........"
  ],
  [
    ".##..##.",
    "########",
    "########",
    ".######.",
    "..####..",
    "...##..."
  ],
  [
    "..####..",
    ".######.",
    "##.##.##",
    "########",
    ".######.",
    "..#..#.."
  ],
  [
    "..#..#..",
    "...##...",
    ".######.",
    "##.##.##",
    "########",
    "#.#..#.#"
  ],
  [
    "########",
    "......##",
    "####..##",
    "##....##",
    "##.#####",
    "##......"
  ],
  [
    "X##..##X",
    "########",
    "########",
    ".######.",
    "..####..",
    "...XX..."
  ],
  [
    "..####..",
    ".######.",
    "##.XX.##",
    "########",
    ".######.",
    "..#..#.."
  ],
  [
    "X.####.X",
    "########",
    "##.XX.##",
    "########",
    "X######X",
    "..#XX#.."
  ],
  [
    "X######X",
    "##.XX.##",
    "########",
    "X##..##X",
    "########",
    "...XX..."
  ],
  [],
  [
    "X##..##X",
    "########",
    "##X..X##",
    "########",
    ".######.",
    "..####.."
  ],
  [
    "#.#..#.#",
    "########",
    ".##XX##.",
    "########",
    "##....##",
    "X......X"
  ],
  [
    "X#######",
    "##X##X##",
    "########",
    ".##XX##.",
    "########",
    "#######X"
  ],
  [
    "##X##X##",
    "########",
    "X##..##X",
    "########",
    "..####..",
    "X##XX##X"
  ],
  [
    "X#X##X#X",
    "########",
    "##X##X##",
    "########",
    "X######X",
    "##X##X##"
  ],
  [
    "X#X##X#X",
    "########",
    "##.XX.##",
    "########",
    "X######X",
    "#X####X#"
  ],
  [
    "##X##X##",
    "########",
    "X##XX##X",
    "########",
    "##....##",
    "X######X"
  ],
  [
    "X######X",
    "##X##X##",
    "########",
    "X##XX##X",
    "########",
    "##X##X##"
  ],
  [
    "#X####X#",
    "########",
    "XX####XX",
    "########",
    "##X##X##",
    "X######X"
  ],
  [
    "X#X##X#X",
    "##X##X##",
    "########",
    "X##XX##X",
    "########",
    "##X##X##"
  ],
  [
    "X#X##X#X",
    "########",
    "##XX..##",
    "##..XX##",
    "########",
    "X######X"
  ],
  [
    "X#X##X#X",
    "########",
    "X##XX##X",
    "########",
    "##X##X##",
    "X######X"
  ],
  [
    "##X##X##",
    "########",
    "X##XX##X",
    "##....##",
    "########",
    "X#X##X#X"
  ],
  [
    "X######X",
    "##X##X##",
    "########",
    "X#X##X#X",
    "########",
    "##XX..##"
  ],
  [
    "X#X##X#X",
    "########",
    "##XX##X#",
    "#X##XX##",
    "########",
    "X######X"
  ],
  [
    "##X##X##",
    "X######X",
    "########",
    "X##XX##X",
    "########",
    "##X##X##"
  ],
  [
    "X#X##X#X",
    "########",
    "XX####XX",
    "##X##X##",
    "########",
    "X#X##X#X"
  ],
  [
    "##X##X##",
    "X######X",
    "########",
    "##XX..##",
    "##..XX##",
    "X######X"
  ],
  [
    "X######X",
    "########",
    "#X####X#",
    "##X##X##",
    "########",
    "X##XX##X"
  ],
  [
    "X#X##X#X",
    "##X##X##",
    "########",
    "X##XX##X",
    "########",
    "##X##X##"
  ],
  [
    "XX####XX",
    "########",
    "X##XX##X",
    "##X##X##",
    "########",
    "X#X##X#X"
  ],
  [
    "X#X##X#X",
    "########",
    "XX##XX##",
    "##XX##XX",
    "########",
    "X#X##X#X"
  ],
  [
    "X##X##XX",
    "########",
    "##X##X##",
    "X##XX##X",
    "########",
    "XX##X##X"
  ],
  [
    "X##XX##X",
    "########",
    "##X##X##",
    "########",
    "X#X##X#X",
    "##XX..##"
  ],
  [
    "XX####XX",
    "##X##X##",
    "########",
    "X##XX##X",
    "########",
    "X#X##X#X"
  ],
  [
    "X#X##X#X",
    "########",
    "##XX##X#",
    "#X##XX##",
    "########",
    "XX####XX"
  ],
  [
    "XX#XX#XX",
    "########",
    "X##XX##X",
    "##X##X##",
    "########",
    "X#X##X#X"
  ],
  [
    "X#X##X#X",
    "##X##X##",
    "########",
    "XX####XX",
    "##X##X##",
    "X##XX##X"
  ],
  [
    "XX#XX#XX",
    "########",
    "##X##X##",
    "X##XX##X",
    "########",
    "X#X##X#X"
  ]
];

for (let level = LEVEL_LAYOUTS.length; level < LEVEL_COUNT; level++) {
  const layout = [];
  for (let row = 0; row < 6; row++) {
    let line = "";
    for (let col = 0; col < BRICK_COLUMNS; col++) {
      const pattern = (row * 13 + col * 7 + level * 5) % 12;
      line += pattern < 2 ? "." : pattern === 2 || pattern === 8 ? "X" : pattern === 10 ? "H" : "#";
    }
    layout.push(line);
  }
  LEVEL_LAYOUTS.push(layout);
}

const BRICK_ROW_COLORS = ["#ff6464", "#ffad55", "#ffe66d", "#75df88", "#54c8ff", "#b28dff"];

// # bricks are breakable; X bricks are lethal; H bricks are moving hazards; . is empty.
function makeBricks(level) {
  const list = [];
  if (level === 9 || level === 15 || level === 21 || level === 27 || level === LEVEL_COUNT - 1) {
    const bossLevels = [9, 15, 21, 27, LEVEL_COUNT - 1];
    const variant = BOSS_VARIANTS[bossLevels.indexOf(level)];
    const bossHealth = 40 + Math.max(0, level - 9) * 5;
    const bossWidth = 320;
    const bossHeight = 140;
    return [{
      x: (WIDTH - bossWidth) / 2,
      y: 82,
      originX: (WIDTH - bossWidth) / 2,
      originY: 82,
      moveAmplitude: 112,
      movePhase: level * 0.7,
      width: bossWidth,
      height: bossHeight,
      type: "boss",
      bossName: variant.name,
      palette: variant.palette,
      damagedPalette: variant.damagedPalette,
      glow: variant.glow,
      eyes: variant.eyes,
      damagedEyes: variant.damagedEyes,
      minionInterval: variant.minionInterval,
      minionLimit: variant.minionLimit,
      minionTimer: variant.minionInterval,
      hp: bossHealth,
      maxHp: bossHealth,
      color: "#ff4f6d",
      isKill: false
    }];
  }
  const layout = LEVEL_LAYOUTS[level];
  const totalWidth = BRICK_COLUMNS * BRICK_WIDTH + (BRICK_COLUMNS - 1) * BRICK_GAP;
  const left = (WIDTH - totalWidth) / 2;

  for (let row = 0; row < layout.length; row++) {
    for (let col = 0; col < layout[row].length; col++) {
      const type = layout[row][col];
      if (type !== ".") {
        const brick = {
          x: left + col * (BRICK_WIDTH + BRICK_GAP),
          y: BRICKS_TOP + row * (BRICK_HEIGHT + BRICK_GAP),
          width: BRICK_WIDTH,
          height: BRICK_HEIGHT,
          isKill: type === "X" || type === "H",
          type: type === "H" ? "sweeper" : type === "X" ? "kill" : "normal",
          color: type === "X" || type === "H" ? "#ffffff" : BRICK_ROW_COLORS[row % BRICK_ROW_COLORS.length]
        };
        if (brick.type === "sweeper") {
          brick.originX = brick.x;
          brick.moveAmplitude = Math.min(70, 36 + level);
          brick.movePhase = (row + col) * 0.8;
        }
        if (!brick.isKill && level >= 2) {
          const variant = (row * 7 + col * 11 + level * 3) % 17;
          if (variant < 2) {
            brick.type = "armored";
            brick.hp = 2 + ((row + col) % 2);
            brick.maxHp = brick.hp;
            brick.color = "#9292a0";
          } else if (variant < 4) {
            brick.type = "explosive";
            brick.color = "#ff8b45";
          } else if (variant < 6) {
            brick.type = "moving";
            brick.originX = brick.x;
            brick.moveAmplitude = 14;
            brick.movePhase = (row + col) * 0.7;
            brick.color = "#69d8c4";
          } else if (variant < 8) {
            brick.type = "regenerating";
            brick.color = "#a986ef";
          }
        }
        list.push(brick);
      }
    }
  }

  return list;
}

// Draws every brick in the list.
function drawBricks() {
  for (const brick of bricks) {
    if (brick.hidden) continue;
    if (brick.isKill ? !adminVisibility.enemies : !adminVisibility.blocks) continue;
    if (brick.type === "boss") {
      drawBoss(brick);
      continue;
    }
    ctx.fillStyle = brick.type === "sweeper" ? "#ff4f6d" : brick.isKill ? "white" : brick.color || "black";
    if (brick.type === "armored" && brick.damaged) ctx.fillStyle = "#555563";
    ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
    ctx.strokeStyle = brick.isKill ? "black" : "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 2;
    ctx.strokeRect(brick.x + 1, brick.y + 1, brick.width - 2, brick.height - 2);
    if (!brick.isKill) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(brick.x + 2, brick.y + 1);
      ctx.lineTo(brick.x + brick.width - 2, brick.y + 1);
      ctx.stroke();
    }

    if (brick.type === "armored") {
      ctx.fillStyle = "#111";
      ctx.textAlign = "center";
      ctx.font = "bold 10px Courier New";
      ctx.fillText(String(brick.hp), brick.x + brick.width / 2, brick.y + brick.height / 2 + 3);
    } else if (brick.type === "explosive") {
      ctx.fillStyle = "#1b1010";
      ctx.textAlign = "center";
      ctx.font = "bold 12px Courier New";
      ctx.fillText("*", brick.x + brick.width / 2, brick.y + brick.height / 2 + 4);
    }

    if (brick.isKill) {
      ctx.beginPath();
      ctx.moveTo(brick.x + 8, brick.y + brick.height - 5);
      ctx.lineTo(brick.x + brick.width - 8, brick.y + 5);
      ctx.moveTo(brick.x + brick.width / 2 - 4, brick.y + brick.height - 5);
      ctx.lineTo(brick.x + brick.width / 2 + 4, brick.y + 5);
      ctx.stroke();
    }
  }

  function drawBoss(boss) {
    const phase = boss.hp <= boss.maxHp / 2;
    const centerX = boss.x + boss.width / 2;
    const pulse = Math.sin(simulationFrame * 0.12);
    const bob = Math.sin(simulationFrame * 0.045) * 3;
    const top = boss.y + bob;
    const left = boss.x;
    const right = boss.x + boss.width;
    const height = boss.height;
    const gradient = ctx.createLinearGradient(left, top, right, top + height);
    const colors = phase ? boss.damagedPalette : boss.palette;
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(0.5, colors[1]);
    gradient.addColorStop(1, colors[2]);

    ctx.save();
    ctx.translate(0, Math.sin(simulationFrame * 0.07) * 2);
    ctx.shadowColor = phase ? boss.damagedPalette[0] : boss.glow;
    ctx.shadowBlur = phase ? 24 : 16;
    ctx.fillStyle = gradient;
    ctx.strokeStyle = phase ? boss.damagedEyes : boss.eyes;
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(left + 26, top + 50);
    ctx.lineTo(left - 10, top + 68 + pulse * 5);
    ctx.lineTo(left + 42, top + 82);
    ctx.lineTo(left + 34, top + 112);
    ctx.lineTo(left + 85, top + 94);
    ctx.lineTo(left + 94, top + 72);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(right - 26, top + 50);
    ctx.lineTo(right + 10, top + 68 - pulse * 5);
    ctx.lineTo(right - 42, top + 82);
    ctx.lineTo(right - 34, top + 112);
    ctx.lineTo(right - 85, top + 94);
    ctx.lineTo(right - 94, top + 72);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX - 85, top + 50);
    ctx.lineTo(centerX - 76, top + 22);
    ctx.lineTo(centerX - 50, top + 34);
    ctx.lineTo(centerX - 30, top + 14);
    ctx.lineTo(centerX, top + 30);
    ctx.lineTo(centerX + 30, top + 14);
    ctx.lineTo(centerX + 50, top + 34);
    ctx.lineTo(centerX + 76, top + 22);
    ctx.lineTo(centerX + 85, top + 50);
    ctx.lineTo(centerX + 74, top + 91);
    ctx.lineTo(centerX + 49, top + 114);
    ctx.lineTo(centerX, top + 126);
    ctx.lineTo(centerX - 49, top + 114);
    ctx.lineTo(centerX - 74, top + 91);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#160b24";
    ctx.beginPath();
    ctx.ellipse(centerX, top + 70, 62, 36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = phase ? boss.damagedEyes : boss.eyes;
    ctx.beginPath();
    ctx.ellipse(centerX - 30, top + 62, 13, 9, -0.2, 0, Math.PI * 2);
    ctx.ellipse(centerX + 30, top + 62, 13, 9, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(centerX - 34, top + 91);
    ctx.lineTo(centerX + 34, top + 91);
    ctx.lineTo(centerX + 22, top + 105);
    ctx.lineTo(centerX, top + 98);
    ctx.lineTo(centerX - 22, top + 105);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "bold 12px Courier New";
    ctx.fillText(phase ? "VOID WARDEN // ENRAGED" : "VOID WARDEN", centerX, top + 119);

    const barWidth = boss.width * 0.74;
    const barX = centerX - barWidth / 2;
    const barY = top + height + 12;
    ctx.fillStyle = "#220b12";
    ctx.fillRect(barX, barY, barWidth, 9);
    ctx.fillStyle = phase ? "#ffb000" : "#ff365b";
    ctx.fillRect(barX, barY, barWidth * Math.max(0, boss.hp / boss.maxHp), 9);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, 9);
    ctx.restore();
  }
}
