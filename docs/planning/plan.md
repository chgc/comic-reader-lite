# 8comic 乾淨版瀏覽器實作規劃

## 問題與現況
- 目標：建立一個「8comic 乾淨版瀏覽器」，提供乾淨閱讀體驗，並可記錄「正在觀看的漫畫」與「閱讀進度」。
- 限制：閱讀紀錄需使用 `localStorage` 保存。
- 圖片來源：從 8comic 網站抓取，抓取/解碼邏輯將分階段分析與落地。
- 目前程式庫現況：`D:\side-projects\8comic-viewer` 目前無既有程式碼（空目錄），需從骨架開始規劃與建立。

## 方案概述
1. 先建立前端 MVP（單頁網頁）與資料模型，優先完成可用閱讀流程與本地進度保存。
2. 採用「前端 + 自建後端代理」：由後端代理抓取 8comic 資料，前端不直接請求來源站。
3. 將「8comic 圖片取得流程」拆成可替換的 provider/service，先預留介面與假資料，再逐步接上真實解析邏輯。
4. 以「可漸進開發」為核心：UI、狀態管理、儲存層、來源解析層分離，避免早期耦合。

## 基本功能與對應任務

### 功能 A：漫畫清單與最近閱讀
- 說明：顯示使用者已看過/加入的漫畫，能快速回到上次閱讀位置。
- 任務：
  - 定義 `Comic` / `ReadingProgress` 資料結構。
  - 建立「最近閱讀」列表 UI（漫畫名稱、章節、頁碼、最後閱讀時間）。
  - 建立新增/移除漫畫到清單的操作流程。

### 功能 B：閱讀器與翻頁
- 說明：可載入指定章節頁面並翻頁，提供乾淨閱讀畫面。
- 任務：
  - 建立 Reader View（圖片顯示、上一頁/下一頁、章節切換）。
  - 讀取圖片 URL 並渲染，加入基本 loading/error 顯示。
  - 提供鍵盤快捷鍵（左右鍵翻頁）與行動裝置基本手勢支援（後續可擴充）。

### 功能 C：閱讀進度記錄（localStorage）
- 說明：自動保存每本漫畫的章節/頁碼，重新開啟可續讀。
- 任務：
  - 建立 `localStorage` repository（讀取、寫入、版本欄位、資料遷移入口）。
  - 在翻頁與章節切換事件中即時更新進度。
  - App 啟動時載入進度並恢復閱讀狀態。

### 功能 D：8comic 圖片來源串接（分階段）
- 說明：逐步分析 8comic 的圖片索引/路徑生成邏輯，替換 mock provider。
- 任務：
  - 建立後端代理 API（例如 `/api/comics/:id/chapters/:chapter/pages`）提供前端乾淨資料格式。
  - 第 1 階段：建立 `ImageSourceProvider` 抽象介面與 mock 實作（先打通 UI/流程）。
  - 第 2 階段：分析 8comic 章節頁 HTML 與必要參數來源，建立 parser。
  - 第 3 階段：實作圖片 URL 生成與錯誤重試策略。
  - 第 4 階段：加入防呆（來源變更偵測、失敗提示、fallback 流程）。

### 功能 E：基礎品質與可維護性
- 說明：確保 MVP 可持續迭代。
- 任務：
  - 設定最小可用專案結構（views/services/storage/types）。
  - 為核心流程補單元測試（storage、progress reducer、parser 基本案例）。
  - 定義錯誤訊息與使用者提示文案。

## TODO（執行順序）
1. 初始化前端骨架與目錄結構。
2. 建立資料模型與 localStorage 儲存層。
3. 完成最近閱讀清單與基本閱讀器 UI。
4. 串接進度保存與續讀流程。
5. 建立後端代理層與初版章節/頁面 API。
6. 導入 `ImageSourceProvider` 抽象與 mock 資料流。
7. 逐步分析並接入 8comic 真實圖片取得邏輯。
8. 補齊核心測試與錯誤處理。

## 注意事項
- 8comic 來源可能變動，需保留 parser/provider 的替換彈性。
- 已確認第一版採「前端 + 自建後端代理」，降低 CORS 與來源限制風險。
- `localStorage` 容量有限，僅保存必要資訊（漫畫識別、章節、頁碼、時間戳）。

