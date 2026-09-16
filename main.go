package main

import (
	"bytes"
	"database/sql"
	_ "embed"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	_ "modernc.org/sqlite"
)

// catalog.json is the one machine-readable copy of shed-options.md. The
// frontend imports the same file; this embeds it at compile time, so the two
// cannot drift and a catalog change needs no code edit on either side
// (issue #8).
//
// Embedded rather than read at runtime: the binary then carries its own
// prices and cannot be started next to a missing or stale file.
//
//go:embed catalog.json
var catalogJSON []byte

// priceTable maps "WxLxTier" to base price in dollars.
//
// Keyed on the Tier rather than the height: every catalog size is 11ft to the
// peak now, so the height tells the two grades apart no longer and all seven
// Standard sizes would collide with their Deluxe twin.
var priceTable map[string]float64

// optionPrices maps add-on keys to dollar amounts.
var optionPrices map[string]float64

// modelTiers maps a Model to the Tiers it is sold at. A Gable is Deluxe only:
// the price list has "Standard barn prices" and then "Deluxe barns & gables",
// and there is no Standard gable in the table. The price table is not keyed by
// Model, so this is the only place that rule can live — 12x16xStandard is a
// real price, for a Barn.
var modelTiers map[string][]string

func init() {
	var catalog struct {
		BasePrices   map[string]float64  `json:"basePrices"`
		OptionPrices map[string]float64  `json:"optionPrices"`
		ModelTiers   map[string][]string `json:"modelTiers"`
	}
	if err := json.Unmarshal(catalogJSON, &catalog); err != nil {
		// Unreachable short of shipping a malformed catalog, and refusing to
		// start is the right answer if we ever do: the alternative is a server
		// that quotes every shed at zero and rejects every size as unsold.
		panic(fmt.Sprintf("catalog.json is not valid JSON: %v", err))
	}
	if len(catalog.BasePrices) == 0 || len(catalog.OptionPrices) == 0 {
		panic("catalog.json carries no prices")
	}
	if len(catalog.ModelTiers) == 0 {
		panic("catalog.json says no Model is sold at any grade")
	}
	priceTable = catalog.BasePrices
	optionPrices = catalog.OptionPrices
	modelTiers = catalog.ModelTiers
}

// soldAsTier reports whether the catalog sells this Model at this Tier.
func soldAsTier(model, tier string) bool {
	for _, t := range modelTiers[model] {
		if t == tier {
			return true
		}
	}
	return false
}

// defaultTier is the grade to quote a Model at when the client names none.
//
// Per Model rather than a flat "Standard": a Gable is Deluxe only, so quoting
// one as a Standard would price it off a Barn's line and, since the grade
// became geometry, describe a shed with the wrong roof edge.
func defaultTier(model string) string {
	if tiers := modelTiers[model]; len(tiers) > 0 {
		return tiers[0]
	}
	return "Standard"
}

// lookupBasePrice returns the catalog price for the given dimensions.
// Returns (price, true) if found, (0, false) if not a valid catalog combo.
func lookupBasePrice(width, length int, tier string) (float64, bool) {
	key := fmt.Sprintf("%dx%dx%s", width, length, tier)
	price, ok := priceTable[key]
	return price, ok
}

// Placement represents a door or window placement on the shed.
//
// The coordinates are pointers so that "absent" is distinguishable from
// "zero". A client that produced a non-finite coordinate serializes it as
// `null`, which decodes into a plain float64 as 0 without complaint — the
// Opening would be accepted and quietly moved to the bottom-left corner of
// its wall instead of being refused (issue #19). Once validated they are
// always non-nil, so the stored JSON is unchanged.
type Placement struct {
	ID          string   `json:"id"`
	Type        string   `json:"type"` // "door", "window", "garage_door", "swing_barn_door", "entry_door"
	Wall        string   `json:"wall"` // "front", "back", "left", "right"
	NormalizedX *float64 `json:"normalizedX"`
	NormalizedY *float64 `json:"normalizedY"`
	Width       *float64 `json:"width"`
	Height      *float64 `json:"height"`
	RotationZ   float64  `json:"rotationZ,omitempty"`

	// What this Opening is, where the catalog prices two of them differently:
	// a 36in entry door is steel or nine-light, and two doors on one shed can
	// differ, so it rides on the door rather than on an Option.
	DoorType string `json:"doorType,omitempty"`

	// What hangs off it. Shutters flank a window; a ramp meets a garage door.
	// Neither has a position of its own, and neither exists apart from the
	// Opening it attaches to (issue #44).
	Shutters bool   `json:"shutters,omitempty"`
	Ramp     string `json:"ramp,omitempty"`
}

