package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestUniqueStrings(t *testing.T) {
	in := []string{"a", "b", "a", "", "c", "b"}
	out := uniqueStrings(in)
	if len(out) != 3 {
		t.Fatalf("expected 3 items, got %d", len(out))
	}
}

func TestPagesHandlerRejectsNon8comicProvider(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/comics/100/chapters/1/pages?provider=mock", nil)
	res := httptest.NewRecorder()
	comicsHandler(res, req)
	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", res.Code)
	}
}

func TestChaptersHandlerRejectsNon8comicProvider(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/comics/100/chapters?provider=mock", nil)
	res := httptest.NewRecorder()
	comicsHandler(res, req)
	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", res.Code)
	}
}

func TestParseChapterItems(t *testing.T) {
	html := `
<a href="/html/999.html?ch=12">第12話</a>
<a href="/html/999.html?ch=13"><span>第13話</span></a>
`
	items := parseChapterItems(html)
	if len(items) != 2 {
		t.Fatalf("expected 2 chapter items, got %d", len(items))
	}
	if items[0].ID != "12" || items[1].ID != "13" {
		t.Fatalf("unexpected chapter ids: %+v", items)
	}
}

func TestMetaHandlerRejectsNon8comicProvider(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/comics/100/meta?provider=mock", nil)
	res := httptest.NewRecorder()
	comicsHandler(res, req)
	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", res.Code)
	}
}

func TestParseComicMeta(t *testing.T) {
	html := `
<meta property="og:title" content="太散漫了,堀田老師!">
<meta property="og:description" content="果然堀田老師在外面和在家里面完全是兩個人呢!">
<meta property="og:image" content="/pics/0/20133.jpg">
<a href="/comic/11-1.html">少女系列</a>
<div>作者: なかだまお 2026-02-21</div>
<div>漫畫：[1-57] 連載中</div>
`
	meta := parseComicMeta(html, "20133", "https://www.8comic.com/html/20133.html")
	if meta.Title != "太散漫了,堀田老師!" {
		t.Fatalf("unexpected title: %s", meta.Title)
	}
	if meta.Author != "なかだまお" {
		t.Fatalf("unexpected author: %s", meta.Author)
	}
	if meta.CoverImageURL != "https://www.8comic.com/pics/0/20133.jpg" {
		t.Fatalf("unexpected cover url: %s", meta.CoverImageURL)
	}
	if meta.ChapterRange != "1-57" || meta.SeriesStatus != "連載中" {
		t.Fatalf("unexpected chapter/status: %+v", meta)
	}
}

func TestParseScriptGeneratedPages(t *testing.T) {
	// 40 chars for suffix seed, then wom(1)=ab, folder(93)=bP, pageCount(3)=ad, part=0
	seed := "48m4SngA8" + strings.Repeat("x", 31)
	l095 := seed + "abbPad0"
	html := "<script>var chs=1;var l095_6='" + l095 + "';</script>"
	pages, err := parseScriptGeneratedPages(html, "20133", "1")
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	if len(pages) != 3 {
		t.Fatalf("expected 3 pages, got %d", len(pages))
	}
	if pages[0] != "https://img9.8comic.com/3/20133/1/001_48m.jpg" {
		t.Fatalf("unexpected first page: %s", pages[0])
	}
	if pages[1] != "https://img9.8comic.com/3/20133/1/002_4Sn.jpg" {
		t.Fatalf("unexpected second page: %s", pages[1])
	}
	if pages[2] != "https://img9.8comic.com/3/20133/1/003_gA8.jpg" {
		t.Fatalf("unexpected third page: %s", pages[2])
	}
}
