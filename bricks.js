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
  { name: "NEXUS PRIME", palette: ["#f0abfc", "#db2777", "#500724"], damagedPalette: ["#fde047", "#ea580c", "#431407"], glow: "#f472b6", eyes: "#86efac", damagedEyes: "#fff176", minionInterval: 180, minionLimit: 2 },
  { name: "TEMPEST CORE", palette: ["#67e8f9", "#2563eb", "#172554"], damagedPalette: ["#facc15", "#ea580c", "#431407"], glow: "#22d3ee", eyes: "#fef08a", damagedEyes: "#fff176", minionInterval: 165, minionLimit: 3 },
  { name: "EMBER TITAN", palette: ["#fdba74", "#ea580c", "#431407"], damagedPalette: ["#fef08a", "#dc2626", "#450a0a"], glow: "#fb923c", eyes: "#fef3c7", damagedEyes: "#fff176", minionInterval: 150, minionLimit: 3 },
  { name: "AURORA WRAITH", palette: ["#a5f3fc", "#6366f1", "#312e81"], damagedPalette: ["#fef08a", "#ec4899", "#500724"], glow: "#67e8f9", eyes: "#f8fafc", damagedEyes: "#fef08a", minionInterval: 145, minionLimit: 3 },
  { name: "MACHINE HEART", palette: ["#a3e635", "#15803d", "#052e16"], damagedPalette: ["#fde047", "#ea580c", "#431407"], glow: "#84cc16", eyes: "#bae6fd", damagedEyes: "#fff176", minionInterval: 135, minionLimit: 3 },
  { name: "STAR FORGE", palette: ["#f0abfc", "#7c3aed", "#2e1065"], damagedPalette: ["#fde68a", "#f43f5e", "#7f1d1d"], glow: "#c084fc", eyes: "#67e8f9", damagedEyes: "#fff176", minionInterval: 125, minionLimit: 4 },
  { name: "DEEP CURRENT", palette: ["#5eead4", "#0369a1", "#082f49"], damagedPalette: ["#fb7185", "#c026d3", "#4a044e"], glow: "#2dd4bf", eyes: "#fef08a", damagedEyes: "#fff176", minionInterval: 115, minionLimit: 4 },
  { name: "BINARY REGENT", palette: ["#67e8f9", "#155e75", "#082f49"], damagedPalette: ["#facc15", "#b91c1c", "#450a0a"], glow: "#22d3ee", eyes: "#a7f3d0", damagedEyes: "#fff176", minionInterval: 108, minionLimit: 5 },
  { name: "CROWN OF ASH", palette: ["#fda4af", "#9f1239", "#4c0519"], damagedPalette: ["#fde68a", "#ea580c", "#431407"], glow: "#fb7185", eyes: "#fff7ed", damagedEyes: "#fef08a", minionInterval: 98, minionLimit: 5 },
  { name: "ORBITAL MAW", palette: ["#c4b5fd", "#4338ca", "#1e1b4b"], damagedPalette: ["#5eead4", "#be123c", "#500724"], glow: "#818cf8", eyes: "#fef08a", damagedEyes: "#fff176", minionInterval: 90, minionLimit: 6 },
  { name: "GLASS CATHEDRAL", palette: ["#a5f3fc", "#0e7490", "#082f49"], damagedPalette: ["#fda4af", "#be123c", "#4c0519"], glow: "#67e8f9", eyes: "#fff7ed", damagedEyes: "#fef08a", minionInterval: 170, minionLimit: 3 },
  { name: "CLOCKWORK HYDRA", palette: ["#fbbf24", "#b45309", "#451a03"], damagedPalette: ["#a3e635", "#166534", "#052e16"], glow: "#facc15", eyes: "#bae6fd", damagedEyes: "#f0abfc", minionInterval: 125, minionLimit: 4 },
  { name: "ABYSSAL CROWN", palette: ["#818cf8", "#312e81", "#0f172a"], damagedPalette: ["#fb7185", "#9f1239", "#4c0519"], glow: "#a78bfa", eyes: "#67e8f9", damagedEyes: "#fde047", minionInterval: 105, minionLimit: 5 },
  { name: "PRISMATIC REGENT", palette: ["#f0abfc", "#0891b2", "#172554"], damagedPalette: ["#fef08a", "#c026d3", "#500724"], glow: "#67e8f9", eyes: "#fff7ed", damagedEyes: "#facc15", minionInterval: 145, minionLimit: 4 },
  { name: "MOLTEN ARCHIVIST", palette: ["#fb923c", "#b91c1c", "#431407"], damagedPalette: ["#fde047", "#7f1d1d", "#1c1917"], glow: "#f97316", eyes: "#fef3c7", damagedEyes: "#67e8f9", minionInterval: 118, minionLimit: 5 },
  { name: "STORM WIDOW", palette: ["#a3e635", "#0e7490", "#082f49"], damagedPalette: ["#fda4af", "#be123c", "#4c0519"], glow: "#22d3ee", eyes: "#fef08a", damagedEyes: "#fff7ed", minionInterval: 96, minionLimit: 6 },
  { name: "OBSIDIAN WARDEN", palette: ["#111827", "#4b5563", "#fbbf24"], damagedPalette: ["#fca5a5", "#7f1d1d", "#111827"], glow: "#fbbf24", eyes: "#dbeafe", damagedEyes: "#fef08a", minionInterval: 88, minionLimit: 6 },
  { name: "SOLAR CHOIR", palette: ["#fef3c7", "#f59e0b", "#7c2d12"], damagedPalette: ["#fdba74", "#ef4444", "#4c0519"], glow: "#facc15", eyes: "#fff7ed", damagedEyes: "#fef08a", minionInterval: 86, minionLimit: 7 },
  { name: "VELVET MAW", palette: ["#f9a8d4", "#7e22ce", "#312e81"], damagedPalette: ["#fca5a5", "#9f1239", "#3b0764"], glow: "#e879f9", eyes: "#fef3c7", damagedEyes: "#fef08a", minionInterval: 80, minionLimit: 7 },
  { name: "ASHEN ROOK", palette: ["#d6d3d1", "#78716c", "#1f2937"], damagedPalette: ["#fdba74", "#c2410c", "#431407"], glow: "#f5f5f4", eyes: "#fef08a", damagedEyes: "#facc15", minionInterval: 76, minionLimit: 8 },
  { name: "GRIM MONOLITH", palette: ["#d1d5db", "#374151", "#0f172a"], damagedPalette: ["#fca5a5", "#991b1b", "#1f2937"], glow: "#94a3b8", eyes: "#a7f3d0", damagedEyes: "#fef08a", minionInterval: 72, minionLimit: 8 },
  { name: "ECLIPSE HALO", palette: ["#c4b5fd", "#312e81", "#020617"], damagedPalette: ["#f9a8d4", "#7e22ce", "#312e81"], glow: "#a78bfa", eyes: "#fef08a", damagedEyes: "#facc15", minionInterval: 68, minionLimit: 8 },
  { name: "TITAN BLOOM", palette: ["#86efac", "#166534", "#052e16"], damagedPalette: ["#facc15", "#ea580c", "#431407"], glow: "#4ade80", eyes: "#fef3c7", damagedEyes: "#fdba74", minionInterval: 64, minionLimit: 8 },
  { name: "IRON CHOIR", palette: ["#e2e8f0", "#475569", "#111827"], damagedPalette: ["#fca5a5", "#991b1b", "#4c0519"], glow: "#cbd5e1", eyes: "#7dd3fc", damagedEyes: "#fef08a", minionInterval: 60, minionLimit: 9 },
  { name: "BLACK BEACON", palette: ["#a1a1aa", "#111827", "#020617"], damagedPalette: ["#f9a8d4", "#be123c", "#500724"], glow: "#d4d4d8", eyes: "#7dd3fc", damagedEyes: "#fef08a", minionInterval: 56, minionLimit: 9 },
  { name: "CINDER SPIRE", palette: ["#fca5a5", "#b91c1c", "#4c0519"], damagedPalette: ["#fde68a", "#f59e0b", "#431407"], glow: "#f87171", eyes: "#fff7ed", damagedEyes: "#fef08a", minionInterval: 52, minionLimit: 10 },
  { name: "GLACIER ENGINE", palette: ["#bae6fd", "#0369a1", "#082f49"], damagedPalette: ["#fef08a", "#ea580c", "#431407"], glow: "#38bdf8", eyes: "#f8fafc", damagedEyes: "#fff7ed", minionInterval: 104, minionLimit: 5 },
  { name: "THUNDER CROWN", palette: ["#fef08a", "#ca8a04", "#422006"], damagedPalette: ["#fda4af", "#be123c", "#4c0519"], glow: "#facc15", eyes: "#67e8f9", damagedEyes: "#f0abfc", minionInterval: 92, minionLimit: 6 },
  { name: "MOSS TITAN", palette: ["#86efac", "#15803d", "#052e16"], damagedPalette: ["#fde68a", "#c2410c", "#431407"], glow: "#4ade80", eyes: "#fef08a", damagedEyes: "#fff7ed", minionInterval: 112, minionLimit: 5 }
];
const FINAL_BOSS_PHASES = ["DORMANT / HUNTING", "TENTACLED TITAN / EVOLUTION", "ADMIN CORE / TOTAL CORRUPTION"];
const BOSS_LEVELS = Array.from(
  { length: Math.ceil((LEVEL_COUNT - 10) / 6) },
  function (_, index) { return 9 + index * 6; }
).concat(LEVEL_COUNT - 1);

