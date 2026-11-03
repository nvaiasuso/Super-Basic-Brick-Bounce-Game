const lobbyStatus = document.getElementById("lobby-status");
const lobbySetup = document.getElementById("lobby-setup");
const lobbyRoom = document.getElementById("lobby-room");
const lobbyCreateButton = document.getElementById("lobby-create");
const lobbyJoinButton = document.getElementById("lobby-join");
const lobbyReadyButton = document.getElementById("lobby-ready");
const lobbyStartButton = document.getElementById("lobby-start");
const lobbyLeaveButton = document.getElementById("lobby-leave");
const lobbyCopyButton = document.getElementById("lobby-copy");
const lobbyCodeInput = document.getElementById("lobby-code-input");
const lobbyCodeOutput = document.getElementById("lobby-code-output");
const lobbyPlayerList = document.getElementById("lobby-player-list");
const playerNameInput = document.getElementById("player-name");
const lobbyAIControls = document.getElementById("lobby-ai-controls");
const lobbyAINameInput = document.getElementById("lobby-ai-name");
const lobbyAddAIButton = document.getElementById("lobby-add-ai");
const multiplayerStatus = document.getElementById("multiplayer-status");
const multiplayerChat = document.getElementById("multiplayer-chat");
const chatMessages = document.getElementById("chat-messages");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatStatus = document.getElementById("chat-status");
const adminBattleModeInput = document.getElementById("admin-battle-mode");

let lobbySocket = null;
let lobbyActionInFlight = false;
let lobbyPlayerId = null;
let lobbyCode = "";
let lobbyHost = false;
let lobbyActive = false;
let lobbyStarted = false;
let lobbyPlayers = [];
let lobbyAdminIds = [];
let lobbyReady = false;
let lastPaddleSentAt = 0;
let lastSnapshotReceivedAt = 0;
let hostWindowHidden = false;

function setLobbyStatus(message) {
  lobbyStatus.textContent = message;
}

function setMultiplayerStatus(message) {
  if (!multiplayerStatus) return;
  multiplayerStatus.hidden = !message;
  multiplayerStatus.textContent = message || "";
}

