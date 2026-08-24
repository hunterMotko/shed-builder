package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func init() { gin.SetMode(gin.TestMode) }

// post sends a Design to the save endpoint and decodes the response.
func post(t *testing.T, body string) (*httptest.ResponseRecorder, Design) {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/api/save-design", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	newRouter().ServeHTTP(rec, req)

	var out Design
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	return rec, out
}

// The Quote is the server's number, not the client's. Expected prices come
// from shed-options.md.
func TestQuoteIgnoresClientSuppliedPrice(t *testing.T) {
	rec, design := post(t, `{"width":12,"length":16,"wallHeight":10,"style":"Gable","price":1}`)

	if rec.Code != http.StatusCreated {
		t.Fatalf("want 201, got %d: %s", rec.Code, rec.Body.String())
	}
	if design.Price != 6089 {
		t.Errorf("want the catalog price 6089, got %v", design.Price)
	}
}

func TestRejectsCombinationNotInCatalog(t *testing.T) {
	rec, _ := post(t, `{"width":13,"length":17,"wallHeight":10,"style":"Gable"}`)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("want 400 for a combination we do not sell, got %d", rec.Code)
	}
}

func TestRejectsUnknownModel(t *testing.T) {
	rec, _ := post(t, `{"width":12,"length":16,"wallHeight":10,"style":"Tudor"}`)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("want 400 for an unknown Model, got %d", rec.Code)
	}
}

func TestSavedDesignCanBeFetchedByID(t *testing.T) {
	_, saved := post(t, `{"width":12,"length":16,"wallHeight":10,"style":"Gable"}`)

	req := httptest.NewRequest(http.MethodGet, "/api/design/"+saved.ID, nil)
	rec := httptest.NewRecorder()
	newRouter().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("want 200, got %d", rec.Code)
	}
	var fetched Design
	if err := json.Unmarshal(rec.Body.Bytes(), &fetched); err != nil {
		t.Fatalf("response was not a Design: %v", err)
	}
	if fetched.Price != saved.Price {
		t.Errorf("fetched Quote %v does not match saved Quote %v", fetched.Price, saved.Price)
	}
}

// Interior Options: workbench $35/running ft, pegboard $70/sheet, loft $4/sqft.
func TestQuotePricesInteriorOptions(t *testing.T) {
	_, design := post(t, `{"width":12,"length":16,"wallHeight":10,"style":"Gable","addOns":{
		"workbench":{"enabled":true,"runningFt":8},
		"pegboard":{"enabled":true,"sheets":3},
		"loft":{"enabled":true,"sqft":96}}}`)

	want := 6089.0 + 8*35 + 3*70 + 96*4
	if design.Price != want {
		t.Errorf("want Quote %v, got %v", want, design.Price)
	}
}
