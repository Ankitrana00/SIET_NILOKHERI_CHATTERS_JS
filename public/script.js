import { io } from "https://cdn.socket.io/4.7.2/socket.io.esm.min.js";

const socket = io();

const messageInput = document.getElementById("message-input");
const chatBox = document.getElementById("chat-box");
const sendBtn = document.getElementById("send-btn");
const emojiBtn = document.getElementById("emoji-btn");
const emojiPicker = document.getElementById("emoji-picker");
const photoBtn = document.getElementById("photo-btn");
const photoInput = document.getElementById("photo-input");
const statusEl = document.getElementById("status");
const timerEl = document.getElementById("timer");
const typingIndicator = document.getElementById("typing-indicator");
const newMatchBtn = document.getElementById("new-match-btn");
const disconnectBtn = document.getElementById("disconnect-btn");
const themeToggle = document.getElementById("toggle-theme");

let typing = false;
let timer;
let timeLeft = 300;

// == MESSAGE HANDLING ==
sendBtn.addEventListener("click", () => {
  const msg = messageInput.value.trim();
  if (msg) {
    appendMessage(msg, "user");
    socket.emit("chatMessage", msg);
    messageInput.value = "";
  }
});

messageInput.addEventListener("keypress", () => {
  if (!typing) {
    typing = true;
    socket.emit("typing");
    setTimeout(() => {
      typing = false;
    }, 2000);
  }
});

socket.on("chatMessage", (msg) => appendMessage(msg, "partner"));

function appendMessage(msg, sender) {
  const div = document.createElement("div");
  div.className = `chat-bubble ${sender}`;
  div.innerText = msg;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// == EMOJI PICKER ==
emojiBtn.addEventListener("click", () => {
  emojiPicker.style.display = emojiPicker.style.display === "none" ? "block" : "none";
});

emojiPicker.addEventListener("emoji-click", (event) => {
  messageInput.value += event.detail.unicode;
  emojiPicker.style.display = "none";
});

// == PHOTO SHARING ==
photoBtn.addEventListener("click", () => photoInput.click());

photoInput.addEventListener("change", () => {
  const file = photoInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      appendImage(reader.result, "user");
      socket.emit("photo", reader.result);
    };
    reader.readAsDataURL(file);
  }
});

function appendImage(dataUrl, sender) {
  const div = document.createElement("div");
  div.className = `chat-bubble ${sender}`;
  const img = document.createElement("img");
  img.src = dataUrl;
  div.appendChild(img);
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

socket.on("photo", (dataUrl) => appendImage(dataUrl, "partner"));

// == TYPING INDICATOR ==
socket.on("typing", () => {
  typingIndicator.style.display = "block";
  setTimeout(() => {
    typingIndicator.style.display = "none";
  }, 2000);
});

// == MATCHING ==
socket.on("status", (text) => {
  statusEl.innerText = text;
});

newMatchBtn.addEventListener("click", () => {
  socket.emit("findNewMatch");
});

disconnectBtn.addEventListener("click", () => {
  socket.emit("disconnectChat");
  resetChat();
});

function resetChat() {
  chatBox.innerHTML = "";
  statusEl.innerText = "Disconnected";
  clearInterval(timer);
  timerEl.innerText = "5:00";
  timeLeft = 300;
}

// == TIMER ==
function startTimer() {
  clearInterval(timer);
  timeLeft = 300;
  timer = setInterval(() => {
    timeLeft--;
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    timerEl.innerText = `${mins}:${secs.toString().padStart(2, "0")}`;
    if (timeLeft <= 0) {
      clearInterval(timer);
      socket.emit("disconnectChat");
      resetChat();
    }
  }, 1000);
}

socket.on("startChat", () => {
  statusEl.innerText = "You're connected!";
  resetChat();
  startTimer();
});

socket.on("partnerDisconnected", () => {
  statusEl.innerText = "Stranger disconnected.";
  resetChat();
});

// == THEME TOGGLE ==
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
});




