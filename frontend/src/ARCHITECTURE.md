# Shed Configurator — Frontend Architecture

## Component Tree

```
App
├── ControlPanel
│   ├── DimensionsSection       — width/length sliders
│   ├── StyleSection            — Gable vs Barn radio
│   ├── ColorSection
│   │   ├── ColorPresetsDropdown
│   │   └── ColorPicker
│   ├── TrimAndDetailsSection   — trim mode, siding texture, roof material
│   ├── PriceDisplay
│   └── ActionButtons           — save / load / reset (useDesignPersistence)
│
└── Canvas  [React Three Fiber]
    ├── ambientLight + pointLight × 2
    ├── OrbitControls
    └── Suspense
        ├── GableShed            (when style === 'Gable')
        │   ├── ShedWall × 4    (front, back, left, right)
        │   │   ├── DoorFrame / WindowFrame  per placement
        │   │   ├── DoorObject / WindowObject per placement
        │   │   ├── GarageDoor  per placement
        │   │   └── BarnDoor    per placement
        │   ├── GableEnd × 2    (front, back — triangular gable panels)
        │   ├── GableRoof
        │   ├── GableTrim       (corner boards, eave fascia, rake boards — gable-specific)
        │   ├── Skids
        │   └── Porch?          (when porch.enabled)
        │
        └── BarnShed             (when style === 'Barn')
            ├── ShedWall × 4
            │   └── (same opening children as above)
            ├── GambrelRoof     (lower + upper mesh sections)
            ├── BarnTrim        (corner boards, eave fascia — barn-specific)
            ├── Skids
            └── Porch?
```

---

## Data Flow: Zustand Store → 3D Components

```
User interaction (ControlPanel)
        │
        ▼
  useShedStore actions
  (setWidth, setColor, addPlacement, setPorch, …)
        │
        ▼
  Zustand store (single global state)
        │
        ├─► App.jsx  ─── reads style, width, length, color, roofColor
        │                 passes as props to GableShed or BarnShed
        │
        └─► GableShed / BarnShed  ─── reads from store directly:
                │                      placements, trimColor, sidingTexture,
                │                      roofMaterial, porch, roofLowerPitch,
                │                      roofUpperPitch
                │
                ├─► ShedWall  (props: side, shedWidth, shedLength, wallHeight,
                │              color, sidingTexture, trimColor, placements)
                │       │
                │       └─► CSG useEffect  (runs when placements change)
                │               produces modifiedGeometry state
                │
                ├─► GableRoof / GambrelRoof  (props: dimensions + roofColor + roofMaterial)
                ├─► GableEnd × 2            (props: dimensions + color + sidingTexture)
                ├─► Skids                   (props: dimensions + STANDARD_FOUNDATION constants)
                └─► Porch?                  (props: dimensions + wall + depth + colors)
```

Key rule: `App.jsx` passes only `width`, `length`, `color`, and `roofColor` as props to the shed
roots. Everything else (trim, texture, placements, porch) is read directly from the store inside
`GableShed` / `BarnShed`.

---

## Zustand Store State Shape

File: `src/store/shedStore.js`

| Field | Type | Default | Valid range / values |
|---|---|---|---|
| `width` | `number` | `12` | 8–20 ft |
| `length` | `number` | `16` | 8–24 ft |
| `style` | `string` | `'Gable'` | `'Gable'` \| `'Barn'` |
| `color` | `string` | `'#D2691E'` | hex `#RRGGBB` |
| `roofColor` | `string` | `'#8B4513'` | hex `#RRGGBB` |
| `trimColor` | `string` | `'#654321'` | hex `#RRGGBB` |
| `trimColorMode` | `string` | `'automatic'` | `'automatic'` \| `'manual'` |
| `trimAutoMode` | `string` | `'matchRoof'` | `'matchRoof'` \| `'contrast'` |
| `sidingTexture` | `string` | `'T1-11'` | `'T1-11'` \| `'smooth'` |
| `roofMaterial` | `string` | `'metal'` | `'metal'` \| `'shingle'` |
| `roofLowerPitch` | `number` | `5` | X in X:12 notation |
| `roofUpperPitch` | `number` | `10` | X in X:12 notation |
| `foundationHeight` | `number` | `1.5` | feet |
| `foundationColor` | `string` | `'#8B7355'` | hex `#RRGGBB` |
| `porch.enabled` | `boolean` | `false` | |
| `porch.wall` | `string` | `'front'` | `'front'` \| `'back'` \| `'left'` \| `'right'` |
| `porch.depth` | `number` | `6` | feet |
| `addOns.garageDoor.style` | `string` | `'sectional'` | `'sectional'` \| `'rollup'`; auto-set by `setStyle` (Barn → `'rollup'`, Gable → `'sectional'`) |
| `price` | `number` | `0` | calculated, not set manually |
| `placements` | `Placement[]` | `[]` | see Placement shape below |

