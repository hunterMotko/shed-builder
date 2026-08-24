# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A full-stack 3D shed design application that allows users to configure, visualize, and save custom shed designs in real-time. The frontend uses React Three Fiber for procedural 3D geometry generation, while the backend provides a REST API for design persistence.

## Development Commands

### Backend (Go)
```bash
# Start the backend server
cd backend
./shed-server

# Build from source
cd backend
go mod tidy
go build -o shed-server
./shed-server

# Server runs on http://localhost:8080
```

### Frontend (Vite + React)
```bash
# Start development server
cd frontend
npm run dev
# Runs on http://localhost:5173

# Production build
cd frontend
npm run build

# Lint code
cd frontend
npm run lint

# Preview production build
cd frontend
npm run preview
```

## Architecture

### State Management (Zustand)
- **Single global store**: `frontend/src/store/shedStore.js`
- Manages all shed configuration: dimensions, colors, roof style, placements (doors/windows)
- Provides actions for updating state and derived getters
- Key state properties:
  - `width`, `length`: Shed dimensions (8-20ft width, 8-24ft length)
  - `style`: "Gable" or "Barn" (gambrel)
  - `color`, `roofColor`, `trimColor`: Color hex values
  - `placements`: Array of door/window placement objects with normalized positions
  - `sidingTexture`: "T1-11" or "smooth"
  - `roofMaterial`: "metal" or "shingle"
  - `roofLowerPitch`, `roofUpperPitch`: For gambrel roofs (5:12 and 10:12 default)
  - `foundationHeight`, `foundationColor`: Foundation configuration

### 3D Rendering Architecture
- **No external 3D models**: All geometry is procedurally generated using Three.js primitives
- **Two shed components**: `GableShed` and `BarnShed` render different roof styles
- **CSG operations**: Door and window cutouts use `three-bvh-csg` for Boolean operations on wall meshes
- **Placement system**: Doors/windows positioned using normalized coordinates (0.0-1.0) on wall surfaces
- **Component structure**:
  - Wall geometry: Simple `BoxGeometry` with CSG cutouts
  - Roof geometry: ExtrudeGeometry from 2D profiles
  - Foundation: Individual skid beams using `Skids` component
  - Openings: `DoorFrame`, `WindowFrame`, `DoorObject`, `WindowObject` components

### CSG (Constructive Solid Geometry) System
Located in `frontend/src/utils/csgOperations.js`:
- `csgModifier()`: Performs Boolean subtraction to cut door/window openings from wall meshes
- Placement objects define normalized positions (0.0-1.0) that are converted to world coordinates
- Each placement creates a cutout box that is subtracted from the main wall geometry

### Backend API (Go + Gin)
- **In-memory storage**: Thread-safe map with `sync.RWMutex`
- **Three endpoints**:
  - `POST /api/save-design`: Save a design configuration, returns UUID
  - `GET /api/design/:id`: Retrieve a design by ID
  - `GET /api/designs`: List all saved designs
- **Validation**: Enforces dimension limits (8-20ft width, 8-24ft length) and valid style values
- **CORS**: Configured to allow frontend at localhost:5173

### Pricing Logic
- Base price: `(width × length) × $10/sqft`
- Barn style adds $500 surcharge
- Calculated in frontend and stored with design

## Geometry System

### Roof Geometry Calculations (`frontend/src/utils/roofGeometry.js`)
The roof geometry is procedurally generated using mathematical calculations:

**Gable Roof (Simple Triangle)**:
- Single triangular profile extruded along shed length
- Peak height calculated from roof height parameter
- Rake trim angle: `arctan(roofHeight / halfWidth)`
- Rake trim length: `sqrt(halfWidth² + roofHeight²)` (Pythagorean theorem)

**Gambrel Roof (Barn Style - Two-Slope)**:
- **Lower slope**: 5:12 pitch (steeper) - Rise = run × (5/12)
- **Upper slope**: 10:12 pitch (gentler) - Rise = run × (10/12)
- **Knuckle point**: Where lower and upper slopes meet
  - Knuckle Y: `wallHeight + (halfWidth × lowerPitchRatio)`
  - Knuckle X: `halfWidth`
