package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"regexp"
	"slices"
	"strings"
	"time"
)

type pagesResponse struct {
	ComicID string   `json:"comicId"`
	Chapter string   `json:"chapter"`
	Pages   []string `json:"pages"`
}

var (
	imgSrcRegex = regexp.MustCompile(`(?i)<img[^>]+src=["']([^"']+)["']`)
	urlRegex    = regexp.MustCompile(`https?://[^\s"'<>]+?\.(jpg|jpeg|png|gif|webp)`)
)

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/health", healthHandler)
	mux.HandleFunc("/api/comics/", pagesHandler)

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

func pagesHandler(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	// /api/comics/{comicId}/chapters/{chapter}/pages
	if len(parts) != 6 || parts[0] != "api" || parts[1] != "comics" || parts[3] != "chapters" || parts[5] != "pages" {
		http.NotFound(w, r)
		return
	}

	comicID := parts[2]
	chapter := parts[4]
	provider := r.URL.Query().Get("provider")
	if provider == "" {
		provider = "mock"
	}

	var pages []string
	var err error
	switch provider {
	case "mock":
		pages = mockPages(comicID, chapter)
	case "8comic":
		pages, err = scrape8comicPages(r, comicID, chapter)
	default:
		http.Error(w, "invalid provider", http.StatusBadRequest)
		return
	}

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

func mockPages(comicID, chapter string) []string {
	base := fmt.Sprintf("https://picsum.photos/seed/%s-%s", comicID, chapter)
	return []string{
		base + "-1/900/1300",
		base + "-2/900/1300",
		base + "-3/900/1300",
		base + "-4/900/1300",
		base + "-5/900/1300",
	}
}

func scrape8comicPages(r *http.Request, comicID, chapter string) ([]string, error) {
	sourceURL := r.URL.Query().Get("sourceUrl")
	if sourceURL == "" {
		base := strings.TrimRight(envOr("EIGHTCOMIC_BASE_URL", "https://www.comicabc.com/html"), "/")
		sourceURL = fmt.Sprintf("%s/%s.html?ch=%s", base, comicID, chapter)
	}

	client := &http.Client{Timeout: 15 * time.Second}
	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, sourceURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0")

	res, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return nil, fmt.Errorf("upstream status: %d", res.StatusCode)
	}

	bodyBytes, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}
	html := string(bodyBytes)

	pages := make([]string, 0, 32)
	for _, m := range imgSrcRegex.FindAllStringSubmatch(html, -1) {
		src := strings.TrimSpace(m[1])
		if strings.HasPrefix(src, "http://") || strings.HasPrefix(src, "https://") {
			pages = append(pages, src)
		}
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