### Placement Object Shape

```js
{
  id:          string,   // UUID
  type:        'door' | 'window' | 'garage_door' | 'barn_door',
  wall:        'front' | 'back' | 'left' | 'right',
  normalizedX: number,  // 0.0–1.0, position along wall width
  normalizedY: number,  // 0.0–1.0, position along wall height (0 = floor)
  width:       number,  // feet
  height:      number,  // feet
  rotationZ:   number,  // radians, optional (default 0)
}
```

### Store Actions

| Action | Signature | Effect |
|---|---|---|
| `setWidth` | `(number) => void` | Updates width |
| `setLength` | `(number) => void` | Updates length |
| `setStyle` | `(string) => void` | Switches Gable/Barn; auto-sets `addOns.garageDoor.style` (`'rollup'` for Barn, `'sectional'` for Gable) |
| `setColor` | `(string) => void` | Siding hex color |
| `setRoofColor` | `(string) => void` | Roof hex color |
| `setTrimColor` | `(string) => void` | Trim hex color |
| `setTrimColorMode` | `(string) => void` | automatic / manual |
| `setTrimAutoMode` | `(string) => void` | matchRoof / contrast |
| `setSidingTexture` | `(string) => void` | T1-11 / smooth |
| `setRoofMaterial` | `(string) => void` | metal / shingle |
| `setRoofLowerPitch` | `(number) => void` | Gambrel lower slope |
| `setRoofUpperPitch` | `(number) => void` | Gambrel upper slope |
| `setFoundationHeight` | `(number) => void` | |
| `setFoundationColor` | `(string) => void` | |
| `setPorch` | `(Partial<porch>) => void` | Merges into porch config |
| `setPrice` | `(number) => void` | |
| `addPlacement` | `(Placement) => void` | Appends to placements |
| `removePlacement` | `(id: string) => void` | Filters by id |
| `updatePlacement` | `(id, updates) => void` | Merges updates |
| `clearPlacements` | `() => void` | Empties placements |
| `getPlacements` | `(wall?) => Placement[]` | Filters or returns all |
| `getConfig` | `() => FullConfig` | Snapshot for save |
| `getPrice` | `() => number` | Derived from pricingUtils |
| `reset` | `() => void` | Restores all defaults |

---

## Prop Tables

### ShedWall

File: `src/components/shed/walls/ShedWall.jsx`

| Prop | Type | Default | Description |
|---|---|---|---|
| `side` | `'front'\|'back'\|'left'\|'right'` | required | Which wall to render |
| `shedWidth` | `number` | required | Full shed width in ft |
| `shedLength` | `number` | required | Full shed length in ft |
| `wallHeight` | `number` | required | Wall height in ft |
| `color` | `string` | required | Hex siding color |
| `sidingTexture` | `string` | required | `'T1-11'` or `'smooth'` |
| `trimColor` | `string` | required | Hex trim color |
| `trimWidth` | `number` | `0.25` | Frame trim width in ft |
| `placements` | `Placement[]` | `[]` | Openings for this wall only |
| `doorStyle` | `string` | `'sectional'` | Passed through to `GarageDoor`; `'sectional'` \| `'rollup'` |
| `castShadow` | `boolean` | `true` | |
| `receiveShadow` | `boolean` | `true` | |
| `ref` | `React.Ref` | — | Forwarded to the wall mesh |

`ShedWall` exports `WALL_THICKNESS = 0.5` (ft). Front/back walls span the full shed width;
left/right walls span `shedLength - WALL_THICKNESS * 2` to fit between front/back corners.

### GableRoof

File: `src/components/shed/roofs/GableRoof.jsx`

