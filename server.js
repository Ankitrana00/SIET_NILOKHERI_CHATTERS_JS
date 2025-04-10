const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const waitingUsers = [];

app.use(express.static(path.join(__dirname)));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
  io.emit("activeUsers", io.engine.clientsCount);

  findMatch(socket);

  socket.on("chatMessage", (msg) => {
    if (socket.partnerId) {
      io.to(socket.partnerId).emit("chatMessage", msg);
    }
  });

  socket.on("typing", () => {
    if (socket.partnerId) {
      io.to(socket.partnerId).emit("typing");
    }
  });

  socket.on("seen", () => {
    if (socket.partnerId) {
      io.to(socket.partnerId).emit("seen");
    }
  });

  socket.on("photo", (imageData) => {
    if (socket.partnerId) {
      io.to(socket.partnerId).emit("photo", imageData);
    }
  });

  socket.on("disconnectChat", () => {
    if (socket.partnerId) {
      io.to(socket.partnerId).emit("chatEnded");
    }
    disconnectFromPartner(socket);
  });

  socket.on("findNewMatch", () => {
    disconnectFromPartner(socket);
    findMatch(socket);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    disconnectFromPartner(socket);
    io.emit("activeUsers", io.engine.clientsCount);
  });
});

// Matchmaking function
function findMatch(socket) {
  if (waitingUsers.length > 0) {
    const partner = waitingUsers.pop();
    pairSockets(socket, partner);
  } else {
    waitingUsers.push(socket);
  }
}

// Pairing function
function pairSockets(s1, s2) {
  s1.partnerId = s2.id;
  s2.partnerId = s1.id;
  s1.emit("startChat");
  s2.emit("startChat");
}

// Clean disconnection logic
function disconnectFromPartner(socket) {
  if (socket.partnerId) {
    const partner = io.sockets.sockets.get(socket.partnerId);
    if (partner) {
      partner.partnerId = null;
      partner.emit("chatEnded");
    }
  }
  socket.partnerId = null;

  const index = waitingUsers.indexOf(socket);
  if (index !== -1) waitingUsers.splice(index, 1);
}

// Broadcast active users every 5 seconds
setInterval(() => {
  io.emit("activeUsers", io.engine.clientsCount);
}, 5000);

// Railway/Heroku compatibility
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});







