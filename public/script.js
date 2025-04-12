const socket = io();

const chatBox = document.getElementById("chat-box");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const newMatchBtn = document.getElementById("new-match");
const emojiBtn = document.getElementById("emoji-btn");
const emojiPicker = document.getElementById("emoji-picker");
const photoBtn = document.getElementById("photo-btn");
const imageInput = document.getElementById("image-input");
const activeUsersDisplay = document.getElementById("active-users");
const timerDisplay = document.getElementById("timer");
const extendBtn = document.getElementById("extend-btn");
const typingIndicator = document.getElementById("typing-indicator");
const sound = document.getElementById("notification-sound");
const darkModeToggle = document.getElementById("dark-mode-toggle");

let timer;
let timeLeft = 300;

function sendMessage() {
  const message = messageInput.value;
  if (message.trim()) {
    socket.emit("chatMessage", message);
    addMessageBubble(message, "user", true);
    messageInput.value = "";
    triggerVibration();
  }
}

sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
  else socket.emit("typing");
});

function addMessageBubble(message, sender, showStatus = false) {
  const msgElement = document.createElement("div");
  msgElement.className = `chat-bubble ${sender}`;
  msgElement.textContent = message;

  msgElement.addEventListener("mouseenter", () => showReactionPopup(msgElement));
  msgElement.addEventListener("mouseleave", hideReactionPopup);

  if (showStatus) {
    const status = document.createElement("span");
    status.className = "status";
    status.textContent = "Sent";
    msgElement.appendChild(status);
  }

  chatBox.appendChild(msgElement);
  chatBox.scrollTop = chatBox.scrollHeight;
}

socket.on("chatMessage", (message) => {
  addMessageBubble(message, "partner");
  socket.emit("seen");
  sound.play();
  triggerVibration();
});

socket.on("photo", (base64Image) => {
  const img = document.createElement("img");
  img.src = base64Image;
  img.className = "chat-photo partner-photo";
  chatBox.appendChild(img);
  chatBox.scrollTop = chatBox.scrollHeight;
  sound.play();
  triggerVibration();
});

socket.on("seen", () => {
  const lastUserMsg = document.querySelector(".chat-bubble.user:last-child .status");
  if (lastUserMsg) lastUserMsg.textContent = "Seen";
});

socket.on("typing", () => {
  typingIndicator.style.display = "block";
  setTimeout(() => typingIndicator.style.display = "none", 1500);
});

socket.on("startChat", () => {
  clearInterval(timer);
  timeLeft = 300;
  startTimer();
});

socket.on("activeUsers", (count) => {
  activeUsersDisplay.textContent = `Active Users: ${count}`;
});

newMatchBtn.addEventListener("click", () => {
  const confirmLeave = confirm("Are you sure you want to leave this chat?");
  if (confirmLeave) {
    chatBox.innerHTML = "";
    socket.emit("findNewMatch");
  }
});

photoBtn.addEventListener("click", () => imageInput.click());

imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  if (file && file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = (e) => {
      socket.emit("photo", e.target.result);

      const img = document.createElement("img");
      img.src = e.target.result;
      img.className = "chat-photo user-photo";
      chatBox.appendChild(img);
      chatBox.scrollTop = chatBox.scrollHeight;
    };
    reader.readAsDataURL(file);
    triggerVibration();
  }
  imageInput.value = "";
});

function startTimer() {
  timerDisplay.textContent = `Time Left: ${timeLeft}s`;
  timer = setInterval(() => {
    timeLeft--;
    timerDisplay.textContent = `Time Left: ${timeLeft}s`;

    if (timeLeft <= 0) {
      clearInterval(timer);
      socket.emit("disconnectChat");
      alert("Chat ended! Find a new match.");
      chatBox.innerHTML = "";
      timeLeft = 300;
    }
  }, 1000);
}

extendBtn.addEventListener("click", () => {
  timeLeft += 300;
  triggerVibration();
});

emojiBtn.addEventListener("click", () => {
  emojiPicker.style.display = emojiPicker.style.display === "none" ? "block" : "none";
});

emojiPicker.addEventListener("emoji-click", (event) => {
  messageInput.value += event.detail.unicode;
  emojiPicker.style.display = "none";
});

document.addEventListener("click", (e) => {
  if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
    emojiPicker.style.display = "none";
  }
});

darkModeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  const icon = document.body.classList.contains("dark-mode") ? "🌞" : "🌓";
  darkModeToggle.textContent = icon;
});

let popup;
function showReactionPopup(parent) {
  if (popup) popup.remove();
  popup = document.createElement("div");
  popup.className = "reaction-popup";
  popup.innerHTML = "👍 😂 ❤️ 😮 😢 😡";

  popup.addEventListener("click", (e) => {
    if (e.target.textContent) {
      parent.textContent += " " + e.target.textContent;
      popup.remove();
    }
  });

  parent.appendChild(popup);
}

function hideReactionPopup() {
  if (popup) popup.remove();
}

function triggerVibration() {
  if (navigator.vibrate) navigator.vibrate(50);
}




