# mémoire｜個人備忘錄

一個使用 Vue + Vite 製作的繁體中文個人備忘錄。筆記只存放在目前瀏覽器，並可匯出 JSON 備份、在確認後完整還原。

## 本機開發

```bash
npm install
npm run dev
```

其他指令：

```bash
npm run test
npm run build
npm run preview
```

## 資料與備份

- 筆記與主題偏好會存放在瀏覽器的 Local Storage；清除瀏覽器網站資料後無法直接復原。
- 請定期使用「匯出備份」保留 JSON 檔案。
- 匯入備份會先顯示筆記數量；確認後會完全取代目前瀏覽器中的資料。

## GitHub Pages

推送至 `main` 後，`.github/workflows/deploy.yml` 會自動建置並發布網站。首次部署前，請到 GitHub 儲存庫的 **Settings → Pages**，將發布來源設定為 **GitHub Actions**。

工作流程會從 GitHub Pages 取得網站的 base path，再傳給 Vite 建置，因此可同時支援 `https://<帳號>.github.io/<repo>/` 專案網站與根網站。