function appendChatMessage(message) {
  const item = document.createElement("li");
  const heading = document.createElement("strong");
  const text = document.createElement("span");
  const time = document.createElement("time");
  heading.textContent = message.name || "Player";
  text.textContent = message.text || "";
  time.dateTime = new Date(message.sentAt || Date.now()).toISOString();
  time.textContent = new Date(message.sentAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  item.append(heading, text, time);
  chatMessages.append(item);
  while (chatMessages.children.length > 100) chatMessages.firstElementChild.remove();
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function setLobbyActionInFlight(value) {
  lobbyActionInFlight = value;
  lobbyCreateButton.disabled = value;
  lobbyJoinButton.disabled = value;
}

function getLobbySocketUrl() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return protocol + "//" + window.location.host + "/lobby";
}

const staticLobbyCodeCharacters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function createRealtimeLobbySocket(initialAction) {
  const client = window.sharedSupabaseClient;
  if (!client) return null;

  const playerId = window.crypto && typeof window.crypto.randomUUID === "function"
    ? window.crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(36).slice(2);
  const isHost = initialAction.type === "create";
  const lobbyCode = isHost
    ? Array.from({ length: 6 }, function () { return staticLobbyCodeCharacters[Math.floor(Math.random() * staticLobbyCodeCharacters.length)]; }).join("")
    : initialAction.code;
  const listeners = new Map();
  const roomPlayers = [];
  const roomBots = [];
  let roomStarted = false;
  let roomAdminBattle = Boolean(initialAction.adminBattle);
  let roomAdminIds = [];
  let hostPlayerId = isHost ? playerId : null;
  let channel;
  let closed = false;

  const socket = {
    readyState: WebSocket.CONNECTING,
    bufferedAmount: 0,
    isRealtime: true,
    addEventListener: function (type, callback, options) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push({ callback: callback, once: Boolean(options && options.once) });
    },
    dispatch: function (type, event) {
      const entries = listeners.get(type) || [];
      for (const entry of entries.slice()) {
        entry.callback(event || {});
        if (entry.once) listeners.set(type, (listeners.get(type) || []).filter(function (item) { return item !== entry; }));
      }
    },
    send: function (data) {
      let message;
      try {
        message = JSON.parse(data);
      } catch (error) {
        return;
      }
      if (message.type === "create" && isHost && roomPlayers.length === 0) {
        const hostPlayer = {
          id: playerId,
          name: cleanLobbyName(message.name),
          color: "#d6ff55",
          x: 355,
          previousX: 355,
          y: 570,
          previousY: 570,
          width: 90,
          angle: 0,
          previousAngle: 0,
          ready: true,
          host: true
        };
        roomAdminBattle = Boolean(message.adminBattle);
        roomAdminIds = [playerId];
        roomPlayers.push(hostPlayer);
        sendServerMessage({ type: "created", code: lobbyCode, playerId: playerId, host: true }, playerId);
        broadcastRoomState();
        return;
      }
      if (message.type === "join" && !isHost) {
        publish({ message: { type: "join", name: cleanLobbyName(message.name) } });
        return;
      }
      if (isHost) {
        handleHostMessage(message, playerId);
      } else {
        publish({ message: message });
      }
    },
    close: function () {
      if (closed) return;
      closed = true;
      socket.readyState = WebSocket.CLOSED;
      if (channel) channel.unsubscribe();
      socket.dispatch("close");
    }
  };

  function fail() {
    if (closed) return;
    socket.dispatch("error");
    socket.close();
  }

  function cleanLobbyName(value) {
    const name = typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 16) : "";
    return name || "Player";
  }

  function emitMessage(message) {
    socket.dispatch("message", { data: JSON.stringify(message) });
  }

  function publish(packet) {
    if (closed || !channel) return;
    channel.send({ type: "broadcast", event: "lobby-message", payload: Object.assign({ senderId: playerId }, packet) }).then(function (status) {
      if (status === "error") fail();
    }).catch(function () {
      fail();
    });
  }

  function sendServerMessage(message, recipientId, excludeId) {
    if (recipientId === playerId || (!recipientId && excludeId !== playerId)) emitMessage(message);
    if (recipientId === playerId) return;
    publish({ server: true, recipientId: recipientId || null, excludeId: excludeId || null, message: message });
  }

  function broadcastRoomState() {
    sendServerMessage({
      type: "room-state",
      code: lobbyCode,
      started: roomStarted,
      adminBattle: roomAdminBattle,
      adminIds: roomAdminIds,
      players: roomPlayers.concat(roomBots)
    });
  }

  function sendError(message, recipientId) {
    sendServerMessage({ type: "error", message: message }, recipientId);
  }

  function handleHostMessage(message, senderId) {
    if (message.type === "join") {
      if (roomStarted) return sendError("That game has already started.", senderId);
      if (roomPlayers.length >= 2) return sendError("That lobby is full.", senderId);
      const joinedPlayer = {
        id: senderId,
        name: cleanLobbyName(message.name),
        color: "#55d9ff",
        x: 355,
        previousX: 355,
        y: 570,
        previousY: 570,
        width: 90,
        angle: 0,
        previousAngle: 0,
        ready: false,
        host: false
      };
      roomPlayers.push(joinedPlayer);
      sendServerMessage({ type: "joined", code: lobbyCode, playerId: senderId, host: false }, senderId);
      broadcastRoomState();
      return;
    }

    const player = roomPlayers.find(function (item) { return item.id === senderId; });
    if (!player) return;

    if (message.type === "leave") {
      if (player.host) {
        sendServerMessage({ type: "room-closed", message: "The host left the lobby." });
        window.setTimeout(function () { socket.close(); }, 150);
      } else {
        roomPlayers.splice(roomPlayers.indexOf(player), 1);
        roomAdminIds = roomAdminIds.filter(function (adminId) { return adminId !== senderId; });
        roomStarted = false;
        sendServerMessage({ type: "left" }, senderId);
        broadcastRoomState();
      }
      return;
    }

    if (message.type === "ready") {
      if (player.host) return sendError("The host starts the game when everyone is ready.", senderId);
      player.ready = Boolean(message.ready);
      broadcastRoomState();
      return;
    }

    if (message.type === "set-admins") {
      if (!player.host) return sendError("Only the host can assign admin access.", senderId);
      if (roomStarted) return sendError("Admin access cannot be changed after the game starts.", senderId);
      const validIds = new Set(roomPlayers.map(function (member) { return member.id; }));
      roomAdminIds = Array.isArray(message.adminIds)
        ? Array.from(new Set(message.adminIds.filter(function (adminId) { return typeof adminId === "string" && validIds.has(adminId); })))
        : [];
      broadcastRoomState();
      return;
    }

    if (message.type === "chat") {
      const text = typeof message.text === "string" ? message.text.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 300) : "";
      if (text) sendServerMessage({ type: "chat", id: senderId, name: player.name, text: text, sentAt: Date.now() });
      return;
    }

    if (message.type === "add-ai") {
      if (!player.host) return sendError("Only the host can add AI players.", senderId);
      if (roomStarted) return sendError("AI players can only be added before the game starts.", senderId);
      if (roomBots.length >= 8) return sendError("A lobby can have up to 8 AI players.", senderId);
      const botIndex = roomBots.length;
      roomBots.push({
        id: "ai-" + playerId + "-" + botIndex,
        name: cleanLobbyName(message.name) === "Player" ? "CPU " + (botIndex + 1) : cleanLobbyName(message.name),
        color: ["#d6ff55", "#55d9ff", "#ff78bd", "#ffad55"][botIndex % 4],
        x: 36 + (botIndex % 6) * 96,
        ready: true,
        host: false,
        ai: true
      });
      broadcastRoomState();
      return;
    }

    if (message.type === "start") {
      const everyoneReady = roomPlayers.every(function (item) { return item.host || item.ready; });
      if (!player.host) return sendError("Only the host can start the game.", senderId);
      if (roomAdminBattle && roomPlayers.length < 2) return sendError("Admin Battle requires a second human player.", senderId);
      if (roomAdminBattle && !roomPlayers.some(function (member) { return !roomAdminIds.includes(member.id); })) {
        return sendError("Admin Battle needs at least one player without admin access.", senderId);
      }
      if (roomPlayers.length + roomBots.length < 2) return sendError("Invite another player or add an AI player before starting.", senderId);
      if (!everyoneReady) return sendError("Wait for every player to be ready.", senderId);
      roomStarted = true;
      for (const member of roomPlayers) {
        sendServerMessage({ type: "started", playerId: member.id, host: member.host, players: roomPlayers.concat(roomBots), adminBattle: roomAdminBattle, adminIds: roomAdminIds }, member.id);
      }
      return;
    }

    if (message.type === "launch") {
      if (!player.host && roomStarted) window.launchLobbyBall(senderId);
      return;
    }

    if (message.type === "host-visibility") {
      if (player.host && roomStarted) publish({ server: true, message: { type: "host-visibility", hidden: Boolean(message.hidden) } });
      return;
    }

    if (message.type === "admin-command") {
      if (!roomStarted || !roomAdminIds.includes(senderId)) return sendError("You do not have admin access in this game.", senderId);
      if (!message.command || typeof message.command !== "object" || Array.isArray(message.command)) return;
      sendServerMessage({ type: "admin-command", adminId: senderId, command: message.command }, hostPlayerId);
      return;
    }

    if (message.type === "paddle") {
      if (!roomStarted || !Number.isFinite(message.x)) return;
      const width = Number.isFinite(message.width) ? Math.max(40, Math.min(145, message.width)) : player.width;
      const angle = Number.isFinite(message.angle) ? Math.max(-35, Math.min(35, message.angle)) : player.angle;
      player.previousX = player.x;
      player.previousY = player.y;
      player.previousAngle = player.angle;
      player.left = Boolean(message.left);
      player.right = Boolean(message.right);
      player.width = width;
      player.angle = angle;
      player.x = Math.max(0, Math.min(800 - width, message.x));
      const paddleMessage = {
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
      };
      sendServerMessage(paddleMessage, null, senderId);
      return;
    }

    if (message.type === "snapshot") {
      if (player.host && roomStarted && message.state && typeof message.state === "object") {
        publish({ server: true, message: { type: "snapshot", state: message.state } });
      }
    }
  }

  function handlePacket(packet) {
    if (!packet || packet.senderId === playerId) return;
    if (packet.recipientId && packet.recipientId !== playerId) return;
    if (packet.excludeId && packet.excludeId === playerId) return;
    if (isHost) {
      if (!packet.server && packet.message) handleHostMessage(packet.message, packet.senderId);
    } else if (packet.server && packet.senderId === hostPlayerId && packet.message) {
      emitMessage(packet.message);
    }
  }

  channel = client.channel("block-breaker-lobby-" + lobbyCode, {
    config: { broadcast: { self: false }, presence: { key: playerId } }
  });
  channel.on("broadcast", { event: "lobby-message" }, function (event) {
    handlePacket(event.payload);
  });
  channel.on("presence", { event: "leave" }, function (event) {
    if (isHost) {
      const leavingPlayer = roomPlayers.find(function (item) { return item.id === event.key; });
      if (leavingPlayer && !leavingPlayer.host) {
        roomPlayers.splice(roomPlayers.indexOf(leavingPlayer), 1);
        roomAdminIds = roomAdminIds.filter(function (adminId) { return adminId !== event.key; });
        roomStarted = false;
        broadcastRoomState();
      }
    } else if (event.key === hostPlayerId && !closed) {
      emitMessage({ type: "room-closed", message: "The host left the lobby." });
      window.setTimeout(function () { socket.close(); }, 150);
    }
  });
  channel.subscribe(async function (status) {
    if (status === "SUBSCRIBED") {
      if (isHost) {
        const occupied = Object.values(channel.presenceState()).some(function (members) { return members.length > 0; });
        if (occupied) {
          socket.dispatch("error");
          socket.close();
          return;
        }
        await channel.track({ id: playerId, name: cleanLobbyName(initialAction.name), host: true });
      } else {
        const hostPresence = Object.values(channel.presenceState()).flat().find(function (presence) { return presence.host; });
        if (!hostPresence) {
          emitMessage({ type: "error", message: "That lobby code was not found. The host may be offline." });
          socket.close();
          return;
        }
        hostPlayerId = hostPresence.id;
        await channel.track({ id: playerId, name: cleanLobbyName(initialAction.name), host: false });
      }
      socket.readyState = WebSocket.OPEN;
      socket.dispatch("open");
    } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
      fail();
    }
  });

  return socket;
}

