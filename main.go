package main

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"net/http"
	"strings"
	"sync"
	"time"
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
type Options struct {
	GarageDoor     OptionConfig `json:"garageDoor"`
	AdditionalDoor OptionConfig `json:"additionalDoor"`
	EntryDoor      OptionConfig `json:"entryDoor"`
	VinylWindows   OptionConfig `json:"vinylWindows"`
	OctagonWindow  OptionConfig `json:"octagonWindow"`
	Skylight       OptionConfig `json:"skylight"`
	Shutters       OptionConfig `json:"shutters"`
	Ramp           OptionConfig `json:"ramp"`
	OctagonVent    OptionConfig `json:"octagonVent"`
	Workbench      OptionConfig `json:"workbench"`
	Pegboard       OptionConfig `json:"pegboard"`
	Loft           OptionConfig `json:"loft"`
}

// calculateOptionTotal derives total add-on price from the Options state.
func calculateOptionTotal(ao Options) float64 {
	total := 0.0

	if ao.GarageDoor.Enabled {
		if ao.GarageDoor.Size == "8x7" {
			total += optionPrices["garage_door_8x7"]
		} else {
			total += optionPrices["garage_door_6x7"]
		}
	}
	if ao.AdditionalDoor.Enabled {
		total += optionPrices["garage_door_additional"]
	}
	if ao.EntryDoor.Enabled {
		if ao.EntryDoor.Type == "nine_light" {
			total += optionPrices["entry_door_nine_light"]
		} else {
			total += optionPrices["entry_door_steel"]
		}
	}
	if ao.VinylWindows.Enabled {
		count := ao.VinylWindows.Count
		if count < 1 {
			count = 1
		}
		total += optionPrices["window_vinyl_slide"] * float64(count)
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
	if ao.Shutters.Enabled {
		pairs := ao.Shutters.Pairs
		if pairs < 1 {
			pairs = 1
		}
		total += optionPrices["shutters_per_pair"] * float64(pairs)
	}
	if ao.Ramp.Enabled {
		if ao.Ramp.Size == "large" {
			total += optionPrices["ramp_large"]
		} else {
			total += optionPrices["ramp_small"]
		}
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

// In-memory storage.
var (
	designStore = make(map[string]*Design)
	mu          sync.RWMutex
)

// POST /api/save-design
func saveDesign(c *gin.Context) {
	var input Design
	if err := c.BindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	// The Model is checked first now, because the Tier's default depends on it.
	if input.Model != "Gable" && input.Model != "Barn" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Model must be 'Gable' or 'Barn'"})
		return
	}

	// Default the Tier to the grade this Model is sold at, if the client names
	// none. A flat "Standard" made a Gable into a shed the catalog does not
	// sell, priced off a Barn's line.
	if input.Tier == "" {
		input.Tier = defaultTier(input.Model)
	}

	if !soldAsTier(input.Model, input.Tier) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf(
				"A %s is sold as %s only",
				input.Model, strings.Join(modelTiers[input.Model], " or "),
			),
		})
		return
	}

	// Validate combo against price table
	basePrice, valid := lookupBasePrice(input.Width, input.Length, input.Tier)
	if !valid {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf(
				"Invalid combination: %dx%d %s is not in the catalog",
				input.Width, input.Length, input.Tier,
			),
		})
		return
	}

	if err := validatePlacements(input.Placements); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Server-side price calculation (ignore client price for base)
	serverPrice := basePrice + calculateOptionTotal(input.Options)

	design := &Design{
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
		Price:      serverPrice,
		CreatedAt:  time.Now().Format(time.RFC3339),
	}

	mu.Lock()
	designStore[design.ID] = design
	mu.Unlock()

	c.JSON(http.StatusCreated, design)
}

// GET /api/design/:id
func getDesign(c *gin.Context) {
	id := c.Param("id")

	mu.RLock()
	design, exists := designStore[id]
	mu.RUnlock()

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Design not found"})
		return
	}

	c.JSON(http.StatusOK, design)
}

// GET /api/designs
func listDesigns(c *gin.Context) {
	mu.RLock()
	designs := make([]*Design, 0, len(designStore))
	for _, design := range designStore {
		designs = append(designs, design)
	}
	mu.RUnlock()

	c.JSON(http.StatusOK, designs)
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
	api := router.Group("/api")
	{
		api.POST("/save-design", saveDesign)
		api.GET("/design/:id", getDesign)
		api.GET("/designs", listDesigns)
	}

	return router
}

func main() {
	newRouter().Run(":8080")
}
