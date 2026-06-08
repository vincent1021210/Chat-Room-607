const SPREADSHEET_ID = "1GE44VNCVqCBPj94hdIXzMP4l4YK4DRLPkdWLAIwkDr0";
const SHEET_NAME = "留言紀錄";

function doPost(e) {
  const payload = JSON.parse(e.postData.contents || "{}");
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