function attachLobbySocket(socket, action, realtimeFallback) {
  socket.addEventListener("open", function () {
    socket.send(JSON.stringify(action));
  }, { once: true });
  socket.addEventListener("message", function (event) {
    try {
      handleLobbyMessage(JSON.parse(event.data));
    } catch (error) {
      setLobbyStatus("Received an invalid lobby message.");
    }
  });
  socket.addEventListener("error", function () {
    if (!realtimeFallback && socket === lobbySocket) {
      startRealtimeLobbyFallback(action);
      return;
    }
    if (socket === lobbySocket) {
      setLobbyActionInFlight(false);
      setLobbyStatus("Could not connect to multiplayer. Check that Supabase Realtime is enabled.");
    }
  });
  socket.addEventListener("close", function () {
    if (socket !== lobbySocket) return;
    if (lobbyActive) {
      const wasStarted = lobbyStarted;
      resetLobby("Lobby connection lost.");
      if (wasStarted && typeof window.endLobbyGame === "function") window.endLobbyGame();
    }
  });
}

function startRealtimeLobbyFallback(action) {
  if (!window.sharedSupabaseClient) {
    setLobbyActionInFlight(false);
    setLobbyStatus("Static multiplayer needs the configured Supabase Realtime service.");
    return;
  }
  const socket = createRealtimeLobbySocket(action);
  if (!socket) {
    setLobbyActionInFlight(false);
    setLobbyStatus("Could not start static multiplayer.");
    return;
  }
  lobbySocket = socket;
  setLobbyStatus("Connecting through the static-host lobby relay...");
  attachLobbySocket(socket, action, true);
}

