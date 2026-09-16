package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/gin-gonic/gin"
	_ "modernc.org/sqlite"
)

func init() {
	gin.SetMode(gin.TestMode)
	// A file, not `:memory:`, because what these tests are checking is that a
	// Design outlives the thing that wrote it. It is opened lazily on the first
	// request, so setting this here is early enough.
	dir, err := os.MkdirTemp("", "shed-db")
	if err != nil {
		panic(err)
	}
	os.Setenv("SHED_DB", filepath.Join(dir, "test.db"))
}

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
	rec, design := post(t, `{"width":12,"length":16,"tier":"Standard","model":"Barn","price":1}`)

	if rec.Code != http.StatusCreated {
		t.Fatalf("want 201, got %d: %s", rec.Code, rec.Body.String())
	}
	if design.Price != 6089 {
		t.Errorf("want the catalog price 6089, got %v", design.Price)
	}
}

func TestRejectsCombinationNotInCatalog(t *testing.T) {
	rec, _ := post(t, `{"width":13,"length":17,"tier":"Standard","model":"Barn"}`)

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
	_, saved := post(t, `{"width":12,"length":16,"tier":"Deluxe","model":"Gable"}`)

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

// quote posts a quote request and decodes what comes back.
func quote(t *testing.T, body string) (*httptest.ResponseRecorder, QuoteRequest) {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/api/quote-request", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req.RemoteAddr = fmt.Sprintf("10.0.0.%d:1234", rateLimitIP())
	rec := httptest.NewRecorder()
	newRouter().ServeHTTP(rec, req)

	var out QuoteRequest
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	return rec, out
}

// Each test speaks from its own address, so one test's requests never spend
// another's rate-limit budget.
var rateLimitCounter = 0

func rateLimitIP() int {
	rateLimitCounter++
	return rateLimitCounter % 250
}

const aDesign = `"design":{"width":12,"length":16,"tier":"Deluxe","model":"Gable"}`

// The terminal act: a Design and the person who wants it built, saved together
// and priced by the server.
func TestAQuoteRequestSavesTheDesignAndTheContact(t *testing.T) {
	rec, q := quote(t, `{`+aDesign+`,"contact":{"name":"Dana","phone":"555-0100","zip":"17331","note":"gravel pad"}}`)

	if rec.Code != http.StatusCreated {
		t.Fatalf("want 201, got %d: %s", rec.Code, rec.Body.String())
	}
	if q.Price != 6389 {
		t.Errorf("want the catalog Quote 6389, got %v", q.Price)
	}
	if q.DesignID == "" {
		t.Fatal("the request names no Design")
	}

	handle, err := sql.Open("sqlite", os.Getenv("SHED_DB"))
	if err != nil {
		t.Fatalf("cannot open the database: %v", err)
	}
	defer handle.Close()

	var name, phone, designID string
	err = handle.QueryRow(
		`SELECT name, phone, design_id FROM quote_requests WHERE id = ?`, q.ID,
	).Scan(&name, &phone, &designID)
	if err != nil {
		t.Fatalf("the request is not in the database: %v", err)
	}
	if name != "Dana" || phone != "555-0100" {
		t.Errorf("stored contact is %q / %q", name, phone)
	}

	// The Design it names must be fetchable, or the link in the shop's email
	// leads nowhere.
	req := httptest.NewRequest(http.MethodGet, "/api/design/"+designID, nil)
	fetch := httptest.NewRecorder()
	newRouter().ServeHTTP(fetch, req)
	if fetch.Code != http.StatusOK {
		t.Fatalf("the Design the request names is not fetchable: %d", fetch.Code)
	}
}

// The shop has to be able to call back.
func TestAQuoteRequestNeedsANameAndAWayToReply(t *testing.T) {
	for _, contact := range []string{
		`{"phone":"555-0100"}`,
		`{"name":"Dana"}`,
		`{"name":"   ","phone":"555-0100"}`,
		`{"name":"Dana","email":"not-an-address"}`,
	} {
		rec, _ := quote(t, `{`+aDesign+`,"contact":`+contact+`}`)
		if rec.Code != http.StatusBadRequest {
			t.Errorf("contact %s: want 400, got %d", contact, rec.Code)
		}
	}
}

// Either one on its own is enough.
func TestAPhoneOrAnEmailIsEnough(t *testing.T) {
	for _, contact := range []string{
		`{"name":"Dana","phone":"555-0100"}`,
		`{"name":"Dana","email":"dana@example.com"}`,
	} {
		rec, _ := quote(t, `{`+aDesign+`,"contact":`+contact+`}`)
		if rec.Code != http.StatusCreated {
			t.Errorf("contact %s: want 201, got %d: %s", contact, rec.Code, rec.Body.String())
		}
	}
}

// A filled honeypot is answered like anything else and stored nowhere. Saying
// "no" would only teach a bot which field to leave alone.
func TestAFilledHoneypotIsAnsweredAndDropped(t *testing.T) {
	before := countQuoteRequests(t)

	rec, _ := quote(t, `{`+aDesign+`,"contact":{"name":"Dana","phone":"555-0100","company":"Acme SEO"}}`)

	if rec.Code != http.StatusCreated {
		t.Errorf("want a 201 that tells a bot nothing, got %d", rec.Code)
	}
	if after := countQuoteRequests(t); after != before {
		t.Errorf("the honeypot request was stored: %d became %d", before, after)
	}
}

// A shed nobody sells cannot be quoted, however good the contact details are.
func TestAQuoteRequestForAnUnsoldShedIsRefused(t *testing.T) {
	rec, _ := quote(t, `{"design":{"width":13,"length":16,"tier":"Deluxe","model":"Gable"},`+
		`"contact":{"name":"Dana","phone":"555-0100"}}`)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("want 400, got %d: %s", rec.Code, rec.Body.String())
	}
}

