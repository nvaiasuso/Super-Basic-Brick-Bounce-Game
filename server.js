const crypto = require("node:crypto");
const httpServer = require("http-server").createServer({ root: __dirname, cache: -1 });
const WebSocket = require("ws");

const port = Number(process.env.PORT) || 8080;
const rooms = new Map();
const clients = new Map();
const roomCodeCharacters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const playerColors = ["#d6ff55", "#55d9ff"];

const socketServer = new WebSocket.Server({
  server: httpServer.server,
  path: "/lobby",
  maxPayload: 1024 * 1024
});

function send(socket, message) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function sendError(socket, message) {
  send(socket, { type: "error", message: message });
}

function createRoomCode() {
  let code;
  do {
    code = "";
    for (let index = 0; index < 6; index++) {
      code += roomCodeCharacters[crypto.randomInt(roomCodeCharacters.length)];
    }
  } while (rooms.has(code));
  return code;
}

function cleanName(value) {
  const name = typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 16)
    : "";
  return name || "Player";
}

function cleanChatText(value) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 300)
    : "";
}

function playersIn(room) {
  const humanPlayers = Array.from(room.players.values()).map(function (player) {
    return {
      id: player.id,
      name: player.name,
      color: player.color,
      x: player.x,
      previousX: player.previousX,
      y: player.y,
      previousY: player.previousY,
      width: player.width,
      angle: player.angle,
      previousAngle: player.previousAngle,
      left: player.left,
      right: player.right,
      ready: player.ready,
      host: player.host
    };
  });
  return humanPlayers.concat(room.bots);
}

function broadcastRoom(room, message) {
  for (const player of room.players.values()) {
    send(player.socket, message);
  }
}

function broadcastRoomState(room) {
  broadcastRoom(room, {
    type: "room-state",
    code: room.code,
    started: room.started,
    players: playersIn(room)
  });
}

function removePlayer(socket, notifyPlayer) {
  const player = clients.get(socket);
  if (!player) return;
  if (!player.roomCode) {
    if (!notifyPlayer) clients.delete(socket);
    return;
  }

  const wasHost = player.host;
  const room = rooms.get(player.roomCode);
  if (notifyPlayer) {
    send(socket, { type: "left" });
    player.roomCode = null;
    player.host = false;
    player.ready = false;
  } else {
    clients.delete(socket);
  }
  if (!room) return;
  room.players.delete(player.id);

  if (wasHost) {
    for (const other of room.players.values()) {
      send(other.socket, { type: "room-closed", message: "The host left the lobby." });
      if (notifyPlayer) {
        other.roomCode = null;
        other.host = false;
        other.ready = false;
      } else {
        clients.delete(other.socket);
        other.socket.close();
      }
    }
    rooms.delete(room.code);
    return;
  }

  if (room.started) room.started = false;
  if (room.players.size === 0) {
    rooms.delete(room.code);
    return;
  }
  broadcastRoomState(room);
}

function createLobby(socket, message) {
  const player = clients.get(socket);
  if (player.roomCode) return sendError(socket, "Leave your current lobby first.");

  const code = createRoomCode();
  const room = { code: code, hostId: player.id, players: new Map(), bots: [], started: false };
  player.roomCode = code;
  player.name = cleanName(message.name);
  player.color = playerColors[0];
  player.x = 355;
  player.previousX = player.x;
  player.y = 570;
  player.previousY = player.y;
  player.width = 90;
  player.angle = 0;
  player.previousAngle = 0;
  player.host = true;
  player.ready = true;
  room.players.set(player.id, player);
  rooms.set(code, room);

  send(socket, { type: "created", code: code, playerId: player.id, host: true });
  broadcastRoomState(room);
}

function joinLobby(socket, message) {
  const player = clients.get(socket);
  if (player.roomCode) return sendError(socket, "Leave your current lobby first.");
  const code = typeof message.code === "string" ? message.code.trim().toUpperCase() : "";
  const room = rooms.get(code);
  if (!room) return sendError(socket, "That lobby code was not found.");
  if (room.started) return sendError(socket, "That game has already started.");
  if (room.players.size >= 2) return sendError(socket, "That lobby is full.");

  player.roomCode = code;
  player.name = cleanName(message.name);
  player.color = playerColors[1];
  player.x = 355;
  player.previousX = player.x;
  player.y = 570;
  player.previousY = player.y;
  player.width = 90;
  player.angle = 0;
  player.previousAngle = 0;
  player.host = false;
  player.ready = false;
  room.players.set(player.id, player);

  send(socket, { type: "joined", code: code, playerId: player.id, host: false });
  broadcastRoomState(room);
}