---

## 目前進度（已完成）
- Angular v21 + Go 專案骨架完成。
- 已有閱讀器 UI、localStorage 進度保存、後端 pages API（mock + 初步 8comic）。
- docs 已依類型分目錄（architecture / api / frontend / backend）。
- backend mock provider 與對應測試已移除，統一使用 8comic provider。

## 新增功能規劃：依漫畫 ID 取得章節資訊與章節內容資訊

### 目標
- 根據漫畫 ID，從來源站取得：
  1) 章節清單（章節編號/標題）
  2) 章節內容中繼資料（頁數、圖片組成所需欄位）
- 處理多段 URL 與 referer/header/cookie 規則，並統一由後端代理執行。

### 實作策略
1. 先由你提供實際抓取規則（網址鏈路 + referer 規則 + response 片段）。
2. 我將規則拆成 parser pipeline：
   - `comicId -> chapters`
   - `chapter -> chapterMeta/pages`
   - `page -> image URL`
3. 建立可測試的抽象層（request builder / parser / url composer），避免硬編碼散落在 handler。
4. 增加失敗診斷（哪一段 URL 或 referer 失敗）與重試策略。

### 對應任務
1. 定義章節資料模型與 API 回傳格式（chapters / chapter meta）。
2. 新增後端 API：
   - `GET /api/comics/{comicId}/chapters`
   - `GET /api/comics/{comicId}/chapters/{chapter}/meta`
3. 實作 referer-aware HTTP client（可按步驟套用不同 headers）。
4. 實作多段解析器與 URL 組合器。
5. 新增單元測試（parser、URL 組合、header/referer 規則）。
6. 前端串接章節清單與章節切換流程。
7. 實作順序確認：先完成 `comicId -> 章節清單 API`，再往章節內容資訊延伸。

### 你需要提供的資料
- 已建立模板：`docs/api/8comic-source-rules-template.md`
- 請依模板填寫實際規則與範例資料，之後我會直接進行分析並落實為程式碼。

---

## 第一項規則分析（漫畫 ID -> 章節列表頁）

### 已知來源（你提供）
- 漫畫頁 URL 模板：`https://www.8comic.com/html/{comicId}.html`
- 範例：`https://www.8comic.com/html/20133.html`

### 目前可先抽出的「基本資訊」候選欄位
以 `20133` 範例頁面觀察，可優先規劃下列欄位：
1. `comicId`：由輸入或 URL 得到（`20133`）
2. `title`：頁面主標題（例：`太散漫了,堀田老師!`）
3. `author`：作者欄位（例：`なかだまお`）
4. `updatedDateText`：作者欄後方日期字串（例：`2026-02-21`，需正規化）
5. `coverImageUrl`：封面圖（例：`/pics/0/20133.jpg`，需補成絕對網址）
6. `seriesStatus`：連載狀態（例：`連載中`）
7. `chapterRangeText`：章節範圍摘要（例：`1-57`）
8. `description`：簡介文案（例：`果然堀田老師...`）
9. `categoryBreadcrumb`：分類麵包屑（例：`少女系列`）
10. `ratingSummary`：打分摘要（人次/總分/月分，若可穩定取值）
11. `heatText`：熱度欄位（目前樣本可見欄位但值可能缺失）

### 章節列表可行解析方向（第一版）
- 先以 `<a href="...ch=...">` 掃描章節連結，抽 `chapterId` 與 `chapterTitle`。
- 若章節列表由 script 生成，第二層改做 JS 變數解析（待你補 response 片段）。
- 排序先按數字章節遞增；若有番外/特別篇，再加權排序規則。

### 風險與待補資料
- 目前模板第一項尚未提供「章節節點位置」與 HTML 片段，章節解析仍屬推定。
- `updatedDateText` / `ratingSummary` / `heatText` 可能在不同作品頁格式不一致，需要至少 2~3 組樣本比對。
- 後續需確認是否存在 anti-bot header/cookie 差異導致返回簡化頁面。

