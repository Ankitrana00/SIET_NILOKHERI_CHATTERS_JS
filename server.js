const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from 'public'
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Matching logic
let waitingUser = null;
const partners = new Map();

function getPartner(socket) {
  return partners.get(socket.id);
}

function pairUsers(socket1, socket2) {
  partners.set(socket1.id, socket2);
  partners.set(socket2.id, socket1);
  socket1.emit("startChat");
  socket2.emit("startChat");
}

function removePartner(socket) {
  const partner = partners.get(socket.id);
  if (partner) {
    partner.emit("partnerDisconnected");
    partners.delete(partner.id);
  }
  partners.delete(socket.id);
}

function updateActiveUsers() {
  io.emit("activeUsers", io.engine.clientsCount);
}

// Socket.io connection
io.on("connection", (socket) => {
  console.log("User connected");
  updateActiveUsers();

  if (waitingUser && waitingUser.id !== socket.id) {
    pairUsers(socket, waitingUser);
    waitingUser = null;
  } else {
    waitingUser = socket;
  }

  // Chat message
  socket.on("chatMessage", (msg) => {
    const partner = getPartner(socket);
    if (partner) partner.emit("chatMessage", msg);
  });

  // Typing indicator
  socket.on("typing", () => {
    const partner = getPartner(socket);
    if (partner) partner.emit("typing");
  });

  // Seen indicator
  socket.on("seen", () => {
    const partner = getPartner(socket);
    if (partner) partner.emit("seen");
  });

  // Photo sharing
  socket.on("photo", (img) => {
    const partner = getPartner(socket);
    if (partner) partner.emit("photo", img);
  });

  // New match
  socket.on("findNewMatch", () => {
    removePartner(socket);
    if (waitingUser && waitingUser.id !== socket.id) {
      pairUsers(socket, waitingUser);
      waitingUser = null;
    } else {
      waitingUser = socket;
    }
  });

  // Chat timeout
  socket.on("disconnectChat", () => {
    removePartner(socket);
  });

  // Disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected");
    updateActiveUsers();

    if (waitingUser && waitingUser.id === socket.id) {
      waitingUser = null;
    }
    removePartner(socket);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});











