const http = require("http");
const fs = require("fs");
const path = require("path");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const BUILD_VERSION =
  process.env.RAILWAY_GIT_COMMIT_SHA ||
  process.env.RAILWAY_DEPLOYMENT_ID ||
  process.env.RAILWAY_PUBLIC_DOMAIN ||
  "dev";
const RECONNECT_GRACE_MS = 30000;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon"
};

const HERO_DEFS = [
  { index: 0, label: "Hero 1" },
  { index: 1, label: "Hero 2" }
];

const DEFAULT_ROOM_CODE = "MAIN";
const rooms = new Map();

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const cleaned = decoded.replace(/\0/g, "");
  const resolved = path.normalize(path.join(ROOT, cleaned));
  if (!resolved.startsWith(ROOT)) return null;
  return resolved;
}

function createRoom(code = DEFAULT_ROOM_CODE) {
  const room = {
    code,
    players: HERO_DEFS.map(() => ({
      clientId: null,
      socketId: null
    })),
    disconnectTimers: HERO_DEFS.map(() => null),
    latestState: null,
    started: false
  };
  rooms.set(code, room);
  return room;
}

function getOrCreateDefaultRoom() {
  return rooms.get(DEFAULT_ROOM_CODE) || createRoom(DEFAULT_ROOM_CODE);
}

function getRoomForSocket(socket) {
  const roomCode = socket?.data?.roomCode;
  if (!roomCode) return null;
  return rooms.get(roomCode) || null;
}

function getPlayerIndex(room, socketId) {
  return room ? room.players.findIndex(player => player.socketId === socketId) : -1;
}

function getPlayerIndexByClientId(room, clientId) {
  return room ? room.players.findIndex(player => player.clientId === clientId) : -1;
}

function buildEmptyLobbyState() {
  return {
    roomCode: DEFAULT_ROOM_CODE,
    started: false,
    yourSlot: -1,
    heroes: HERO_DEFS.map(hero => ({
      index: hero.index,
      label: hero.label,
      taken: false,
      isYours: false
    }))
  };
}

function buildLobbyState(room, clientId) {
  const yourSlot = getPlayerIndexByClientId(room, clientId);
  return {
    roomCode: room.code,
    started: room.started,
    yourSlot,
    heroes: HERO_DEFS.map(hero => {
      const slot = room.players[hero.index];
      return {
        index: hero.index,
        label: hero.label,
        taken: Boolean(slot?.clientId),
        isYours: slot?.clientId === clientId
      };
    })
  };
}

function emitLobbyState(room, io) {
  for (const [socketId, socket] of io.sockets.sockets) {
    if (socket.data.roomCode === room.code) {
      io.to(socketId).emit("lobbyState", buildLobbyState(room, socket.data.clientId));
    }
  }
}

function hasLiveSocket(io, socketId) {
  return Boolean(socketId && io?.sockets?.sockets?.has(socketId));
}

function countLiveRoomSockets(room, io) {
  if (!room) return 0;
  return room.players.reduce((count, player) => count + (hasLiveSocket(io, player?.socketId) ? 1 : 0), 0);
}

function hardResetRoom(room) {
  if (!room) return;
  room.started = false;
  room.latestState = null;
  room.players.forEach((player, index) => {
    if (!player) return;
    player.clientId = null;
    player.socketId = null;
    const timer = room.disconnectTimers[index];
    if (timer) {
      clearTimeout(timer);
      room.disconnectTimers[index] = null;
    }
  });
}

function syncRoomPresence(room, io) {
  if (!room) return;
  if (countLiveRoomSockets(room, io) === 0) {
    hardResetRoom(room);
    return;
  }
  room.players.forEach((player, index) => {
    if (!player) return;
    if (hasLiveSocket(io, player.socketId)) return;
    player.socketId = null;
    if (!room.disconnectTimers[index]) {
      player.clientId = null;
    }
  });
}

function tryStartRoom(room, io) {
  if (room.started) return;
  syncRoomPresence(room, io);
  if (room.players.some(player => !player.clientId || !player.socketId)) return;
  room.started = true;
  room.latestState = null;
  room.players.forEach((player, index) => {
    if (!player.socketId) return;
    io.to(player.socketId).emit("matchStarted", {
      roomCode: room.code,
      isHost: index === 0,
      localPlayerIndex: index
    });
  });
  emitLobbyState(room, io);
}

