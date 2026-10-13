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
    "..####..",
    ".##XX##.",
    "##....##",
    "########"
  ],
  [
    "##X..X##",
    ".##..##.",
    "X##XX##X",
    "########"
  ],
  [
    "X#....#X",
    ".##XX##.",
    "##....##",
    "#X####X#"
  ],
  [
    "#.#X#.#.",
    ".#.#.#.#",
    "##X##X##",
    "########"
  ],
  [
    "XX####XX",
    "##....##",
    ".##XX##.",
    "########"
  ],
  [
    "#X##..##",
    "##.#X#.#",
    ".#X##X#.",
    "########"
  ],
  [
    "X#X##X#X",
    "##....##",
    ".##XX##.",
    "#X####X#"
  ]
];

// # bricks are breakable; X bricks are lethal hazards; . is empty space.
function makeBricks(level) {
  const list = [];
  const layout = LEVEL_LAYOUTS[level];
  const totalWidth = BRICK_COLUMNS * BRICK_WIDTH + (BRICK_COLUMNS - 1) * BRICK_GAP;
  const left = (WIDTH - totalWidth) / 2;

  for (let row = 0; row < layout.length; row++) {
    for (let col = 0; col < layout[row].length; col++) {
      const type = layout[row][col];
      if (type !== ".") {
        list.push({
          x: left + col * (BRICK_WIDTH + BRICK_GAP),
          y: BRICKS_TOP + row * (BRICK_HEIGHT + BRICK_GAP),
          width: BRICK_WIDTH,
          height: BRICK_HEIGHT,
          isKill: type === "X"
        });
      }
    }
  }

  return list;
}

// Draws every brick in the list.
function drawBricks() {
  for (const brick of bricks) {
    ctx.fillStyle = brick.isKill ? "white" : "black";
    ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
    ctx.strokeStyle = brick.isKill ? "black" : "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(brick.x + 1, brick.y + 1, brick.width - 2, brick.height - 2);

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
