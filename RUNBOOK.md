# Shed Configurator - Complete Setup & Running Guide

## Project Overview

This is a full-stack Shed Configurator web application built with:
- **Frontend**: React + Vite + Tailwind CSS + React Three Fiber (R3F) for 3D visualization
- **Backend**: Go + Gin Framework + REST API
- **3D Graphics**: Three.js for procedural shed geometry generation
- **State Management**: Zustand for centralized configuration state

## Architecture Summary

### Frontend Structure
```
frontend/src/
├── App.jsx                          # Main split-screen layout component
├── components/
│   ├── GableShed/GableShed.jsx     # Gable roof shed component (simpler geometry)
│   ├── BarnShed/BarnShed.jsx       # Gambrel roof barn component
│   ├── common/
│   │   ├── Skids.jsx                # Foundation/skid beams
│   │   ├── DoorFrame.jsx            # Door trim frames
│   │   ├── DoorObject.jsx           # 3D door objects
│   │   ├── WindowFrame.jsx          # Window trim frames
│   │   └── WindowObject.jsx         # 3D window objects
│   └── [other components]
├── store/
│   └── shedStore.js                 # Zustand configuration store
├── utils/
│   ├── csgOperations.js             # CSG boolean operations for cutouts
│   ├── roofGeometry.js              # Roof geometry calculations
│   └── [other utilities]
└── index.css / App.css

backend/
├── main.go                           # Go backend with API routes
├── go.mod / go.sum                   # Go dependencies
└── shed-server                       # Compiled binary
```

### Key Features

1. **Configurable Shed Dimensions**
   - Width: 8-20 feet
   - Length: 8-24 feet

2. **Roof Styles**
   - **Gable**: Simple triangular pitched roof
   - **Barn (Gambrel)**: Two-slope roof (5:12 lower, 10:12 upper) with knuckle point

3. **Customizable Colors**
   - Siding color
   - Roof color
   - Trim color

4. **Dynamic Pricing**
   - Base: $10 per square foot
   - Barn style surcharge: +$500

5. **Design Persistence**
   - Save configurations to backend
   - Retrieve saved designs by ID
   - List all saved designs

## Installation & Setup

### Prerequisites

- **Node.js** v20.19+ (for frontend)
- **Go** 1.20+ (for backend)
- **npm** or **yarn** (for frontend package management)

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd /Users/huntermotko/Documents/go/shed_app/frontend
   ```

2. **Install dependencies** (if not already installed)
   ```bash
   npm install
   ```

3. **Verify build works**
   ```bash
   npm run build
   ```
   Expected output: ✓ 646 modules transformed, ✓ built successfully

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd /Users/huntermotko/Documents/go/shed_app/backend
   ```

2. **Verify Go installation**
   ```bash
   go version
   ```
   Expected: go version go1.20+ (or newer)

3. **Build the server** (already compiled, but you can rebuild)
   ```bash
   go build -o shed-server
   ```

## Running the Application

### Step 1: Start the Go Backend Server

```bash
cd /Users/huntermotko/Documents/go/shed_app/backend
./shed-server
```

**Expected output:**
```
[GIN-debug] Loaded HTML Templates (0):
[GIN-debug] Listening and serving HTTP on :8080
```

The server is now running on `http://localhost:8080` and handles:
- `POST /api/save-design` - Save a shed configuration
- `GET /api/design/:id` - Retrieve a design by ID
- `GET /api/designs` - List all saved designs

### Step 2: Start the Frontend Development Server (in a new terminal)

```bash
cd /Users/huntermotko/Documents/go/shed_app/frontend
npm run dev
```

**Expected output:**
```
VITE v7.2.4  ready in 123 ms

➜  Local:   http://localhost:5173/
➜  press h to show help
```

The frontend is now running on `http://localhost:5173`

### Step 3: Open in Browser

Navigate to: **http://localhost:5173**

## Using the Application

### Main Interface

**Left Panel - Configuration Controls:**
1. **Dimensions Section**
   - Width slider (8-20 ft)
   - Length slider (8-24 ft)

2. **Style & Colors Section**
   - Roof Style dropdown (Gable or Barn)
   - Siding Color picker
   - Roof Color picker
   - Trim Color picker

3. **Summary Section**
   - Style display
   - Dimensions display
   - Area calculation
   - Door/Window count
   - **Estimated Price** (automatically calculated)

4. **Action Buttons**
   - **Save Design** - Persists configuration to backend
   - **Reset** - Resets to default values

**Right Panel - 3D Canvas:**
- Interactive 3D visualization of the shed
- **Mouse Controls:**
  - Left-click + drag: Rotate around shed
  - Right-click + drag: Pan camera
  - Scroll: Zoom in/out
- Infinite grid for reference
- Dynamic lighting

### Configuration Workflow

1. **Adjust Dimensions**
   - Use width slider (8-20 ft)
   - Use length slider (8-24 ft)
   - Watch 3D model update in real-time

2. **Select Roof Style**
   - Choose "Gable" for simple triangular roof
   - Choose "Barn" for gambrel (two-slope) roof
   - Price updates automatically (+$500 for Barn)

3. **Customize Colors**
   - Click any color picker to choose custom colors
   - Observe changes immediately in 3D view

