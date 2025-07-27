const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const mongoose = require('mongoose');
const Message = require('./models/message');
const cors = require('cors'); // ← ADD THIS LINE

const app = express();
const server = http.createServer(app);

// ⬇️ ADD YOUR FRONTEND URL FROM VERCEL HERE
const FRONTEND_ORIGIN = 'https://chat-mbiv35n1f-akshit-negis-projects.vercel.app';

// Enable CORS for Express
app.use(cors({
  origin: FRONTEND_ORIGIN,
  methods: ['GET', 'POST'],
  credentials: true
}));

// Enable CORS for Socket.IO
const io = new Server(server, {
  cors: {
    origin: FRONTEND_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const users = new Map(); // socket.id -> username

// Connect to MongoDB
mongoose.connect('mongodb+srv://akshitnegi5011:mychatapp123@cluster0.2nxbofw.mongodb.net/chatapp?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ Connected to MongoDB Atlas');
}).catch((err) => {
  console.error('❌ MongoDB connection error:', err);
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve frontend HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.IO logic
io.on('connection', async (socket) => {
  console.log('A user connected');

  try {
    const messages = await Message.find().sort({ timestamp: 1 }).limit(100);
    socket.emit('chat history', messages);
  } catch (err) {
    console.error('Error fetching chat history:', err);
  }

  socket.on('set username', (username) => {
    users.set(socket.id, username);
    io.emit('user joined', username);
    io.emit('update user list', Array.from(users.values()));
  });

  socket.on('chat message', (data) => {
    const newMessage = new Message({
      username: data.username,
      message: data.message
    });

    newMessage.save().then(() => {
      io.emit('chat message', data);
    }).catch((err) => {
      console.log('Error saving message to DB:', err);
    });
  });

  socket.on('private message', (data) => {
    const recipientSocket = getSocketIdFromUsername(data.to);
    if (recipientSocket) {
      io.to(recipientSocket).emit('private message', {
        from: data.from,
        message: data.message
      });
    }
  });

  socket.on('typing', (username) => {
    socket.broadcast.emit('typing', username);
  });

  socket.on('stop typing', () => {
    socket.broadcast.emit('stop typing');
  });

  socket.on('disconnect', () => {
    const username = users.get(socket.id);
    if (username) {
      io.emit('user left', username);
      users.delete(socket.id);
      io.emit('update user list', Array.from(users.values()));
    }
    console.log('A user disconnected');
  });

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
