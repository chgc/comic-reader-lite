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
  - `provider`: 僅支援 `8comic`（預設 `8comic`）
  - `sourceUrl`: 可選，覆蓋 8comic 抓取來源網址
  - `referer`: 可選，指定上游請求 Referer（8comic 預設 `https://www.8comic.com/`）
- 回應：
```json
{
  "comicId": "100",
  "chapter": "1",
  "pages": ["https://.../1.jpg", "https://.../2.jpg"]
}
```

## 8comic provider 行為
- 若未提供 `sourceUrl`，預設使用 `https://articles.onemoreplace.tw/online/new-{comicId}.html?ch={chapter}`。
- 優先解析章節頁 script 的動態組圖邏輯（`$("#comics-pics").html(xx)`）計算完整圖片 URL。
- 若 script 解析失敗，fallback 解析 HTML 中可見的圖片 URL。

## `GET /api/comics/{comicId}/chapters`
- 用途：依漫畫 ID 取得章節清單
- Query：
  - `provider`: 僅支援 `8comic`（預設 `8comic`）
  - `sourceUrl`: 可選，覆寫章節清單來源網址
  - `referer`: 可選，指定上游請求 Referer
- 回應：
```json
{
  "comicId": "100",
  "chapters": [
    { "id": "1", "title": "第 1 話" },
    { "id": "2", "title": "第 2 話" }
  ]
}
```

## `GET /api/comics/{comicId}/meta`
- 用途：依漫畫 ID 取得漫畫基本資訊（名稱、作者、狀態、封面等）
- Query：
  - `provider`: 僅支援 `8comic`（預設 `8comic`）
  - `sourceUrl`: 可選，覆寫漫畫頁來源網址
  - `referer`: 可選，指定上游請求 Referer
- 回應：
```json
{
  "comicId": "20133",
  "title": "太散漫了,堀田老師!",
  "author": "なかだまお",
  "description": "果然堀田老師在外面和在家里面完全是兩個人呢!",
  "coverImageUrl": "https://www.8comic.com/pics/0/20133.jpg",
  "seriesStatus": "連載中",
  "chapterRange": "1-57",
  "updatedDate": "2026-02-21",
  "category": "少女系列",
  "ratingSummary": "打分人次: 0 , 總得分: 0 , 本月得分: 0",
  "sourceUrl": "https://www.8comic.com/html/20133.html"
}
```

