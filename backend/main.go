package main

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"net/http"
	"sync"
	"time"
)

// Placement represents a door or window placement on the shed
type Placement struct {
	ID          string  `json:"id"`
	Type        string  `json:"type"` // "door" or "window"
	Wall        string  `json:"wall"` // "front", "back", "left", "right"
	NormalizedX float64 `json:"normalizedX"`
	NormalizedY float64 `json:"normalizedY"`
	Width       float64 `json:"width"`
	Height      float64 `json:"height"`
	RotationZ   float64 `json:"rotationZ,omitempty"`
}

// Design represents a shed configuration
type Design struct {
	ID        string       `json:"id"`
	Width     int          `json:"width"`
	Length    int          `json:"length"`
	Style     string       `json:"style"`
	Color     string       `json:"color"`
	RoofColor string       `json:"roofColor"`
	TrimColor string       `json:"trimColor"`
	Placements []*Placement `json:"placements"`
	Price     float64      `json:"price"`
	CreatedAt string       `json:"createdAt"`
}

// In-memory storage
var (
	designStore = make(map[string]*Design)
	mu          sync.RWMutex
)

// calculatePrice computes the price based on dimensions and style
func calculatePrice(width, length int, style string) float64 {
	basePrice := float64((width * length)) * 10.0 // $10 per sq ft

	if style == "Barn" {
		basePrice += 500.0 // Barn style surcharge
	}

	return basePrice
}

// POST /api/save-design
func saveDesign(c *gin.Context) {
	var input Design
	if err := c.BindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	// Validate input
	if input.Width < 8 || input.Width > 20 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Width must be between 8-20 ft"})
		return
	}
	if input.Length < 8 || input.Length > 24 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Length must be between 8-24 ft"})
		return
	}
	if input.Style != "Gable" && input.Style != "Barn" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Style must be 'Gable' or 'Barn'"})
		return
	}

	// Create design with ID and calculated price
	design := &Design{
		ID:         uuid.New().String(),
		Width:      input.Width,
		Length:     input.Length,
		Style:      input.Style,
		Color:      input.Color,
		RoofColor:  input.RoofColor,
		TrimColor:  input.TrimColor,
		Placements: input.Placements,
		Price:      input.Price,
		CreatedAt:  time.Now().Format(time.RFC3339),
	}

	// Store design
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

// GET /api/designs (list all designs)
func listDesigns(c *gin.Context) {
	mu.RLock()
	designs := make([]*Design, 0, len(designStore))
	for _, design := range designStore {
		designs = append(designs, design)
	}
	mu.RUnlock()

	c.JSON(http.StatusOK, designs)
}

func main() {
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

	router.Run(":8080")
}
