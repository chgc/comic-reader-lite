package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestUniqueStrings(t *testing.T) {
	in := []string{"a", "b", "a", "", "c", "b"}
	out := uniqueStrings(in)
	if len(out) != 3 {
		t.Fatalf("expected 3 items, got %d", len(out))
	}
}

func TestPagesHandlerMock(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/comics/100/chapters/1/pages?provider=mock", nil)
	res := httptest.NewRecorder()
	pagesHandler(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", res.Code)
	}

	var payload pagesResponse
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if len(payload.Pages) == 0 {
		t.Fatal("expected non-empty pages")
	}
}