function cleanupRoom(room) {
  if (!room) return;
  if (room.players.some(player => player.clientId || player.socketId)) return;
  rooms.delete(room.code);
}

function cancelDisconnectTimer(room, playerIndex) {
  if (!room || playerIndex < 0) return;
  const timer = room.disconnectTimers[playerIndex];
  if (timer) {
    clearTimeout(timer);
    room.disconnectTimers[playerIndex] = null;
  }
}

function attachSocketToRoomPlayer(room, socket, playerIndex, io) {
  const player = room?.players?.[playerIndex];
  if (!player) return false;
  player.socketId = socket.id;
  cancelDisconnectTimer(room, playerIndex);
  socket.data.roomCode = room.code;
  socket.join(room.code);
  if (room.started) {
    io.to(socket.id).emit("matchStarted", {
      roomCode: room.code,
      isHost: playerIndex === 0,
      localPlayerIndex: playerIndex,
      resumed: true
    });
    if (room.latestState) {
      io.to(socket.id).emit("resumeState", room.latestState);
    }
  } else {
    io.to(socket.id).emit("roomJoined", { roomCode: room.code, resumed: true });
  }
  emitLobbyState(room, io);
  tryStartRoom(room, io);
  return true;
}

function tryRestoreSession(socket, io) {
  const clientId = socket?.data?.clientId;
  if (!clientId) return false;
  for (const room of rooms.values()) {
    const playerIndex = getPlayerIndexByClientId(room, clientId);
    if (playerIndex === -1) continue;
    return attachSocketToRoomPlayer(room, socket, playerIndex, io);
  }
  return false;
}

function finalizeDisconnect(room, playerIndex, io) {
  const player = room?.players?.[playerIndex];
  if (!player || player.socketId) return;
  player.clientId = null;
  room.latestState = null;
  room.started = false;
  room.disconnectTimers[playerIndex] = null;

  room.players.forEach((otherPlayer, otherIndex) => {
    if (otherIndex === playerIndex) return;
    if (!otherPlayer.socketId) return;
    io.to(otherPlayer.socketId).emit("roomError", { message: "Opponent disconnected. Match stopped." });
  });

  emitLobbyState(room, io);
  cleanupRoom(room);
}

const server = http.createServer((req, res) => {
  if (req.url && req.url.startsWith("/socket.io/")) {
    return;
  }
  const urlPath = req.url === "/" ? "/index.html" : req.url;
  const filePath = safePath(urlPath);
  if (!filePath) {
    res.writeHead(400);
    res.end("Bad request");
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME_TYPES[ext] || "application/octet-stream";
    const headers = { "Content-Type": type };
    if (ext === ".html" || ext === ".css" || ext === ".js") {
      headers["Cache-Control"] = "no-store, no-cache, must-revalidate, proxy-revalidate";
      headers.Pragma = "no-cache";
      headers.Expires = "0";
      headers["Surrogate-Control"] = "no-store";
    }
    if (ext === ".html") {
      fs.readFile(filePath, "utf8", (readErr, html) => {
        if (readErr) {
          res.writeHead(500);
          res.end("Failed to read html");
          return;
        }
        res.writeHead(200, headers);
        res.end(html.replaceAll("__BUILD_VERSION__", BUILD_VERSION));
      });
      return;
    }
    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
  });
});

const io = new Server(server, {
  cors: { origin: "*" }
});

