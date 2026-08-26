# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A customer designs a shed to their own specification, sees it rendered in 3D, and requests a
quote to buy it. The frontend generates all shed geometry procedurally with React Three Fiber;
the Go backend prices the Design and stores it.

Read these before changing anything substantial:

- **`CONTEXT.md`** — the glossary. Use its vocabulary in code, tests, and issues.
- **`docs/adr/`** — the decisions and why they were made. ADR-0001 through 0006 predate the
  glossary and use the older words; 0007 onward use the current ones.
- **`shed-options.md`** — the catalog of record: prices, sizes, and what each build includes.

### Vocabulary

| Term | Meaning |
|---|---|
| **Model** | The product line — `Gable` or `Barn`. Carries roof profile, wall height (84in vs 80.5in studs) and trim set as one bundle. Not a roof toggle. |
| **Tier** | The build grade — `Standard` or `Deluxe`. Not a height: both stand the same, and Tier is what selects a price alongside width and length. |
| **Design** | One complete specification: Model, dimensions, colors, Options with their Placements. |
| **Option** | A priced catalog item. An **Opening** cuts a wall (doors, windows); an **Attachment** does not (ramp, shutters, skylight, porch, loft). |
| **Placement** | Where an Option sits on the shed. |
| **Quote** | The price the server computes. The client's number is never trusted. |
| **Runner** | A pressure-treated 4x4 the shed sits on. Five in a standard build. |