function handleMessage(socket, message) {
  const player = clients.get(socket);
  if (!player) return;

  if (message.type === "ping" && Number.isFinite(message.t)) {
    send(socket, { type: "pong", t: message.t });
    return;
  }

  if (message.type === "create") return createLobby(socket, message);
  if (message.type === "join") return joinLobby(socket, message);
  if (message.type === "leave") return removePlayer(socket, true);

  const room = player.roomCode ? rooms.get(player.roomCode) : null;
  if (!room) return sendError(socket, "Join a lobby first.");

  if (message.type === "ready") {
    if (player.host) return sendError(socket, "The host starts the game when everyone is ready.");
    player.ready = Boolean(message.ready);
    return broadcastRoomState(room);
  }

  if (message.type === "chat") {
    const text = cleanChatText(message.text);
    if (!text) return;
    return broadcastRoom(room, {
      type: "chat",
      id: player.id,
      name: player.name,
      text: text,
      sentAt: Date.now()
    });
  }

  if (message.type === "add-ai") {
    if (!player.host) return sendError(socket, "Only the host can add AI players.");
    if (room.started) return sendError(socket, "AI players can only be added before the game starts.");
    const botIndex = room.bots.length;
    room.bots.push({
      id: "ai-" + crypto.randomUUID(),
      name: cleanName(message.name) === "Player" ? "CPU " + (botIndex + 1) : cleanName(message.name),
      color: ["#d6ff55", "#55d9ff", "#ff78bd", "#ffad55"][botIndex % 4],
      x: 36 + (botIndex % 6) * 96,
      ready: true,
      host: false,
      ai: true
    });
    return broadcastRoomState(room);
  }

  if (message.type === "launch") {
    if (player.host || !room.started) return;
    const host = Array.from(room.players.values()).find(function (member) { return member.host; });
    if (host) send(host.socket, { type: "launch", id: player.id });
    return;
  }

  if (message.type === "host-visibility") {
    if (!player.host || !room.started) return;
    for (const other of room.players.values()) {
      if (!other.host) send(other.socket, { type: "host-visibility", hidden: Boolean(message.hidden) });
    }
    return;
  }

  if (message.type === "start") {
    const everyoneReady = Array.from(room.players.values()).every(function (member) {
      return member.host || member.ready;
    });
    if (!player.host) return sendError(socket, "Only the host can start the game.");
    if (room.players.size + room.bots.length < 2) return sendError(socket, "Invite another player or add an AI player before starting.");
    if (!everyoneReady) return sendError(socket, "Wait for every player to be ready.");
    room.started = true;
    for (const member of room.players.values()) {
      send(member.socket, { type: "started", playerId: member.id, host: member.host, players: playersIn(room) });
    }
    return;
  }

  if (message.type === "paddle") {
    if (typeof message.x !== "number" || !Number.isFinite(message.x)) return;
    const width = typeof message.width === "number" && Number.isFinite(message.width)
      ? Math.max(40, Math.min(145, message.width))
      : player.width;
    const angle = typeof message.angle === "number" && Number.isFinite(message.angle)
      ? Math.max(-35, Math.min(35, message.angle))
      : player.angle;
    player.previousX = player.x;
    player.previousY = player.y;
    player.previousAngle = player.angle;
    player.left = Boolean(message.left);
    player.right = Boolean(message.right);
    player.width = width;
    player.angle = angle;
    player.x = Math.max(0, Math.min(800 - width, message.x));
    for (const other of room.players.values()) {
      if (other !== player) {
        send(other.socket, {
          type: "paddle",
          id: player.id,
          x: player.x,
          previousX: player.previousX,
          y: player.y,
          previousY: player.previousY,
          width: player.width,
          angle: player.angle,
          previousAngle: player.previousAngle,
          left: player.left,
          right: player.right
        });
      }
    }
    return;
  }

  if (message.type === "snapshot") {
    if (!player.host || !room.started || !message.state || typeof message.state !== "object") return;
    for (const other of room.players.values()) {
      if (!other.host) send(other.socket, { type: "snapshot", state: message.state });
    }
  }
}

socketServer.on("connection", function (socket) {
  clients.set(socket, {
    id: crypto.randomUUID(),
    name: "Player",
    color: playerColors[0],
    x: 355,
    ready: false,
    host: false,
    roomCode: null,
    socket: socket
  });

  socket.on("message", function (data) {
    try {
      handleMessage(socket, JSON.parse(data.toString()));
    } catch (error) {
      sendError(socket, "The lobby received an invalid message.");
    }
  });

  socket.on("close", function () {
    removePlayer(socket, false);
  });
});

httpServer.listen(port, "0.0.0.0", function () {
  console.log("Block Breaker with lobby server running on port " + port);
});

function closeServer() {
  socketServer.close();
  httpServer.close();
}

process.on("SIGINT", closeServer);
process.on("SIGTERM", closeServer);