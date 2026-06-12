const nameKey = "chat-board-name";
const sheetWebAppUrl = "https://script.google.com/macros/s/AKfycbzIDLpiqAwg2rTBqis4B-ZH-yXJZ57pSuZ5JQo-47CXeFh-JkIz4xgISf-p9vW_sMnjgg/exec";
const classmates = [
  ["1號", "劉士弘"],
  ["2號", "郭哲瑜"],
  ["3號", "黃上恩"],
  ["4號", "邱思齊"],
  ["5號", "陳宥辰"],
  ["6號", "楊宇杰"],
  ["7號", "張軒凱"],
  ["8號", "邱德榮"],
  ["9號", "張久軒"],
  ["10號", "蘇昱誠"],
  ["11號", "秦紹軒"],
  ["12號", "陳庭豪"],
  ["13號", "蔡博任"],
  ["14號", "張祐實"],
  ["15號", "廖品筑"],
  ["16號", "李垣萱"],
  ["17號", "姚宥寧"],
  ["18號", "錢瑋婕"],
  ["19號", "陳亞歆"],
  ["20號", "許為婷"],
  ["21號", "連曼晴"],
  ["22號", "諶顥云"],
  ["23號", "賴暐璇"],
  ["24號", "林詠淇"],
  ["25號", "陳宥瑄"],
  ["27號", "張恩僑"],
];

const messagesEl = document.querySelector("#messages");
const form = document.querySelector("#messageForm");
const input = document.querySelector("#messageInput");
const nameInput = document.querySelector("#displayName");
const nameHint = document.querySelector("#nameHint");
const messageStatus = document.querySelector("#messageStatus");
const saveNameButton = document.querySelector("#saveName");
const messageCount = document.querySelector("#messageCount");
const sendButton = document.querySelector(".send-button");
const template = document.querySelector("#messageTemplate");
const sheetRefreshMs = 8000;

let messages = [];

populateNameOptions();
clearMessagesFromUrl();
clearMessagesByNumberFromUrl();
nameInput.value = localStorage.getItem(nameKey) || "";
updateComposerState();
renderMessages();
syncMessagesFromSheet();
window.setInterval(syncMessagesFromSheet, sheetRefreshMs);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const author = normalizeName(nameInput.value);
  const text = input.value.trim();

  if (!author) {
    showNameError();
    return;
  }

  if (!text) {
    setMessageStatus("請先寫下留言內容。", true);
    input.focus();
    return;
  }

  localStorage.setItem(nameKey, author);
  setMessageStatus("正在把留言送到聊天室與 Google Sheet。");
  sendButton.disabled = true;

  const message = {
    id: crypto.randomUUID(),
    author,
    text,
    createdAt: new Date().toISOString(),
    mine: true,
  };

  messages.push(message);
  syncMessagesToSheet([message]);
  input.value = "";
  resizeComposer();
  renderMessages();
  setMessageStatus("已送出。");
  window.setTimeout(() => setMessageStatus(""), 1800);
  sendButton.disabled = false;
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
  setMessageStatus("暱稱已儲存。");
  nameInput.focus();
});

function populateNameOptions() {
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "請選擇暱稱";
  nameInput.replaceChildren(placeholder);

  classmates.forEach(([number, name]) => {
    const option = document.createElement("option");
    option.value = `${number}：${name}`;
    option.textContent = `${number}：${name}`;
    nameInput.append(option);
  });
}

function clearMessagesFromUrl() {
  const params = new URLSearchParams(window.location.search);

  if (!params.has("clear")) {
    return;
  }

  messages = [];
  window.history.replaceState({}, "", window.location.pathname);
}

function clearMessagesByNumberFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const number = params.get("clearNumber");

  if (!number) {
    return;
  }

  messages = messages.filter((message) => !message.author.startsWith(`${number}號：`));
  window.history.replaceState({}, "", window.location.pathname);
}

function syncMessagesToSheet(messagesToSync) {
  if (!sheetWebAppUrl) {
    return;
  }

  const syncableMessages = messagesToSync.filter((message) => message.id);

  if (!syncableMessages.length) {
    return;
  }

  postMessagesToSheet({
    messages: syncableMessages.map((message) => ({
      id: message.id,
      timestamp: message.createdAt,
      nickname: message.author,
      message: message.text,
    })),
  });
}

function syncMessagesFromSheet() {
  if (!sheetWebAppUrl) {
    return;
  }

  const callbackName = `sheetSyncCallback_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const script = document.createElement("script");
  const separator = sheetWebAppUrl.includes("?") ? "&" : "?";

  window[callbackName] = (payload) => {
    try {
      mergeMessagesFromSheet(payload && Array.isArray(payload.messages) ? payload.messages : []);
    } finally {
      delete window[callbackName];
      script.remove();
    }
  };

  script.src = `${sheetWebAppUrl}${separator}callback=${callbackName}`;
  script.onerror = () => {
    delete window[callbackName];
    script.remove();
  };

  document.body.append(script);
}

function mergeMessagesFromSheet(remoteMessages) {
  const localById = new Map(messages.filter((message) => message.id).map((message) => [message.id, message]));
  messages = remoteMessages
    .filter((message) => !isSystemWelcomeMessage(message))
    .map((message) => ({
    ...message,
    mine: localById.get(message.id)?.mine ?? message.author === normalizeName(nameInput.value),
    }))
    .sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt));
  renderMessages();
}

function postMessagesToSheet(payload) {
  const iframe = document.createElement("iframe");
  const form = document.createElement("form");
  const input = document.createElement("input");
  const frameName = `sheet-sync-${Date.now()}`;

  iframe.name = frameName;
  iframe.hidden = true;

  form.action = sheetWebAppUrl;
  form.method = "POST";
  form.target = frameName;
  form.hidden = true;

  input.name = "payload";
  input.value = JSON.stringify(payload);

  form.append(input);
  document.body.append(iframe, form);
  form.submit();

  window.setTimeout(() => {
    iframe.remove();
    form.remove();
  }, 1500);
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

  const wasNearBottom = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 60;
  messagesEl.append(fragment);

  if (wasNearBottom || messages.length <= 2) {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
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
  setMessageStatus("請先選擇暱稱。", true);
  nameInput.focus();
}

function setMessageStatus(text, isError = false) {
  messageStatus.textContent = text;
  messageStatus.classList.toggle("error", isError);
}

function isSystemWelcomeMessage(message) {
  return (
    message.author === "系統" &&
    message.text === "歡迎來到留言板。輸入暱稱與內容，就可以開始聊天式留言。"
  );
}
