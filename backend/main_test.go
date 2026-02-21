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

func TestParseChaptersFromScript(t *testing.T) {
	items := parseChaptersFromScript("<script>var chs=57;var ti=20133;</script>")
	if len(items) != 57 {
		t.Fatalf("expected 57 chapter items, got %d", len(items))
	}
	if items[0].ID != "1" || items[56].ID != "57" {
		t.Fatalf("unexpected chapter bounds: first=%+v last=%+v", items[0], items[56])
	}
}

func TestParseChaptersFromRange(t *testing.T) {
	html := "<div>作者: abc 2026-02-21</div><div>漫畫：[1-57] 連載中</div>"
	items := parseChaptersFromRange(html)
	if len(items) != 57 {
		t.Fatalf("expected 57 chapter items, got %d", len(items))
	}
	if items[0].ID != "1" || items[56].ID != "57" {
		t.Fatalf("unexpected chapter bounds: first=%+v last=%+v", items[0], items[56])
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

func TestNormalizeTitle(t *testing.T) {
	got := normalizeTitle("太散漫了,堀田老師! 堀田留美子 最新漫畫綫上觀看 - 無限動漫 8comic.com")
	if got != "太散漫了,堀田老師! 堀田留美子" {
		t.Fatalf("unexpected normalized title: %s", got)
	}
}

func TestParseComicMetaUsesH2Title(t *testing.T) {
	html := `
<title>太散漫了,堀田老師! 堀田留美子 最新漫畫綫上觀看 - 無限動漫 8comic.com</title>
<li class="h2 mb-1">太散漫了,堀田老師!</li>
<span class="item-info-author">作者: なかだまお</span>
`
	meta := parseComicMeta(html, "20133", "https://www.8comic.com/html/20133.html")
	if meta.Title != "太散漫了,堀田老師!" {
		t.Fatalf("unexpected title parsed from h2: %s", meta.Title)
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

func TestParseScriptGeneratedPagesLayoutB(t *testing.T) {
	// folder(93)=bP, chapter(1)=ab, pageCount(3)=ad, seed(40 chars), part=0
	seed := "48m4SngA8" + strings.Repeat("x", 31)
	record := "bPabad" + seed + "0"
	payload := strings.Repeat(record, 5)
	html := "<script>for (var i=0;i<5;i++){} var abc='" + payload + "';</script>"
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
}

func TestParseScriptGeneratedPagesLayoutC(t *testing.T) {
	// pageCount(3)=ad, folder(93)=bP, seed(40), chapter(1)=ab, part=0
	seed := "48m4SngA8" + strings.Repeat("x", 31)
	record := "adbP" + seed + "ab" + "0"
	payload := strings.Repeat(record, 5)
	html := "<script>var chs=5; var l095_6='" + payload + "';</script>"
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
}

func TestParseScriptGeneratedPagesLayoutE(t *testing.T) {
	// folder(93)=bP, chapter(1)=ab, seed(40), pageCount(3)=ad, part=0
	seed := "48m4SngA8" + strings.Repeat("x", 31)
	record := "bPab" + seed + "ad" + "0"
	payload := strings.Repeat(record, 5)
	html := `
<script>
var chs=5; var l095_6='` + payload + `';
for (var i=0;i<5;i++){
  var bw2xpb5=lc(trrr_192(l095_6,i*(49-2)+0,2));
  var l6_4hg=lc(trrr_192(l095_6,i*(46+1)+2,2));
  var ul2it8g70=lc(trrr_192(l095_6,i*(46+1)+4));
  var p501j_l=lc(trrr_192(l095_6,i*(48-1)+44,2));
  var bg70b44=lc(trrr_192(l095_6,i*(48-1)+46,1));
  ps=p501j_l;
  if(l6_4hg==ch &&(part==''||part==bg70b44)){break;}
}
var xx='';
for(var j=1;j<=ps;j++){
  xx+='<img s="' + a + a + dec(4) + trrr_192(bw2xpb5, 0, 1) + b + c + dec(3) + dec(2) + dec(3) + a + trrr_192(bw2xpb5,1,1) + a + ti + a + l6_4hg + a + nn(j) + d + trrr_192(ul2it8g70,mm(j),3) + b + dec(1) + '">';
}
$('#comics-pics').html(xx);
</script>`
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
}

func TestInferLayoutFromScript(t *testing.T) {
	html := `
<script>
for (var i=0;i<2;i++){
  var vPage=lc(fn(payload,i*(48-1)+44,2));
  var vChapter=lc(fn(payload,i*(46+1)+2,2));
  var vFolder=lc(fn(payload,i*(49-2)+0,2));
  var vSeed=lc(fn(payload,i*(46+1)+4));
  ps=vPage;
  if(vChapter==ch){break;}
}
var xx='';
for(var j=1;j<=ps;j++){
  xx+='<img s="' + a + fn(vFolder,0,1) + b + fn(vSeed,mm(j),3) + '">';
}
$('#comics-pics').html(xx);
</script>`
	got, ok := inferLayoutFromScript(html)
	if !ok {
		t.Fatal("expected layout inference success")
	}
	want := [4]int{2, 0, 44, 4}
	if got != want {
		t.Fatalf("unexpected layout: got=%v want=%v", got, want)
	}
}

func TestExtractDecodePatternFromXX(t *testing.T) {
	html := `
<script>
var xx='';
for (var j=1;j<=ps;j++) {
  xx += '<div><img s="' + aa + aa + xyz(6) + t(f,0,1) + bb + cc + xyz(5) + xyz(4) + xyz(3) + aa + t(f,1,1) + aa + ti + aa + ch + aa + nn(j) + dd + t(e,mm(j),3) + bb + xyz(2) + '" draggable="false"></div>';
}
$('#comics-pics').html(xx);
</script>`
	fn, got := extractDecodePatternFromXX(html)
	want := [5]int{6, 5, 4, 3, 2}
	if fn != "xyz" {
		t.Fatalf("unexpected decode fn: %s", fn)
	}
	if got != want {
		t.Fatalf("unexpected decode indexes: got=%v want=%v", got, want)
	}
}

func TestExtractPayloadVarByDecodeFunction(t *testing.T) {
	html := `
function dec(v){ return helper(payloadX.substring(payloadX.length-47-v*6,payloadX.length-47-v*6+6));}
var payloadX='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
`
	got := extractPayloadVarByDecodeFunction(html, "dec")
	if got != "payloadX" {
		t.Fatalf("unexpected payload var: %s", got)
	}
}
