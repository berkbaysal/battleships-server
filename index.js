const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");

const greenText = "\x1B[32m";
const redText = "\x1B[31m";

const app = express();
const port = 8080;
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  console.log(`${greenText}Connected: ${socket.id}`);
  leaveAllRooms(socket);
  socket.emit("client-update", { clientId: socket.id, activeGame: null });

  socket.on("join-room", (roomName) => {
    joinRoom(socket, roomName);
  });
  socket.on("create-room", (roomName) => {
    createRoom(socket, roomName);
  });
  socket.on("start-game", (roomName) => {
    startGame(roomName);
    console.log(`Game started at room ${roomName}.`);
  });
  socket.on("disconnect", () => {
    socket._cleanup;
    console.log(`${redText}Disconnected: ${socket.id}`);
  });
});

httpServer.listen(8080);

module.exports = app;

//connection functions

async function joinRoom(socket, roomName) {
  const sockets = await io.in(roomName).fetchSockets();
  if (sockets.length > 0) {
    leaveAllRooms(socket);
    socket.join(roomName);
    socket.emit("client-update", { roomName: roomName });
    console.log(`Client ${socket.id} joined room ${roomName}.`);
  } else {
    console.log(`Client ${socket.id} tried to join room ${roomName} but it does not exist.`);
  }
}
async function createRoom(socket, roomName) {
  const sockets = await io.in(roomName).fetchSockets();
  if (sockets.length === 0) {
    leaveAllRooms(socket);
    socket.join(roomName);
    socket.emit("client-update", { roomName: roomName });
    console.log(`Client ${socket.id} created room ${roomName}.`);
  } else {
    console.log(`Client ${socket.id} tried to create room ${roomName} but it already exists.`);
  }
}
function leaveAllRooms(socket) {
  socket.rooms.forEach((room) => {
    socket.leave(room);
  });
}

//game functions

function startGame(roomName) {
  io.to(roomName).emit("start-game");
}
