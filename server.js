const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const mongoose = require('mongoose');
const Message = require('./models/message');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const users = new Map(); // socket.id -> username

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/chatapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Serve the frontend HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle Socket.IO connections
io.on('connection', async (socket) => {
  console.log('A user connected');

  // Load previous chat messages
  try {
    const messages = await Message.find().sort({ timestamp: 1 }).limit(100);
    socket.emit('chat history', messages);
  } catch (err) {
    console.error('Error fetching chat history:', err);
  }

  // Set the username
  socket.on('set username', (username) => {
    users.set(socket.id, username);
    io.emit('user joined', username); // Broadcast that the user joined
    io.emit('update user list', Array.from(users.values())); // Update the user list
  });

  // Handle public chat messages
  socket.on('chat message', (data) => {
    const newMessage = new Message({
      username: data.username,
      message: data.message
    });

    newMessage.save().then(() => {
      io.emit('chat message', data); // Broadcast the new message to all clients
    }).catch((err) => {
      console.log('Error saving message to DB:', err);
    });
  });

  // Handle private messages
  socket.on('private message', (data) => {
    const recipientSocket = getSocketIdFromUsername(data.to);
    if (recipientSocket) {
      io.to(recipientSocket).emit('private message', {
        from: data.from,
        message: data.message
      });
    }
  });

  // Typing notifications
  socket.on('typing', (username) => {
    socket.broadcast.emit('typing', username);
  });

  socket.on('stop typing', () => {
    socket.broadcast.emit('stop typing');
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const username = users.get(socket.id);
    if (username) {
      io.emit('user left', username);
      users.delete(socket.id);
      io.emit('update user list', Array.from(users.values()));
    }
    console.log('A user disconnected');
  });

  // Helper to get socket ID by username
  function getSocketIdFromUsername(username) {
    for (let [socketId, user] of users.entries()) {
      if (user === username) return socketId;
    }
    return null;
  }
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