| Prop | Type | Default | Description |
|---|---|---|---|
| `shedWidth` | `number` | required | |
| `shedLength` | `number` | required | |
| `wallHeight` | `number` | required | Y base of roof |
| `roofHeight` | `number` | `4` | Rise from wall top to peak (ft) |
| `roofColor` | `string` | required | Hex roof color |
| `roofMaterial` | `string` | required | `'metal'` or `'shingle'` |
| `overhangEave` | `number` | `0.5` | Eave overhang in ft; extrusion depth = `shedLength + overhangEave*2` |
| `castShadow` | `boolean` | `true` | |
| `receiveShadow` | `boolean` | `true` | |

Renders a single `ExtrudeGeometry` from a triangular `THREE.Shape`
`(-halfWidth,0) → (halfWidth,0) → (0,roofHeight)` extruded along `shedLength`.
Positioned at `[0, wallHeight, -shedLength/2]`.

### GambrelRoof

File: `src/components/shed/roofs/GambrelRoof.jsx`

| Prop | Type | Default | Description |
|---|---|---|---|
| `shedWidth` | `number` | required | |
| `shedLength` | `number` | required | |
| `wallHeight` | `number` | required | |
| `roofLowerPitch` | `number` | `5` | Lower slope X:12 |
| `roofUpperPitch` | `number` | `10` | Upper slope X:12 |
| `roofColor` | `string` | required | |
| `roofMaterial` | `string` | required | |
| `overhangEave` | `number` | `0.5` | Eave overhang in ft; extrusion depth = `shedLength + overhangEave*2` |
| `castShadow` | `boolean` | `true` | |
| `receiveShadow` | `boolean` | `true` | |

Knuckle geometry (internal constants):

```
KNUCKLE_X_RATIO = 0.6   // knuckle sits 60% from center to edge
knuckleX = halfWidth * 0.6
knuckleY = (halfWidth - knuckleX) * (roofLowerPitch / 12)
peakY    = knuckleY + knuckleX * (roofUpperPitch / 12)
```

Renders two meshes sharing the same `roofShader`:
- **Lower** (`gambrelRoofLower`): trapezoid `(-halfW,0)→(halfW,0)→(knuckleX,knuckleY)→(-knuckleX,knuckleY)`
- **Upper** (`gambrelRoofUpper`): triangle `(-knuckleX,knuckleY)→(knuckleX,knuckleY)→(0,peakY)`

Both extruded along `shedLength`, positioned at `[0, wallHeight, -shedLength/2]`.

Note: `GambrelRoof` end-caps (the hexagonal barn face visible front and back) are produced
automatically by `ExtrudeGeometry` — no separate `GableEnd` component is needed for `BarnShed`.

### GableEnd

File: `src/components/shed/roofs/GableEnd.jsx`

| Prop | Type | Default | Description |
|---|---|---|---|
| `side` | `'front'\|'back'` | required | Which gable end |
| `shedWidth` | `number` | required | |
| `shedLength` | `number` | required | |
| `wallHeight` | `number` | required | Y base of triangle |
| `roofHeight` | `number` | `4` | Rise to peak |
| `color` | `string` | required | Hex siding color |
| `sidingTexture` | `string` | required | `'T1-11'` or `'smooth'` |
| `castShadow` | `boolean` | `true` | |
| `receiveShadow` | `boolean` | `true` | |

Renders a `BufferGeometry` triangle with vertices
`(-halfWidth,0,0)`, `(halfWidth,0,0)`, `(0,roofHeight,0)` using the siding shader.
Positioned at `[0, wallHeight, ±halfLength]`.

### GarageDoor

File: `src/components/shed/openings/GarageDoor.jsx`

| Prop | Type | Default | Description |
|---|---|---|---|
| `placement` | `Placement` | required | Must have `type: 'garage_door'` |
| `shedDimensions` | `{width, length, wallHeight}` | required | |
| `trimColor` | `string` | `'#8B7355'` | Panel and track color |
| `doorStyle` | `string` | `'sectional'` | `'sectional'` \| `'rollup'`; roll-up renders corrugated horizontal ribs |

Renders horizontal panel sections (`Math.ceil(height)` rows, minimum 3), side tracks, a header
rail, and a center lift handle. Panel count scales with door height. The CSG cutout in `ShedWall`
creates the actual opening; this component renders the visual door panels just proud of the wall
face (`OFFSET = 0.3` ft).

### BarnDoor

File: `src/components/shed/openings/BarnDoor.jsx`