function finalBossPhaseForHealth(boss) {
  const healthRatio = boss.hp / boss.maxHp;
  return healthRatio > 2 / 3 ? 1 : healthRatio > 1 / 3 ? 2 : 3;
}

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
      line += pattern < 2 ? "." : pattern === 2 ? "H" : pattern === 8 ? "P" : pattern === 10 ? "C" : "#";
    }
    layout.push(line);
  }
  LEVEL_LAYOUTS.push(layout);
}

const BRICK_ROW_COLORS = ["#ff6464", "#ffad55", "#ffe66d", "#75df88", "#54c8ff", "#b28dff"];

// # bricks are breakable; X bricks are lethal; H bricks are moving hazards; . is empty.
function makeBossBrick(variantIndex, encounterLevel = level) {
  const variant = BOSS_VARIANTS[Math.max(0, Math.min(BOSS_VARIANTS.length - 1, variantIndex))];
  const healthBoost = typeof bossHealthBoost === "number" ? bossHealthBoost : 1;
  const bossHealth = Math.max(1, Math.round((24 + Math.floor(Math.max(0, encounterLevel - 9) * 2)) * healthBoost));
  const bossWidth = 320;
  const bossHeight = 140;
  return {
    x: (WIDTH - bossWidth) / 2,
    y: 82,
    originX: (WIDTH - bossWidth) / 2,
    originY: 82,
    moveAmplitude: 112,
    movePhase: encounterLevel * 0.7,
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
  };
}

