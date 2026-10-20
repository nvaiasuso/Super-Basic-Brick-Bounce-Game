// ============================================================
// bricks.js: where the bricks are, and how they are drawn
// ============================================================

const BRICK_COLUMNS = 8;
const BRICK_WIDTH = 58;
const BRICK_HEIGHT = 20;
const BRICK_GAP = 8;
const BRICKS_TOP = 62;

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
  []
];

const BRICK_ROW_COLORS = ["#ff6464", "#ffad55", "#ffe66d", "#75df88", "#54c8ff", "#b28dff"];

// # bricks are breakable; X bricks are lethal hazards; . is empty space.
function makeBricks(level) {
  const list = [];
  if (level === LEVEL_COUNT - 1) {
    return [{
      x: 160,
      y: 82,
      width: 280,
      height: 112,
      type: "boss",
      hp: 40,
      maxHp: 40,
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
          isKill: type === "X",
          type: type === "X" ? "kill" : "normal",
          color: type === "X" ? "#ffffff" : BRICK_ROW_COLORS[row % BRICK_ROW_COLORS.length]
        };
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
    ctx.fillStyle = brick.isKill ? "white" : brick.color || "black";
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

    if (brick.type === "armored" || brick.type === "boss") {
      ctx.fillStyle = "#111";
      ctx.textAlign = "center";
      ctx.font = brick.type === "boss" ? "bold 24px Courier New" : "bold 10px Courier New";
      ctx.fillText(String(brick.hp), brick.x + brick.width / 2, brick.y + brick.height / 2 + (brick.type === "boss" ? 8 : 3));
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
}
