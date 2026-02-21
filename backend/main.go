package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"time"
)

type pagesResponse struct {
	ComicID string   `json:"comicId"`
	Chapter string   `json:"chapter"`
	Pages   []string `json:"pages"`
}

type chapterItem struct {
	ID    string `json:"id"`
	Title string `json:"title"`
}

type chaptersResponse struct {
	ComicID  string        `json:"comicId"`
	Chapters []chapterItem `json:"chapters"`
}

type comicMetaResponse struct {
	ComicID       string `json:"comicId"`
	Title         string `json:"title,omitempty"`
	Author        string `json:"author,omitempty"`
	Description   string `json:"description,omitempty"`
	CoverImageURL string `json:"coverImageUrl,omitempty"`
	SeriesStatus  string `json:"seriesStatus,omitempty"`
	ChapterRange  string `json:"chapterRange,omitempty"`
	UpdatedDate   string `json:"updatedDate,omitempty"`
	Category      string `json:"category,omitempty"`
	RatingSummary string `json:"ratingSummary,omitempty"`
	HeatText      string `json:"heatText,omitempty"`
	SourceURL     string `json:"sourceUrl,omitempty"`
}

var (
	imgSrcRegex      = regexp.MustCompile(`(?i)<img[^>]+src=["']([^"']+)["']`)
	urlRegex         = regexp.MustCompile(`https?://[^\s"'<>]+?\.(jpg|jpeg|png|gif|webp)`)
	anchorRegex      = regexp.MustCompile(`(?is)<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)</a>`)
	metaTagRegex     = regexp.MustCompile(`(?is)<meta[^>]+(?:property|name)=["']([^"']+)["'][^>]+content=["']([^"']*)["'][^>]*>`)
	htmlTagRegex     = regexp.MustCompile(`(?is)<[^>]+>`)
	chapterIDRegex   = regexp.MustCompile(`(?i)(?:[?&]ch=|chapter=)(\d+)`)
	whitespaceRegex  = regexp.MustCompile(`\s+`)
	fallbackNumRegex = regexp.MustCompile(`\d+`)
	authorRegex      = regexp.MustCompile(`作者[:：]\s*([^\s<]+)`)
	dateRegex        = regexp.MustCompile(`\b20\d{2}-\d{2}-\d{2}\b`)
	statusRegex      = regexp.MustCompile(`(連載中|完結|已完結|連載|完结)`)
	chapterSumRegex  = regexp.MustCompile(`漫畫[:：]\s*\[?(\d+\s*-\s*\d+)\]?`)
	categoryRegex    = regexp.MustCompile(`(?is)<a[^>]+href=["']/comic/\d+-\d+\.html["'][^>]*>(.*?)</a>`)
	heatRegex        = regexp.MustCompile(`熱度[:：]\s*([^\s]+)`)
	ratingRegex      = regexp.MustCompile(`打分人次[:：]\s*\d+\s*,\s*總得分[:：]\s*\d+\s*,\s*本月得分[:：]\s*\d+`)
	l095Regex        = regexp.MustCompile(`var\s+l095_6\s*=\s*'([^']+)'`)
	chsRegex         = regexp.MustCompile(`var\s+chs\s*=\s*(\d+)`)
	trailingPart     = regexp.MustCompile(`[a-z]$`)
)

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/health", healthHandler)
	mux.HandleFunc("/api/comics/", comicsHandler)

	addr := envOr("ADDR", ":8080")
	server := &http.Server{
		Addr:              addr,
		Handler:           withCORS(mux),
		ReadHeaderTimeout: 10 * time.Second,
	}

	log.Printf("backend listening on %s", addr)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}

func healthHandler(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func comicsHandler(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) == 4 && parts[0] == "api" && parts[1] == "comics" && parts[3] == "chapters" {
		chaptersHandler(w, r, parts[2])
		return
	}
	if len(parts) == 4 && parts[0] == "api" && parts[1] == "comics" && parts[3] == "meta" {
		metaHandler(w, r, parts[2])
		return
	}
	if len(parts) == 6 && parts[0] == "api" && parts[1] == "comics" && parts[3] == "chapters" && parts[5] == "pages" {
		pagesHandler(w, r, parts[2], parts[4])
		return
	}
	http.NotFound(w, r)
}

func metaHandler(w http.ResponseWriter, r *http.Request, comicID string) {
	provider := r.URL.Query().Get("provider")
	if provider == "" {
		provider = "8comic"
	}
	if provider != "8comic" {
		http.Error(w, "invalid provider", http.StatusBadRequest)
		return
	}

	meta, err := scrape8comicMeta(r, comicID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}

	writeJSON(w, http.StatusOK, meta)
}