function sendLobbyAction(action) {
  setLobbyActionInFlight(true);
  setLobbyStatus("Connecting to lobby...");
  if (lobbySocket && lobbySocket.isRealtime && !lobbyActive) {
    lobbySocket.close();
    lobbySocket = null;
  }
  if (lobbySocket && lobbySocket.readyState === WebSocket.OPEN) {
    lobbySocket.send(JSON.stringify(action));
    return;
  }

  if (lobbySocket && lobbySocket.readyState === WebSocket.CONNECTING) {
    lobbySocket.addEventListener("open", function () {
      lobbySocket.send(JSON.stringify(action));
    }, { once: true });
    return;
  }

  let socket;
  try {
    socket = new WebSocket(getLobbySocketUrl());
  } catch (error) {
    startRealtimeLobbyFallback(action);
    return;
  }
  lobbySocket = socket;
  attachLobbySocket(socket, action, false);
}

function currentPlayerName() {
  return playerNameInput.value.trim().slice(0, 16) || "Player";
}

window.sendLobbyAdminCommand = function (command) {
  if (!lobbyStarted || !lobbyAdminIds.includes(lobbyPlayerId) || !lobbySocket || lobbySocket.readyState !== WebSocket.OPEN) return false;
  lobbySocket.send(JSON.stringify({ type: "admin-command", command: command }));
  return true;
};

