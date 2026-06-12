const SPREADSHEET_ID = "1GE44VNCVqCBPj94hdIXzMP4l4YK4DRLPkdWLAIwkDr0";
const SHEET_NAME = "留言紀錄";

function doGet(e) {
  const payload = {
    messages: getMessages(),
  };

  if (e && e.parameter && e.parameter.callback) {
    const output = `${e.parameter.callback}(${JSON.stringify(payload)})`;
    return ContentService.createTextOutput(output).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const payload = getPayload(e);
  const sheet = getSheet();
  const existingIds = getExistingMessageIds(sheet);
  const messages = Array.isArray(payload.messages) ? payload.messages : [payload];

  messages.forEach((message) => {
    if (!message.id || existingIds.has(message.id)) {
      return;
    }

    sheet.appendRow([
      message.id,
      new Date(),
      message.timestamp || "",
      message.nickname || "",
      message.message || "",
    ]);

    existingIds.add(message.id);
  });

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getPayload(e) {
  const formPayload = e && e.parameter ? e.parameter.payload : "";
  const rawPayload = e && e.postData ? e.postData.contents : "";
  const source = formPayload || rawPayload || "{}";

  return JSON.parse(source);
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow(["留言ID", "登記時間", "留言時間", "暱稱", "留言內容"]);
  }

  return sheet;
}

function getExistingMessageIds(sheet) {
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return new Set();
  }

  return new Set(
    sheet
      .getRange(2, 1, lastRow - 1, 1)
      .getValues()
      .flat()
      .filter(Boolean)
  );
}

function getMessages() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  return sheet
    .getRange(2, 1, lastRow - 1, 5)
    .getValues()
    .map((row) => ({
      id: row[0],
      createdAt: row[2],
      author: row[3],
      text: row[4],
      mine: false,
    }))
    .filter((message) => message.id && message.author && message.text)
    .filter((message) => !isSystemWelcomeMessage(message));
}

function isSystemWelcomeMessage(message) {
  return (
    message.author === "系統" &&
    message.text === "歡迎來到留言板。輸入暱稱與內容，就可以開始聊天式留言。"
  );
}
