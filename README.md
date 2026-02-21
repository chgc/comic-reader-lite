# 8comic Viewer

8comic Viewer 是一個前後端分離的漫畫閱讀器：

- 前端：Angular 21（Standalone + Signals）
- 後端：Go（`net/http`）
- 部署：Docker Compose（Nginx 代理 `/api` 到 backend）

## 專案結構

```text
8comic-viewer/
├─ backend/    # Go API：健康檢查、漫畫章節與頁面解析
├─ frontend/   # Angular 閱讀器 UI
├─ docs/       # 架構與 API 文件
├─ justfile    # 常用開發指令
└─ docker-compose.yml
```

## 快速開始（推薦）

### 需求

- Docker + Docker Compose
- （可選）`just` 指令工具

### 一鍵啟動

在專案根目錄執行：

```bash
just release
```

此命令會依序執行：測試、建置、建立 Docker 映像、啟動服務。

啟動後預設網址：

- Frontend: http://localhost:28000
- Backend: http://localhost:28080
- Health check: http://localhost:28080/api/health

## 不使用 just 的方式

```bash
docker compose up -d --build
```

停止服務：

```bash
docker compose down
```

## 常用指令（just）

```bash
just install       # 安裝 frontend 套件
just test          # 執行 backend 測試
just build         # build backend + frontend
just docker-build  # build docker images
just up            # 啟動服務（預設 28000/28080）
just up-custom 39000 39080
just down
just logs
just ps
just restart
```

## 可設定環境變數

`docker-compose.yml` 支援以下變數（含預設值）：

- `FRONTEND_PORT`（預設 `28000`）
- `BACKEND_PORT`（預設 `28080`）
- `ADDR`（backend 監聽位址，預設 `:8080`）
- `EIGHTCOMIC_BASE_URL`（預設 `https://www.comicabc.com/html`）
- `EIGHTCOMIC_CHAPTER_URL_TEMPLATE`（預設 `https://articles.onemoreplace.tw/online/new-%s.html?ch=%s`）
- `EIGHTCOMIC_REFERER`（預設 `https://www.8comic.com/`）

範例：

```bash
FRONTEND_PORT=39000 BACKEND_PORT=39080 docker compose up -d --build
```

## 主要 API

- `GET /api/health`
- `GET /api/comics/{comicId}/meta?provider=8comic`
- `GET /api/comics/{comicId}/chapters?provider=8comic`
- `GET /api/comics/{comicId}/chapters/{chapter}/pages?provider=8comic`

更完整的回應格式與欄位請參考：

- `docs/api/backend-endpoints.md`

## 文件

- 架構總覽：`docs/architecture/system-overview.md`
- 前端狀態與儲存：`docs/frontend/state-and-storage.md`
- 後端解析策略：`docs/backend/parser-strategy.md`

## 授權與注意事項

本專案用於技術研究與個人閱讀流程驗證。若串接第三方內容來源，請自行確認並遵守來源網站之使用條款與相關法規。