4. **Save Your Design**
   - Click "Save Design" button
   - Backend assigns unique ID
   - Alert shows the saved design ID
   - Configuration stored in-memory (persists while server runs)

5. **Retrieve Saved Designs**
   - Use the API endpoint: `GET http://localhost:8080/api/design/{id}`
   - Returns full configuration JSON

## API Endpoints

### 1. Save a Design
**Endpoint:** `POST /api/save-design`

**Request Body:**
```json
{
  "width": 12,
  "length": 16,
  "style": "Gable",
  "color": "#D2691E",
  "roofColor": "#8B4513",
  "trimColor": "#654321",
  "placements": [],
  "price": 1920
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "width": 12,
  "length": 16,
  "style": "Gable",
  "color": "#D2691E",
  "roofColor": "#8B4513",
  "trimColor": "#654321",
  "placements": [],
  "price": 1920,
  "createdAt": "2024-11-30T16:05:00Z"
}
```

### 2. Get Design by ID
**Endpoint:** `GET /api/design/:id`

**Example:** `GET /api/design/550e8400-e29b-41d4-a716-446655440000`

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "width": 12,
  "length": 16,
  "style": "Gable",
  "color": "#D2691E",
  "roofColor": "#8B4513",
  "trimColor": "#654321",
  "placements": [],
  "price": 1920,
  "createdAt": "2024-11-30T16:05:00Z"
}
```

### 3. List All Designs
**Endpoint:** `GET /api/designs`

**Response (200 OK):**
```json
[
  { ... design 1 ... },
  { ... design 2 ... },
  { ... design 3 ... }
]
```

## Testing the API with curl

### Save a Design
```bash
curl -X POST http://localhost:8080/api/save-design \
  -H "Content-Type: application/json" \
  -d '{
    "width": 14,
    "length": 20,
    "style": "Barn",
    "color": "#8B4513",
    "roofColor": "#2F4F4F",
    "trimColor": "#654321",
    "placements": [],
    "price": 3300
  }'
```

### Get a Design
```bash
curl http://localhost:8080/api/design/{id}
```

### List All Designs
```bash
curl http://localhost:8080/api/designs
```

## Stopping the Application

1. **Stop Frontend Server:**
   - Press `Ctrl+C` in the terminal running `npm run dev`

2. **Stop Backend Server:**
   - Press `Ctrl+C` in the terminal running `./shed-server`

## Troubleshooting

### Issue: "Port 8080 already in use"
**Solution:** Kill the process using port 8080
```bash
lsof -ti:8080 | xargs kill -9
```

### Issue: "Port 5173 already in use"
**Solution:** Use a different port
```bash
npm run dev -- --port 5174
```

### Issue: CORS errors in browser console
**Solution:** Backend CORS middleware is enabled. If still seeing errors:
- Verify backend is running on `http://localhost:8080`
- Check browser console for exact error
- Backend CORS allows all origins (wildcard)

### Issue: "Cannot find module" errors
**Solution:** Reinstall dependencies
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Issue: Go binary won't execute
**Solution:** Rebuild the binary
```bash
cd backend
go mod tidy
go build -o shed-server
./shed-server
```

## Development Notes

### Key Technologies & Patterns

1. **React Three Fiber (R3F)**
   - Uses extrudeGeometry to create 3D shed profiles
   - Applies shaders for texture details (T1-11 siding, corrugated roof)
   - Implements CSG boolean operations for door/window cutouts

2. **Zustand Store** (`shedStore.js`)
   - Centralized configuration state
   - All state changes trigger immediate 3D re-render
   - Supports configuration reset

3. **Procedural Geometry Generation**
   - **GableShed**: Creates triangular roof profile, extrudes along length
   - **BarnShed**: Creates trapezoid lower + triangle upper roof, two extrusions
   - No external 3D model files (.obj, .gltf) - everything is procedurally generated

4. **Price Calculation**
   - Frontend: Calculated on dimension/style change
   - Backend: Recalculated on save (validation)
   - Formula: (width × length × $10/sqft) + (Barn style ? $500 : $0)

## Build Artifacts

- **Frontend Build:** `/Users/huntermotko/Documents/go/shed_app/frontend/dist/`
- **Backend Binary:** `/Users/huntermotko/Documents/go/shed_app/backend/shed-server`

To deploy to production:
1. Build frontend: `npm run build` → creates `dist/` folder
2. Build backend: `go build -o shed-server`
3. Serve frontend files statically from Go backend (optional enhancement)

## Next Steps & Enhancements

1. **Database Persistence**
   - Replace in-memory store with SQLite/PostgreSQL
   - Implement user authentication
   - Add design sharing/collaboration features

2. **Advanced Features**
   - Door/window placement UI (currently configured via state only)
   - Material texture customization
   - Foundation/base customization
   - Export designs as images (screenshot) or 3D files

3. **Performance Optimization**
   - Implement geometry caching
   - Add level-of-detail (LOD) for complex geometries
   - Code splitting for large bundle size

4. **Mobile Responsiveness**
   - Adapt split-screen layout for mobile
   - Touch controls for 3D canvas
   - Responsive controls panel

---

**Last Updated:** November 30, 2024
**Status:** ✅ Fully functional shed configurator with procedural geometry and REST API
