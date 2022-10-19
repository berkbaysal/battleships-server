const express = require("express");
const cors = require("cors");
const { createServer } = require("http");
const { Server } = require("socket.io");

//BASH COLOR VARIABLES
const greenText = "\x1B[32m";
const redText = "\x1B[31m";
//BASH COLOR VARIABLES

const app = express();
app.use(cors());
const port = 8080;
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  //on successful connection: 1- Log, 2-Leave default room, 3-Send a client update to initialize local state
  console.log(`${greenText}Connected: ${socket.id}`);
  leaveAllRooms(socket);
  socket.emit("client-update", { clientId: socket.id, gameState: "inactive" });

  //handle room join request
  socket.on("join-room", (roomName) => {
    joinRoom(socket, roomName);
  });

  //handle create room request
  socket.on("create-room", (roomName) => {
    createRoom(socket, roomName);
  });

  //handle start-game request
  socket.on("start-game", ({ roomName, opponent }) => {
    startGame(opponent);
    io.to(roomName).emit("client-update", { turn: socket.id, gameState: "placement" });
    console.log(`Game started at room ${roomName}.`);
  });

  //handle placement phase done

  socket.on("ready", ({ opponent, opponentGameState }) => {
    console.log(`${socket.id} is ready to proceed, opponent is in ${opponentGameState}`);
    playerReady(socket, opponent, opponentGameState);
  });

  socket.on("game-over", ({ opponent, roomName }) => {
    console.log(`Game in room ${roomName} ended, ${opponent} won.`);
    io.to(opponent).emit("game-over");
  });

  //handle attack
  socket.on("attack-cell", ({ opponent: opponent, cell: cell }) => {
    console.log(`${opponent} attacked cell ${cell}`);
    attackCell(opponent, cell);
  });

  socket.on("attack-result", ({ opponent: opponent, cell: cell, outcome: outcome, roomName: roomName }) => {
    console.log(`Attack ${outcome ? "hit." : "missed."}`);
    reportAttackResult(opponent, cell, outcome);
    io.to(roomName).emit("client-update", { turn: socket.id });
  });

  //handle & cleanup on disconnect

  socket.on("disconnecting", () => {
    handleDisconnect(socket);
  });

  socket.on("disconnect", () => {
    socket._cleanup;
    console.log(`${redText}Disconnected: ${socket.id}`);
  });
});

httpServer.listen(8080);

module.exports = app;

//--------CONNECTION FUNCTIONS-----------

async function checkIfRoomExists(roomName, res) {
  const sockets = await io.in(roomName).fetchSockets(); //see if room is in use
  if (sockets.length > 0) res.json({ roomExists: true });
  else return res.json({ roomExists: false });
}

async function joinRoom(socket, roomName) {
  const sockets = await io.in(roomName).fetchSockets(); //see if room is in use
  if (sockets.length > 0) {
    //if room is NOT empty
    leaveAllRooms(socket); //leave default or previous room(s)
    socket.join(roomName); //join room
    const [hostId] = sockets.map((currentSocket) => currentSocket.id).filter((id) => id !== socket.id);
    io.to(socket.id).emit("client-update", { roomName: roomName, opponent: hostId, opponentGameState: "inactive", clientIsHost: false }); //send opponent id to client
    io.to(hostId).emit("client-update", { roomName: roomName, opponent: socket.id, opponentGameState: "inactive" }); //send opponent id to host
    console.log(`Client ${socket.id} joined room ${roomName}.`); //log event
  } else {
    // If user tries to "join" and empty room log it to console.
    console.log(`Client ${socket.id} tried to join room ${roomName} but it does not exist.`);
  }
}
async function createRoom(socket, roomName) {
  const sockets = await io.in(roomName).fetchSockets(); //see if room is in use
  if (sockets.length === 0) {
    //if room IS empty
    leaveAllRooms(socket); //leave default or previous room(s)
    socket.join(roomName); //join room
    socket.emit("client-update", { roomName: roomName, players: [socket.id], clientIsHost: true }); //broadcast to self host and room name
    console.log(`Client ${socket.id} created room ${roomName}.`); //log room creation
  } else {
    //if room is already in use log it and refuse creation.
    console.log(`Client ${socket.id} tried to create room ${roomName} but it already exists.`);
  }
}
function leaveAllRooms(socket) {
  //force socket to leave and previously joined rooms.
  socket.rooms.forEach((room) => {
    if (room !== socket.id) {
      socket.leave(room);
    }
  });
}

async function handleDisconnect(socket) {
  const sockets = await socket.rooms;
  for (const room of sockets.keys()) {
    if (room !== socket.id) {
      io.to(room).emit("opponent-left");
    }
  }
}

//--------GAME FUNCTIONS-----------

function startGame(opponent) {
  io.to(opponent).emit("start-game");
}
function attackCell(opponent, cell) {
  io.to(opponent).emit("attack-cell", cell);
}
function reportAttackResult(opponent, cell, outcome) {
  io.to(opponent).emit("attack-result", { cell: cell, outcome: outcome });
}
function playerReady(socket, opponent, opponentGameState) {
  if (opponentGameState === "waiting") {
    socket.emit("client-update", { opponentGameState: "active", gameState: "active" });
    io.to(opponent).emit("client-update", { opponentGameState: "active", gameState: "active" });
  } else {
    socket.emit("client-update", { gameState: "waiting" });
    io.to(opponent).emit("client-update", { opponentGameState: "waiting" });
  }
}

//API FUNCTIONS / ENDPOINTS

app.get("/checkRoom", (req, res) => {
  checkIfRoomExists(req.query.roomName, res);
});