| Prop | Type | Default | Description |
|---|---|---|---|
| `placement` | `Placement` | required | Must have `type: 'barn_door'` |
| `shedDimensions` | `{width, length, wallHeight}` | required | |
| `trimColor` | `string` | `'#654321'` | Frame and brace color |
| `wallColor` | `string` | `'#D2691E'` | Panel fill color |

Renders two door leaves parked to the left and right of the opening, each with board panel,
outer frame rails, X-brace diagonals, and roller wheels. A track rail spans above the opening.
Doors sit at `OFFSET = 0.12` ft proud of the wall face (closer than a swing door).

### Porch

File: `src/components/shed/extras/Porch.jsx`

| Prop | Type | Default | Description |
|---|---|---|---|
| `shedWidth` | `number` | required | |
| `shedLength` | `number` | required | |
| `wallHeight` | `number` | required | |
| `wall` | `'front'\|'back'\|'left'\|'right'` | `'front'` | Wall the porch attaches to |
| `depth` | `number` | `6` | How far the porch extends (ft) |
| `color` | `string` | `'#8B7355'` | Deck/post/beam wood color |
| `roofColor` | `string` | `'#2F4F4F'` | Lean-to roof color |
| `roofMaterial` | `string` | `'metal'` | `'metal'` or `'shingle'` |

The porch group origin is placed at the base of the specified wall; all geometry is local to that
group so rotation handles all four walls automatically. Lean-to roof uses a fixed 3:12 pitch.
`porchSpan` = `shedWidth` for front/back, `shedLength` for left/right.

---

## CSG Pipeline: Placements → Geometry Cutouts

CSG runs inside `ShedWall` via a `useEffect`, not through `csgOperations.js`.
`csgOperations.js` (the `CSGShedModifier` class) exists as a utility layer but is not called
by the current render path — `ShedWall` implements the same logic inline using a single
shared `Evaluator` instance (`const evaluator = new Evaluator()` at module scope).

### Active Pipeline (ShedWall.jsx)

```
placements prop changes
        │
        ▼
useEffect fires
        │
        ├── early-exit if placements.length === 0  →  setModifiedGeometry(null)
        │
        ├── clone baseGeometry (BoxGeometry for this wall)
        │
        └── for each placement p:
                │
                ├── compute localX = -localGeomWidth/2 + p.normalizedX * localGeomWidth
                ├── compute localY = -wallHeight/2 + p.normalizedY * wallHeight
                │
                ├── create cutGeo = BoxGeometry(p.width, p.height, WALL_THICKNESS + 0.1)
                ├── position cutMesh at (localX, localY, 0)
                │
                └── currentMesh = evaluator.evaluate(currentMesh, cutMesh, SUBTRACTION)
                        (three-bvh-csg Boolean subtraction)
        │
        ▼
setModifiedGeometry(finalGeometry)
        │
        ▼
<mesh>
  <primitive object={modifiedGeometry ?? baseGeometry} attach="geometry" />
```

Intermediate geometries are disposed in the `finally` block. `baseGeometry` (from `useMemo`) is
never disposed — only the cloned geometry and CSG intermediates.

The render then places `DoorFrame`/`WindowFrame`/`GarageDoor`/`BarnDoor` components as siblings
of the wall mesh, positioned in world space by `getOpeningTransform()` inside each component.

### Coordinate Conversion

Normalized → local wall space (used by ShedWall CSG):

```
localX = -localGeomWidth / 2 + normalizedX * localGeomWidth
localY = -wallHeight / 2     + normalizedY * wallHeight
localZ = 0  (punches through center of wall slab)
```

Normalized → world space (used by door/window objects for their own positioning):

```
front:  worldX = -halfWidth + normalizedX * width
        worldY = -wallHeight/2 + normalizedY * wallHeight
        worldZ = halfLength + OFFSET
back:   worldZ = -halfLength - OFFSET  (rotation [0, π, 0])
left:   worldX = -halfWidth - OFFSET
        worldZ = -halfLength + normalizedX * length  (rotation [0, π/2, 0])
right:  worldX =  halfWidth + OFFSET
        worldZ = -halfLength + normalizedX * length  (rotation [0, -π/2, 0])
```

OFFSET values: `GarageDoor` / `DoorObject` = `0.3` ft, `BarnDoor` = `0.12` ft.

---

## Shader System

File: `src/utils/shaders.js`