function renderLobbyPlayers() {
  lobbyPlayerList.replaceChildren();
  for (const player of lobbyPlayers) {
    const item = document.createElement("li");
    const name = document.createElement("span");
    const state = document.createElement("span");
    const isAdmin = lobbyAdminIds.includes(player.id);
    name.textContent = player.name + (player.host ? " (host)" : "");
    state.textContent = player.ai ? "AI PLAYER" : (player.host ? "HOST" : (player.ready ? "READY" : "NOT READY"));
    if (isAdmin) state.textContent += " / ADMIN";
    item.append(name, state);
    if (lobbyHost && !player.ai) {
      const role = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = isAdmin;
      checkbox.disabled = lobbyStarted;
      checkbox.setAttribute("aria-label", "Give admin access to " + player.name);
      checkbox.addEventListener("change", function () {
        const adminIds = lobbyAdminIds.filter(function (adminId) { return adminId !== player.id; });
        if (checkbox.checked) adminIds.push(player.id);
        if (lobbySocket && lobbySocket.readyState === WebSocket.OPEN) {
          lobbySocket.send(JSON.stringify({ type: "set-admins", adminIds: adminIds }));
        }
      });
      role.className = "lobby-admin-role";
      role.append(checkbox, document.createTextNode("Admin"));
      item.append(role);
    }
    lobbyPlayerList.append(item);
  }

  const otherPlayer = lobbyPlayers.find(function (player) { return !player.host; });
  lobbyReadyButton.hidden = lobbyHost;
  lobbyStartButton.hidden = !lobbyHost;
  lobbyAIControls.hidden = !lobbyHost || lobbyStarted;
  lobbyReadyButton.textContent = lobbyReady ? "Not Ready" : "Ready";
  lobbyReadyButton.setAttribute("aria-pressed", String(lobbyReady));
  const hasAdminBattleSurvivor = lobbyPlayers.some(function (player) {
    return !player.ai && !lobbyAdminIds.includes(player.id);
  });
  lobbyStartButton.disabled = !otherPlayer || !otherPlayer.ready || lobbyStarted || (adminBattleModeInput.checked && !hasAdminBattleSurvivor);
  adminBattleModeInput.disabled = lobbyActive || !lobbyHost;
}

function showLobbyRoom(message) {
  lobbySetup.hidden = true;
  lobbyRoom.hidden = false;
  multiplayerChat.hidden = false;
  lobbyCodeOutput.textContent = lobbyCode;
  lobbyPlayers = message.players || [];
  lobbyAdminIds = Array.isArray(message.adminIds) ? message.adminIds : lobbyPlayers.filter(function (player) { return player.admin; }).map(function (player) { return player.id; });
  const localPlayer = lobbyPlayers.find(function (player) { return player.id === lobbyPlayerId; });
  lobbyReady = Boolean(localPlayer && localPlayer.ready);
  renderLobbyPlayers();
  if (lobbyHost && lobbyPlayers.length === 1) {
    setLobbyStatus("Lobby created. Share the code with a friend.");
  } else if (!lobbyHost && !lobbyReady) {
    setLobbyStatus("You joined. Mark yourself ready when you are set.");
  } else {
    setLobbyStatus("The lobby is ready. The host can start when everyone is set.");
  }
}

function resetLobby(message) {
  lobbyActive = false;
  lobbyStarted = false;
  lobbyHost = false;
  lobbyReady = false;
  lobbyPlayerId = null;
  lobbyCode = "";
  lobbyPlayers = [];
  lobbyAdminIds = [];
  lobbySetup.hidden = false;
  adminBattleModeInput.disabled = false;
  lobbyRoom.hidden = true;
  lobbyCodeOutput.textContent = "";
  lobbyPlayerList.replaceChildren();
  multiplayerChat.hidden = true;
  chatMessages.replaceChildren();
  chatStatus.textContent = "";
  setLobbyActionInFlight(false);
  setMultiplayerStatus("");
  if (message) setLobbyStatus(message);
}

