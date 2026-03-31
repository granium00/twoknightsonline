const http = require("http");
const fs = require("fs");
const path = require("path");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

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

const rooms = new Map();

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const cleaned = decoded.replace(/\0/g, "");
  const resolved = path.normalize(path.join(ROOT, cleaned));
  if (!resolved.startsWith(ROOT)) return null;
  return resolved;
}

function randomRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function generateRoomCode() {
  let code = randomRoomCode();
  while (rooms.has(code)) {
    code = randomRoomCode();
  }
  return code;
}

function createRoom() {
  const code = generateRoomCode();
  const room = {
    code,
    members: new Set(),
    sockets: [null, null],
    latestState: null,
    started: false
  };
  rooms.set(code, room);
  return room;
}

function getRoomForSocket(socket) {
  const roomCode = socket?.data?.roomCode;
  if (!roomCode) return null;
  return rooms.get(roomCode) || null;
}

function getPlayerIndex(room, socketId) {
  return room ? room.sockets.findIndex(id => id === socketId) : -1;
}

function buildEmptyLobbyState() {
  return {
    roomCode: null,
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

function buildLobbyState(room, socketId) {
  const yourSlot = getPlayerIndex(room, socketId);
  return {
    roomCode: room.code,
    started: room.started,
    yourSlot,
    heroes: HERO_DEFS.map(hero => {
      const socketAtSlot = room.sockets[hero.index];
      return {
        index: hero.index,
        label: hero.label,
        taken: Boolean(socketAtSlot),
        isYours: socketAtSlot === socketId
      };
    })
  };
}

function emitLobbyState(room, io) {
  const targets = new Set();
  room.members.forEach(socketId => {
    if (socketId) targets.add(socketId);
  });
  room.sockets.forEach(socketId => {
    if (socketId) targets.add(socketId);
  });

  for (const [socketId, socket] of io.sockets.sockets) {
    if (socket.data.roomCode === room.code) {
      targets.add(socketId);
    }
  }

  targets.forEach(socketId => {
    io.to(socketId).emit("lobbyState", buildLobbyState(room, socketId));
  });
}

function tryStartRoom(room, io) {
  if (room.started) return;
  if (room.sockets.some(socketId => !socketId)) return;
  room.started = true;
  room.latestState = null;
  room.sockets.forEach((socketId, index) => {
    io.to(socketId).emit("matchStarted", {
      roomCode: room.code,
      isHost: index === 0,
      localPlayerIndex: index
    });
  });
  emitLobbyState(room, io);
}

function cleanupRoom(room) {
  if (!room) return;
  if (room.members.size > 0) return;
  if (room.sockets.some(Boolean)) return;
  rooms.delete(room.code);
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
    res.writeHead(200, { "Content-Type": type });
    fs.createReadStream(filePath).pipe(res);
  });
});

const io = new Server(server, {
  cors: { origin: "*" }
});

io.on("connection", socket => {
  socket.emit("lobbyState", buildEmptyLobbyState());

  socket.on("createRoom", () => {
    let room = getRoomForSocket(socket);
    if (room) {
      emitLobbyState(room, io);
      return;
    }
    room = createRoom();
    room.members.add(socket.id);
    socket.data.roomCode = room.code;
    socket.join(room.code);
    io.to(socket.id).emit("roomCreated", { roomCode: room.code });
    io.to(socket.id).emit("lobbyState", buildLobbyState(room, socket.id));
  });

  socket.on("joinRoom", payload => {
    const roomCode = String(payload?.roomCode || "").trim().toUpperCase();
    const room = rooms.get(roomCode);
    if (!room) {
      io.to(socket.id).emit("roomError", { message: "Room not found." });
      return;
    }
    if (room.started) {
      io.to(socket.id).emit("roomError", { message: "This match has already started." });
      return;
    }
    const currentRoom = getRoomForSocket(socket);
    if (currentRoom && currentRoom.code !== room.code) {
      io.to(socket.id).emit("roomError", { message: "Leave the current room first." });
      return;
    }
    room.members.add(socket.id);
    socket.data.roomCode = room.code;
    socket.join(room.code);
    io.to(socket.id).emit("roomJoined", { roomCode: room.code });
    emitLobbyState(room, io);
  });

  socket.on("selectHero", payload => {
    const room = getRoomForSocket(socket);
    const heroIndex = Number(payload?.heroIndex);
    if (!room) {
      io.to(socket.id).emit("roomError", { message: "Join a room first." });
      return;
    }
    if (room.started) {
      io.to(socket.id).emit("roomError", { message: "This match has already started." });
      return;
    }
    if (!Number.isInteger(heroIndex) || heroIndex < 0 || heroIndex >= HERO_DEFS.length) {
      io.to(socket.id).emit("roomError", { message: "Invalid hero." });
      return;
    }
    const currentIndex = getPlayerIndex(room, socket.id);
    const occupant = room.sockets[heroIndex];
    if (occupant && occupant !== socket.id) {
      io.to(socket.id).emit("roomError", { message: "This hero is already taken." });
      return;
    }
    if (currentIndex !== -1) {
      room.sockets[currentIndex] = null;
    }
    room.sockets[heroIndex] = socket.id;
    emitLobbyState(room, io);
    tryStartRoom(room, io);
  });

  socket.on("clientAction", action => {
    const room = getRoomForSocket(socket);
    if (!room || !room.started) return;
    const hostId = room.sockets[0];
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

  socket.on("disconnect", () => {
    const room = getRoomForSocket(socket);
    if (!room) return;
    const playerIndex = getPlayerIndex(room, socket.id);
    if (playerIndex !== -1) {
      room.sockets[playerIndex] = null;
    }
    room.members.delete(socket.id);
    room.started = false;
    room.latestState = null;
    socket.data.roomCode = null;

    for (const [otherId, otherSocket] of io.sockets.sockets) {
      if (otherId === socket.id) continue;
      if (otherSocket.data.roomCode !== room.code) continue;
      io.to(otherId).emit("roomError", { message: "Opponent left the room. Match stopped." });
    }

    emitLobbyState(room, io);
    cleanupRoom(room);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