Both factory functions return a plain object (`{uniforms, vertexShader, fragmentShader}`)
consumed by `<shaderMaterial args={[shaderObject]} />`.

### makeSidingShader(color, sidingTexture)

Used by: `ShedWall`, `GableEnd`

| Uniform | Type | Value |
|---|---|---|
| `color` | `THREE.Color` | Hex siding color |
| `useRibs` | `float` | `1.0` for T1-11, `0.0` for smooth |

Fragment logic: samples `vPos.x * 2.0` for rib frequency. `smoothstep` at 0.4–0.45 and 0.55–0.6
creates a soft groove edge. Ribs darken the color by up to 12% (`ribEffect * 0.12 * useRibs`).

### makeRoofShader(roofColor, roofMaterial)

Used by: `GableRoof`, `GambrelRoof`, `Porch` (lean-to roof)

| Uniform | Type | Value |
|---|---|---|
| `color` | `THREE.Color` | Hex roof color |
| `isShingle` | `float` | `1.0` for shingle, `0.0` for metal |

Fragment logic blends two independently computed colors via `mix(metalColor, shingleColor, isShingle)`:

- **Metal path**: vertical corrugated panels via `vPos.x * 3.0` with `smoothstep` shading ±25%
  brightness, plus a normal-based specular highlight (`dot(vNormal, vec3(0,1,0.5)) * 0.2`).
- **Shingle path**: horizontal courses via `vPos.y * 1.0` with staggered column breaks using
  `floor(vPos.y)` to alternate stagger offset by 0.5.

---

## How-To: Adding a New Placement Type

1. **Define the type string** — pick a `type` value (e.g., `'skylight'`).

2. **Add placement to store**:

   ```js
   useShedStore.getState().addPlacement({
     id: crypto.randomUUID(),
     type: 'skylight',
     wall: 'front',   // or whichever wall/surface
     normalizedX: 0.5,
     normalizedY: 0.5,
     width: 2,
     height: 1.5,
   });
   ```

3. **Create the visual component** (`src/components/shed/openings/Skylight.jsx`):
   - Accept `placement`, `shedDimensions`, and color props.
   - Use `getOpeningTransform(placement, shedDimensions)` (copy from `GarageDoor.jsx`) to
     compute `pos` and `rot` in world space.
   - Render geometry as a `<group position={pos} rotation={rot}>`.

4. **Wire it into ShedWall** — add a branch in both the frame and object render passes:

   ```jsx
   // In the object render pass:
   if (p.type === 'skylight') {
     return (
       <Skylight key={p.id} placement={p} shedDimensions={shedDimensions} />
     );
   }
   ```

   `ShedWall`'s CSG `useEffect` already processes all placements generically using `p.width` and
   `p.height` — no changes needed there.

5. **Add to PlacementDialog** (or whichever UI creates placements) to allow users to select the
   new type.

---

## How-To: Adding a New Roof Style

1. **Add the style value** to the store's `style` field and `reset()` defaults if it needs
   distinct pitch config. Extend `validateDesignConfig` in `src/services/designApi.js` if the
   backend must accept it.

2. **Create the roof component** (`src/components/shed/roofs/HipRoof.jsx`):
   - Accept `shedWidth`, `shedLength`, `wallHeight`, `roofHeight` (or pitch props), `roofColor`,
     `roofMaterial`.
   - Build geometry using `THREE.Shape` + `ExtrudeGeometry` or `BufferGeometry` directly.
   - Apply `makeRoofShader(roofColor, roofMaterial)` via `<shaderMaterial args={[roofShader]} />`.
   - Use `useMemo` with dimension/color deps for geometry and shader.

3. **Create a shed wrapper** (`src/components/HipShed/HipShed.jsx`) following the same pattern
   as `GableShed`:
   - Map `WALL_SIDES` to four `<ShedWall>` components.
   - Render the new roof component.
   - Render `<Skids>` with `STANDARD_FOUNDATION` constants.
   - Conditionally render `<Porch>`.
   - Read `placements`, `trimColor`, `sidingTexture`, `roofMaterial`, `porch` from the store.

4. **Register in App.jsx**:

   ```jsx
   {style === 'Hip' ? (
     <HipShed width={width} length={length} color={color} roofColor={roofColor} />
   ) : style === 'Barn' ? (
     <BarnShed ... />
   ) : (
     <GableShed ... />
   )}
   ```