// wallSides are the four walls every Model renders (ADR-0010).
var wallSides = map[string]bool{"front": true, "back": true, "left": true, "right": true}

// validatePlacements rejects any Placement the renderer could not draw.
//
// This mirrors validateDesignConfig in the frontend. The client check is the
// only other one there is, so this must not be the weaker of the two: a
// Design is stored exactly as it arrives and is handed straight back to the
// renderer on load.
func validatePlacements(placements []*Placement) error {
	for i, p := range placements {
		if p == nil {
			return fmt.Errorf("placement %d is missing", i)
		}
		where := p.ID
		if where == "" {
			where = fmt.Sprintf("index %d", i)
		}
		for name, value := range map[string]*float64{
			"normalizedX": p.NormalizedX,
			"normalizedY": p.NormalizedY,
		} {
			if value == nil {
				return fmt.Errorf("placement %s has no %s", where, name)
			}
			if *value < 0 || *value > 1 {
				return fmt.Errorf("placement %s has %s outside its wall", where, name)
			}
		}
		for name, value := range map[string]*float64{
			"width":  p.Width,
			"height": p.Height,
		} {
			if value == nil || *value <= 0 {
				return fmt.Errorf("placement %s has an invalid %s", where, name)
			}
		}
		if !wallSides[p.Wall] {
			return fmt.Errorf("placement %s names a wall the shed does not have: %q", where, p.Wall)
		}
	}
	return nil
}

// OptionConfig holds the client-supplied add-on state.
// We re-derive price server-side for security; we just store the state.
type OptionConfig struct {
	Enabled   bool    `json:"enabled"`
	Size      string  `json:"size,omitempty"`
	Count     int     `json:"count,omitempty"`
	Type      string  `json:"type,omitempty"`
	Pairs     int     `json:"pairs,omitempty"`
	RunningFt float64 `json:"runningFt,omitempty"`
	Sheets    int     `json:"sheets,omitempty"`
	Sqft      float64 `json:"sqft,omitempty"`
	// Ends is which gable an octagon is fitted to: "front", "back" or "both".
	// It mirrors `octagonEnds` in gableEndOpenings.js — an octagon is bought
	// per end, and the two sides must count the same or the price shown and
	// the price charged disagree (issue #43).
	Ends string `json:"ends,omitempty"`
}

// octagonEndCount is how many octagons an Option buys.
//
// An Option with no Ends is one octagon on the front: the reading that cannot
// overcharge, and what a customer ticking a box once means. Mirrors
// `octagonEnds` in gableEndOpenings.js.
func octagonEndCount(oc OptionConfig) float64 {
	if !oc.Enabled {
		return 0
	}
	if oc.Ends == "both" {
		return 2
	}
	return 1
}

// Options holds all add-on states.
// Options are the catalog items that have **no position on the shed**.
//
// Doors, windows, shutters and ramps are not here: anything that sits somewhere
// is a Placement, and the Quote counts Placements. A flag beside them would be a
// second copy of the same fact, and that is how a garage door came to add $500
// and no geometry (issue #10).
type Options struct {
	OctagonWindow OptionConfig `json:"octagonWindow"`
	Skylight      OptionConfig `json:"skylight"`
	OctagonVent   OptionConfig `json:"octagonVent"`
	Workbench     OptionConfig `json:"workbench"`
	Pegboard      OptionConfig `json:"pegboard"`
	Loft          OptionConfig `json:"loft"`
}