// One address cannot send an unbounded number.
func TestQuoteRequestsFromOneAddressAreRateLimited(t *testing.T) {
	body := `{` + aDesign + `,"contact":{"name":"Dana","phone":"555-0100"}}`
	send := func() int {
		req := httptest.NewRequest(http.MethodPost, "/api/quote-request", bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		req.RemoteAddr = "10.9.9.9:1234"
		rec := httptest.NewRecorder()
		newRouter().ServeHTTP(rec, req)
		return rec.Code
	}

	for i := 0; i < quoteBurst; i++ {
		if code := send(); code != http.StatusCreated {
			t.Fatalf("request %d: want 201, got %d", i+1, code)
		}
	}
	if code := send(); code != http.StatusTooManyRequests {
		t.Errorf("want 429 once the burst is spent, got %d", code)
	}
}

func countQuoteRequests(t *testing.T) int {
	t.Helper()
	handle, err := sql.Open("sqlite", os.Getenv("SHED_DB"))
	if err != nil {
		t.Fatalf("cannot open the database: %v", err)
	}
	defer handle.Close()

	var n int
	if err := handle.QueryRow(`SELECT COUNT(*) FROM quote_requests`).Scan(&n); err != nil {
		t.Fatalf("cannot count quote requests: %v", err)
	}
	return n
}

// A Design outlives the process that saved it. The in-memory map this replaced
// lost every one of them on restart, which made a quote request worth less than
// the button that sent it.
func TestASavedDesignIsOnDiskAndSurvivesTheProcess(t *testing.T) {
	_, saved := post(t, `{"width":12,"length":16,"tier":"Deluxe","model":"Gable"}`)

	// Opened independently of the server's own handle: this is the file as
	// another process would find it.
	handle, err := sql.Open("sqlite", os.Getenv("SHED_DB"))
	if err != nil {
		t.Fatalf("cannot open the database file: %v", err)
	}
	defer handle.Close()

	var doc string
	if err := handle.QueryRow(`SELECT doc FROM designs WHERE id = ?`, saved.ID).Scan(&doc); err != nil {
		t.Fatalf("the saved Design is not in the database: %v", err)
	}

	var onDisk Design
	if err := json.Unmarshal([]byte(doc), &onDisk); err != nil {
		t.Fatalf("what is stored is not a Design: %v", err)
	}
	if onDisk.Price != saved.Price {
		t.Errorf("stored Quote %v does not match the one served %v", onDisk.Price, saved.Price)
	}
}

// One customer's Design, dimensions and contact details must not be readable by
// anyone who asks. The route that handed them all over is gone, not guarded.
func TestThereIsNoRouteListingEveryDesign(t *testing.T) {
	post(t, `{"width":12,"length":16,"tier":"Deluxe","model":"Gable"}`)

	req := httptest.NewRequest(http.MethodGet, "/api/designs", nil)
	rec := httptest.NewRecorder()
	newRouter().ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("want 404 for a route that should not exist, got %d: %s", rec.Code, rec.Body.String())
	}
}

