# 系統架構總覽

## 技術堆疊
- 前端：Angular v21（Standalone Component）
- 後端：Go（`net/http`）

## 分層
1. `frontend/`：閱讀器 UI、漫畫清單、閱讀進度狀態與 `localStorage` 持久化。
2. `backend/`：代理 API，提供 mock 與 8comic 來源解析能力。
3. `docs/`：依類型存放設計文件（architecture / api / frontend / backend）。

## 核心流程
1. 使用者在前端加入漫畫（ID、名稱、章節）。
2. 前端呼叫後端 `/api/comics/{id}/chapters/{chapter}/pages` 取得頁面圖片 URL。
3. 前端渲染圖片並在翻頁時更新 `localStorage` 閱讀進度。
4. 下次開啟時自動從 `localStorage` 恢復章節與頁碼。