function makeBricks(level) {
  const list = [];
  if (level === LEVEL_COUNT - 1) {
    const bossWidth = 430;
    const bossHeight = 220;
    return [{
      x: (WIDTH - bossWidth) / 2,
      y: 54,
      originX: (WIDTH - bossWidth) / 2,
      originY: 54,
      moveAmplitude: 32,
      movePhase: 0.8,
      width: bossWidth,
      height: bossHeight,
      type: "boss",
      bossName: "WITHER STORM",
      isFinalBoss: true,
      isWitherStorm: true,
      phase: 1,
      phaseTimer: 180,
      palette: ["#66715f", "#343b31", "#10120f"],
      damagedPalette: ["#f3a712", "#b92438", "#260b16"],
      glow: "#9bbf75",
      eyes: "#ff3b32",
      damagedEyes: "#fff176",
      minionInterval: 165,
      minionLimit: 0,
      minionTimer: 120,
      hp: 120,
      maxHp: 120,
      color: "#60704f",
      isKill: false
    }];
  }
  if (BOSS_LEVELS.includes(level)) {
    return [makeBossBrick(BOSS_LEVELS.indexOf(level), level)];
  }
  const layout = LEVEL_LAYOUTS[level];
  const totalWidth = BRICK_COLUMNS * BRICK_WIDTH + (BRICK_COLUMNS - 1) * BRICK_GAP;
  const left = (WIDTH - totalWidth) / 2;

  for (let row = 0; row < layout.length; row++) {
    for (let col = 0; col < layout[row].length; col++) {
      const marker = layout[row][col];
      if (marker !== ".") {
        const type = marker === "H" ? "sweeper" : marker === "P" ? "prism" : marker === "C" ? "crystal" : marker === "R" ? "command" : "normal";
        const brick = {
          x: left + col * (BRICK_WIDTH + BRICK_GAP),
          y: BRICKS_TOP + row * (BRICK_HEIGHT + BRICK_GAP),
          width: BRICK_WIDTH,
          height: BRICK_HEIGHT,
          isKill: false,
          type: type,
          color: type === "sweeper" ? "#ff4f6d" : type === "prism" ? "#a78bfa" : type === "crystal" ? "#7dd3fc" : type === "command" ? "#50664c" : BRICK_ROW_COLORS[row % BRICK_ROW_COLORS.length]
        };
        if (brick.type === "sweeper") {
          brick.originX = brick.x;
          brick.moveAmplitude = Math.min(70, 36 + level);
          brick.movePhase = (row + col) * 0.8;
        }
        if (type === "prism") {
          brick.hp = 3;
          brick.maxHp = 3;
          brick.spin = (row + col) % 2 === 0 ? 1 : -1;
        } else if (type === "crystal") {
          brick.hp = 2;
          brick.maxHp = 2;
        } else if (type === "command") {
          brick.hp = 4;
          brick.maxHp = 4;
        }
        if (type === "normal" && level >= 2) {
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
          } else if (variant < 11) {
            brick.type = "prism";
            brick.hp = 3;
            brick.maxHp = 3;
            brick.spin = (row + col) % 2 === 0 ? 1 : -1;
            brick.color = "#a78bfa";
          } else if (variant < 14) {
            brick.type = "crystal";
            brick.hp = 2;
            brick.maxHp = 2;
            brick.color = "#7dd3fc";
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
    if (secretImageMode) {
      if (drawSecretImage(brick.x, brick.y, brick.width, brick.height, Math.floor(brick.x / brick.width) + Math.floor(brick.y / brick.height))) continue;
    }
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
    } else if (brick.type === "command") {
      ctx.strokeStyle = "#c8ff8a";
      ctx.lineWidth = 2;
      ctx.strokeRect(brick.x + 5, brick.y + 4, brick.width - 10, brick.height - 8);
      ctx.fillStyle = "#d8ff9b";
      ctx.textAlign = "center";
      ctx.font = "bold 9px Courier New";
      ctx.fillText("CMD " + brick.hp, brick.x + brick.width / 2, brick.y + brick.height / 2 + 3);
    } else if (brick.type === "prism") {
      ctx.fillStyle = "#f5f3ff";
      ctx.beginPath();
      ctx.moveTo(brick.x + brick.width / 2, brick.y + 3);
      ctx.lineTo(brick.x + brick.width - 6, brick.y + brick.height / 2);
      ctx.lineTo(brick.x + brick.width / 2, brick.y + brick.height - 3);
      ctx.lineTo(brick.x + 6, brick.y + brick.height / 2);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.font = "bold 9px Courier New";
      ctx.fillText(String(brick.hp), brick.x + brick.width / 2, brick.y + brick.height / 2 + 3);
    } else if (brick.type === "crystal") {
      ctx.strokeStyle = "#e0f2fe";
      ctx.beginPath();
      ctx.moveTo(brick.x + brick.width / 2, brick.y + 3);
      ctx.lineTo(brick.x + brick.width - 9, brick.y + brick.height / 2);
      ctx.lineTo(brick.x + brick.width / 2, brick.y + brick.height - 3);
      ctx.lineTo(brick.x + 9, brick.y + brick.height / 2);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.font = "bold 9px Courier New";
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
    if (boss.isFinalBoss) {
      drawWitherStorm(boss);
      return;
    }
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

  function drawWitherStorm(boss) {
    const centerX = boss.x + boss.width / 2;
    const bob = Math.sin(simulationFrame * 0.045) * 4;
    const top = boss.y + bob;
    const stage = boss.phase || finalBossPhaseForHealth(boss);
    const colors = stage === 1 ? boss.palette : boss.damagedPalette;
    const tentacleCount = stage === 1 ? 6 : stage === 2 ? 9 : 12;
    const pulse = Math.sin(simulationFrame * 0.12);

    ctx.save();
    ctx.lineCap = "round";
    ctx.globalAlpha = 0.28 + Math.max(0, pulse) * 0.16;
    ctx.strokeStyle = stage === 3 ? "#ff475f" : boss.glow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(centerX, top + 92, boss.width * (0.44 + Math.max(0, pulse) * 0.025), boss.height * 0.58, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.shadowColor = stage === 3 ? "#ff475f" : boss.glow;
    ctx.shadowBlur = stage === 3 ? 38 : 24;
    ctx.strokeStyle = colors[1];
    ctx.lineWidth = boss.adminAssimilated ? 16 : 12;
    for (let index = 0; index < tentacleCount; index++) {
      const startX = boss.x + 44 + index * ((boss.width - 88) / Math.max(1, tentacleCount - 1));
      const sway = Math.sin(simulationFrame * 0.06 + index * 1.4) * (22 + stage * 9);
      ctx.beginPath();
      ctx.moveTo(startX, top + 140);
      ctx.bezierCurveTo(startX + sway, top + 174, startX - sway, top + 202, startX + sway * 0.7, top + 228);
      ctx.stroke();
      ctx.strokeStyle = colors[0];
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.strokeStyle = colors[1];
      ctx.lineWidth = boss.adminAssimilated ? 16 : 12;
    }

    ctx.fillStyle = colors[2];
    ctx.strokeStyle = stage === 3 ? "#ff7b78" : boss.glow;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(centerX, top + 120, boss.width * 0.34, 86 + Math.max(0, pulse) * 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    for (let head = 0; head < 3; head++) {
      const headX = centerX + (head - 1) * Math.min(150, boss.width * 0.24);
      const headY = top + (head === 1 ? 12 : 36);
      ctx.fillStyle = colors[1];
      ctx.strokeStyle = stage === 3 ? "#ff7b78" : boss.eyes;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(headX - 48, headY + 34);
      ctx.lineTo(headX - 40, headY - 8);
      ctx.lineTo(headX - 22, headY - 30);
      ctx.lineTo(headX, headY - 16);
      ctx.lineTo(headX + 22, headY - 30);
      ctx.lineTo(headX + 40, headY - 8);
      ctx.lineTo(headX + 48, headY + 34);
      ctx.lineTo(headX + 24, headY + 55);
      ctx.lineTo(headX, headY + 42 + pulse * 4);
      ctx.lineTo(headX - 24, headY + 55);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = stage === 3 ? "#ffef9c" : boss.eyes;
      ctx.shadowColor = boss.eyes;
      ctx.shadowBlur = 12;
      ctx.fillRect(headX - 26, headY + 10, 12, 6);
      ctx.fillRect(headX + 14, headY + 10, 12, 6);
      ctx.shadowBlur = 0;
    }

    const coreSize = (boss.adminAssimilated ? 130 : 88) + Math.max(0, pulse) * 10;
    ctx.shadowBlur = 0;
    ctx.fillStyle = boss.adminAssimilated ? "#220914" : "#111b17";
    ctx.fillRect(centerX - coreSize / 2, top + 67, coreSize, coreSize);
    ctx.strokeStyle = boss.adminAssimilated ? "#ff476f" : stage === 3 ? "#ff475f" : "#d8ff9b";
    ctx.lineWidth = boss.adminAssimilated ? 7 : 4;
    ctx.strokeRect(centerX - coreSize / 2, top + 67, coreSize, coreSize);
    ctx.strokeStyle = boss.adminAssimilated ? "rgba(255, 71, 111, 0.8)" : "rgba(216, 255, 155, 0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX - 20, top + 78);
    ctx.lineTo(centerX + 20, top + 78);
    ctx.moveTo(centerX - 20, top + 118);
    ctx.lineTo(centerX + 20, top + 118);
    ctx.moveTo(centerX - 20, top + 78);
    ctx.lineTo(centerX - 20, top + 118);
    ctx.moveTo(centerX + 20, top + 78);
    ctx.lineTo(centerX + 20, top + 118);
    ctx.stroke();
    ctx.fillStyle = boss.adminAssimilated ? "#ffef9c" : "#e7ffad";
    ctx.textAlign = "center";
    ctx.font = "bold 11px Courier New";
    ctx.fillText(boss.adminAssimilated ? "ADMIN CORE" : "WITHER CORE", centerX, top + 100);
    ctx.font = "bold 10px Courier New";
    ctx.fillText("CORE " + Math.ceil(boss.hp) + " / " + boss.maxHp, centerX, top + 116);
    if (boss.adminAssimilated && boss.adminPowers) {
      ctx.font = "bold 8px Courier New";
      ctx.fillText("TOGGLES " + boss.adminPowers.enabledToggleCount + "/" + boss.adminPowers.toggles.length + " // SPAWNS HIJACKED", centerX, top + 132);
      ctx.fillText("ENEMY MULTIPLIER x" + boss.adminPowers.enemyMultiplier + " // NO NEXTBOTS", centerX, top + 144);
    }
    ctx.font = "bold 12px Courier New";
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px Courier New";
    ctx.fillText(boss.adminAssimilated ? "WITHER STORM // ADMIN OVERRIDE" : "WITHER STORM // " + FINAL_BOSS_PHASES[stage - 1], centerX, top + boss.height - 8);

    if (boss.adminAssimilated) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      for (let index = 0; index < 6; index++) {
        const glitchY = top + 70 + index * 24;
        const glitchX = Math.sin(simulationFrame * 0.7 + index * 2) * 34;
        ctx.fillStyle = index % 2 === 0 ? "#ff355e" : "#77f7ff";
        ctx.fillRect(boss.x + 24 + Math.abs(glitchX), glitchY, boss.width * 0.72, 2 + index % 3);
      }
      ctx.restore();
    }

    const barWidth = boss.width * 0.7;
    const barX = centerX - barWidth / 2;
    const barY = top + boss.height + 16;
    ctx.fillStyle = "#240b12";
    ctx.fillRect(barX, barY, barWidth, 10);
    ctx.fillStyle = stage === 3 ? "#ff475f" : "#83e39d";
    ctx.fillRect(barX, barY, barWidth * Math.max(0, boss.hp / boss.maxHp), 10);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, 10);
    ctx.restore();
  }
}
