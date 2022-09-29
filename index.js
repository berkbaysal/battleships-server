const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "http://localhost:3000" },
});

io.on("connection", (socket) => {
  console.log(`Connected: ${socket.id}`);

  socket.on("client-message", (message) => {
    console.log(`Client sent message: ${message}`);
  });
});

httpServer.listen(5000);

module.exports = app;