// calculateOptionTotal derives the add-on price from what is on the shed.
//
// **Openings are counted, not ticked** (issue #10). The client shows the same
// number by the same rule, but this one is the Quote (ADR-0008): a price that
// followed a checkbox could be paid for a shed with no door in it.
func calculateOptionTotal(ao Options, placements []*Placement) float64 {
	total := 0.0

	of := func(kind string) []*Placement {
		var out []*Placement
		for _, p := range placements {
			if p != nil && p.Type == kind {
				out = append(out, p)
			}
		}
		return out
	}

	// The first roll-up is priced by its width; every one after it is what the
	// catalog calls an additional garage door.
	for i, p := range of("garage_door") {
		switch {
		case i > 0:
			total += optionPrices["garage_door_additional"]
		case p.Width != nil && *p.Width >= 8:
			total += optionPrices["garage_door_8x7"]
		default:
			total += optionPrices["garage_door_6x7"]
		}
	}

	// An entry door's kind rides on the door: two on one shed can differ.
	for _, p := range of("door") {
		if p.DoorType == "nine_light" {
			total += optionPrices["entry_door_nine_light"]
		} else {
			total += optionPrices["entry_door_steel"]
		}
	}

	// A swing barn door is part of the Standard barn package and adds nothing.

	windows := of("window")
	total += optionPrices["window_vinyl_slide"] * float64(len(windows))

	// Shutters and ramps hang off the Opening they flank or meet, so the count
	// of Openings carrying one *is* the quantity.
	for _, p := range windows {
		if p.Shutters {
			total += optionPrices["shutters_per_pair"]
		}
	}
	for _, p := range of("garage_door") {
		switch p.Ramp {
		case "large":
			total += optionPrices["ramp_large"]
		case "small":
			total += optionPrices["ramp_small"]
		}
	}

	if n := octagonEndCount(ao.OctagonWindow); n > 0 {
		total += optionPrices["window_octagon"] * n
	}
	if ao.Skylight.Enabled {
		ft := ao.Skylight.RunningFt
		if ft <= 0 {
			ft = 8
		}
		total += optionPrices["skylight_per_ft"] * ft
	}
	if n := octagonEndCount(ao.OctagonVent); n > 0 {
		total += optionPrices["vent_octagon"] * n
	}
	if ao.Workbench.Enabled {
		total += optionPrices["workbench_per_ft"] * ao.Workbench.RunningFt
	}
	if ao.Pegboard.Enabled {
		total += optionPrices["pegboard_per_sheet"] * float64(ao.Pegboard.Sheets)
	}
	if ao.Loft.Enabled {
		total += optionPrices["loft_per_sqft"] * ao.Loft.Sqft
	}

	return total
}

// Design represents a shed configuration.
type Design struct {
	ID         string       `json:"id"`
	Width      int          `json:"width"`
	Length     int          `json:"length"`
	Tier       string       `json:"tier"`
	Model      string       `json:"model"`
	Color      string       `json:"color"`
	RoofColor  string       `json:"roofColor"`
	TrimColor  string       `json:"trimColor"`
	Placements []*Placement `json:"placements"`
	Options    Options      `json:"options"`
	Price      float64      `json:"price"`
	CreatedAt  string       `json:"createdAt"`
}

// Storage: SQLite on disk, so a saved Design outlives the process. It used to
// be a map behind a mutex, which lost every Design on restart — and a quote
// request that evaporates on the next deploy is worse than no button at all.
//
// The driver is `modernc.org/sqlite`: pure Go, no cgo, so the server stays one
// static binary and any host with a writable disk can run it.
//
// **A Design is stored whole, as JSON in one column.** A column per field would
// be a second description of `Design` to keep in step with the struct, and
// nothing here queries by field: a Design is written once and read back by its
// id. The id is the customer's handle — a UUID, unguessable, which is what
// stands in for an account until there is one.
var (
	db     *sql.DB
	dbOnce sync.Once
)

// dbPath is where the database lives. `SHED_DB` lets a deployment put it on a
// mounted volume, and lets the tests point at a temporary file.
func dbPath() string {
	if p := os.Getenv("SHED_DB"); p != "" {
		return p
	}
	return "shed.db"
}

