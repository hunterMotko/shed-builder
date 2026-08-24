package main

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"net/http"
	"sync"
	"time"
)

// priceTable maps "WxLxH" to base price in dollars.
var priceTable = map[string]float64{
	// Standard — 10ft wall height
	"10x12x10": 4689, "10x16x10": 5189, "10x20x10": 5689,
	"12x12x10": 5589, "12x16x10": 6089, "12x20x10": 6589, "12x24x10": 7089,
	// Deluxe — 11ft wall height
	"10x12x11": 5789, "10x16x11": 6389, "10x20x11": 6989,
	"12x12x11": 5989, "12x16x11": 6389, "12x20x11": 7189,
	"12x24x11": 7789, "12x26x11": 8389, "12x32x11": 8989,
	"14x20x11": 11189, "14x24x11": 11789, "14x28x11": 12389,
	"14x32x11": 12989, "14x36x11": 13589,
	"16x24x11": 12189, "16x28x11": 12789, "16x32x11": 13389, "16x36x11": 13989,
	// Special — 12ft wall height
	"14x28x12": 13189, "16x36x12": 14789,
}

// optionPrices maps add-on keys to dollar amounts.
var optionPrices = map[string]float64{
	"garage_door_6x7":        450,
	"garage_door_8x7":        500,
	"garage_door_additional": 600,
	"entry_door_steel":       375,
	"entry_door_nine_light":  425,
	"window_vinyl_slide":     275, // per window
	"window_octagon":         85,
	"skylight_per_ft":        5,
	"shutters_per_pair":      70,
	"ramp_small":             275,
	"ramp_large":             325,
	"vent_octagon":           85,
	"workbench_per_ft":       35,
	"pegboard_per_sheet":     70,
	"loft_per_sqft":          4,
}

// lookupBasePrice returns the catalog price for the given dimensions.
// Returns (price, true) if found, (0, false) if not a valid catalog combo.
func lookupBasePrice(width, length, wallHeight int) (float64, bool) {
	key := fmt.Sprintf("%dx%dx%d", width, length, wallHeight)
	price, ok := priceTable[key]
	return price, ok
}

// Placement represents a door or window placement on the shed.
type Placement struct {
	ID          string  `json:"id"`
	Type        string  `json:"type"` // "door", "window", "garage_door", "swing_barn_door", "entry_door"
	Wall        string  `json:"wall"` // "front", "back", "left", "right"
	NormalizedX float64 `json:"normalizedX"`
	NormalizedY float64 `json:"normalizedY"`
	Width       float64 `json:"width"`
	Height      float64 `json:"height"`
	RotationZ   float64 `json:"rotationZ,omitempty"`
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
	if ao.OctagonWindow.Enabled {
		total += optionPrices["window_octagon"]
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
	if ao.OctagonVent.Enabled {
		total += optionPrices["vent_octagon"]
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
	WallHeight int          `json:"wallHeight"`
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

	// Default wallHeight to 10 if not supplied
	if input.WallHeight == 0 {
		input.WallHeight = 10
	}

	// Validate combo against price table
	basePrice, valid := lookupBasePrice(input.Width, input.Length, input.WallHeight)
	if !valid {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf(
				"Invalid combination: %dx%dx%d is not in the catalog",
				input.Width, input.Length, input.WallHeight,
			),
		})
		return
	}

	if input.Model != "Gable" && input.Model != "Barn" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Model must be 'Gable' or 'Barn'"})
		return
	}

	// Server-side price calculation (ignore client price for base)
	serverPrice := basePrice + calculateOptionTotal(input.Options)

	design := &Design{
		ID:         uuid.New().String(),
		Width:      input.Width,
		Length:     input.Length,
		WallHeight: input.WallHeight,
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
