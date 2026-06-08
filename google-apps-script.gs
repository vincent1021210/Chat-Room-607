const SPREADSHEET_ID = "1GE44VNCVqCBPj94hdIXzMP4l4YK4DRLPkdWLAIwkDr0";
const SHEET_NAME = "留言紀錄";

function doPost(e) {
  const payload = JSON.parse(e.postData.contents || "{}");
  const sheet = getSheet();

  sheet.appendRow([
    new Date(),
    payload.timestamp || "",
    payload.nickname || "",
    payload.message || "",
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow(["登記時間", "留言時間", "暱稱", "留言內容"]);
  }

  return sheet;
}
