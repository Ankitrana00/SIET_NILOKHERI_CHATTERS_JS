const express = require("express");
const http = require("http");
const path = require("path");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, "public")));

// Serve index.html at root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --- Socket.io Logic ---
let users = [];

io.on("connection", (socket) => {
  users.push(socket);
  updateActiveUsers();

  let partner = null;

  const match = users.find((u) => u !== socket && !u.partner);
  if (match) {
    partner = match;
    partner.partner = socket;
    socket.partner = partner;

    socket.emit("startChat");
    partner.emit("startChat");
  }

  socket.on("chatMessage", (msg) => {
    if (socket.partner) socket.partner.emit("chatMessage", msg);
  });

  socket.on("photo", (data) => {
    if (socket.partner) socket.partner.emit("photo", data);
  });

  socket.on("typing", () => {
    if (socket.partner) socket.partner.emit("typing");
  });

  socket.on("seen", () => {
    if (socket.partner) socket.partner.emit("seen");
  });

  socket.on("disconnectChat", () => {
    if (socket.partner) {
      socket.partner.partner = null;
      socket.partner.emit("disconnect");
      socket.partner = null;
    }
  });

  socket.on("findNewMatch", () => {
    if (socket.partner) {
      socket.partner.partner = null;
      socket.partner.emit("disconnect");
      socket.partner = null;
    }

    // re-match logic
    const available = users.find((u) => u !== socket && !u.partner);
    if (available) {
      partner = available;
      partner.partner = socket;
      socket.partner = partner;

      socket.emit("startChat");
      partner.emit("startChat");
    }
  });

  socket.on("disconnect", () => {
    users = users.filter((u) => u !== socket);
    if (socket.partner) {
      socket.partner.partner = null;
      socket.partner.emit("disconnect");
    }
    updateActiveUsers();
  });

  function updateActiveUsers() {
    const count = users.length;
    io.emit("activeUsers", count);
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});