io.on("connection", socket => {
  socket.data.clientId = String(socket.handshake.auth?.clientId || socket.id);
  if (!tryRestoreSession(socket, io)) {
    const room = getOrCreateDefaultRoom();
    syncRoomPresence(room, io);
    if (room.started) {
      socket.emit("roomError", { message: "Матч уже идет. Дождитесь следующей игры." });
      socket.emit("lobbyState", buildLobbyState(room, socket.data.clientId));
      return;
    }
    socket.data.roomCode = room.code;
    socket.join(room.code);
    io.to(socket.id).emit("lobbyState", buildLobbyState(room, socket.data.clientId));
  }

  socket.on("selectHero", payload => {
    const room = getRoomForSocket(socket);
    const heroIndex = Number(payload?.heroIndex);
    if (!room) {
      io.to(socket.id).emit("roomError", { message: "Лобби недоступно. Обновите страницу." });
      return;
    }
    if (room.started) {
      io.to(socket.id).emit("roomError", { message: "Матч уже начался." });
      return;
    }
    if (!Number.isInteger(heroIndex) || heroIndex < 0 || heroIndex >= HERO_DEFS.length) {
      io.to(socket.id).emit("roomError", { message: "Некорректный герой." });
      return;
    }
    syncRoomPresence(room, io);
    const currentIndex = getPlayerIndexByClientId(room, socket.data.clientId);
    const occupant = room.players[heroIndex];
    if (occupant?.clientId && occupant.clientId !== socket.data.clientId) {
      io.to(socket.id).emit("roomError", { message: "Этот герой уже занят." });
      return;
    }
    if (currentIndex !== -1) {
      room.players[currentIndex].clientId = null;
      room.players[currentIndex].socketId = null;
      cancelDisconnectTimer(room, currentIndex);
    }
    room.players[heroIndex].clientId = socket.data.clientId;
    room.players[heroIndex].socketId = socket.id;
    cancelDisconnectTimer(room, heroIndex);
    emitLobbyState(room, io);
    tryStartRoom(room, io);
  });

  socket.on("resetLobby", () => {
    const room = getOrCreateDefaultRoom();
    hardResetRoom(room);
    for (const [, otherSocket] of io.sockets.sockets) {
      if (otherSocket.data.roomCode === room.code) {
        otherSocket.data.roomCode = room.code;
        otherSocket.join(room.code);
      }
    }
    emitLobbyState(room, io);
  });

  socket.on("clientAction", action => {
    const room = getRoomForSocket(socket);
    if (!room || !room.started) return;
    const hostId = room.players[0]?.socketId;
    if (hostId) {
      io.to(hostId).emit("hostAction", action);
    }
  });

  socket.on("hostAction", action => {
    const room = getRoomForSocket(socket);
    if (!room || !room.started) return;
    const senderIndex = getPlayerIndex(room, socket.id);
    if (senderIndex !== 0) return;
    socket.to(room.code).emit("hostAction", action);
  });

  socket.on("hostState", state => {
    const room = getRoomForSocket(socket);
    if (!room || !room.started) return;
    const senderIndex = getPlayerIndex(room, socket.id);
    if (senderIndex !== 0) return;
    room.latestState = state;
    socket.to(room.code).emit("stateUpdate", state);
  });

  socket.on("sharedToast", payload => {
    const room = getRoomForSocket(socket);
    if (!room || !room.started) return;
    const senderIndex = getPlayerIndex(room, socket.id);
    if (senderIndex !== 0) return;
    const text = String(payload?.text || "").trim();
    if (!text) return;
    socket.to(room.code).emit("sharedToast", { text });
  });

  socket.on("privateUi", payload => {
    const room = getRoomForSocket(socket);
    if (!room || !room.started) return;
    const senderIndex = getPlayerIndex(room, socket.id);
    if (senderIndex !== 0) return;
    const playerIndex = Number(payload?.playerIndex);
    const type = String(payload?.type || "").trim();
    if (!Number.isInteger(playerIndex) || playerIndex < 0 || playerIndex >= room.players.length) return;
    if (!type) return;
    const targetSocketId = room.players[playerIndex]?.socketId;
    if (!targetSocketId) return;
    io.to(targetSocketId).emit("privateUi", {
      type,
      payload: payload?.payload || {}
    });
  });

  socket.on("disconnect", () => {
    const room = getRoomForSocket(socket);
    if (!room) return;
    const playerIndex = getPlayerIndex(room, socket.id);
    if (playerIndex !== -1) {
      room.players[playerIndex].socketId = null;
      cancelDisconnectTimer(room, playerIndex);
      room.disconnectTimers[playerIndex] = setTimeout(() => {
        finalizeDisconnect(room, playerIndex, io);
      }, RECONNECT_GRACE_MS);
    }
    socket.data.roomCode = null;
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
