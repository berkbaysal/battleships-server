const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  console.log(`Connected: ${socket.id}`);

  socket.on("client-message", (message) => {
    console.log(`Client sent message: ${message}`);
  });
});

httpServer.listen(3000);

module.exports = app;
