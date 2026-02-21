# 8comic 章節/內容抓取規則模板

請依下列區塊填寫；每個步驟都盡量附上實際 URL、必要參數、Referer 與 Header 規則。

## 0) 名詞與輸入

- 網址: https://www.8comic.com/html/20133.html
- 漫畫 ID 範例：20133
- 章節 ID/章節序號定義：?ch=2
- 內容頁 page 定義：https://articles.onemoreplace.tw/online/new-20133.html?ch=2

---

## 1) 漫畫 ID -> 章節列表

### 1.1 Request

- Method: Get
- URL 模板: https://www.8comic.com/html/{{漫畫 ID}}.html

### 1.2 Response

- 格式: HTML
- 章節欄位位置: To be determine

### 1.3 解析規則

- 章節 ID 如何取得:
- 章節標題如何取得:
- 章節排序規則:

---

## 2) 章節 -> 內容資訊（頁數、圖片 key、或中繼資料）

### 2.1 Request

- Method: GET
- URL 模板: https://articles.onemoreplace.tw/online/new-{{漫畫 ID}}.html?ch={{章節}}
- Query/Path 參數:
- 必要 Headers:
  - Referer: https://www.8comic.com/

### 2.2 Response

- 格式: HTML

### 2.3 解析規則

- 會有一段 scripts 的功能將章節內的圖片動態新增在網頁上.
- 從中的邏輯分析出圖片網址
- 關鍵字:
  - $("#comics-pics").html(xx) 裡的 xx 是 img elements
  - ch=1 時，前三章圖片網址分別是 //img9.8comic.com/3/20133/1/001_48m.jpg, //img9.8comic.com/3/20133/1/002_4Sn.jpg, //img9.8comic.com/3/20133/1/003_gA8.jpg

---