- **Profile vertices**: Creates hexagon shape (2 base corners, 2 knuckle points, 2 peak points mirrored)
- **Two roof sections**:
  - Lower: Trapezoid from wall top to knuckle (`createLowerRoofShape()`)
  - Upper: Triangle from knuckle to peak (`createUpperRoofShape()`)

**Key Functions**:
- `pitchToRadians(pitchX)`: Convert X:12 pitch notation to radians
- `calculateRise(horizontalRun, pitchX)`: Get vertical rise from horizontal run
- `calculateKnucklePoint(halfWidth, wallHeight, lowerPitch, roofHeight)`: Find gambrel knuckle
- `verifyGambrelProfile()`: Validate calculated geometry matches expected pitches

### Trim Geometry (`frontend/src/components/shed/trim/`)

Trim components are style-specific: `GableTrim` is rendered by `GableShed`; `BarnTrim` is rendered
by `BarnShed`. The `trim/` directory is not shared. `tw = 0.333 ft` (~4 inches).

**Corner boards** (4 pieces):
```
geometry: BoxGeometry(tw, wallHeight, tw)
positions: [±(halfW - tw/2), wallHeight/2, ±(halfL - tw/2)]
```

**Eave fascia** (2 pieces, long sides):
```
geometry: BoxGeometry(tw, tw, shedLength + overhangEave*2)
positions: [±(halfW - tw/2), wallHeight + tw/2, 0]
```

**Rake boards** (4 pieces, GableTrim only):
```
rakeLength = sqrt(halfW² + roofHeight²)
rakeAngle  = atan2(roofHeight, halfW)
geometry: BoxGeometry(rakeLength, tw, tw)
positions: [±halfW/2, wallHeight + roofHeight/2, ±halfL + 0.01]
rotations: [0, 0, ±rakeAngle]
```
The `0.01 ft` Z-offset prevents Z-fighting with `GableEnd`.

**Roof overhang**: `GableRoof` and `GambrelRoof` accept `overhangEave = 0.5` (ft).
Extrusion depth = `shedLength + overhangEave * 2`, extending the mesh past both gable ends.

### CSG (Boolean Operations) System (`frontend/src/utils/csgOperations.js`)
Uses `three-bvh-csg` library for cutting door/window openings from wall geometry.

**Coordinate Conversion**:
- Placement uses normalized coordinates (0.0-1.0) relative to wall dimensions
- `getWorldCoordinates()` converts to Three.js world space:
  ```
  Front wall:  X = -halfWidth + (normalizedX × width), Y = -wallHeight/2 + (normalizedY × wallHeight), Z = halfLength
  Back wall:   X = -halfWidth + (normalizedX × width), Y = -wallHeight/2 + (normalizedY × wallHeight), Z = -halfLength
  Left wall:   X = -halfWidth, Y = -wallHeight/2 + (normalizedY × wallHeight), Z = -halfLength + (normalizedX × length)
  Right wall:  X = halfWidth, Y = -wallHeight/2 + (normalizedY × wallHeight), Z = -halfLength + (normalizedX × length)
  ```

**CSG Workflow**:
1. Clone base wall geometry
2. Create subtraction box at placement coordinates
3. Use `Evaluator.evaluate(baseMesh, subtractionMesh, SUBTRACTION)` to cut hole
4. Return modified geometry
5. Apply sequentially for multiple placements

**Important**: CSG operations are expensive. Limit placements for 60 FPS performance.

### Foundation System
- Individual skid beams rendered using `Skids` component
- Standard dimensions from `STANDARD_FOUNDATION`:
  - Height: 1.5 feet
  - Overhang: 0.5 feet on all sides
  - Color: `#8B7355` (brown/tan)

## Key Patterns

### Adding New Placement Types
When adding doors/windows:
1. Create placement object with `{id, type, wall, normalizedX, normalizedY, width, height}`
2. Add to `placements` array in Zustand store using `addPlacement()`
3. CSG system automatically cuts openings from walls using `applyAllPlacements()`
4. Render frame/object components conditionally based on placement data
5. **Important**: Validate normalized coordinates are clamped to [0, 1] range