func chaptersHandler(w http.ResponseWriter, r *http.Request, comicID string) {
	provider := r.URL.Query().Get("provider")
	if provider == "" {
		provider = "8comic"
	}
	if provider != "8comic" {
		http.Error(w, "invalid provider", http.StatusBadRequest)
		return
	}

	chapters, err := scrape8comicChapters(r, comicID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}

	writeJSON(w, http.StatusOK, chaptersResponse{
		ComicID:  comicID,
		Chapters: chapters,
	})
}

func pagesHandler(w http.ResponseWriter, r *http.Request, comicID, chapter string) {
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	// /api/comics/{comicId}/chapters/{chapter}/pages
	if len(parts) != 6 || parts[0] != "api" || parts[1] != "comics" || parts[3] != "chapters" || parts[5] != "pages" {
		http.NotFound(w, r)
		return
	}

	provider := r.URL.Query().Get("provider")
	if provider == "" {
		provider = "8comic"
	}
	if provider != "8comic" {
		http.Error(w, "invalid provider", http.StatusBadRequest)
		return
	}

	pages, err := scrape8comicPages(r, comicID, chapter)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}

	writeJSON(w, http.StatusOK, pagesResponse{
		ComicID: comicID,
		Chapter: chapter,
		Pages:   pages,
	})
}

func scrape8comicChapters(r *http.Request, comicID string) ([]chapterItem, error) {
	sourceURL := r.URL.Query().Get("sourceUrl")
	if sourceURL == "" {
		base := strings.TrimRight(envOr("EIGHTCOMIC_BASE_URL", "https://www.comicabc.com/html"), "/")
		sourceURL = fmt.Sprintf("%s/%s.html", base, comicID)
	}

	html, err := fetchUpstreamHTML(r, sourceURL, r.URL.Query().Get("referer"))
	if err != nil {
		return nil, err
	}

	chapters := parseChapterItems(html)
	if len(chapters) == 0 {
		return nil, fmt.Errorf("no chapters parsed from source")
	}
	return chapters, nil
}

func scrape8comicPages(r *http.Request, comicID, chapter string) ([]string, error) {
	sourceURL := r.URL.Query().Get("sourceUrl")
	if sourceURL == "" {
		sourceURL = fmt.Sprintf(envOr("EIGHTCOMIC_CHAPTER_URL_TEMPLATE", "https://articles.onemoreplace.tw/online/new-%s.html?ch=%s"), comicID, chapter)
	}
	referer := r.URL.Query().Get("referer")
	if referer == "" {
		referer = envOr("EIGHTCOMIC_REFERER", "https://www.8comic.com/")
	}
	html, err := fetchUpstreamHTML(r, sourceURL, referer)
	if err != nil {
		return nil, err
	}
	if pages, parseErr := parseScriptGeneratedPages(html, comicID, chapter); parseErr == nil && len(pages) > 0 {
		return pages, nil
	}

	pages := make([]string, 0, 32)
	for _, m := range imgSrcRegex.FindAllStringSubmatch(html, -1) {
		src := strings.TrimSpace(m[1])
		pages = append(pages, normalizeURL(src, sourceURL))
	}
	for _, m := range urlRegex.FindAllString(html, -1) {
		pages = append(pages, m)
	}
	pages = uniqueStrings(pages)
	if len(pages) == 0 {
		return nil, fmt.Errorf("no image urls parsed from source")
	}
	return pages, nil
}