// database opens the file on first use and creates the schema if it is not
// there. Opened lazily rather than in init() so that a test can choose the path
// before the first request, and so that `go test` on a package that never
// serves a request touches no disk.
func database() *sql.DB {
	dbOnce.Do(func() {
		path := dbPath()
		handle, err := sql.Open("sqlite", path)
		if err != nil {
			log.Fatalf("cannot open the design database at %s: %v", path, err)
		}
		if _, err := handle.Exec(`
			CREATE TABLE IF NOT EXISTS designs (
				id         TEXT PRIMARY KEY,
				created_at TEXT NOT NULL,
				doc        TEXT NOT NULL
			)
		`); err != nil {
			log.Fatalf("cannot create the designs table in %s: %v", path, err)
		}
		// Columns here, where a Design is one JSON document. The difference is
		// who reads it: a Design is written by this server and read back by it,
		// whole, while a quote request is read by a person at the shop — and
		// eventually sorted, filtered and marked done. Five short fields are
		// worth naming.
		if _, err := handle.Exec(`
			CREATE TABLE IF NOT EXISTS quote_requests (
				id         TEXT PRIMARY KEY,
				design_id  TEXT NOT NULL,
				created_at TEXT NOT NULL,
				name       TEXT NOT NULL,
				phone      TEXT NOT NULL,
				email      TEXT NOT NULL,
				zip        TEXT NOT NULL,
				note       TEXT NOT NULL
			)
		`); err != nil {
			log.Fatalf("cannot create the quote_requests table in %s: %v", path, err)
		}
		db = handle
	})
	return db
}

// storeDesign writes one Design, whole.
func storeDesign(d *Design) error {
	doc, err := json.Marshal(d)
	if err != nil {
		return err
	}
	_, err = database().Exec(
		`INSERT INTO designs (id, created_at, doc) VALUES (?, ?, ?)`,
		d.ID, d.CreatedAt, string(doc),
	)
	return err
}

// loadDesign reads one back by its id. `sql.ErrNoRows` means no such Design.
func loadDesign(id string) (*Design, error) {
	var doc string
	if err := database().QueryRow(`SELECT doc FROM designs WHERE id = ?`, id).Scan(&doc); err != nil {
		return nil, err
	}
	var d Design
	if err := json.Unmarshal([]byte(doc), &d); err != nil {
		return nil, err
	}
	return &d, nil
}

// buildDesign turns what a client sent into the Design this server will stand
// behind: the Model and Tier checked against what is sold, the combination
// checked against the catalog, every Placement checked as buildable, and **the
// price computed here** — whatever the client claimed is ignored (ADR-0008).
//
// Factored out of the save handler because a quote request has to do exactly
// this before it does anything else, and two copies of it would be two answers
// to "what does this shed cost".
//
// Every error it returns is a refusal the caller can fix, so callers answer 400.
func buildDesign(input Design) (*Design, error) {
	// The Model is checked first, because the Tier's default depends on it.
	if input.Model != "Gable" && input.Model != "Barn" {
		return nil, fmt.Errorf("Model must be 'Gable' or 'Barn'")
	}

	// Default the Tier to the grade this Model is sold at, if the client names
	// none. A flat "Standard" made a Gable into a shed the catalog does not
	// sell, priced off a Barn's line.
	if input.Tier == "" {
		input.Tier = defaultTier(input.Model)
	}

	if !soldAsTier(input.Model, input.Tier) {
		return nil, fmt.Errorf(
			"A %s is sold as %s only",
			input.Model, strings.Join(modelTiers[input.Model], " or "),
		)
	}

	basePrice, valid := lookupBasePrice(input.Width, input.Length, input.Tier)
	if !valid {
		return nil, fmt.Errorf(
			"Invalid combination: %dx%d %s is not in the catalog",
			input.Width, input.Length, input.Tier,
		)
	}

	if err := validatePlacements(input.Placements); err != nil {
		return nil, err
	}

	return &Design{
		ID:         uuid.New().String(),
		Width:      input.Width,
		Length:     input.Length,
		Tier:       input.Tier,
		Model:      input.Model,
		Color:      input.Color,
		RoofColor:  input.RoofColor,
		TrimColor:  input.TrimColor,
		Placements: input.Placements,
		Options:    input.Options,
		Price:      basePrice + calculateOptionTotal(input.Options, input.Placements),
		CreatedAt:  time.Now().Format(time.RFC3339),
	}, nil
}