### Modifying Shed Geometry
- **Wall geometry**: Modify `wallGeometry` useMemo in `BarnShed.jsx` or `GableShed.jsx`
  - Simple BoxGeometry: `new THREE.BoxGeometry(width, wallHeight, length)`
  - CSG applied after base geometry creation
- **Roof geometry**:
  - Gable: Single triangle extruded using `ExtrudeGeometry`
  - Gambrel: Two separate extrusions (lower trapezoid + upper triangle)
  - Use utility functions from `roofGeometry.js` for calculations
- **Always regenerate geometry** when dimensions change using useMemo dependencies

### State Updates
- Use Zustand actions (e.g., `setWidth`, `setColor`) instead of direct state mutation
- Price recalculation happens in `App.jsx` when dimensions or style changes
- Reset functionality available via `useShedStore.getState().reset()`
- All 3D components re-render automatically when store state changes

## Materials and Textures

### Siding Options
- **T1-11**: Vertical groove texture (default)
- **Smooth**: Plain siding without grooves
- Configured via `sidingTexture` in store

### Roofing Materials
- **Metal**: Corrugated metal roofing (default)
- **Shingle**: Asphalt shingle texture
- Configured via `roofMaterial` in store

### Trim System
- **Automatic Mode**: Trim color automatically matches roof or provides contrast
  - `trimAutoMode: 'matchRoof'`: Trim matches roof color
  - `trimAutoMode: 'contrast'`: Trim uses contrasting color
- **Manual Mode**: User selects custom trim color
- Trim width: 0.25 feet (~3 inches) for door/window frames

### Garage Door Styles
- **Sectional** (`doorStyle: 'sectional'`): Default; horizontal panel sections
- **Roll-up** (`doorStyle: 'rollup'`): Corrugated horizontal ribs
- `setStyle` auto-switches: Barn → `'rollup'`, Gable → `'sectional'`
- Configured via `addOns.garageDoor.style` in store; passed through `ShedWall` → `GarageDoor`

## UI Component Architecture

### Control Panel Design System
The control panel follows a card-based design with clear visual hierarchy:

**Layout Structure**:
- **Header (Sticky)**: Title and subtitle, 80px height
- **Main Content (Scrollable)**: Sections with 24px spacing
- **Footer (Sticky)**: Action buttons

**Section Cards**:
- White background with subtle gray border
- 16px padding, 8px border radius
- Sections: Dimensions, Style, Colors, Price Display

**Color Presets System**:
- Organized by category (Traditional, Natural, Classic, Modern)
- 10 siding colors, 8 roof colors
- WCAG contrast ratios displayed
- Dropdown with visual swatches and hex codes

**Accessibility Features**:
- WCAG 2.1 AA compliant
- 44x44px minimum touch targets
- Full keyboard navigation support
- Screen reader compatible with ARIA labels
- Focus indicators (2px ring with offset)

## File Structure

```
frontend/src/
├── App.jsx                          # Main layout, controls, and 3D canvas
├── store/shedStore.js               # Global Zustand state management
├── components/
│   ├── BarnShed/BarnShed.jsx        # Gambrel roof shed component
│   ├── GableShed/GableShed.jsx      # Gable roof shed component
│   ├── common/
│   │   ├── DoorFrame.jsx            # Door frame rendering
│   │   ├── WindowFrame.jsx          # Window frame rendering
│   │   ├── DoorObject.jsx           # 3D door object
│   │   ├── WindowObject.jsx         # 3D window object
│   │   └── Skids.jsx                # Foundation skid beams
│   ├── controls/                    # UI control components
│   │   ├── DimensionsSection.jsx    # Width/length sliders
│   │   ├── StyleSection.jsx         # Roof style selection
│   │   ├── ColorSection.jsx         # Color controls
│   │   ├── ColorPresetsDropdown.jsx # Preset color picker
│   │   ├── ColorPicker.jsx          # Custom color picker
│   │   ├── RangeInput.jsx           # Accessible range slider
│   │   ├── PriceDisplay.jsx         # Price breakdown
│   │   ├── ActionButtons.jsx        # Save/Load/Reset buttons
│   │   └── TrimAndDetailsSection.jsx # Trim and material controls
│   ├── ControlPanel.jsx             # Main control panel container
│   └── shed/
│       ├── trim/                    # Style-specific trim (not shared)
│       │   ├── GableTrim.jsx        # Corner boards, eave fascia, rake boards
│       │   └── BarnTrim.jsx         # Corner boards, eave fascia
│       └── ...
└── utils/
    ├── csgOperations.js             # CSG Boolean operations
    └── roofGeometry.js              # Roof profile generation

backend/
└── main.go                          # Complete Go server with API routes
```

