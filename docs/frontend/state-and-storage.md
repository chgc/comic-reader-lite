# 前端狀態與儲存設計

## 資料模型
- `Comic`：`id`, `title`, `chapter`, `addedAt`
- `ReadingProgress`：`comicId`, `chapter`, `pageIndex`, `updatedAt`

## localStorage Key
- `eightcomic.library.v1`：漫畫清單
- `eightcomic.progress.v1`：每本漫畫的閱讀進度 map

## 行為
1. 新增漫畫：寫入 `library`，並立即開啟閱讀器。
2. 開啟漫畫：優先讀取 `progress` 恢復章節/頁碼。
3. 翻頁：每次變更頁碼即寫入 `progress`。
4. 鍵盤操作：`ArrowLeft` / `ArrowRight` 對應上一頁/下一頁。