// An id that was never issued is a miss, not a server error.
func TestAnUnknownDesignIDIsNotFound(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/design/no-such-design", nil)
	rec := httptest.NewRecorder()
	newRouter().ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("want 404, got %d: %s", rec.Code, rec.Body.String())
	}
}

// The Quote counts what is on the shed. A checkbox that added $500 without a
// door was the defect this closes (issue #10).
func TestDoorsAndWindowsArePricedFromThePlacements(t *testing.T) {
	// One 8x7 roll-up with a large ramp, a second roll-up, a nine-light entry
	// door, and two windows, one of them shuttered.
	body := `{"width":12,"length":16,"tier":"Deluxe","model":"Gable","placements":[
		{"id":"a","type":"garage_door","wall":"front","normalizedX":0.3,"normalizedY":0.5,"width":8,"height":7,"ramp":"large"},
		{"id":"b","type":"garage_door","wall":"back","normalizedX":0.5,"normalizedY":0.5,"width":6,"height":7},
		{"id":"c","type":"door","wall":"left","normalizedX":0.5,"normalizedY":0.5,"width":3,"height":6.8,"doorType":"nine_light"},
		{"id":"d","type":"window","wall":"left","normalizedX":0.2,"normalizedY":0.6,"width":2,"height":3,"shutters":true},
		{"id":"e","type":"window","wall":"right","normalizedX":0.8,"normalizedY":0.6,"width":2,"height":3}
	]}`

	rec, design := post(t, body)
	if rec.Code != http.StatusCreated {
		t.Fatalf("want 201, got %d: %s", rec.Code, rec.Body.String())
	}

	// 6389 base + 500 (8x7) + 600 (the second is an additional door)
	//      + 425 (nine-light) + 275*2 (windows) + 70 (one shuttered)
	//      + 325 (large ramp)
	want := 6389.0 + 500 + 600 + 425 + 550 + 70 + 325
	if design.Price != want {
		t.Errorf("want %v, got %v", want, design.Price)
	}
}

// A shed with nothing on it is the base price, whatever an old client sends in
// the Options it no longer has a use for.
func TestATickedOptionWithNoPlacementBuysNothing(t *testing.T) {
	_, plain := post(t, `{"width":12,"length":16,"tier":"Deluxe","model":"Gable"}`)
	_, ticked := post(t, `{"width":12,"length":16,"tier":"Deluxe","model":"Gable",`+
		`"options":{"garageDoor":{"enabled":true,"size":"8x7"},"vinylWindows":{"enabled":true,"count":4},`+
		`"shutters":{"enabled":true,"pairs":3},"ramp":{"enabled":true,"size":"large"}}}`)

	if ticked.Price != plain.Price {
		t.Errorf("a flag with no Opening moved the Quote: %v against %v", ticked.Price, plain.Price)
	}
	if plain.Price != 6389 {
		t.Errorf("want the catalog price 6389, got %v", plain.Price)
	}
}

// A swing barn door comes with the Standard barn package, so placing one is
// free — the catalog prices no such line.
func TestASwingBarnDoorAddsNothing(t *testing.T) {
	_, design := post(t, `{"width":12,"length":16,"tier":"Standard","model":"Barn","placements":[
		{"id":"a","type":"swing_barn_door","wall":"front","normalizedX":0.5,"normalizedY":0.5,"width":6,"height":6.5}
	]}`)

	if design.Price != 6089 {
		t.Errorf("want the catalog price 6089, got %v", design.Price)
	}
}