func parseScriptGeneratedPages(html, comicID, chapter string) ([]string, error) {
	l095Match := l095Regex.FindStringSubmatch(html)
	if len(l095Match) < 2 {
		return nil, fmt.Errorf("script payload not found")
	}
	chsMatch := chsRegex.FindStringSubmatch(html)
	if len(chsMatch) < 2 {
		return nil, fmt.Errorf("chapter count not found")
	}
	totalChapters, err := strconv.Atoi(chsMatch[1])
	if err != nil || totalChapters <= 0 {
		return nil, fmt.Errorf("invalid chapter count")
	}

	chRaw := chapter
	if strings.Contains(chRaw, "-") {
		chRaw = strings.SplitN(chRaw, "-", 2)[0]
	}
	chRaw = strings.TrimSpace(chRaw)
	part := ""
	if trailingPart.MatchString(chRaw) && len(chRaw) > 1 {
		part = trailingPart.FindString(chRaw)
		chRaw = chRaw[:len(chRaw)-1]
	}
	if chRaw == "" {
		chRaw = "1"
	}

	l095 := l095Match[1]
	var suffixSeed string
	var folderCode string
	var pageCount int
	selectedPart := part

	for i := 0; i < totalChapters; i++ {
		offset := i * 47
		if offset+47 > len(l095) {
			break
		}
		eb := sub(l095, offset, 40)
		wom := lc(sub(l095, offset+40, 2))
		f54 := lc(sub(l095, offset+42, 2))
		ps := lc(sub(l095, offset+44, 2))
		h := lc(sub(l095, offset+46, 1))
		if wom == chRaw && (selectedPart == "" || selectedPart == h) {
			if selectedPart == "" && h != "0" {
				selectedPart = h
			}
			n, convErr := strconv.Atoi(ps)
			if convErr != nil || n <= 0 {
				return nil, fmt.Errorf("invalid page count")
			}
			suffixSeed = eb
			folderCode = f54
			pageCount = n
			break
		}
	}

	if pageCount == 0 || len(folderCode) < 2 {
		return nil, fmt.Errorf("target chapter not found in payload")
	}

	imgPrefix := decodeTailMarker(l095, 4, "img")
	domainPartA := decodeTailMarker(l095, 3, "com")
	domainPartB := decodeTailMarker(l095, 2, "ic.")
	ext := decodeTailMarker(l095, 1, "jpg")
	host := fmt.Sprintf("%s%s.8%s%s%s", imgPrefix, folderCode[:1], domainPartA, domainPartB, domainPartA)
	firstDir := folderCode[1:2]

	pages := make([]string, 0, pageCount)
	for j := 1; j <= pageCount; j++ {
		token := sub(suffixSeed, mm(j), 3)
		if len(token) < 3 {
			break
		}
		pages = append(pages, fmt.Sprintf("https://%s/%s/%s/%s%s/%s_%s.%s", host, firstDir, comicID, chRaw, selectedPart, nn(j), token, ext))
	}
	if len(pages) == 0 {
		return nil, fmt.Errorf("no pages generated from payload")
	}
	return pages, nil
}

func scrape8comicMeta(r *http.Request, comicID string) (comicMetaResponse, error) {
	sourceURL := r.URL.Query().Get("sourceUrl")
	if sourceURL == "" {
		base := strings.TrimRight(envOr("EIGHTCOMIC_BASE_URL", "https://www.comicabc.com/html"), "/")
		sourceURL = fmt.Sprintf("%s/%s.html", base, comicID)
	}

	html, err := fetchUpstreamHTML(r, sourceURL, r.URL.Query().Get("referer"))
	if err != nil {
		return comicMetaResponse{}, err
	}

	meta := parseComicMeta(html, comicID, sourceURL)
	if meta.Title == "" && meta.Author == "" && meta.Description == "" {
		return comicMetaResponse{}, fmt.Errorf("no comic metadata parsed from source")
	}
	return meta, nil
}

func parseChapterItems(html string) []chapterItem {
	out := make([]chapterItem, 0, 32)
	seen := make(map[string]struct{})
	for _, m := range anchorRegex.FindAllStringSubmatch(html, -1) {
		href := strings.TrimSpace(m[1])
		if !strings.Contains(strings.ToLower(href), "ch=") {
			continue
		}
		chapterID := extractChapterID(href)
		if chapterID == "" {
			continue
		}
		if _, ok := seen[chapterID]; ok {
			continue
		}
		rawTitle := whitespaceRegex.ReplaceAllString(htmlTagRegex.ReplaceAllString(m[2], ""), " ")
		title := strings.TrimSpace(rawTitle)
		if title == "" {
			title = fmt.Sprintf("第 %s 話", chapterID)
		}
		out = append(out, chapterItem{ID: chapterID, Title: title})
		seen[chapterID] = struct{}{}
	}
	return out
}

func parseComicMeta(html, comicID, sourceURL string) comicMetaResponse {
	meta := comicMetaResponse{ComicID: comicID, SourceURL: sourceURL}
	metaMap := make(map[string]string)
	for _, m := range metaTagRegex.FindAllStringSubmatch(html, -1) {
		k := strings.ToLower(strings.TrimSpace(m[1]))
		if _, ok := metaMap[k]; !ok {
			metaMap[k] = strings.TrimSpace(m[2])
		}
	}

	meta.Title = firstNonEmpty(metaMap["og:title"], metaMap["twitter:title"], metaMap["title"])
	meta.Description = firstNonEmpty(metaMap["og:description"], metaMap["description"])
	meta.CoverImageURL = normalizeURL(firstNonEmpty(metaMap["og:image"], metaMap["twitter:image"]), sourceURL)

	if meta.CoverImageURL == "" {
		for _, m := range imgSrcRegex.FindAllStringSubmatch(html, -1) {
			src := strings.TrimSpace(m[1])
			if strings.Contains(strings.ToLower(src), "/pics/") {
				meta.CoverImageURL = normalizeURL(src, sourceURL)
				break
			}
		}
	}

	plainText := whitespaceRegex.ReplaceAllString(htmlTagRegex.ReplaceAllString(html, " "), " ")
	plainText = strings.TrimSpace(plainText)

	if m := authorRegex.FindStringSubmatch(plainText); len(m) > 1 {
		meta.Author = strings.TrimSpace(m[1])
	}
	if m := dateRegex.FindStringSubmatch(plainText); len(m) > 0 {
		meta.UpdatedDate = strings.TrimSpace(m[0])
	}
	if m := statusRegex.FindStringSubmatch(plainText); len(m) > 1 {
		meta.SeriesStatus = strings.TrimSpace(m[1])
	}
	if m := chapterSumRegex.FindStringSubmatch(plainText); len(m) > 1 {
		meta.ChapterRange = strings.TrimSpace(m[1])
	}
	if m := categoryRegex.FindStringSubmatch(html); len(m) > 1 {
		meta.Category = strings.TrimSpace(htmlTagRegex.ReplaceAllString(m[1], ""))
	}
	if m := ratingRegex.FindStringSubmatch(plainText); len(m) > 0 {
		meta.RatingSummary = strings.TrimSpace(m[0])
	}
	if m := heatRegex.FindStringSubmatch(plainText); len(m) > 1 {
		meta.HeatText = strings.TrimSpace(m[1])
	}

	if meta.Title == "" {
		for _, m := range anchorRegex.FindAllStringSubmatch(html, -1) {
			text := strings.TrimSpace(htmlTagRegex.ReplaceAllString(m[2], ""))
			if text != "" && !strings.Contains(text, "首頁") && !strings.Contains(text, "開始看") {
				meta.Title = text
				break
			}
		}
	}

	return meta
}