// POST /api/save-design
func saveDesign(c *gin.Context) {
	var input Design
	if err := c.BindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	design, err := buildDesign(input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := storeDesign(design); err != nil {
		// Saying "saved" over a write that failed is the one answer worse than
		// refusing: the customer keeps a link to a Design nobody has.
		log.Printf("saving design %s: %v", design.ID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not save the design"})
		return
	}

	c.JSON(http.StatusCreated, design)
}

// Contact is how the shop reaches a customer back. The name is required and so
// is **one** of phone or email: the shop has to be able to call back, and
// demanding both loses customers who give one (issue #54).
type Contact struct {
	Name  string `json:"name"`
	Phone string `json:"phone"`
	Email string `json:"email"`
	Zip   string `json:"zip"`
	Note  string `json:"note"`

	// Company is a honeypot. The form hides it, so a customer never fills it
	// in and a bot filling every field does. A filled one is answered exactly
	// like a real request and stored nowhere — telling a bot it failed only
	// teaches it what to change.
	Company string `json:"company"`
}

// QuoteRequest is a Design plus the person who wants it built.
type QuoteRequest struct {
	ID        string  `json:"id"`
	DesignID  string  `json:"designId"`
	Contact   Contact `json:"contact"`
	Price     float64 `json:"price"`
	CreatedAt string  `json:"createdAt"`
}

type quoteRequestInput struct {
	Design  Design  `json:"design"`
	Contact Contact `json:"contact"`
}

// validateContact mirrors `validateContact` in services/designApi.js. Neither
// may be the weaker of the two.
func validateContact(k Contact) error {
	if strings.TrimSpace(k.Name) == "" {
		return fmt.Errorf("a name is required")
	}
	if strings.TrimSpace(k.Phone) == "" && strings.TrimSpace(k.Email) == "" {
		return fmt.Errorf("a phone number or an email address is required")
	}
	if e := strings.TrimSpace(k.Email); e != "" && (!strings.Contains(e, "@") || strings.HasSuffix(e, "@")) {
		return fmt.Errorf("that email address does not look like one")
	}
	return nil
}

// A quote request is cheap to send and expensive to receive, so one address may
// only send a few. In memory, which is all a single local process needs: a
// restart forgiving everyone is not a threat model, it is a Tuesday.
var (
	quoteSeen = map[string][]time.Time{}
	quoteMu   sync.Mutex
)

const (
	quoteWindow = time.Hour
	quoteBurst  = 5
)

func withinRateLimit(ip string) bool {
	quoteMu.Lock()
	defer quoteMu.Unlock()

	cutoff := time.Now().Add(-quoteWindow)
	kept := quoteSeen[ip][:0]
	for _, at := range quoteSeen[ip] {
		if at.After(cutoff) {
			kept = append(kept, at)
		}
	}
	if len(kept) >= quoteBurst {
		quoteSeen[ip] = kept
		return false
	}
	quoteSeen[ip] = append(kept, time.Now())
	return true
}

// notifyShop tells a human a quote request arrived.
//
// Over HTTPS, not SMTP: outbound mail ports are blocked or restricted on most
// entry-tier hosts, and a blocked port fails silently on the day it matters.
//
// **With no provider configured it logs the whole request instead of sending.**
// That is the local default and it is deliberate — the flow works end to end
// with no domain, no account and no secret, and nothing is lost, because the
// request is already in the database before this is called.
func notifyShop(q *QuoteRequest, d *Design) {
	summary := fmt.Sprintf(
		"Quote request %s\n\n%s\n%s%s\nZIP: %s\n\n%dx%d %s %s — $%.2f\nDesign: %s\n\nNote:\n%s\n",
		q.ID, q.Contact.Name, q.Contact.Phone, q.Contact.Email, q.Contact.Zip,
		d.Width, d.Length, d.Tier, d.Model, q.Price, d.ID, q.Contact.Note,
	)

	to, from, key := os.Getenv("QUOTE_EMAIL_TO"), os.Getenv("QUOTE_EMAIL_FROM"), os.Getenv("RESEND_API_KEY")
	if to == "" || from == "" || key == "" {
		log.Printf("no email configured; a quote request arrived:\n%s", summary)
		return
	}

	body, err := json.Marshal(map[string]any{
		"from":    from,
		"to":      []string{to},
		"subject": fmt.Sprintf("Quote request: %dx%d %s from %s", d.Width, d.Length, d.Model, q.Contact.Name),
		"text":    summary,
	})
	if err != nil {
		log.Printf("quote request %s: cannot build the notification: %v", q.ID, err)
		return
	}

	req, err := http.NewRequest(http.MethodPost, "https://api.resend.com/emails", bytes.NewReader(body))
	if err != nil {
		log.Printf("quote request %s: cannot build the notification: %v", q.ID, err)
		return
	}
	req.Header.Set("Authorization", "Bearer "+key)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		// The request is saved either way. A failed notification is a thing to
		// chase in the log, not a reason to tell the customer it did not send.
		log.Printf("quote request %s: notification failed: %v", q.ID, err)
		return
	}
	defer res.Body.Close()
	if res.StatusCode >= 300 {
		log.Printf("quote request %s: notification refused with %d", q.ID, res.StatusCode)
	}
}

// storeQuoteRequest writes one request. The honeypot never reaches it.
func storeQuoteRequest(q *QuoteRequest) error {
	_, err := database().Exec(
		`INSERT INTO quote_requests (id, design_id, created_at, name, phone, email, zip, note)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		q.ID, q.DesignID, q.CreatedAt,
		q.Contact.Name, q.Contact.Phone, q.Contact.Email, q.Contact.Zip, q.Contact.Note,
	)
	return err
}

// POST /api/quote-request
//
// The terminal act (ADR-0008): a Design plus the contact details of whoever
// wants it built. It saves the Design and the request first and notifies
// afterwards, so a request survives a notification that does not.
func requestQuote(c *gin.Context) {
	var input quoteRequestInput
	if err := c.BindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	if strings.TrimSpace(input.Contact.Company) != "" {
		// Answered like any other request, and stored nowhere.
		log.Printf("a quote request filled the honeypot; dropped")
		c.JSON(http.StatusCreated, gin.H{"id": uuid.New().String()})
		return
	}

	if !withinRateLimit(c.ClientIP()) {
		c.JSON(http.StatusTooManyRequests, gin.H{
			"error": "That is a lot of quote requests. Give us a moment, or call the shop.",
		})
		return
	}

	if err := validateContact(input.Contact); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	design, err := buildDesign(input.Design)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := storeDesign(design); err != nil {
		log.Printf("quote request: saving design %s: %v", design.ID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not save the design"})
		return
	}

	contact := input.Contact
	contact.Company = ""
	quote := &QuoteRequest{
		ID:        uuid.New().String(),
		DesignID:  design.ID,
		Contact:   contact,
		Price:     design.Price,
		CreatedAt: time.Now().Format(time.RFC3339),
	}

	if err := storeQuoteRequest(quote); err != nil {
		log.Printf("quote request %s: %v", quote.ID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not send the request"})
		return
	}

	notifyShop(quote, design)

	c.JSON(http.StatusCreated, quote)
}

// GET /api/design/:id
func getDesign(c *gin.Context) {
	id := c.Param("id")

	design, err := loadDesign(id)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Design not found"})
		return
	}
	if err != nil {
		log.Printf("loading design %s: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not load the design"})
		return
	}

	c.JSON(http.StatusOK, design)
}

// newRouter builds the HTTP router. Split out from main() so tests can drive
// the API with httptest without binding a port.
func newRouter() *gin.Engine {
	router := gin.Default()

	// CORS middleware
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// API Routes
	//
	// There is deliberately no route that lists every Design. One returning
	// them all to any caller is a data leak the moment a Design carries a
	// customer's name and number, and nothing needs it: a customer reaches
	// their own Design by its id, which is the unguessable half of the link
	// they were given. A staff view, when there is one, arrives with
	// authentication rather than before it.
	api := router.Group("/api")
	{
		api.POST("/save-design", saveDesign)
		api.POST("/quote-request", requestQuote)
		api.GET("/design/:id", getDesign)
	}

	return router
}

func main() {
	log.Printf("designs are stored in %s", dbPath())
	newRouter().Run(":8080")
}
