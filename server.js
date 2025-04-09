const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Add this route for Railway health check
app.get('/', (req, res) => {
  res.send('🚀 SIET Nilokheri Chatters Server is running!');
});

let waitingUser = null;
let users = new Map(); // socketId -> partnerId

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Match users
    if (waitingUser && waitingUser !== socket.id) {
        users.set(socket.id, waitingUser);
        users.set(waitingUser, socket.id);

        io.to(socket.id).emit('startChat');
        io.to(waitingUser).emit('startChat');
        waitingUser = null;
    } else {
        waitingUser = socket.id;
    }

    // Active Users Count
    io.emit('activeUsers', io.engine.clientsCount);

    socket.on('chatMessage', (msg) => {
        const partnerId = users.get(socket.id);
        if (partnerId) {
            io.to(partnerId).emit('chatMessage', msg);
        }
    });

    socket.on('photo', (base64Image) => {
        const partnerId = users.get(socket.id);
        if (partnerId) {
            io.to(partnerId).emit('photo', base64Image);
        }
    });

    socket.on('typing', () => {
        const partnerId = users.get(socket.id);
        if (partnerId) {
            io.to(partnerId).emit('typing');
        }
    });

    socket.on('seen', () => {
        const partnerId = users.get(socket.id);
        if (partnerId) {
            io.to(partnerId).emit('seen');
        }
    });

    socket.on('findNewMatch', () => {
        const oldPartner = users.get(socket.id);
        if (oldPartner) {
            users.delete(oldPartner);
            io.to(oldPartner).emit('chatMessage', 'User left the chat. Looking for new match...');
        }
        users.delete(socket.id);
        if (waitingUser === socket.id) waitingUser = null;

        // Re-match logic
        if (waitingUser && waitingUser !== socket.id) {
            users.set(socket.id, waitingUser);
            users.set(waitingUser, socket.id);

            io.to(socket.id).emit('startChat');
            io.to(waitingUser).emit('startChat');
            waitingUser = null;
        } else {
            waitingUser = socket.id;
        }
    });

    socket.on('disconnectChat', () => {
        const partnerId = users.get(socket.id);
        if (partnerId) {
            io.to(partnerId).emit('chatMessage', 'User was disconnected due to inactivity.');
            users.delete(partnerId);
        }
        users.delete(socket.id);
        if (waitingUser === socket.id) waitingUser = null;
    });

    socket.on('disconnect', () => {
        const partnerId = users.get(socket.id);
        if (partnerId) {
            io.to(partnerId).emit('chatMessage', 'User disconnected.');
            users.delete(partnerId);
        }
        users.delete(socket.id);
        if (waitingUser === socket.id) waitingUser = null;

        io.emit('activeUsers', io.engine.clientsCount);
    });
});

// Listen on Railway's assigned port or fallback to 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});






