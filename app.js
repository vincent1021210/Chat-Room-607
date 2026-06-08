const storageKey = "chat-board-messages";
const nameKey = "chat-board-name";
const sheetWebAppUrl = "";
const sheetSyncedKey = "chat-board-sheet-synced-ids";

const messagesEl = document.querySelector("#messages");
const form = document.querySelector("#messageForm");
const input = document.querySelector("#messageInput");
const nameInput = document.querySelector("#displayName");
const nameHint = document.querySelector("#nameHint");
const saveNameButton = document.querySelector("#saveName");
const messageCount = document.querySelector("#messageCount");
const sendButton = document.querySelector(".send-button");
const template = document.querySelector("#messageTemplate");

const defaultMessages = [
  {
    id: crypto.randomUUID(),
    author: "系統",
    text: "歡迎來到留言板。輸入暱稱與內容，就可以開始聊天式留言。",
    createdAt: new Date().toISOString(),
    mine: false,
  },
];

let messages = loadMessages();

clearMessagesFromUrl();
clearMessagesByNumberFromUrl();
nameInput.value = localStorage.getItem(nameKey) || "";
updateComposerState();
renderMessages();
syncMessagesToSheet(messages);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const author = normalizeName(nameInput.value);
  const text = input.value.trim();

  if (!author) {
    showNameError();
    return;
  }

  if (!text) {
    input.focus();
    return;
  }

  localStorage.setItem(nameKey, author);

  const message = {
    id: crypto.randomUUID(),
    author,
    text,
    createdAt: new Date().toISOString(),
    mine: true,
  };

  messages.push(message);

  saveMessages();
  syncMessagesToSheet([message]);
  input.value = "";
  resizeComposer();
  renderMessages();
});

input.addEventListener("input", resizeComposer);

nameInput.addEventListener("change", updateComposerState);

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

saveNameButton.addEventListener("click", () => {
  nameInput.value = normalizeName(nameInput.value);
  updateComposerState();

  if (!nameInput.value) {
    showNameError();
    return;
  }

  localStorage.setItem(nameKey, nameInput.value);
  nameInput.focus();
});

function loadMessages() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(saved) && saved.length ? saved : [...defaultMessages];
  } catch {
    return [...defaultMessages];
  }
}

function clearMessagesFromUrl() {
  const params = new URLSearchParams(window.location.search);

  if (!params.has("clear")) {
    return;
  }

  messages = [];
  saveMessages();
  window.history.replaceState({}, "", window.location.pathname);
}

function clearMessagesByNumberFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const number = params.get("clearNumber");

  if (!number) {
    return;
  }

  messages = messages.filter((message) => !message.author.startsWith(`${number}號：`));
  saveMessages();
  window.history.replaceState({}, "", window.location.pathname);
}

function saveMessages() {
  localStorage.setItem(storageKey, JSON.stringify(messages));
}

function syncMessagesToSheet(messagesToSync) {
  if (!sheetWebAppUrl) {
    return;
  }

  const syncedIds = loadSyncedMessageIds();
  const unsyncedMessages = messagesToSync.filter((message) => message.id && !syncedIds.has(message.id));

  if (!unsyncedMessages.length) {
    return;
  }

  fetch(sheetWebAppUrl, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({
      messages: unsyncedMessages.map((message) => ({
        id: message.id,
        timestamp: message.createdAt,
        nickname: message.author,
        message: message.text,
      })),
    }),
  });

  unsyncedMessages.forEach((message) => syncedIds.add(message.id));
  saveSyncedMessageIds(syncedIds);
}

function loadSyncedMessageIds() {
  try {
    const saved = JSON.parse(localStorage.getItem(sheetSyncedKey) || "[]");
    return new Set(Array.isArray(saved) ? saved : []);
  } catch {
    return new Set();
  }
}

function saveSyncedMessageIds(syncedIds) {
  localStorage.setItem(sheetSyncedKey, JSON.stringify([...syncedIds]));
}

function renderMessages() {
  messagesEl.innerHTML = "";
  messageCount.textContent = String(messages.length);

  if (!messages.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "目前還沒有留言。留下第一則訊息，這裡就會開始像聊天一樣累積對話。";
    messagesEl.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();

  messages.forEach((message) => {
    const node = template.content.firstElementChild.cloneNode(true);
    const avatar = node.querySelector(".avatar");
    const author = node.querySelector("strong");
    const time = node.querySelector("time");
    const text = node.querySelector("p");

    node.classList.toggle("mine", Boolean(message.mine));
    avatar.textContent = getInitial(message.author);
    author.textContent = message.author;
    time.textContent = formatTime(message.createdAt);
    time.dateTime = message.createdAt;
    text.textContent = message.text;

    fragment.append(node);
  });

  messagesEl.append(fragment);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function normalizeName(name) {
  return name.trim();
}

function getInitial(name) {
  return (normalizeName(name) || "?").slice(0, 1).toUpperCase();
}

function formatTime(value) {
  return new Intl.DateTimeFormat("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function resizeComposer() {
  input.style.height = "auto";
  input.style.height = `${input.scrollHeight}px`;
}

function updateComposerState() {
  const hasName = Boolean(normalizeName(nameInput.value));
  sendButton.disabled = !hasName;
  nameHint.classList.toggle("error", !hasName);
  nameHint.textContent = hasName ? "暱稱已填寫，可以開始留言。" : "請先填寫暱稱，才能送出留言。";
}

function showNameError() {
  updateComposerState();
  nameInput.focus();
}
