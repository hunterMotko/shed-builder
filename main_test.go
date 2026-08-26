package main

import (
	"bytes"
	"encoding/json"
	"fmt"
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
	rec, design := post(t, `{"width":12,"length":16,"tier":"Standard","model":"Gable","price":1}`)

	if rec.Code != http.StatusCreated {
		t.Fatalf("want 201, got %d: %s", rec.Code, rec.Body.String())
	}
	if design.Price != 6089 {
		t.Errorf("want the catalog price 6089, got %v", design.Price)
	}
}

func TestRejectsCombinationNotInCatalog(t *testing.T) {
	rec, _ := post(t, `{"width":13,"length":17,"tier":"Standard","model":"Gable"}`)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("want 400 for a combination we do not sell, got %d", rec.Code)
	}
}

func TestRejectsUnknownModel(t *testing.T) {
	rec, _ := post(t, `{"width":12,"length":16,"tier":"Standard","model":"Tudor"}`)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("want 400 for an unknown Model, got %d", rec.Code)
	}
}

func TestSavedDesignCanBeFetchedByID(t *testing.T) {
	_, saved := post(t, `{"width":12,"length":16,"tier":"Standard","model":"Gable"}`)

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
	_, design := post(t, `{"width":12,"length":16,"tier":"Standard","model":"Gable","options":{
		"workbench":{"enabled":true,"runningFt":8},
		"pegboard":{"enabled":true,"sheets":3},
		"loft":{"enabled":true,"sqft":96}}}`)

	want := 6089.0 + 8*35 + 3*70 + 96*4
	if design.Price != want {
		t.Errorf("want Quote %v, got %v", want, design.Price)
	}
}

// Every catalog size is 11ft to the peak, so the height cannot tell a Standard
// from a Deluxe and the Tier is what selects the price. The same 12x16 costs
// $6089 as a Standard and $6389 as a Deluxe; a key built from the height would
// have collapsed the two.
func TestTierSelectsThePrice(t *testing.T) {
	_, standard := post(t, `{"width":12,"length":16,"tier":"Standard","model":"Barn"}`)
	if standard.Price != 6089 {
		t.Errorf("want the Standard catalog price 6089, got %v", standard.Price)
	}

	_, deluxe := post(t, `{"width":12,"length":16,"tier":"Deluxe","model":"Barn"}`)
	if deluxe.Price != 6389 {
		t.Errorf("want the Deluxe catalog price 6389, got %v", deluxe.Price)
	}
}

// 14 and 16 wide appear in the Deluxe list only.
func TestWideSizesAreDeluxeOnly(t *testing.T) {
	rec, _ := post(t, `{"width":16,"length":24,"tier":"Standard","model":"Barn"}`)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("want 400 for a 16 wide Standard, got %d", rec.Code)
	}
}

// A Placement is stored exactly as the client sends it, so the server is the
// last chance to reject one that cannot be rendered (issue #19).
//
// The coordinates matter more than they look. A client that produced a NaN
// serializes it as `null`, because that is what JSON.stringify does with a
// non-finite number — and Go decodes `null` into a float64 as 0, not as an
// error. Without an explicit presence check the Opening is accepted and lands
// in the bottom-left corner of its wall rather than being refused.
func TestRejectsPlacementWithMissingCoordinate(t *testing.T) {
	design := `{"width":12,"length":16,"tier":"Standard","model":"Gable","placements":[%s]}`

	cases := map[string]string{
		"null X":   `{"id":"a","type":"window","wall":"front","normalizedX":null,"normalizedY":0.5,"width":3,"height":3}`,
		"null Y":   `{"id":"a","type":"window","wall":"front","normalizedX":0.5,"normalizedY":null,"width":3,"height":3}`,
		"absent X": `{"id":"a","type":"window","wall":"front","normalizedY":0.5,"width":3,"height":3}`,
		"absent Y": `{"id":"a","type":"window","wall":"front","normalizedX":0.5,"width":3,"height":3}`,
	}

	for name, placement := range cases {
		t.Run(name, func(t *testing.T) {
			rec, _ := post(t, fmt.Sprintf(design, placement))
			if rec.Code != http.StatusBadRequest {
				t.Errorf("want 400 for a Placement with a %s, got %d: %s", name, rec.Code, rec.Body.String())
			}
		})
	}
}