### 新增任務（本輪規劃）
1. `analyze-comic-base-fields`：固定基本欄位抽取規則與 fallback。
2. `design-comic-meta-schema`：定義 `ComicMeta` schema（title/author/status/cover/description/chapterSummary...）。
3. `plan-comic-meta-endpoint`：規劃 `GET /api/comics/{comicId}/meta` 並與 chapters endpoint 對齊。

---

## 新增規劃：移除前端「來源 / 可選覆寫」選項

### 目標
- 簡化前端操作流程，移除使用者可見的來源與可選覆寫欄位。
- 前端固定走 8comic 流程：`comicId -> metadata + chapters -> 選章節 -> 閱讀`。

### 規劃範圍
1. 移除 UI 中的來源選擇（provider 區塊）。
2. 移除 UI 中可選覆寫欄位（sourceUrl / sourceReferer）。
3. 清理 component state 與 service 呼叫參數，改為固定 provider=`8comic`。
4. 保留核心流程：取得章節、閱讀指定章節、進度記錄。

### 對應任務
1. `plan-remove-frontend-source-options`：確認移除範圍與固定呼叫策略。
2. `implement-remove-frontend-source-options`：調整 `app.component.ts` 與 `comic-provider.service.ts`。
3. `validate-ui-simplification`：執行前端 build 並驗證主流程不變。

---

## 開發進度更新（截至目前）

### 已完成
- 後端（Go）已提供：
  - `GET /api/comics/{comicId}/meta`
  - `GET /api/comics/{comicId}/chapters`
  - `GET /api/comics/{comicId}/chapters/{chapter}/pages`
- `pages` 解析已支援第二項規則：可從章節頁 script 動態組圖邏輯還原全章圖片 URL。
- `pages` parsing rule 已強化為動態模式：支援變數/函式名稱變動、decode index 變動、layout 變動（含從 script 反推 layout）。
- 已補 offset 變體測試（`i*47+offset` 無括號）並修正 layout offset 擷取規則。
- `chapters` 解析已加入 fallback（連結掃描 / script `chs` / 章節範圍文字）。
- `meta` 標題解析已修正：`comicId=20133` 可取得 `太散漫了,堀田老師!`。
- 前端已簡化：
  - 移除來源與可選覆寫欄位（固定 8comic 流程）。
  - comic title 改由 metadata 自動取得，不需手動輸入。
  - 按「閱讀」會以當前選定章節開啟，不覆蓋為舊進度章節。
- 已新增更多 parser 測試案例（依 8comic-source-rules-template 3.1 擴充），覆蓋多種動態 payload/layout/host 組合。
- **已修正 `inferLayoutFromScript` 的兩個 bug（本輪）：**
  - `psVarRegex` 改為要求首字為字母，避免匹配 `ps = 0;` 初始化而取得錯誤的 pageOffset。
  - `payloadRegex` 最小長度從 200 降至 90，支援章節數少（≤2章）的漫畫。
- **已通過 docs §4 全部 6 個 integration test cases（本輪）：**
  - `21249/ch1`, `21163/ch1`, `26304/ch1`, `20133/ch1`, `28556/ch1`, `24758/ch1`
  - 每筆第一頁 URL 精確吻合，且 HEAD 請求均回傳 HTTP 200（無 404）。
  - Integration test 以 `//go:build integration` tag 保存於 `backend/integration_test.go`，執行方式：`go test -tags integration -v -run TestSection4Cases -timeout 120s`。

### 尚未完成項目
1. `GET /api/comics/{comicId}/chapters/{chapter}/meta` 尚未實作（目前主要直接回 pages）。
2. 章節標題目前部分情況仍使用「第 N 集」推導，尚未完整對齊來源標題。
3. 來源解析失敗時的錯誤分類與診斷資訊仍可再細化。
4. 前端與後端端對端流程尚待完整驗證。

### 可優化功能
1. **章節標題準確率**：加入 script 變數與 DOM 雙路徑解析，提升標題品質。
2. **可觀測性**：為 parser/fallback 加上結構化日誌與錯誤代碼。
3. **前端容錯 UX**：章節或頁面載入失敗時，提供重試與明確操作提示。
4. **驗證自動化**：已有 integration test 骨架，可持續擴充樣本回歸測試。
5. **效能**：對已解析的 meta/chapters 進行短時快取，減少重複抓取。
