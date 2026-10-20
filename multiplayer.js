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

let lobbySocket = null;
let lobbyActionInFlight = false;
let lobbyPlayerId = null;
let lobbyCode = "";
let lobbyHost = false;
let lobbyActive = false;
let lobbyStarted = false;
let lobbyPlayers = [];
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

function setLobbyActionInFlight(value) {
  lobbyActionInFlight = value;
  lobbyCreateButton.disabled = value;
  lobbyJoinButton.disabled = value;
}

function getLobbySocketUrl() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return protocol + "//" + window.location.host + "/lobby";
}

function sendLobbyAction(action) {
  setLobbyActionInFlight(true);
  setLobbyStatus("Connecting to lobby...");
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

  lobbySocket = new WebSocket(getLobbySocketUrl());
  lobbySocket.addEventListener("open", function () {
    lobbySocket.send(JSON.stringify(action));
  }, { once: true });
  lobbySocket.addEventListener("message", function (event) {
    handleLobbyMessage(JSON.parse(event.data));
  });
  lobbySocket.addEventListener("error", function () {
    setLobbyActionInFlight(false);
    setLobbyStatus("Could not reach the lobby server. Start the game with npm start.");
  });
  lobbySocket.addEventListener("close", function () {
    if (lobbyActive) {
      const wasStarted = lobbyStarted;
      resetLobby("Lobby connection lost.");
      if (wasStarted && typeof window.endLobbyGame === "function") window.endLobbyGame();
    }
  });
}

function currentPlayerName() {
  return playerNameInput.value.trim().slice(0, 16) || "Player";
}

function renderLobbyPlayers() {
  lobbyPlayerList.replaceChildren();
  for (const player of lobbyPlayers) {
    const item = document.createElement("li");
    const name = document.createElement("span");
    const state = document.createElement("span");
    name.textContent = player.name + (player.host ? " (host)" : "");
    state.textContent = player.ai ? "AI PLAYER" : (player.host ? "HOST" : (player.ready ? "READY" : "NOT READY"));
    item.append(name, state);
    lobbyPlayerList.append(item);
  }

  const otherPlayer = lobbyPlayers.find(function (player) { return !player.host; });
  lobbyReadyButton.hidden = lobbyHost;
  lobbyStartButton.hidden = !lobbyHost;
  lobbyAIControls.hidden = !lobbyHost || lobbyStarted;
  lobbyReadyButton.textContent = lobbyReady ? "Not Ready" : "Ready";
  lobbyReadyButton.setAttribute("aria-pressed", String(lobbyReady));
  lobbyStartButton.disabled = !otherPlayer || !otherPlayer.ready || lobbyStarted;
}

function showLobbyRoom(message) {
  lobbySetup.hidden = true;
  lobbyRoom.hidden = false;
  lobbyCodeOutput.textContent = lobbyCode;
  lobbyPlayers = message.players || [];
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
  lobbySetup.hidden = false;
  lobbyRoom.hidden = true;
  lobbyCodeOutput.textContent = "";
  lobbyPlayerList.replaceChildren();
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
  lobbyRoom.hidden = true;
  window.beginLobbyGame(lobbyHost, lobbyPlayerId);
  window.setMultiplayerPlayers(lobbyPlayers);
  hostWindowHidden = false;
  lastSnapshotReceivedAt = performance.now();
  setMultiplayerStatus(lobbyHost ? "Hosting live game" : "Connected; waiting for the game stream...");
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
  if (message.type === "snapshot") {
    lastSnapshotReceivedAt = performance.now();
    window.applyLobbyGameSnapshot(message.state);
    if (!hostWindowHidden) setMultiplayerStatus("Live game stream");
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
    return;
  }
  if (message.type === "room-closed") {
    const wasStarted = lobbyStarted;
    resetLobby(message.message || "The lobby was closed.");
    if (wasStarted) window.endLobbyGame();
    return;
  }
  if (message.type === "error") {
    setLobbyActionInFlight(false);
    setLobbyStatus(message.message);
  }
}

lobbyCreateButton.addEventListener("click", function () {
  sendLobbyAction({ type: "create", name: currentPlayerName() });
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