## API Contract

### Save Design Request
```json
POST /api/save-design
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

### Save Design Response
```json
{
  "id": "uuid-string",
  "width": 12,
  "length": 16,
  "style": "Gable",
  "color": "#D2691E",
  "roofColor": "#8B4513",
  "trimColor": "#654321",
  "placements": [],
  "price": 1920,
  "createdAt": "2024-11-30T12:00:00Z"
}
```

## Important Implementation Notes

### 3D Rendering Best Practices
- **Geometry Generation**: All shed geometry is procedurally generated - no external 3D model files (.obj, .gltf, etc.)
- **useMemo Dependencies**: Always include width, length, wallHeight in dependencies for geometry useMemo hooks
- **CSG Operations**: Clone geometry before performing CSG operations to avoid mutating original
- **Performance**: CSG operations are computationally expensive. Each placement requires a separate subtraction operation.

### Placement System Validation
When implementing door/window placements:
1. **Bounds Checking**: Always clamp normalized coordinates to [0, 1] range
2. **Required Properties**: Validate placement has `normalizedX`, `normalizedY`, `width`, `height`, `wall`
3. **Coordinate System**:
   - (0, 0) = bottom-left corner of wall
   - (1, 1) = top-right corner of wall
   - Y-axis: 0 = floor level, 1 = wall top
4. **Edge Cases**: Placements near edges may need additional validation to ensure they fit within wall bounds

### React Three Fiber Patterns
- Use `<mesh>` components with `geometry` and `material` props
- Use `useMemo` for expensive geometry calculations
- Use `useRef` for accessing Three.js objects directly
- Wrap 3D components in `<Suspense>` for loading states
- Use `<OrbitControls>` from @react-three/drei for camera interaction

### State Management Patterns
- Store is single source of truth for all configuration
- Never mutate store state directly - always use provided actions
- Price calculation happens in App.jsx and updates store via `setPrice()`
- All 3D components read from store using `useShedStore()` hook
- Reset clears all state including placements

## Performance Optimization

### Current Optimizations
- Component splitting to reduce re-renders
- Geometry caching via useMemo
- Minimal state at component level (prefer store)
- CSG operations only when placements change

### Known Performance Considerations
- CSG operations: ~50-100ms per placement (can impact 60 FPS)
- Recommend limiting to 5-10 placements per shed
- Consider debouncing during interactive placement editing
- Large sheds (20×24) have more polygons than small ones (8×8)

## Troubleshooting

### Port conflicts
```bash
# Kill process on port 8080
lsof -ti:8080 | xargs kill -9

# Run frontend on different port
npm run dev -- --port 5174
```

### Missing dependencies
```bash
# Frontend
cd frontend && npm install

# Backend
cd backend && go mod tidy
```

### CSG performance issues
- CSG operations are computationally expensive
- Limit number of placements to maintain 60 FPS
- Consider debouncing placement updates during drag operations

### 3D rendering issues
- If geometry doesn't update, check useMemo dependencies
- If placements don't appear, verify normalized coordinates are in [0, 1] range
- If CSG holes are misaligned, check wall coordinate conversion in `getWorldCoordinates()`
- Clear browser cache if seeing old geometry after code changes

## Agent skills

### Issue tracker

Issues live in GitHub Issues on `hunterMotko/shed-builder`, via the `gh` CLI.
See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, using the default label strings.
See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — `CONTEXT.md` and `docs/adr/` at the repo root.
See `docs/agents/domain.md`.