func TestRejectsUnrenderablePlacement(t *testing.T) {
	design := `{"width":12,"length":16,"tier":"Standard","model":"Gable","placements":[%s]}`

	cases := map[string]string{
		"X past the end of the wall": `{"id":"a","type":"window","wall":"front","normalizedX":1.4,"normalizedY":0.5,"width":3,"height":3}`,
		"Y below the floor":          `{"id":"a","type":"window","wall":"front","normalizedX":0.5,"normalizedY":-0.2,"width":3,"height":3}`,
		"no width":                   `{"id":"a","type":"window","wall":"front","normalizedX":0.5,"normalizedY":0.5,"width":0,"height":3}`,
		"negative height":            `{"id":"a","type":"window","wall":"front","normalizedX":0.5,"normalizedY":0.5,"width":3,"height":-3}`,
		"a wall the shed lacks":      `{"id":"a","type":"window","wall":"roof","normalizedX":0.5,"normalizedY":0.5,"width":3,"height":3}`,
	}

	for name, placement := range cases {
		t.Run(name, func(t *testing.T) {
			rec, _ := post(t, fmt.Sprintf(design, placement))
			if rec.Code != http.StatusBadRequest {
				t.Errorf("want 400 for a Placement with %s, got %d: %s", name, rec.Code, rec.Body.String())
			}
		})
	}
}

// The guard must not refuse Openings the configurator can legitimately make:
// 0 is the floor and the left edge, 1 is the eave and the right edge.
func TestAcceptsPlacementAtTheEdgesOfItsWall(t *testing.T) {
	rec, saved := post(t, `{"width":12,"length":16,"tier":"Standard","model":"Gable","placements":[
		{"id":"a","type":"window","wall":"front","normalizedX":0,"normalizedY":1,"width":3,"height":3},
		{"id":"b","type":"door","wall":"left","normalizedX":1,"normalizedY":0,"width":3,"height":6.67}
	]}`)

	if rec.Code != http.StatusCreated {
		t.Fatalf("want 201, got %d: %s", rec.Code, rec.Body.String())
	}
	if len(saved.Placements) != 2 {
		t.Fatalf("want both Placements stored, got %d", len(saved.Placements))
	}
	if got := saved.Placements[0].NormalizedX; got == nil || *got != 0 {
		t.Errorf("want normalizedX 0 echoed back, got %v", got)
	}
	if got := saved.Placements[1].NormalizedY; got == nil || *got != 0 {
		t.Errorf("want normalizedY 0 echoed back, got %v", got)
	}
}

// The catalog is one file now, embedded at compile time rather than typed out
// here as well (issue #8). These expectations come from shed-options.md, the
// catalog of record — not from the JSON, which would only prove it equals
// itself.
func TestEmbeddedCatalogMatchesTheCatalogOfRecord(t *testing.T) {
	if len(priceTable) != 25 {
		t.Errorf("want 25 combinations, got %d", len(priceTable))
	}

	base := map[string]float64{
		"12x16xStandard": 6089,
		"12x16xDeluxe":   6389,
		"10x12xStandard": 4689,
		"16x36xDeluxe":   13989,
	}
	for key, want := range base {
		if got := priceTable[key]; got != want {
			t.Errorf("%s: want %v, got %v", key, want, got)
		}
	}

	options := map[string]float64{
		"garage_door_6x7":    450,
		"garage_door_8x7":    500,
		"window_vinyl_slide": 275,
		"skylight_per_ft":    5,
		"loft_per_sqft":      4,
	}
	for key, want := range options {
		if got := optionPrices[key]; got != want {
			t.Errorf("option %s: want %v, got %v", key, want, got)
		}
	}
}

// A catalog that failed to load would leave every combination invalid and
// every Quote at zero, which is a worse failure than refusing to start.
func TestCatalogIsLoadedBeforeAnyRequestIsServed(t *testing.T) {
	if len(optionPrices) == 0 {
		t.Fatal("option prices are empty — the embedded catalog did not load")
	}

	rec, design := post(t, `{"width":12,"length":16,"tier":"Standard","model":"Gable","price":1}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("want 201, got %d: %s", rec.Code, rec.Body.String())
	}
	if design.Price != 6089 {
		t.Errorf("want the catalog price 6089 served from the shared file, got %v", design.Price)
	}
}
