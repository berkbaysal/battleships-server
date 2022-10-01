const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");

//BASH COLOR VARIABLES
const greenText = "\x1B[32m";
const redText = "\x1B[31m";
//BASH COLOR VARIABLES

const app = express();
const port = 8080;
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  //on successful connection: 1- Log, 2-Leave default room, 3-Send a client update to initialize local state
  console.log(`${greenText}Connected: ${socket.id}`);
  leaveAllRooms(socket);
  socket.emit("client-update", { clientId: socket.id, activeGame: null });

  //handle room join request
  socket.on("join-room", (roomName) => {
    joinRoom(socket, roomName);
  });

  //handle create room request
  socket.on("create-room", (roomName) => {
    createRoom(socket, roomName);
  });

  //handle start-game request
  socket.on("start-game", (roomName) => {
    startGame(roomName);
    console.log(`Game started at room ${roomName}.`);
  });

  //handle & cleanup on disconnect
  socket.on("disconnect", () => {
    socket._cleanup;
    console.log(`${redText}Disconnected: ${socket.id}`);
  });
});

httpServer.listen(8080);

module.exports = app;

//connection functions

async function joinRoom(socket, roomName) {
  const sockets = await io.in(roomName).fetchSockets(); //see if room is in use
  if (sockets.length > 0) {
    //if room is NOT empty
    leaveAllRooms(socket); //leave default or previous room(s)
    socket.join(roomName); //join room
    io.to(roomName).emit("client-update", { roomName: roomName, players: [sockets[0].id, socket.id] }); //broadcast new player, roomname to host and player
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
    socket.emit("client-update", { roomName: roomName, players: [socket.id] }); //broadcast to self host and room name
    console.log(`Client ${socket.id} created room ${roomName}.`); //log room creation
  } else {
    //if room is already in use log it and refuse creation.
    console.log(`Client ${socket.id} tried to create room ${roomName} but it already exists.`);
  }
}
function leaveAllRooms(socket) {
  //force socket to leave default and previously joined rooms.
  socket.rooms.forEach((room) => {
    socket.leave(room);
  });
}

//game functions

function startGame(roomName) {
  io.to(roomName).emit("start-game");
}
