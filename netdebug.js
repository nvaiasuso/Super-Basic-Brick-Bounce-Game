(function () {
  "use strict";

  try {
    const NativeWebSocket = window.WebSocket;
    const nativeStringify = JSON.stringify;
    const counters = {
      role: "UNKNOWN",
      lobbyActive: false,
      lobbyStarted: false,
      lobbyCode: "-",
      socket: null,
      frames: 0,
      updates: 0,
      framesPerSecond: 0,
      updatesPerSecond: 0,
      snapshotsSent: 0,
      snapshotsSentPerSecond: 0,
      lastSnapshotBytes: 0,
      lastStringifyError: "none",
      snapshotsReceived: 0,
      snapshotsReceivedPerSecond: 0,
      lastSnapshotAt: null,
      lastSnapshot: null,
      pingMs: null,
      pendingPings: new Map(),
      errors: [],
      events: [],
      lastBallSignature: null,
      lastBallChangeAt: performance.now(),
      lastRateAt: performance.now(),
      rateFrames: 0,
      rateUpdates: 0,
      rateSnapshotsSent: 0,
      rateSnapshotsReceived: 0,
      lastSelfTest: ""
    };

    function safely(action) {
      try {
        return action();
      } catch (error) {
        return undefined;
      }
    }

    function timestamp() {
      return new Date().toISOString().slice(11, 23);
    }

    function recordEvent(type) {
      safely(function () {
        counters.events.push({ type: String(type), at: timestamp() });
        if (counters.events.length > 20) counters.events.shift();
      });
    }

    function recordError(message) {
      safely(function () {
        counters.errors.push(String(message || "Unknown error"));
        if (counters.errors.length > 100) counters.errors.shift();
        recordEvent("error " + counters.errors[counters.errors.length - 1]);
      });
    }

    function byteLength(value) {
      try {
        return new TextEncoder().encode(value).length;
      } catch (error) {
        return value.length;
      }
    }

    JSON.stringify = function (value, replacer, space) {
      let isSnapshot = false;
      try {
        isSnapshot = Boolean(value && value.type === "snapshot");
      } catch (error) {
        isSnapshot = false;
      }
      try {
        const result = nativeStringify.call(JSON, value, replacer, space);
        if (isSnapshot && typeof result === "string") {
          safely(function () {
            counters.lastSnapshotBytes = byteLength(result);
            counters.lastStringifyError = "none";
          });
        }
        return result;
      } catch (error) {
        if (isSnapshot) {
          safely(function () {
            counters.lastStringifyError = String(error && error.message || error);
            recordEvent("snapshot stringify error");
          });
        }
        throw error;
      }
    };

    function updateLobbyState(message) {
      safely(function () {
        if (message.type === "created" || message.type === "joined") {
          counters.lobbyActive = true;
          counters.lobbyStarted = false;
          counters.role = message.host ? "HOST" : "GUEST";
          counters.lobbyCode = message.code || "-";
        } else if (message.type === "room-state") {
          counters.lobbyActive = true;
          counters.lobbyCode = message.code || counters.lobbyCode;
        } else if (message.type === "started") {
          counters.lobbyActive = true;
          counters.lobbyStarted = true;
          counters.role = message.host ? "HOST" : "GUEST";
        } else if (message.type === "left" || message.type === "room-closed") {
          counters.lobbyActive = false;
          counters.lobbyStarted = false;
          counters.lobbyCode = "-";
        }

        if (message.type === "snapshot") {
          counters.snapshotsReceived++;
          counters.rateSnapshotsReceived++;
          counters.lastSnapshotAt = performance.now();
          counters.lastSnapshot = message.state || null;
        }
        if (message.type === "pong" && counters.pendingPings.has(message.t)) {
          counters.pingMs = performance.now() - counters.pendingPings.get(message.t);
          counters.pendingPings.delete(message.t);
        }
        recordEvent("recv " + message.type);
      });
    }

    function trackSocket(socket) {
      safely(function () {
        counters.socket = socket;
        recordEvent("socket connecting");

        const nativeSend = socket.send;
        socket.send = function (data) {
          safely(function () {
            if (typeof data !== "string") return;
            const message = JSON.parse(data);
            if (!message || !message.type) return;
            recordEvent("send " + message.type);
            if (message.type === "snapshot") {
              counters.snapshotsSent++;
              counters.rateSnapshotsSent++;
            }
          });
          return nativeSend.call(socket, data);
        };

        socket.addEventListener("open", function () { recordEvent("socket open"); });
        socket.addEventListener("message", function (event) {
          safely(function () {
            if (typeof event.data !== "string") return;
            updateLobbyState(JSON.parse(event.data));
          });
        });
        socket.addEventListener("close", function () {
          recordEvent("socket close");
          counters.lobbyActive = false;
          counters.lobbyStarted = false;
          counters.lobbyCode = "-";
        });
        socket.addEventListener("error", function () { recordEvent("socket error"); });

        const pingTimer = window.setInterval(function () {
          safely(function () {
            if (socket.readyState !== NativeWebSocket.OPEN) return;
            const sentAt = performance.now();
            counters.pendingPings.set(sentAt, sentAt);
            socket.send(JSON.stringify({ type: "ping", t: sentAt }));
            for (const [key, startedAt] of counters.pendingPings) {
              if (sentAt - startedAt > 10000) counters.pendingPings.delete(key);
            }
          });
        }, 2000);
        socket.addEventListener("close", function () { window.clearInterval(pingTimer); }, { once: true });
      });
    }

    if (NativeWebSocket) {
      function DebugWebSocket() {
        const args = Array.prototype.slice.call(arguments);
        const socket = Reflect.construct(NativeWebSocket, args);
        trackSocket(socket);
        return socket;
      }
      DebugWebSocket.prototype = NativeWebSocket.prototype;
      Object.setPrototypeOf(DebugWebSocket, NativeWebSocket);
      window.WebSocket = DebugWebSocket;
    }

    if (typeof window.frame === "function") {
      const originalFrame = window.frame;
      window.frame = function () {
        safely(function () {
          counters.frames++;
          counters.rateFrames++;
        });
        return originalFrame.apply(this, arguments);
      };
    }

    if (typeof window.update === "function") {
      const originalUpdate = window.update;
      window.update = function () {
        safely(function () {
          counters.updates++;
          counters.rateUpdates++;
        });
        return originalUpdate.apply(this, arguments);
      };
    }

    const style = document.createElement("style");
    style.textContent = "#netdebug-toggle{position:fixed;z-index:10001;top:10px;right:10px;padding:5px 9px;border:1px solid #9aa6a0;background:#101714eF;color:#fff;font:12px monospace;cursor:pointer}#netdebug-panel{position:fixed;z-index:10000;width:min(360px,calc(100vw - 24px));max-height:72vh;overflow:auto;padding:10px;border:1px solid #95a69b;background:rgba(9,15,12,.92);color:#eef5ee;font:11px/1.35 monospace;box-shadow:0 4px 24px #0009}#netdebug-panel[hidden]{display:none}#netdebug-panel header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-weight:bold}#netdebug-panel button{font:inherit;padding:4px 7px;margin:2px}#netdebug-values{display:grid;gap:2px}#netdebug-values .line{display:flex;justify-content:space-between;gap:8px;white-space:pre-wrap;overflow-wrap:anywhere;border-bottom:1px solid #ffffff14;padding:2px 0}#netdebug-values .value{text-align:right}#netdebug-values .warn{color:#ff6464;font-weight:bold}#netdebug-tab-warning{color:#ff6464;font-weight:bold;margin:5px 0}#netdebug-actions{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px}#netdebug-result{white-space:pre-wrap;margin:7px 0 0;color:#cce9ce}#netdebug-events{white-space:pre-wrap;overflow-wrap:anywhere;color:#b8c5bd;max-height:110px;overflow:auto;margin:7px 0 0}#netdebug-panel .group-label{margin:6px 0 2px;color:#d8ebaa;font-weight:bold}#netdebug-panel .group[hidden]{display:none}";
    document.head.appendChild(style);

    const toggle = document.createElement("button");
    toggle.id = "netdebug-toggle";
    toggle.type = "button";
    toggle.textContent = "Debug";
    toggle.setAttribute("aria-expanded", "false");

    const panel = document.createElement("section");
    panel.id = "netdebug-panel";
    panel.hidden = true;
    panel.setAttribute("aria-label", "Network debug panel");

    const header = document.createElement("header");
    const title = document.createElement("span");
    title.textContent = "NETWORK DEBUG";
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.textContent = "Hide";
    header.append(title, closeButton);

    const values = document.createElement("div");
    values.id = "netdebug-values";
    const fieldElements = {};

    function addGroup(label, groupName) {
      const group = document.createElement("div");
      group.className = "group group-label group-" + groupName;
      group.textContent = label;
      values.appendChild(group);
    }

    function addField(name, label, groupName) {
      const row = document.createElement("div");
      row.className = "line group group-" + groupName;
      const labelElement = document.createElement("span");
      const valueElement = document.createElement("span");
      valueElement.className = "value";
      labelElement.textContent = label;
      row.append(labelElement, valueElement);
      values.appendChild(row);
      fieldElements[name] = valueElement;
    }

    addGroup("SESSION", "all");
    addField("role", "Role", "all");
    addField("lobby", "Lobby active / started", "all");
    addField("socket", "Socket / code", "all");
    addField("tab", "Hidden / focused", "all");
    addField("fps", "Frames per second", "all");
    addField("ups", "Updates per second", "all");
    addGroup("HOST NETWORK", "host");
    addField("sent", "Snapshots sent / sec", "host");
    addField("bytes", "Last snapshot bytes", "host");
    addField("stringify", "Last stringify error", "host");
    addField("buffer", "Socket buffered bytes", "host");
    addGroup("GUEST NETWORK", "guest");
    addField("received", "Snapshots received / sec", "guest");
    addField("snapshotAge", "Last snapshot age", "guest");
    addField("snapshotState", "Last snapshot level/lives/ball/bricks", "guest");
    addGroup("GAME STATE", "all");
    addField("ball", "Ball x/y/vx/vy", "all");
    addField("ballMotion", "Ball motion", "all");
    addField("game", "Over / won / paused", "all");
    addField("simulation", "Hit stop / level", "all");
    addField("interpBuffer", "Interpolation snapshots", "all");
    addField("interpDelay", "Interpolation delay", "all");
    addField("interpSnaps", "Large-jump snaps", "all");
    addField("ping", "Round-trip ping", "all");
    addField("errors", "Error count", "all");

    const tabWarning = document.createElement("div");
    tabWarning.id = "netdebug-tab-warning";
    tabWarning.textContent = "Warning: browsers pause hidden tabs, which freezes the host’s game.";
    tabWarning.hidden = true;

    const actions = document.createElement("div");
    actions.id = "netdebug-actions";
    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.textContent = "Copy report";
    const testButton = document.createElement("button");
    testButton.type = "button";
    testButton.textContent = "Run self-test";
    actions.append(copyButton, testButton);

    const result = document.createElement("div");
    result.id = "netdebug-result";
    const eventsView = document.createElement("div");
    eventsView.id = "netdebug-events";
    panel.append(header, tabWarning, values, actions, result, eventsView);
    document.body.append(toggle, panel);

    function getGameState() {
      try {
        return typeof window.getGameDebugState === "function" ? window.getGameDebugState() : null;
      } catch (error) {
        return null;
      }
    }

    function placePanel() {
      safely(function () {
        panel.style.left = "-10000px";
        panel.style.top = "0";
        panel.hidden = false;
        const width = panel.offsetWidth;
        const height = panel.offsetHeight;
        const margin = 12;
        const candidates = [
          { left: margin, top: margin },
          { left: window.innerWidth - width - margin, top: margin },
          { left: margin, top: window.innerHeight - height - margin },
          { left: window.innerWidth - width - margin, top: window.innerHeight - height - margin }
        ];
        const canvas = document.getElementById("game");
        const canvasRect = canvas && !canvas.hidden ? canvas.getBoundingClientRect() : null;
        let best = candidates[0];
        let bestOverlap = Infinity;
        for (const candidate of candidates) {
          const right = candidate.left + width;
          const bottom = candidate.top + height;
          const overlapWidth = canvasRect ? Math.max(0, Math.min(right, canvasRect.right) - Math.max(candidate.left, canvasRect.left)) : 0;
          const overlapHeight = canvasRect ? Math.max(0, Math.min(bottom, canvasRect.bottom) - Math.max(candidate.top, canvasRect.top)) : 0;
          const overlap = overlapWidth * overlapHeight;
          if (overlap < bestOverlap) {
            best = candidate;
            bestOverlap = overlap;
          }
          if (overlap === 0) break;
        }
        panel.style.left = Math.max(margin, best.left) + "px";
        panel.style.top = Math.max(margin, best.top) + "px";
      });
    }

    function setVisible(visible) {
      safely(function () {
        panel.hidden = !visible;
        toggle.setAttribute("aria-expanded", String(visible));
        if (visible) placePanel();
      });
    }

    function setField(name, value, warning) {
      safely(function () {
        const element = fieldElements[name];
        if (!element) return;
        element.textContent = String(value);
        element.classList.toggle("warn", Boolean(warning));
      });
    }

    function updateRates(now) {
      if (now - counters.lastRateAt < 1000) return;
      const elapsed = now - counters.lastRateAt;
      counters.framesPerSecond = counters.rateFrames * 1000 / elapsed;
      counters.updatesPerSecond = counters.rateUpdates * 1000 / elapsed;
      counters.snapshotsSentPerSecond = counters.rateSnapshotsSent * 1000 / elapsed;
      counters.snapshotsReceivedPerSecond = counters.rateSnapshotsReceived * 1000 / elapsed;
      counters.rateFrames = 0;
      counters.rateUpdates = 0;
      counters.rateSnapshotsSent = 0;
      counters.rateSnapshotsReceived = 0;
      counters.lastRateAt = now;
    }

    function render() {
      safely(function () {
        const now = performance.now();
        updateRates(now);
        const socket = counters.socket;
        const state = getGameState();
        const interpolation = safely(function () {
          return typeof window.getLobbyInterpolationDebugState === "function" ? window.getLobbyInterpolationDebugState() : null;
        });
        const ball = state && state.ball;
        const signature = ball ? [ball.x, ball.y, ball.vx, ball.vy].join("|") : "-";
        if (signature !== counters.lastBallSignature) {
          counters.lastBallSignature = signature;
          counters.lastBallChangeAt = now;
        }

        const hidden = document.hidden;
        const focused = safely(function () { return document.hasFocus(); }) === true;
        const socketState = socket && NativeWebSocket ? ["CONNECTING", "OPEN", "CLOSING", "CLOSED"][socket.readyState] || socket.readyState : "NONE";
        setField("role", counters.role, false);
        setField("lobby", counters.lobbyActive + " / " + counters.lobbyStarted, false);
        setField("socket", socketState + " / " + counters.lobbyCode, Boolean(counters.lobbyActive && (!socket || socket.readyState !== NativeWebSocket.OPEN)));
        setField("tab", hidden + " / " + focused, hidden);
        setField("fps", counters.framesPerSecond.toFixed(1), counters.framesPerSecond < 50);
        setField("ups", counters.updatesPerSecond.toFixed(1), counters.updatesPerSecond < 50);
        setField("sent", counters.snapshotsSentPerSecond.toFixed(1), false);
        setField("bytes", counters.lastSnapshotBytes, false);
        setField("stringify", counters.lastStringifyError, counters.lastStringifyError !== "none");
        setField("buffer", socket ? socket.bufferedAmount : "-", Boolean(socket && socket.bufferedAmount > 262144));
        setField("received", counters.snapshotsReceivedPerSecond.toFixed(1), false);
        const snapshotAge = counters.lastSnapshotAt !== null ? now - counters.lastSnapshotAt : Infinity;
        setField("snapshotAge", Number.isFinite(snapshotAge) ? snapshotAge.toFixed(0) + " ms" : "never", snapshotAge > 500);
        const lastSnapshot = counters.lastSnapshot;
        const snapshotBall = lastSnapshot && lastSnapshot.ball || {};
        const brickValue = lastSnapshot && lastSnapshot.bricks;
        const brickCount = Array.isArray(brickValue) ? brickValue.length : (brickValue && typeof brickValue === "object" ? Object.keys(brickValue).length : 0);
        setField("snapshotState", lastSnapshot ? [lastSnapshot.level, lastSnapshot.lives, snapshotBall.x, snapshotBall.y, brickCount].join(" / ") : "-", false);
        setField("ball", ball ? [ball.x, ball.y, ball.vx, ball.vy].map(function (value) { return Number(value).toFixed(1); }).join(" / ") : "-", false);
        const ballFrozen = now - counters.lastBallChangeAt >= 1000;
        setField("ballMotion", ballFrozen ? "BALL FROZEN" : "moving", ballFrozen);
        setField("game", state ? [state.gameOver, state.gameWon, state.paused].join(" / ") : "-", false);
        setField("simulation", state ? [state.hitStopFrames, state.level].join(" / ") : "-", false);
        setField("interpBuffer", interpolation ? interpolation.bufferSize : "-", false);
        setField("interpDelay", interpolation ? interpolation.delayMs + " ms" : "-", false);
        setField("interpSnaps", interpolation ? interpolation.snaps : "-", Boolean(interpolation && interpolation.snaps > 0));
        setField("ping", counters.pingMs === null ? "waiting" : counters.pingMs.toFixed(0) + " ms", counters.pingMs !== null && counters.pingMs >= 300);
        setField("errors", counters.errors.length, counters.errors.length > 0);
        tabWarning.hidden = !hidden;
        for (const element of panel.querySelectorAll(".group-host")) element.hidden = counters.role !== "HOST";
        for (const element of panel.querySelectorAll(".group-guest")) element.hidden = counters.role !== "GUEST";
        eventsView.textContent = counters.events.slice(-20).map(function (event) { return event.at + " " + event.type; }).join("\n");
      });
    }

    function buildReport() {
      const state = getGameState();
      const ball = state && state.ball || {};
      const socket = counters.socket;
      const snapshot = counters.lastSnapshot;
      const interpolation = safely(function () {
        return typeof window.getLobbyInterpolationDebugState === "function" ? window.getLobbyInterpolationDebugState() : null;
      });
      const guestAge = counters.lastSnapshotAt !== null ? performance.now() - counters.lastSnapshotAt : null;
      const lines = [
        "Block Breaker network report",
        "Role: " + counters.role,
        "Lobby active/started: " + counters.lobbyActive + "/" + counters.lobbyStarted,
        "Socket readyState: " + (socket ? socket.readyState : "none"),
        "Lobby code: " + counters.lobbyCode,
        "Document hidden/focused: " + document.hidden + "/" + safely(function () { return document.hasFocus(); }),
        "FPS/UPS: " + counters.framesPerSecond.toFixed(1) + "/" + counters.updatesPerSecond.toFixed(1),
        "Host snapshots/s, bytes, stringify error, bufferedAmount: " + [counters.snapshotsSentPerSecond.toFixed(1), counters.lastSnapshotBytes, counters.lastStringifyError, socket ? socket.bufferedAmount : "-"].join(", "),
        "Guest snapshots/s, age: " + [counters.snapshotsReceivedPerSecond.toFixed(1), guestAge === null ? "never" : guestAge.toFixed(0) + " ms"].join(", "),
        "Last guest snapshot: " + (snapshot ? [snapshot.level, snapshot.lives, snapshot.ball && snapshot.ball.x, snapshot.ball && snapshot.ball.y, Array.isArray(snapshot.bricks) ? snapshot.bricks.length : 0].join(" / ") : "-"),
        "Ball x/y/vx/vy: " + [ball.x, ball.y, ball.vx, ball.vy].join(" / "),
        "Ball frozen: " + (performance.now() - counters.lastBallChangeAt >= 1000),
        "Game over/won/paused: " + (state ? [state.gameOver, state.gameWon, state.paused].join(" / ") : "-"),
        "Hit stop/level: " + (state ? [state.hitStopFrames, state.level].join(" / ") : "-"),
        "Interpolation buffer/delay/snaps: " + (interpolation ? [interpolation.bufferSize, interpolation.delayMs + " ms", interpolation.snaps].join(" / ") : "-"),
        "Ping ms: " + (counters.pingMs === null ? "waiting" : counters.pingMs.toFixed(0)),
        "Errors: " + counters.errors.length + (counters.errors.length ? "\n" + counters.errors.join("\n") : ""),
        "Last 20 network events:"
      ];
      lines.push.apply(lines, counters.events.slice(-20).map(function (event) { return event.at + " " + event.type; }));
      return lines.join("\n");
    }

    async function copyReport() {
      try {
        const report = buildReport();
        await navigator.clipboard.writeText(report);
        result.textContent = "Report copied.";
      } catch (error) {
        safely(function () {
          const textarea = document.createElement("textarea");
          textarea.value = buildReport();
          document.body.appendChild(textarea);
          textarea.select();
          const copied = document.execCommand("copy");
          textarea.remove();
          result.textContent = copied ? "Report copied." : "Clipboard unavailable. Select the report from the debug panel.";
        });
      }
    }

    function runSelfTest() {
      safely(function () {
        const socket = counters.socket;
        const checks = [
          ["Socket is open", Boolean(socket && NativeWebSocket && socket.readyState === NativeWebSocket.OPEN)]
        ];
        if (counters.role === "HOST") {
          let snapshotWorks = false;
          try {
            const snapshot = window.getLobbyGameSnapshot();
            snapshotWorks = typeof nativeStringify(snapshot) === "string";
            counters.lastStringifyError = "none";
          } catch (error) {
            counters.lastStringifyError = String(error && error.message || error);
          }
          checks.push(["Host snapshot and JSON.stringify work", snapshotWorks]);
        } else if (counters.role === "GUEST") {
          checks.push(["Guest snapshot arrived within 2 seconds", Boolean(counters.lastSnapshotAt !== null && performance.now() - counters.lastSnapshotAt <= 2000)]);
        }
        checks.push(["Game loop updates exceed 50/s", counters.updatesPerSecond > 50]);
        checks.push(["Tab is visible", !document.hidden]);
        checks.push(["Ping is under 300 ms", counters.pingMs !== null && counters.pingMs < 300]);

        let failed = false;
        counters.lastSelfTest = checks.map(function (check) {
          if (failed) return "SKIP " + check[0];
          if (check[1]) return "PASS " + check[0];
          failed = true;
          return "FAIL " + check[0];
        }).join("\n");
        result.textContent = counters.lastSelfTest;
      });
    }

    toggle.addEventListener("click", function () { setVisible(panel.hidden); });
    closeButton.addEventListener("click", function () { setVisible(false); });
    copyButton.addEventListener("click", copyReport);
    testButton.addEventListener("click", runSelfTest);
    window.addEventListener("resize", function () { if (!panel.hidden) placePanel(); });
    window.addEventListener("keydown", function (event) {
      safely(function () {
        if (event.shiftKey && event.key.toLowerCase() === "d") {
          event.preventDefault();
          setVisible(panel.hidden);
        }
      });
    });
    window.addEventListener("error", function (event) {
      recordError(event.message || "Window error");
    });
    window.addEventListener("unhandledrejection", function (event) {
      const reason = event.reason;
      recordError(reason && reason.message ? reason.message : reason);
    });

    window.setInterval(render, 250);
  } catch (error) {
    try {
      console.error("Network debug panel failed to initialize", error);
    } catch (ignored) {
      // Debug setup must never interrupt the game.
    }
  }
})();