// Interior Options: workbench $35/running ft, pegboard $70/sheet, loft $4/sqft.
func TestQuotePricesInteriorOptions(t *testing.T) {
	_, design := post(t, `{"width":12,"length":16,"tier":"Standard","model":"Barn","options":{
		"workbench":{"enabled":true,"runningFt":8},
		"pegboard":{"enabled":true,"sheets":3},
		"loft":{"enabled":true,"sqft":96}}}`)

	want := 6089.0 + 8*35 + 3*70 + 96*4
	if design.Price != want {
		t.Errorf("want Quote %v, got %v", want, design.Price)
	}
}

// An octagon is bought per gable end, so the Quote has to count them. The
// client charges per end too (`octagonEnds` in gableEndOpenings.js); the
// server's number is the Quote, so if only one side learned this a customer
// would be shown one price and billed another.
func TestQuoteChargesAnOctagonPerEnd(t *testing.T) {
	// shed-options.md: octagon gable window $85, octagon gable vent $85.
	_, one := post(t, `{"width":12,"length":16,"tier":"Deluxe","model":"Gable","options":{
		"octagonWindow":{"enabled":true,"ends":"front"}}}`)
	if want := 6389.0 + 85; one.Price != want {
		t.Errorf("one end: want Quote %v, got %v", want, one.Price)
	}

	_, both := post(t, `{"width":12,"length":16,"tier":"Deluxe","model":"Gable","options":{
		"octagonWindow":{"enabled":true,"ends":"both"},
		"octagonVent":{"enabled":true,"ends":"both"}}}`)
	if want := 6389.0 + 2*85 + 2*85; both.Price != want {
		t.Errorf("both ends: want Quote %v, got %v", want, both.Price)
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

// The price list has "Standard barn prices" and then "Deluxe barns & gables":
// a Gable is sold as a Deluxe only. The price table is keyed by size and Tier
// with no Model in it, so it cannot carry this on its own — 12x16xStandard is a
// real price, for a Barn — and a Standard Gable would otherwise be quoted off
// the wrong line and drawn with the wrong roof edge.
func TestAGableIsSoldAsDeluxeOnly(t *testing.T) {
	rec, _ := post(t, `{"width":12,"length":16,"tier":"Standard","model":"Gable"}`)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("want 400 for a Standard Gable, got %d: %s", rec.Code, rec.Body.String())
	}

	// A Barn is still sold at either grade.
	if rec, _ := post(t, `{"width":12,"length":16,"tier":"Standard","model":"Barn"}`); rec.Code != http.StatusCreated {
		t.Errorf("want 201 for a Standard Barn, got %d", rec.Code)
	}
}

// An absent Tier used to default to Standard flatly, which turned a Gable into
// a shed the catalog does not sell — priced off a Barn's line. The default is
// per Model now: the grade that Model is actually sold at.
func TestAnAbsentTierDefaultsToTheGradeTheModelIsSoldAt(t *testing.T) {
	_, gable := post(t, `{"width":12,"length":16,"model":"Gable"}`)
	if gable.Tier != "Deluxe" || gable.Price != 6389 {
		t.Errorf("want a Deluxe Gable at 6389, got a %s at %v", gable.Tier, gable.Price)
	}

	_, barn := post(t, `{"width":12,"length":16,"model":"Barn"}`)
	if barn.Tier != "Standard" || barn.Price != 6089 {
		t.Errorf("want a Standard Barn at 6089, got a %s at %v", barn.Tier, barn.Price)
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
	design := `{"width":12,"length":16,"tier":"Deluxe","model":"Gable","placements":[%s]}`

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
	design := `{"width":12,"length":16,"tier":"Deluxe","model":"Gable","placements":[%s]}`

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
	rec, saved := post(t, `{"width":12,"length":16,"tier":"Deluxe","model":"Gable","placements":[
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

	rec, design := post(t, `{"width":12,"length":16,"tier":"Standard","model":"Barn","price":1}`)
	if rec.Code != http.StatusCreated {
		t.Fatalf("want 201, got %d: %s", rec.Code, rec.Body.String())
	}
	if design.Price != 6089 {
		t.Errorf("want the catalog price 6089 served from the shared file, got %v", design.Price)
	}
}
