# 後端 API 設計

## `GET /api/health`
- 用途：健康檢查
- 回應：
```json
{ "status": "ok" }
```

## `GET /api/comics/{comicId}/chapters/{chapter}/pages`
- 用途：取得章節頁面圖片 URL 清單
- Query：
  - `provider`: `mock` 或 `8comic`（預設 `mock`）
  - `sourceUrl`: 可選，覆蓋 8comic 抓取來源網址
- 回應：
```json
{
  "comicId": "100",
  "chapter": "1",
  "pages": ["https://.../1.jpg", "https://.../2.jpg"]
}
```

## 8comic provider 行為
- 若未提供 `sourceUrl`，依 `EIGHTCOMIC_BASE_URL` + `{comicId}.html?ch={chapter}` 組成來源網址。
- 解析 HTML 中的 `<img src>` 與常見圖片 URL 字串，去重後回傳。