function startLobbyGame(message) {
  lobbyActive = true;
  lobbyStarted = true;
  lobbyHost = message.host;
  lobbyPlayerId = message.playerId;
  lobbyPlayers = message.players || [];
  lobbyAdminIds = Array.isArray(message.adminIds) ? message.adminIds : lobbyPlayers.filter(function (player) { return player.admin; }).map(function (player) { return player.id; });
  lobbyRoom.hidden = true;
  window.beginLobbyGame(lobbyHost, lobbyPlayerId, Boolean(message.adminBattle), lobbyAdminIds);
  window.setMultiplayerPlayers(lobbyPlayers);
  hostWindowHidden = false;
  lastSnapshotReceivedAt = performance.now();
  const localIsAdmin = lobbyAdminIds.includes(lobbyPlayerId);
  setMultiplayerStatus(message.adminBattle
    ? (localIsAdmin ? "Admin Battle: use your admin panel; the other players must survive." : "Admin Battle: survive the admins' challenges.")
    : (localIsAdmin ? "You have admin access in this game." : (lobbyHost ? "Hosting live game" : "Connected; waiting for the game stream...")));
  if (lobbyHost) sendHostVisibility();
  if (lobbyHost) {
    window.addLobbyAIPlayers(lobbyPlayers.filter(function (player) { return player.ai; }));
  }
}

function handleLobbyMessage(message) {
  if (message.type === "created" || message.type === "joined") {
    lobbyCode = message.code;
    lobbyPlayerId = message.playerId;
    lobbyHost = message.host;
    lobbyActive = true;
    setLobbyActionInFlight(false);
    lobbyCodeInput.value = lobbyCode;
    return;
  }
  if (message.type === "room-state") {
    lobbyCode = message.code;
    lobbyAdminIds = Array.isArray(message.adminIds) ? message.adminIds : [];
    showLobbyRoom(message);
    if (lobbyStarted) {
      lobbyPlayers = message.players || [];
      window.setMultiplayerPlayers(lobbyPlayers);
    }
    return;
  }
  if (message.type === "started") {
    startLobbyGame(message);
    return;
  }
  if (message.type === "paddle") {
    lobbyPlayers = lobbyPlayers.map(function (player) {
      return player.id === message.id ? Object.assign({}, player, message) : player;
    });
    window.setMultiplayerPlayers(lobbyPlayers);
    return;
  }
  if (message.type === "launch") {
    window.launchLobbyBall(message.id);
    return;
  }
  if (message.type === "admin-command") {
    if (lobbyHost && typeof window.runRemoteAdminCommand === "function") {
      window.runRemoteAdminCommand(message.adminId, message.command);
    }
    return;
  }
  if (message.type === "snapshot") {
    lastSnapshotReceivedAt = performance.now();
    window.applyLobbyGameSnapshot(message.state);
    if (!hostWindowHidden) setMultiplayerStatus("Live game stream");
    return;
  }
  if (message.type === "chat") {
    appendChatMessage(message);
    return;
  }
  if (message.type === "host-visibility") {
    hostWindowHidden = Boolean(message.hidden);
    setMultiplayerStatus(hostWindowHidden
      ? "Host window is in the background; live sync may pause. Keep the host window visible."
      : "Host is active; syncing live game...");
    return;
  }
  if (message.type === "left") {
    const wasStarted = lobbyStarted;
    resetLobby("You left the lobby.");
    if (wasStarted) window.endLobbyGame();
    if (lobbySocket && lobbySocket.isRealtime) {
      const socket = lobbySocket;
      window.setTimeout(function () { socket.close(); }, 100);
    }
    return;
  }
  if (message.type === "room-closed") {
    const wasStarted = lobbyStarted;
    resetLobby(message.message || "The lobby was closed.");
    if (wasStarted) window.endLobbyGame();
    if (lobbySocket && lobbySocket.isRealtime) {
      const socket = lobbySocket;
      window.setTimeout(function () { socket.close(); }, 100);
    }
    return;
  }
  if (message.type === "error") {
    setLobbyActionInFlight(false);
    setLobbyStatus(message.message);
  }
}

lobbyCreateButton.addEventListener("click", function () {
  sendLobbyAction({ type: "create", name: currentPlayerName(), adminBattle: adminBattleModeInput.checked });
});

lobbyJoinButton.addEventListener("click", function () {
  const code = lobbyCodeInput.value.trim().toUpperCase();
  if (code.length !== 6) {
    setLobbyStatus("Enter the six-character lobby code first.");
    return;
  }
  sendLobbyAction({ type: "join", code: code, name: currentPlayerName() });
});