Do not reintroduce `style`, `addOn`, or `skid` — they were renamed deliberately (issue #1).

## Development Commands

### Backend (Go 1.25.4)

```bash
cd backend
go build -o shed-server . && ./shed-server   # serves on :8080
go test ./...                                # API tests via httptest
go vet ./... && gofmt -l .
```

### Frontend (Vite 7 + React 19)

```bash
cd frontend
npm run dev        # http://localhost:5173
npm test           # vitest, single run
npm run test:watch
npm run build
npm run lint       # 7 pre-existing errors — don't add more
```

## Architecture

### State (Zustand)

Single global store: `frontend/src/store/shedStore.js`. Components read it with `useShedStore()`;
outside React use `useShedStore.getState()`. Never mutate state directly — every change goes
through an action.

Defaults: `width: 12`, `length: 16`, `tier: 'Standard'`, `model: 'Gable'`,
`sidingTexture: 'T1-11'`, `roofMaterial: 'metal'`, `roofLowerPitch: 20`, `roofUpperPitch: 4`
(both from the `GAMBREL_*` constants, never typed as literals).

There is no `wallHeight` in the store. The wall is a Model constant in `utils/modelSpec.js`
(85in Barn, 88.5in Gable) and the Peak Height is derived from it for display only. The
catalog's third number is a nominal 11 on every size — a label on the SKU, not geometry.

`options` holds nine Options, all disabled by default. `placements` is a flat array. `porch` is
separate from `options` and currently has **no price** (issue #9).

**The store may only ever hold a Design the catalog sells.** `setWidth`, `setLength` and
`setTier` all run `snapToValidCombo`, which falls back to the nearest sellable combination
rather than accepting an arbitrary size. There is a test for this invariant.

`setModel` also switches the garage door: Barn gets `'rollup'`, Gable gets `'sectional'`.
(`options.garageDoor.style` is a door style — unrelated to Model, and deliberately still called
`style`.)

### 3D rendering

All geometry is procedural. There are no model files (`.obj`, `.gltf`).

`App.jsx` renders `BarnShed` or `GableShed` directly off `model`. Each assembles walls, roof,
trim, Runners and any Placements. Roofs come from `ExtrudeGeometry` over a 2D profile; walls are
`BoxGeometry` with openings cut out.

**Both Models render all four walls** (ADR-0010), from `WALL_SIDES` in `utils/wallSides.js`. The
Models differ above the eave only: a Gable has two `GableEnd` triangles, a Barn has the gambrel
end-caps. Placements are routed to walls by `routePlacements`, which hands back a `dropped` list so
an opening assigned to a wall that isn't rendered is reported rather than lost — a Barn used to
render two walls and discard every front and back Placement in silence.

Trim is per Model and deliberately not shared — `GableTrim` has corner boards, eave fascia and
rake boards; `BarnTrim` has **corner boards only**. ADR-0006 says the Barn also has fascia; the
code disagrees, and which one matches the product is settled against the Reference Photos in #5
and #6, not by reading the component (issue #22). The Trim Set is part of the Model bundle, so
treat it as a product question. Roof overhang at the eave is `0.5 ft`.

A corner board, though, is the same board on both, and **`cornerBoards` in
`utils/trimGeometry.js` is the only place corner positions are worked out** — the trim
counterpart to `openingTransform` (ADR-0011). Both components ask it; neither computes.

Trim stock has two numbers, and they are not the same number: `TRIM_WIDTH` is the face you see
(`0.333 ft`, 4in) and `TRIM_THICKNESS` is how far the board stands off the siding (`0.0625 ft`,
a dressed 1x). They used to be one value, which is what buried every corner board inside the
wall with its faces exactly coplanar — nothing decided which surface won and each board rendered
as hatched noise (issue #31). A corner board is nailed **on** the siding; the two boards at a
corner lap rather than butt, so the front or back one runs past to cover the side board's end
grain. The 4in face is what both components have always defaulted to; the Reference Photos
measure the real stock nearer 5.5in, and issue #22 settles that.

### CSG (cutting openings)

`utils/wallOpenings.js` owns the cut: `cutOpenings(baseGeometry, placements, opts)` subtracts one
box per Placement in the wall's **local** space (ADR-0001) and returns a new geometry, or `null`
when the wall has no openings. `ShedWall.jsx` calls it from a `useMemo` and disposes the result —
the cut geometry reaches the mesh through `<primitive>`, which React Three Fiber never disposes.
Left and right walls are rotated `[0, -π/2, 0]` so a wall's local X always runs along its own
width.

**Operands must be `Brush`, not `THREE.Mesh`.** `Evaluator.evaluate` calls `prepareGeometry()` on
both, which only `Brush` has. Passing a Mesh throws, and for a long time that throw was caught and
logged while every wall silently rendered solid (issue #25). `evaluator.useGroups = false`, since a
wall draws with one material.

**`openingTransform` is the only place opening coordinates are worked out.** The cut and every
visible part of an opening — door slab, window, trim frame, shutters — derive from it, so the two
cannot drift apart (ADR-0011). Pass how far proud of the wall face the part sits; pass
`-WALL_THICKNESS / 2` to land exactly on the centre of the hole, which is what the test asserts on
all four walls. `wallSpan` gives the wall's own width, and `coordinateUtils` uses it to invert a
click back into a Placement.

Do not recompute a position from `normalizedX`/`normalizedY` inside a component. Seven of them did,
each with its own copy of the formula, and every copy was wrong in at least one way (issues #17,
#26).

CSG is expensive and has a performance ceiling — read ADR-0005 before adding placements or moving
this work.

### Backend API (Go + Gin)

`backend/main.go`. Storage is an in-memory map behind a `sync.RWMutex`, so **every Design is lost
on restart**, and `GET /api/designs` returns everything to anyone (issue #12).

| Route | Behaviour |
|---|---|
| `POST /api/save-design` | Validates the combination and the Model, computes the Quote, returns 201 with a UUID |
| `GET /api/design/:id` | One Design, or 404 |
| `GET /api/designs` | Every stored Design |

`newRouter()` builds the router so tests can drive it with `httptest`; `main()` only serves it.
CORS is wide open (`*`).

## Pricing and the Quote

Base prices are a **fixed catalog of 25 width×length×Tier combinations** from
`shed-options.md` — not a formula. Widths sold: 10, 12, 14, 16; above 12 is Deluxe only. There
is no square-foot rate and no Model surcharge. The key is the Tier, not the height: every size
is 11ft, so a height key would collapse all seven Standard sizes onto their Deluxe twin.

Options are priced per item or per unit (per foot, per sheet, per pair, per sqft).

Workbench, pegboard and loft are priced on both sides but are **not yet in the store's
`options` defaults**, so nothing can enable them from the UI (issue #9).

The catalog currently exists twice — `frontend/src/utils/pricingUtils.js` and `backend/main.go` —
and the two can drift. They agree today (25 combinations each, checked against
`shed-options.md`); nothing but diligence keeps them that way. The server recomputes the price on every save and ignores whatever the
client sent; **the server's number is the Quote** (ADR-0008). Issue #8 moves the catalog behind
`GET /api/catalog` so there is one copy.

## Geometry

`frontend/src/utils/roofGeometry.js` holds the math. Pitch is `X:12` — rise in inches per 12
inches of run.

Both Models are cut to a fixed pitch, so the rise follows the span — the reverse of a fixed
rise, which silently changes the pitch with the width.

**Gable**: one triangular profile extruded along the length, at a **6:12** pitch. Rake angle is
`atan(roofHeight / halfWidth)`; rake length is the hypotenuse.

**Barn (gambrel)**: two extrusions meeting at the **Knuckle**. The lower slope is the steep one.
Build spec is **20:12 lower and 4:12 upper** — the lower measured off the reference photos
at ~59.7°, not the 12:12 it was first quoted as. A lower pitch shallower than the upper one is not
a barn. The Knuckle is not stored — `gambrelKnuckleRatio` derives it from the two pitches by
placing it so each slope carries half the rise, which is 5/6 for this spec. Steepening the
sides therefore also shortens them and lengthens the top — reach for the side pitch, never
the Knuckle.

Useful functions: `pitchToRadians`, `calculateRise`, `calculateKnucklePoint`,
`calculateGambrelProfile`, `createLowerRoofShape`, `createUpperRoofShape`, `getRakeTrimAngles`,
`calculateSlopeLength`, `calculateGableRakeAngle`, `calculateGableRakeTrimLength`,
`gableRoofRise`, `gambrelKnuckleRatio`, `roofMaterialSlots`.

`frontend/src/utils/modelSpec.js` holds what a Model bundles: `wallHeightFt`, `roofRiseFt`,
`peakHeightFt`, and `FOUNDATION_HEIGHT` — the deck plus a Runner, which is what `Runners`
actually draws. The store's `foundationHeight` of 1.5ft is a concrete-pad leftover nothing
renders; do not quote a height off it.

Foundation constants live in `STANDARD_FOUNDATION`: height `1.5 ft`, overhang `0.5 ft`, color
`#8B7355`. `components/common/Runners.jsx` renders the floor deck plus five 4x4 runners.

## Placements

A Placement is `{ id, type, wall, normalizedX, normalizedY, width, height }`. Position is
normalized `0.0–1.0` across the wall; `(0,0)` is bottom-left — `normalizedY` 0 is the floor, 1 is
the eave, and `normalizedX` runs across **that wall's** span, which for left and right is
`shedLength - 2 * WALL_THICKNESS`, not the full length. Size is **absolute feet**, which is why
resizing a shed can leave an Opening that no longer fits.

Ask `openingTransform` for the position — never rebuild it from the normalized values.

`ShedWall` renders `door`, `window`, `garage_door`, `barn_door` and `swing_barn_door`.

Known gaps, all issue #10:

- `PlacementDialog.jsx` and `PlacementList.jsx` are imported nowhere, so a user cannot create a
  Placement through the UI at all. The only runtime path into `addPlacement` is loading a saved
  Design.
- Enabling an Option does not create a Placement, so a garage door adds money and no geometry.
- `validatePlacement` reports an Opening that hangs off its wall as a *warning*, leaving
  `valid: true`. A test marks this deliberately with `it.fails`.

## Materials

Siding is `T1-11` (ribbed) or `smooth`; roofing is `metal` (corrugated) or `shingle`. Both are
procedural shaders built by factory functions in `utils/shaders.js` (ADR-0002) — one GLSL change
propagates to every surface. Trim color is automatic (`matchRoof` or `contrast`) or manual.

Garage doors render `sectional` (panelled) or `rollup` (ribbed).

## UI

`App.jsx` holds a three-page nav — Configurator, Component Preview, Reference Match — switched by
local state, not a router.

`ControlPanel.jsx` is a drawer with four tabs: **Size**, **Model**, **Colors**, **Options**, plus
a sticky footer (Save Design / Load / Reset). Tab ids match the CONTEXT.md terms (`dimensions`,
`model`, `colors`, `options`) — if you rename a tab id, rename its `activeTab ===` branch too.

**Reference Match** pairs a reference photo with a 3D reconstruction. Its scene under
`pages/reference-match/barn/` is a **fork** of the real shed components, including a second
`BarnTrim`. Fidelity work done there does not reach the product; issue #4 deletes the fork.

`components/Canvas3D.jsx` and `components/ShedConfigurator.jsx` are not mounted anywhere.

## Testing

Tests live beside their subject as `*.test.js` and run in node — no jsdom, because every seam
under test is non-React.

| Seam | File |
|---|---|
| Roof math | `utils/roofGeometry.test.js` |
| Catalog and Option pricing | `utils/pricingUtils.test.js` |
| Placement rules | `utils/placementValidator.test.js` |
| Cutting openings | `utils/wallOpenings.test.js` |
| Walls and Placement routing | `utils/wallSides.test.js` |
| Trim placement | `utils/trimGeometry.test.js` |
| Store behaviour | `store/shedStore.test.js` |
| HTTP API | `backend/main_test.go` |

Two rules that matter more than coverage:

1. **Expected values come from an independent source** — trigonometry, or a price in
   `shed-options.md`. Never recompute the expectation the way the code does.
2. **Nothing in the suite mounts React.** Tests and a clean build can both pass while the app is
   broken on screen; that has already happened once. Run the app before believing a UI change.

## Working in this repo

- Geometry recalculates in `useMemo`; include every dimension it reads in the dependency array.
- Clone geometry before a CSG operation rather than mutating the original.
- Dispose geometries and materials you create outside the JSX tree — shader factories return fresh
  `ShaderMaterial` configs and React Three Fiber will not clean them up (ADR-0002).
- **A geometry that reaches a mesh through `<primitive>` belongs to whoever built it.** R3F
  deliberately never disposes a primitive's object, so a `useMemo` that builds one needs
  `useEffect(() => () => geometry.dispose(), [geometry])` beside it. Without that, every distinct
  size the store passes through leaves its buffers on the GPU (issue #20). A `<boxGeometry>` or
  `<shaderMaterial args={...}>` element is *not* a primitive and is cleaned up for you.
- Wrap 3D subtrees in `<Suspense>`; use `<OrbitControls>` from `@react-three/drei`.
- Prefer store state over component state for anything the 3D view reads.

## Troubleshooting

```bash
lsof -ti:8080 | xargs kill -9      # backend port in use
npm run dev -- --port 5174         # frontend port in use
cd frontend && npm install
cd backend && go mod tidy
```

- Geometry not updating → check the `useMemo` dependencies.
- A Placement not appearing → check its normalized coordinates are within `[0, 1]`.
- A hole misaligned with its door → the cut happens in `ShedWall.jsx` in local wall space
  (ADR-0001), and the coordinates come from `openingTransform` (ADR-0011).
- Stale geometry after a code change → clear the browser cache.

## API contract

Captured from a running server. Note `price: 1` going in and `6589` coming back — the Quote is
computed server-side ($6,089 for 12x16x10, plus $500 for the 8x7 door).

**Request** — `POST /api/save-design`

```json
{
  "width": 12, "length": 16, "tier": "Standard",
  "model": "Gable",
  "color": "#D2691E", "roofColor": "#8B4513", "trimColor": "#654321",
  "placements": [],
  "options": { "garageDoor": { "enabled": true, "size": "8x7" } },
  "price": 1
}
```

**Response** — `201 Created`

```json
{
  "id": "4667e8ca-6e22-42e8-8491-53610f81a023",
  "width": 12, "length": 16, "tier": "Standard",
  "model": "Gable",
  "color": "#D2691E", "roofColor": "#8B4513", "trimColor": "#654321",
  "placements": [],
  "options": { "garageDoor": { "enabled": true, "size": "8x7" }, "...": "every Option, echoed back" },
  "price": 6589,
  "createdAt": "2026-08-23T22:15:07-04:00"
}
```

Errors are `400` with `{"error": "..."}` for a combination outside the catalog or a Model that
isn't `Gable` or `Barn`; `404` for an unknown id.

## Key paths

```
CONTEXT.md                        glossary — the words to use
docs/adr/                         decisions and their reasoning
docs/agents/                      issue tracker, triage labels, domain doc rules
shed-options.md                   catalog of record: prices and what each build includes

frontend/src/
  App.jsx                         nav, canvas, renders BarnShed | GableShed off `model`
  store/shedStore.js              all Design state
  components/ControlPanel.jsx     drawer: Size | Model | Colors | Options
  components/{Barn,Gable}Shed/    per-Model assembly
  components/shed/                walls, roofs, trim, openings, extras
  components/common/              door/window frames and objects, Runners
  pages/ReferenceMatch.jsx        photo vs render (its scene is a fork — issue #4)
  utils/roofGeometry.js           roof math
  utils/modelSpec.js              what a Model bundles: wall height, rise, peak
  utils/design.js                 overlay a fixed Design on the store's (ADR-0012)
  utils/wallOpenings.js           CSG: cut Openings out of a wall (Brush, local space)
  utils/wallSides.js              the four walls, and routing Placements onto them
  utils/trimGeometry.js           where the trim boards sit; corner positions for both Models
  utils/pricingUtils.js           catalog and Option line items
  services/designApi.js           axios client

backend/main.go                   catalog, pricing, routes, in-memory store
backend/main_test.go              API tests
```

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
