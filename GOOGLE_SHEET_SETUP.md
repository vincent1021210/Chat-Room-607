# Google 試算表自動登記設定

留言板不能直接寫入 Google 試算表分享網址，需要先把 `google-apps-script.gs` 部署成 Google Apps Script Web App。

## 設定步驟

1. 打開目標試算表：
   https://docs.google.com/spreadsheets/d/1GE44VNCVqCBPj94hdIXzMP4l4YK4DRLPkdWLAIwkDr0/edit
2. 點選「擴充功能」>「Apps Script」。
3. 將 `google-apps-script.gs` 的內容貼到 Apps Script 編輯器。
4. 點選「部署」>「新增部署作業」。
5. 類型選「網頁應用程式」。
6. 執行身分選「我」。
7. 存取權選「任何人」。
8. 部署後複製「網頁應用程式網址」。
9. 回到 `app.js`，把 `sheetWebAppUrl` 的空字串改成該網址。

完成後，留言板會把目前瀏覽器本機已有的留言補登到試算表，之後每次送出新留言也會自動新增到「留言紀錄」工作表。試算表會用「留言ID」避免重複登記。
