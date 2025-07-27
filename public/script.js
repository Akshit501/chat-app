document.addEventListener("DOMContentLoaded", () => {

  const socket = io('https://chat-app-dz69.onrender.com');
  const form = document.getElementById('form');
  const input = document.getElementById('input');
  const messagesList = document.getElementById('messages');
  const typingIndicator = document.getElementById('typingIndicator');
  const darkModeToggle = document.getElementById('darkModeToggle');
  const userList = document.getElementById('userList');
  const sendPrivateMessageBtn = document.getElementById('sendPrivateMessageBtn');
  

  
  


  let username = prompt("Enter your username");
  socket.emit('set username', username);

  let typingTimeout;

  // Load chat history when the page is loaded
socket.on('chat history', (messages) => {
  const messagesList = document.getElementById('messages');
  messages.forEach((data) => {
    const item = document.createElement('li');
    const avatar = document.createElement('div');
    const bubble = document.createElement('div');

    avatar.className = 'avatar';
    avatar.textContent = data.username[0].toUpperCase();

    bubble.className = 'message-bubble';
    bubble.textContent = `${data.username}: ${data.message}`;

    item.className = 'message-item';
    item.appendChild(avatar);
    item.appendChild(bubble);
    messagesList.appendChild(item);
  });
});


  // Send private message
  sendPrivateMessageBtn.addEventListener('click', () => {
    const toUser = prompt("Enter the username of the recipient:");
    const message = prompt("Enter your private message:");
    if (toUser && message) {
      socket.emit('private message', { from: username, to: toUser, message });
    }
  });

  // Typing effect
  input.addEventListener('input', () => {
    socket.emit('typing', username);
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit('stop typing');
    }, 1000);
  });

  // Send message
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.value) {
      socket.emit('chat message', {
        username: username,
        message: input.value
      });
      input.value = '';
      socket.emit('stop typing');
    }
  });
  
  
  // Handle chat message
  socket.on('chat message', (data) => {
    const item = document.createElement('li');
    const avatar = document.createElement('div');
    const bubble = document.createElement('div');

    avatar.className = 'avatar';
    avatar.textContent = data.username[0].toUpperCase();

    bubble.className = 'message-bubble';
    bubble.textContent = `${data.username}: ${data.message}`;

    item.className = 'message-item';
    item.appendChild(avatar);
    item.appendChild(bubble);

    messagesList.appendChild(item);
    item.scrollIntoView();


    // 🔊 Play notification sound
  const sound = document.getElementById('notificationSound');
  if (sound) {
    sound.play().catch(err => {
      console.warn("Couldn't play sound:", err);
    });
  }
  });

  // Handle private message
  socket.on('private message', (data) => {
    const li = document.createElement('li');
    li.textContent = `🔒 Private from ${data.from}: ${data.message}`;
    li.style.backgroundColor = '#f0f0f0';
    messagesList.appendChild(li);
  });

  // Typing indicator
  socket.on('typing', (user) => {
    typingIndicator.innerHTML = `${user} is typing <span class="typing-dots">.</span><span class="typing-dots">.</span><span class="typing-dots">.</span>`;
  });

  socket.on('stop typing', () => {
    typingIndicator.innerHTML = '';
  });

  // User join/leave messages
  socket.on('user joined', (username) => {
    const li = document.createElement('li');
    li.textContent = `${username} joined the chat`;
    li.style.fontStyle = 'italic';
    messagesList.appendChild(li);
  });

  socket.on('user left', (username) => {
    const li = document.createElement('li');
    li.textContent = `${username} left the chat`;
    li.style.fontStyle = 'italic';
    messagesList.appendChild(li);
  });

  // Update online users
  socket.on('update user list', (usernames) => {
    if (userList) {
      userList.innerHTML = '';
      usernames.forEach((user) => {
        const li = document.createElement('li');
        li.textContent = user;
        li.className = 'user-list-item';
        userList.appendChild(li);
      });
    }
  });

  // Dark mode toggle
  if (darkModeToggle) {
    darkModeToggle.addEventListener('change', () => {
      document.body.classList.toggle('dark-mode');
    });
  }
});