5. **Add to StyleSection** control so the user can select it.

---

## Performance Characteristics and Known Limits

### CSG Cost

Each placement triggers a full CSG subtraction chain via `three-bvh-csg`. Cost scales linearly
with placements on the same wall:

- ~50–100 ms per placement (measured in CLAUDE.md)
- Operations run in `useEffect` (off the render loop), but block the JS thread until complete
- 5–10 placements per shed is the practical limit before perceptible lag

CSG fires only when the `placements` array reference or `baseGeometry` changes (dimensions
change). Unchanged walls incur zero re-computation.

### Geometry Regeneration

All geometry is wrapped in `useMemo`. Re-computation triggers when listed deps change:

| Component | Deps that trigger rebuild |
|---|---|
| `ShedWall` baseGeometry | `localGeomWidth`, `wallHeight` |
| `ShedWall` position/rotation | `side`, `wallHeight`, `halfW`, `halfL`, `tHalf` |
| `GableRoof` shape | `halfWidth`, `roofHeight` |
| `GableRoof` extrude | `shedLength` |
| `GambrelRoof` lower/upper shapes | `halfWidth`, `knuckleX`, `knuckleY`, `peakY` |
| `GableEnd` geometry | `halfWidth`, `roofHeight` |

### Shader Rebuild

`makeSidingShader` and `makeRoofShader` are called inside `useMemo` with `[color, texture]` or
`[color, material]` deps. Each call allocates a new `THREE.Color` and returns a new shader object,
which causes a material recompile. Color changes therefore have a one-frame recompile cost.

### Polygon Count

Wall count grows with shed dimensions. CSG-modified geometries add internal edge loops.
Large sheds (20 × 24) with 8–10 placements are the high-water mark; tested in `performanceTest.js`.

### Memory

- `baseGeometry` lives as long as the wall is mounted (owned by `useMemo`).
- CSG `finalGeometry` is disposed on the next `useEffect` run or unmount via the cleanup return.
- Intermediate CSG geometries and cut meshes are disposed in the `finally` block.
- `makeSidingShader` / `makeRoofShader` allocate a `THREE.Color` per call; the previous color
  object is GC-eligible after the `useMemo` re-runs but is not explicitly disposed.

---

## File Map

```
frontend/src/
├── App.jsx                                 Root layout; Canvas + ControlPanel
├── store/shedStore.js                      Zustand global store
├── components/
│   ├── ControlPanel.jsx                    Control panel container
│   ├── BarnShed/BarnShed.jsx               Barn shed composition root
│   ├── GableShed/GableShed.jsx             Gable shed composition root
│   ├── common/
│   │   ├── DoorFrame.jsx
│   │   ├── WindowFrame.jsx
│   │   ├── DoorObject.jsx
│   │   ├── WindowObject.jsx
│   │   └── Skids.jsx
│   ├── controls/
│   │   ├── DimensionsSection.jsx
│   │   ├── StyleSection.jsx
│   │   ├── ColorSection.jsx
│   │   ├── ColorPresetsDropdown.jsx
│   │   ├── ColorPicker.jsx
│   │   ├── RangeInput.jsx
│   │   ├── PriceDisplay.jsx
│   │   ├── ActionButtons.jsx
│   │   └── TrimAndDetailsSection.jsx
│   └── shed/
│       ├── walls/ShedWall.jsx              Single wall + CSG + opening children
│       ├── roofs/
│       │   ├── GableRoof.jsx
│       │   ├── GambrelRoof.jsx
│       │   └── GableEnd.jsx
│       ├── openings/
│       │   ├── GarageDoor.jsx
│       │   └── BarnDoor.jsx
│       ├── trim/               (style-specific; not shared)
│       │   ├── GableTrim.jsx   corner boards, eave fascia, rake boards
│       │   └── BarnTrim.jsx    corner boards, eave fascia
│       └── extras/Porch.jsx
├── hooks/useDesignPersistence.js           save/load/list via designApi
├── services/designApi.js                   axios client → Go backend
└── utils/
    ├── shaders.js                          makeSidingShader / makeRoofShader
    ├── roofGeometry.js                     pitch math, STANDARD_FOUNDATION
    ├── csgOperations.js                    CSGShedModifier utility class (not on render path)
    ├── pricingUtils.js                     calculateTotalPrice
    ├── coordinateUtils.js
    └── placementValidator.js
```