func extractChapterID(href string) string {
	m := chapterIDRegex.FindStringSubmatch(href)
	if len(m) > 1 {
		return m[1]
	}
	m = fallbackNumRegex.FindStringSubmatch(href)
	if len(m) > 0 {
		return m[0]
	}
	return ""
}

func sub(s string, start, length int) string {
	if start < 0 || start >= len(s) || length <= 0 {
		return ""
	}
	end := start + length
	if end > len(s) {
		end = len(s)
	}
	return s[start:end]
}

func lc(s string) string {
	if len(s) != 2 {
		return s
	}
	az := "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
	a := strings.IndexByte(az, s[0])
	b := strings.IndexByte(az, s[1])
	if a < 0 || b < 0 {
		return s
	}
	if s[0] == 'Z' {
		return strconv.Itoa(8000 + b)
	}
	return strconv.Itoa(a*52 + b)
}

func nn(n int) string {
	if n < 10 {
		return fmt.Sprintf("00%d", n)
	}
	if n < 100 {
		return fmt.Sprintf("0%d", n)
	}
	return strconv.Itoa(n)
}

func mm(p int) int {
	return ((p - 1) / 10 % 10) + (((p - 1) % 10) * 3)
}

func decodeTailMarker(l095 string, index int, fallback string) string {
	start := len(l095) - 47 - index*6
	if start < 0 || start+6 > len(l095) {
		return fallback
	}
	segment := l095[start : start+6]
	decoded := decodeHexPairs(segment)
	if decoded == "" {
		return fallback
	}
	return decoded
}

func decodeHexPairs(s string) string {
	if len(s)%2 != 0 {
		return ""
	}
	buf := make([]byte, 0, len(s)/2)
	for i := 0; i < len(s); i += 2 {
		v, err := strconv.ParseUint(s[i:i+2], 16, 8)
		if err != nil {
			return ""
		}
		buf = append(buf, byte(v))
	}
	return string(buf)
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		trim := strings.TrimSpace(v)
		if trim != "" {
			return trim
		}
	}
	return ""
}

func normalizeURL(raw, sourceURL string) string {
	trim := strings.TrimSpace(raw)
	if trim == "" {
		return ""
	}
	u, err := url.Parse(trim)
	if err == nil && u.IsAbs() {
		return trim
	}
	base, err := url.Parse(sourceURL)
	if err != nil {
		return trim
	}
	ref, err := url.Parse(trim)
	if err != nil {
		return trim
	}
	return base.ResolveReference(ref).String()
}

func fetchUpstreamHTML(r *http.Request, sourceURL, referer string) (string, error) {
	client := &http.Client{Timeout: 15 * time.Second}
	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, sourceURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0")
	if referer != "" {
		req.Header.Set("Referer", referer)
	}

	res, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return "", fmt.Errorf("upstream status: %d", res.StatusCode)
	}
	bodyBytes, err := io.ReadAll(res.Body)
	if err != nil {
		return "", err
	}
	return string(bodyBytes), nil
}

func uniqueStrings(items []string) []string {
	out := make([]string, 0, len(items))
	for _, v := range items {
		if v == "" || slices.Contains(out, v) {
			continue
		}
		out = append(out, v)
	}
	return out
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET,OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func envOr(k, fallback string) string {
	v := os.Getenv(k)
	if v == "" {
		return fallback
	}
	return v
}
