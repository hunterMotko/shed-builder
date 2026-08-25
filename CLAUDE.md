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
| **Model** | The product line — `Gable` or `Barn`. Carries roof profile, wall height, stud length (84in vs 80.5in) and trim set as one bundle. Not a roof toggle. |
| **Tier** | What a wall height implies: 10ft Standard, 11ft Deluxe, 12ft Special. |
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
npm run lint       # 11 pre-existing errors — don't add more
```

## Architecture

### State (Zustand)

Single global store: `frontend/src/store/shedStore.js`. Components read it with `useShedStore()`;
outside React use `useShedStore.getState()`. Never mutate state directly — every change goes
through an action.

Defaults: `width: 12`, `length: 16`, `wallHeight: 10`, `model: 'Gable'`, `sidingTexture: 'T1-11'`,
`roofMaterial: 'metal'`, `foundationHeight: 1.5`, `roofLowerPitch: 24`, `roofUpperPitch: 6`.

`options` holds nine Options, all disabled by default. `placements` is a flat array. `porch` is
separate from `options` and currently has **no price** (issue #9).

**The store may only ever hold a Design the catalog sells.** `setWidth`, `setLength` and
`setWallHeight` all run `snapToValidCombo`, which falls back to the nearest sellable combination
rather than accepting an arbitrary size. There is a test for this invariant.

`setModel` also switches the garage door: Barn gets `'rollup'`, Gable gets `'sectional'`.
(`options.garageDoor.style` is a door style — unrelated to Model, and deliberately still called
`style`.)

### 3D rendering

All geometry is procedural. There are no model files (`.obj`, `.gltf`).

`App.jsx` renders `BarnShed` or `GableShed` directly off `model`. Each assembles walls, roof,
trim, Runners and any Placements. Roofs come from `ExtrudeGeometry` over a 2D profile; walls are
`BoxGeometry` with openings cut out.

Trim is per Model and deliberately not shared — `GableTrim` has corner boards, eave fascia and
rake boards; `BarnTrim` has **corner boards only** (ADR-0006 says it also has fascia; the code
disagrees and the code is what runs — issue #22). Trim stock is `0.333 ft` (~4in); roof overhang
at the eave is `0.5 ft`.

### CSG (cutting openings)

Openings are cut **inside `ShedWall.jsx`**, which owns a shared `three-bvh-csg` `Evaluator` and
subtracts one box per Placement in the wall's **local** space (ADR-0001). Left and right walls are
rotated `[0, -π/2, 0]` so a wall's local X always runs along its own width.

> `frontend/src/utils/csgOperations.js` exports a `csgModifier` singleton with world-space
> coordinate helpers. **Nothing imports it.** It is dead code that contradicts ADR-0001; do not
> treat it as the coordinate reference and do not extend it. Issue #18 deletes it.

The cut and the rendered opening currently measure the wall differently on the left and right
walls — the cut spans `shedLength - 2 * WALL_THICKNESS`, every opening component spans
`shedLength`, so they drift apart by up to 6in toward the wall ends (issue #17).

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

Base prices are a **fixed catalog of 27 width×length×wallHeight combinations** from
`shed-options.md` — not a formula. Widths sold: 10, 12, 14, 16. There is no square-foot rate and
no Model surcharge.

Options are priced per item or per unit (per foot, per sheet, per pair, per sqft).

Workbench, pegboard and loft are priced on both sides but are **not yet in the store's
`options` defaults**, so nothing can enable them from the UI (issue #9).

The catalog currently exists twice — `frontend/src/utils/pricingUtils.js` and `backend/main.go` —
and the two can drift. They agree today (27 combinations each, no price disagreements); nothing
but diligence keeps them that way. The server recomputes the price on every save and ignores whatever the
client sent; **the server's number is the Quote** (ADR-0008). Issue #8 moves the catalog behind
`GET /api/catalog` so there is one copy.

## Geometry

`frontend/src/utils/roofGeometry.js` holds the math. Pitch is `X:12` — rise in inches per 12
inches of run.

**Gable**: one triangular profile extruded along the length. Rake angle is
`atan(roofHeight / halfWidth)`; rake length is the hypotenuse.

**Barn (gambrel)**: two extrusions meeting at the **Knuckle**. The lower slope is the steep one.
The store drives this with **24:12 lower and 6:12 upper** — `GambrelRoof.jsx` declares defaults of
5 and 10, but they are always overridden by the store, so the running geometry is 24/6. A lower
pitch shallower than the upper one is not a barn.

Useful functions: `pitchToRadians`, `calculateRise`, `calculateKnucklePoint`,
`calculateGambrelProfile`, `createLowerRoofShape`, `createUpperRoofShape`, `getRakeTrimAngles`,
`calculateSlopeLength`, `calculateGableRakeAngle`, `calculateGableRakeTrimLength`.

Foundation constants live in `STANDARD_FOUNDATION`: height `1.5 ft`, overhang `0.5 ft`, color
`#8B7355`. `components/common/Runners.jsx` renders the floor deck plus five 4x4 runners.

## Placements

A Placement is `{ id, type, wall, normalizedX, normalizedY, width, height }`. Position is
normalized `0.0–1.0` across the wall; `(0,0)` is bottom-left. Size is **absolute feet**, which is
why resizing a shed can leave an Opening that no longer fits.

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
- A hole misaligned with its door → the cut happens in `ShedWall.jsx` in local wall space, not in
  `csgOperations.js`.
- Stale geometry after a code change → clear the browser cache.

## API contract

Captured from a running server. Note `price: 1` going in and `6589` coming back — the Quote is
computed server-side ($6,089 for 12x16x10, plus $500 for the 8x7 door).

**Request** — `POST /api/save-design`

```json
{
  "width": 12, "length": 16, "wallHeight": 10,
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
  "width": 12, "length": 16, "wallHeight": 10,
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