lobbyReadyButton.addEventListener("click", function () {
  lobbyReady = !lobbyReady;
  if (lobbySocket && lobbySocket.readyState === WebSocket.OPEN) {
    lobbySocket.send(JSON.stringify({ type: "ready", ready: lobbyReady }));
  }
  renderLobbyPlayers();
  setLobbyStatus(lobbyReady ? "Ready. Waiting for the host to start." : "Not ready yet.");
});

lobbyAddAIButton.addEventListener("click", function () {
  if (!lobbyHost || !lobbySocket || lobbySocket.readyState !== WebSocket.OPEN) return;
  lobbySocket.send(JSON.stringify({ type: "add-ai", name: lobbyAINameInput.value.trim() }));
  lobbyAINameInput.value = "";
});

lobbyStartButton.addEventListener("click", function () {
  if (lobbySocket && lobbySocket.readyState === WebSocket.OPEN) {
    lobbySocket.send(JSON.stringify({ type: "start" }));
  }
});

lobbyLeaveButton.addEventListener("click", function () {
  const wasStarted = lobbyStarted;
  if (lobbySocket && lobbySocket.readyState === WebSocket.OPEN) {
    lobbySocket.send(JSON.stringify({ type: "leave" }));
  }
  resetLobby("You left the lobby.");
  if (wasStarted) window.endLobbyGame();
});

chatForm.addEventListener("submit", function (event) {
  event.preventDefault();
  const text = chatInput.value.trim().slice(0, 300);
  if (!text || !lobbyActive || !lobbySocket || lobbySocket.readyState !== WebSocket.OPEN) {
    chatStatus.textContent = "Chat is unavailable while disconnected.";
    return;
  }
  lobbySocket.send(JSON.stringify({ type: "chat", text: text }));
  chatInput.value = "";
  chatStatus.textContent = "";
});

window.leaveLobbySession = function () {
  const wasStarted = lobbyStarted;
  if (lobbySocket && lobbySocket.readyState === WebSocket.OPEN) {
    lobbySocket.send(JSON.stringify({ type: "leave" }));
  }
  resetLobby("You left the lobby.");
  if (wasStarted) window.endLobbyGame();
};

lobbyCopyButton.addEventListener("click", async function () {
  try {
    await navigator.clipboard.writeText(lobbyCode);
    setLobbyStatus("Lobby code copied.");
  } catch (error) {
    setLobbyStatus("Share this lobby code: " + lobbyCode);
  }
});

window.updateLobbyPaddle = function (x, angle, width, left, right) {
  if (!lobbyActive || !lobbyStarted || !lobbySocket || lobbySocket.readyState !== WebSocket.OPEN) return;
  const now = performance.now();
  if (now - lastPaddleSentAt < 40) return;
  lastPaddleSentAt = now;
  lobbySocket.send(JSON.stringify({ type: "paddle", x: x, angle: angle, width: width, left: Boolean(left), right: Boolean(right) }));
};

window.requestLobbyBallLaunch = function () {
  if (!lobbyActive || !lobbyStarted || lobbyHost || !lobbySocket || lobbySocket.readyState !== WebSocket.OPEN) return;
  lobbySocket.send(JSON.stringify({ type: "launch" }));
};

window.publishLobbyGameSnapshot = function () {
  if (!lobbyActive || !lobbyStarted || !lobbyHost || !lobbySocket || lobbySocket.readyState !== WebSocket.OPEN) return false;
  if (lobbySocket.bufferedAmount > 262144) return false;
  try {
    lobbySocket.send(JSON.stringify({ type: "snapshot", state: window.getLobbyGameSnapshot() }));
    return true;
  } catch (error) {
    setLobbyStatus("Game sync paused after a network error. Leave and rejoin the lobby to continue.");
    return false;
  }
};

function sendHostVisibility() {
  if (!lobbyActive || !lobbyStarted || !lobbyHost || !lobbySocket || lobbySocket.readyState !== WebSocket.OPEN) return;
  lobbySocket.send(JSON.stringify({ type: "host-visibility", hidden: document.hidden }));
}

document.addEventListener("visibilitychange", sendHostVisibility);

window.setInterval(function () {
  if (!lobbyActive || !lobbyStarted || lobbyHost || hostWindowHidden) return;
  if (performance.now() - lastSnapshotReceivedAt > 1000) {
    setMultiplayerStatus("Game stream is stale; checking the host connection...");
  }
}, 500);