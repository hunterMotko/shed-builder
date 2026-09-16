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
| **Tier** | The build grade — `Standard` or `Deluxe`. Not a height: both stand the same, and Tier is what selects a price alongside width and length. It is also **geometry**: a Deluxe is framed with 2x6 rafters, so its roof edge reads 6in against a Standard's 4in. **A Gable is Deluxe only**; so is any width above 12ft. |
| **Design** | One complete specification: Model, dimensions, colors, Options with their Placements. |
| **Option** | A priced catalog item. An **Opening** cuts a wall (doors, windows); an **Attachment** does not (ramp, shutters, skylight, workbench, pegboard, loft). |
| **Loft** | A half-floor platform. On a **Barn** it is part of the build, not an Option — `1/2 loft` is on both Barn sheets in `shed-options.md` and the kernel frames it. On a **Gable** it is an Attachment at $4/sq ft, because no Gable sheet carries one. |
| **Placement** | Where an Option sits on the shed. |
| **Quote** | The price the server computes. The client's number is never trusted. |
| **Runner** | A pressure-treated 4x4 the shed sits on. Five in a standard build. |

Do not reintroduce `style`, `addOn`, or `skid` — they were renamed deliberately (issue #1).

## Development Commands

### Backend (Go 1.25.4)

The Go module is rooted at the repo root — `go.mod` and `main.go` live there, not in a
`backend/` directory. Run these from the root:

```bash
go build -o shed-server . && ./shed-server   # serves on :8080
go test ./...                                # API tests via httptest
go vet ./... && gofmt -l .
```

**New backend packages use the standard Go layout from the root** — `internal/` for code
nobody outside this module should import, and so on. `main.go` stays where it is.

### Frontend (Vite 7 + React 19)

```bash
cd frontend
npm run dev        # http://localhost:5173
npm test           # vitest, single run
npm run test:watch
npm run test:e2e   # playwright: freeze-frame the reference renders
npm run build
npm run lint       # clean — keep it that way
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

`options` holds the six Options that have **no position on the shed** — the two octagons, the
skylight, and the three interior items — and `placements` is a flat array of everything that does.

**Nothing placeable has a flag.** A door, a window, a pair of shutters and a ramp are Placements
or fields on one, never an Option beside one. A flag would be a second copy of the same fact, and
two copies drift: that is precisely how a garage door came to add $500 and no geometry (issue
#10).

**There is no porch.** It had geometry and store state and no price anywhere — not in
`catalog.json`, not in `pricingUtils.js`, and not even a field in the server's `Design`, so a
porch was quoted at nothing and then discarded on save. A shed that can be drawn but neither
quoted nor persisted should not be drawable. Issue #45 brings it back recessed, and priced.

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

**The roof is a slab, not a solid** (ADR-0013): a plane `roofThicknessFt(tier)` deep, extruded
`shedLength + 2 * overhang` so it runs past both gable ends. `y = 0` in the profile is the eave
**at the wall**, so the ridge lands on the rise `roofRiseFt` quotes and the overhang tip hangs
below the top plate. **The slab's depth is the grade's, not a constant** — a Deluxe's 2x6 rafters
make it 6in where a Standard's 2x4 make it 4in, and the fascia, the rake, the J-channel and a
Barn's corner boards all finish on that edge. `BarnShed` and `GableShed` read `tier` off the store
into their Design overlay and hand it down; the kernel refuses a Design without one rather than
draw a Standard's roof on a Deluxe. Measuring from the overhang tip instead put a 12ft Barn's ridge 10in above
its own quoted Peak Height and rendered a Gable's 6:12 as 5.54:12; there is a test asserting the
two agree at every catalog width. Outlines come from `gableRoofProfile` / `gambrelRoofProfile` —
the components do not compute them.

`roofOverhangFt(model, width)` is the shop spec: a gable gets a 6 5/8in soffit and fascia box,
except at 16 wide where it is 4 7/8in; a barn gets 2in and finishes in J-channel.

**Both Models render all four walls** (ADR-0010), from `WALL_SIDES` in `utils/wallSides.js`. The
Models differ above the eave only: a Gable has two `GableEnd` triangles, a Barn has two `BarnEnd`
gambrel faces.

**The end above the eave is not a wall, and that is deliberate** (issue #43). It is not in
`WALL_SIDES`, it takes no Placement, and `openingTransform` does not describe it — a triangle's
`normalizedX` spans a different width at every height, and nobody positions an octagon, which is
centred in the gable by definition. `utils/gableEndOpenings.js` is the named exception to
ADR-0011: it owns where the octagon sits and which ends carry one. **These are outlines, not
cuts** — both ends are flat panels with no thickness, and CSG subtracts solids, so `THREE.Shape`
holes are the right tool and `cutOpenings` is not. An octagon is bought **per end**: ask
`octagonForEnd`, never `options.octagonWindow.enabled`, which is what drew two windows on a Gable
and charged for one. `octagonEnds` and its Go twin `octagonEndCount` must agree, because the
server's number is the Quote. A window and a vent bought for the same end cannot both be fitted —
there is one hole — so the window wins, and both are still charged. Both are siding — the Barn's used to be the roof prism's own end caps, borrowed and
drawn with the siding shader, until the roof became a slab (ADR-0013). Placements are routed to walls by `routePlacements`, which hands back a `dropped` list so
an opening assigned to a wall that isn't rendered is reported rather than lost — a Barn used to
render two walls and discard every front and back Placement in silence.

Trim is per Model and deliberately not shared — `GableTrim` has corner boards plus a boxed rake
and eave fascia; `BarnTrim` has corner boards and the white band down each gambrel rake, and no
eave fascia at all. The Trim Set is part of the Model bundle, so treat any change to it as a
product question. Eave overhang comes from `roofOverhangFt`, not from a constant.

A corner board, though, is the same board on both, and **`utils/trimGeometry.js` is the only
place a trim position is worked out** — the trim counterpart to `openingTransform` (ADR-0011).
`cornerBoards` is shared; `gableFasciaBoards` (the Gable's boxed rake and eave),
`gableCornerBoxes` (the boxed soffit return at each of its four corners), `barnRakeFlashing`
(the white band down a Barn's gambrel — the fly UNDER the metal, so the panel edge laps it) and
`barnKnuckleFlashing` (the gambrel break flashing capping each Knuckle, rendered by
`GambrelRoof` in the roof colour) are per Model. The components ask; neither computes.

The fascia has to be worked out from the **roof**, not the wall: once the roof became a slab
running past the gable ends (ADR-0013), `GableTrim`'s rake boards — still nailed to the gable end
plane — were buried under the overhang and invisible. The Barn's band is not a board at all: the
panel runs 2in past and finishes in J-channel, and what the photographs show is the flashing over
it. That is the half of issue #22 the photos settle — ADR-0006 says the Barn has fascia, the
component said it has none, and both were half right.

**A band that follows a roof edge is one mitred outline, never a run of boxes.** `mitredBand`
builds it: both edges are offset copies of the slab's top line, consecutive runs are intersected
rather than butted, and the two ends are cut plumb — the way `slabFrom` cuts the slab. A box is
cut square across its own axis, so however carefully the centre lines were mitred the corners
still overshot: the Gable's two rake boards left a wedge of daylight above the apex and crossed
below it, and every Knuckle had the same defect in proportion to its angle. The outlines reach a
mesh through `ExtrudedBand`. The rake, the Barn's fly and the J-channel over either are all
bands; the ridge cap and the Knuckle flashing run along the shed instead and stay boxes.

**A skylight is the ridge cap in glass, not a part laid over it** (issue #42). `roofRidgeCap`
takes `skylightFt` and breaks each leg into cap, gap, cap — six runs instead of two — then fills
the gap with a run tagged `kind: 'glass'` at the same width, plane and fold as the metal it
replaced, so the two cannot drift apart. With no skylight it returns exactly the two runs it
always did. Asking for more skylight than there is ridge clamps to the ridge and reports it as
`clampedFrom`, the way `routePlacements` hands back `dropped`. `Skylight.jsx` used to draw four
opaque boxes flat on top of an unbroken cap, at a width and angle of their own invention; it now
owns nothing but the Component Preview, and `skylightMaterial.js` holds what the glass is made
of.

A plumb cut is the right end on a 6:12 and the wrong one on a Barn: the steeper the run, the
longer the point it leaves below the band, and the fly hung 2.5in of paint below the roof it is
tucked under. `mitredBand`'s `endFloor` cuts that end level, and `barnRakeFlashing` sets it to
the slab's own underside — the fly stops where the metal stops, which is what the photographs
show, with the corner board taking over below. Nothing else passes it.

Rake and eave are one board turning a corner, so the numbers that place their faces are shared,
not chosen twice. Both hang `eaveFasciaDrop` below the roof's edge — the rake's own perpendicular
`RAKE_REVEAL`, converted to plumb — and both are `ROOF_THICKNESS` deep measured plumb, which is
how much slab edge there is to cover. A flat eave reveal of its own put the eave fascia an inch
and a half above the rake it meets. The eave then runs a board's thickness past the slab at each
end to lap the rake's plumb cut, the way the two boards at a corner lap.

A corner board is an outline too, for the same reason: its top is not always level. A Barn cuts
it on the **roof's underside** — parallel to the fly, so it carries the gambrel's angle, and as
high as a board can go before it enters the slab. Level at the eave, the tops were buried in the
roof; on the fly's own lower edge, which hangs 2.4in under the slab, that much siding showed
between the board and the fly from anywhere but dead on. `bandUnderside` gives the line, and a
band of no width is the surface itself. A Gable leaves the default, level at the eave. The bottom
is never cut: it is flat and on the floor, `y = 0`.

Trim stock has two numbers, and they are not the same number: `TRIM_WIDTH` is the face you see
(`0.333 ft`, 4in — now measured, at 15–18px on a photo that scales at 48.5 px/ft) and
`TRIM_THICKNESS` is how far the board stands off the siding (`0.0625 ft`, a dressed 1x). They
used to be one value, which is what buried every corner board inside the
wall with its faces exactly coplanar — nothing decided which surface won and each board rendered
as hatched noise (issue #31). A corner board is nailed **on** the siding; the two boards at a
corner lap rather than butt, so the front or back one runs past to cover the side board's end
grain. The 4in face is what both components have always defaulted to, and the Reference Photos
agree with it.

### Cutting openings

**There is no CSG.** `utils/wallOpenings.js`'s `cutOpenings(baseGeometry, placements, opts)` keeps
its old signature, but it asks the kernel for the wall panel with its Openings already cut —
generated analytically, never subtracted (kernel ADR-0001) — and wraps the buffers in a
`THREE.BufferGeometry`, or returns `null` when the wall has no openings. `baseGeometry` is unused.
`three-bvh-csg`, `Brush` and `Evaluator` are gone; `frontend/src/kernel/README.md` lists what else
is routed. `ShedWall.jsx` calls it from a `useMemo` and disposes the result — the geometry reaches
the mesh through `<primitive>`, which React Three Fiber never disposes. Left and right walls are
rotated `[0, -π/2, 0]` so a wall's local X always runs along its own width.

**`openingTransform` is the only place opening coordinates are worked out.** The cut and every
visible part of an opening — door slab, window, trim frame, shutters — derive from it, so the two
cannot drift apart (ADR-0011). Pass how far proud of the wall face the part sits; pass
`-WALL_THICKNESS / 2` to land exactly on the centre of the hole, which is what the test asserts on
all four walls. `wallSpan` gives the wall's own width, and `coordinateUtils` uses it to invert a
click back into a Placement.

Do not recompute a position from `normalizedX`/`normalizedY` inside a component. Seven of them did,
each with its own copy of the formula, and every copy was wrong in at least one way (issues #17,
#26).

ADR-0005's CSG performance ceiling no longer applies — there is no boolean left to be slow — and it
is kept as history.

### Backend API (Go + Gin)

`main.go`, at the repo root. **Designs are stored in SQLite**, through `modernc.org/sqlite` — a
pure-Go driver, so the server stays one static binary with no C toolchain and runs on any host
with a writable disk. `SHED_DB` names the file; it defaults to `shed.db` and the tests point it
at a temporary one. The database opens lazily on first use, so `go test` touches no disk until a
request is served.

**A Design is stored whole, as JSON in one column** (`id`, `created_at`, `doc`). A column per
field would be a second description of the `Design` struct to keep in step, and nothing queries
by field: a Design is written once and read back by its id. That id is a UUID, and it is the
customer's unguessable handle — what stands in for an account until there is one.

**There is deliberately no route that lists every Design.** The one that did returned every
customer's design and details to any caller, and it is deleted rather than guarded (issue #12).
A staff view arrives with authentication, not before it.

### The quote request

`POST /api/quote-request` is what a customer's session ends with (ADR-0008): a Design and the
contact details of whoever wants it built. **It saves the Design and the request before it
notifies anyone**, so a request outlives a notification that fails — the shop can still find it.

`buildDesign` is shared with `saveDesign` rather than copied. Both have to check the Model, the
grade, the combination and every Placement, and **compute the price here** — two copies of that
would be two answers to what a shed costs.

**The contact rule**: a name, and **one** of phone or email. The shop has to be able to call
back, and demanding both loses customers who give one. `validateContact` in `main.go` mirrors
`validateContact` in `services/designApi.js`, and neither may be the weaker of the two.

**Spam is handled twice, and neither is a CAPTCHA** — one taxes every real customer to stop a
problem this form does not have yet. A **honeypot** field (`company`) is hidden from people and
irresistible to a bot filling every field; a filled one is answered exactly like a real request
and stored nowhere, because telling a bot it failed only teaches it what to change. A **per-IP
rate limit** allows five an hour, in memory — a restart forgiving everyone is not a threat
model.

**The notifier speaks HTTPS, not SMTP.** Outbound mail ports are blocked or restricted on most
entry-tier hosts, and a blocked port fails silently on the day it matters. With no provider
configured it **logs the whole request instead of sending**, which is the local default:

| Variable | Meaning |
|---|---|
| `SHED_DB` | Where the database lives. Defaults to `shed.db` beside the binary |
| `QUOTE_EMAIL_TO` | Where a quote request is sent |
| `QUOTE_EMAIL_FROM` | The verified sender address |
| `RESEND_API_KEY` | The provider key |

Set all three email variables or none: with any missing, the request is logged in full and the
customer still gets their confirmation.

| Route | Behaviour |
|---|---|
| `POST /api/save-design` | Validates the combination, the Model and every Placement, computes the Quote, returns 201 with a UUID |
| `POST /api/quote-request` | The terminal action: a Design plus contact details. Saves both, then notifies the shop |
| `GET /api/design/:id` | One Design, or 404 |

`newRouter()` builds the router so tests can drive it with `httptest`; `main()` only serves it.
CORS is wide open (`*`).

A Design is stored exactly as it arrives and handed straight back to the renderer on load, so
`validatePlacements` refuses any Placement that could not be drawn. **`Placement`'s coordinate
fields are `*float64` on purpose**: a non-finite number serializes as `null`, and Go decodes
`null` into a plain `float64` as `0` without complaint — the Opening would be accepted and
quietly moved to the corner of its wall rather than refused (issue #19). It mirrors
`validateDesignConfig` in `services/designApi.js`; neither may be the weaker of the two.

## Pricing and the Quote

Base prices are a **fixed catalog of 25 width×length×Tier combinations** from
`shed-options.md` — not a formula. Widths sold: 10, 12, 14, 16; above 12 is Deluxe only. There
is no square-foot rate and no Model surcharge.

**The price table is not the whole catalog.** It has no Model in its key, so it cannot say
that a Gable is sold as a Deluxe only — and `12x16xStandard` is a real price, for a Barn.
That rule lives in `catalog.json`'s `modelTiers`, which both `pricingUtils.js` and the Go
server read, and it is enforced in three places for three different reasons: the store
snaps to it (`setModel` moves a Standard Barn up a grade when it becomes a Gable),
`validateDesignConfig` refuses it on save, and the server refuses it and defaults an absent
Tier to the grade that Model is sold at rather than flatly to Standard. Since the grade
became geometry, a Standard Gable is not merely unpriced — it would be drawn with a
Barn's 4in roof edge.

The key is the Tier, not the height: every size
is 11ft, so a height key would collapse all seven Standard sizes onto their Deluxe twin.

**What is on the shed is counted; what has no position is ticked.** Doors and windows are priced
off the Placements: the first roll-up by its width and each one after it as an additional garage
door, an entry door by its own `doorType`, windows per window, shutters by the windows carrying
them, and a ramp by the door it meets. A swing barn door is part of the Standard barn package and
prices nothing. The rest — octagons, skylight, workbench, pegboard, loft — are Options priced per
item or per unit (per foot, per sheet, per pair, per sqft).

`getOptionLineItems(options, placements)` and Go's `calculateOptionTotal(options, placements)` are
the same rule twice, and **the server's is the Quote** (ADR-0008).

Workbench, pegboard and loft are priced on both sides **and reachable**: they sit in the store's
`options` defaults and in an **Interior** group on the Options tab, asking for running feet, 4x8
sheets, and square feet added. They take no Placement — they are quantities, not positions.

**The $4/sq ft loft line is for footage on top of what the shed already has.** It
is `add loft/shelving` on the sheet and it means exactly that — extra lofts, extra
shelving — so it adds to a Barn's included half rather than replacing or
double-billing it, and on a Gable it buys the whole platform because a Gable is
built with none. That is why `priceOptions` and `getOptionLineItems` take a raw
`sqft` on either Model and are right to: the number is what the customer is adding,
not what the finished shed ends up with. The Options tab asks it that way: its loft row is labelled square feet *added*, and says a barn is built with a half loft already.

**The numbers live in exactly one file: `catalog.json` at the repo root.** The frontend imports it and
the Go server embeds it with `go:embed`, so a price change is a one-line edit to that file and
neither side can drift from the other (issue #8). They used to be typed out in both places with
nothing but diligence keeping them in step.

It sits at the root because both sides read it and neither owns it. `go:embed` cannot reach
outside its own module, which is why this only works with `go.mod` at the root.
`frontend/vite.config.js` allows `..` in `server.fs` so the dev server will serve it.

There is no catalog endpoint and no fetch. The import resolves at build time, so a price is
available synchronously and `snapToValidCombo` cannot be asked a question it has no answer for.
The tradeoff is that a price change still needs both artifacts rebuilt — the frontend bundle
inlines the JSON and the Go binary embeds it.

The derived helpers (`CATALOG_WIDTHS`, `getAvailableTiers`, `getAvailableLengths`,
`snapToValidCombo`) stay in `pricingUtils.js`: they are how this app asks questions of the
catalog, not part of the catalog itself.

The server recomputes the price on every save and ignores whatever the client sent; **the
server's number is the Quote** (ADR-0008).

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

A Placement is `{ id, type, wall, normalizedX, normalizedY, width, height }`, plus what that
particular Opening *is* and what hangs off it: `doorType` (`steel` | `nine_light`) on an entry
door, `doorStyle` (`rollup` | `sectional`) on a garage door, `shutters` on a window, `ramp` on a
garage door. Two doors on one shed can be different doors, which is why these ride here rather
than on one Option speaking for both. Position is
normalized `0.0–1.0` across the wall; `(0,0)` is bottom-left — `normalizedY` 0 is the floor, 1 is
the eave, and `normalizedX` runs across **that wall's** span, which for left and right is
`shedLength - 2 * WALL_THICKNESS`, not the full length. Size is **absolute feet**, which is why
resizing a shed can leave an Opening that no longer fits.

Ask `openingTransform` for the position — never rebuild it from the normalized values.

`ShedWall` renders `door`, `window`, `garage_door`, `barn_door` and `swing_barn_door`.

**Some things hang off an Opening** (issue #44). A pair of shutters flanks a window; a ramp meets
a garage door — `ramp_small` is 7 ft wide and `ramp_large` 9 ft, which is a door apron, not a
doorstep. Each is a **field on the parent Placement**, never an Option of its own: it has no
position the parent does not already give it, and no existence apart from it — remove the window
and its shutters go with it. So a customer can shutter one window and leave the next bare, and the
count of windows carrying one *is* the price. `utils/dependentOptions.js` holds the rule and the
Openings list holds the controls.

**A resize does not move a customer's door.** It cannot: an Opening on a 16ft wall taken down to
12ft is kept exactly where it was put, and `placementIssues` says so — beside the row in the
Openings list, and again at the save and quote gates, which refuse until it is fixed (ADR-0007).
It is *asked*, never stored: whether an Opening fits is a fact about the Design as it is now, and
a stored answer is one more copy to go stale.

**The kernel calls that a caution rather than a problem, and that is right.** A wall panel clips an
Opening running past its wall, and a door crossing the floor becomes a notch rather than a hole
(ADR-0001, as amended); 144 golden vectors pin the classification. What blocks a *sale* is a
different question, and it is this app's to answer. An earlier `it.fails` marker predicted the
kernel would flip; it did not, and the marker is now a real test of what each side actually says.

## Materials and light

Siding is `T1-11` (ribbed) or `smooth`; roofing is `metal` (corrugated) or `shingle`. Both are
procedural shaders built by factory functions in `utils/shaders.js` (ADR-0002) — one GLSL change
propagates to every surface. Trim color is automatic (`matchRoof` or `contrast`) or manual.

**A shed shader must end with `<tonemapping_fragment>` and `<colorspace_fragment>`** (ADR-0014).
Three converts a colour to linear on the way in and back to sRGB on the way out through that
chunk; a shader that writes `gl_FragColor` and stops keeps the linear value and it is displayed
as though it were sRGB. Almond siding rendered `#6C5943` against the `#EFD7BA` it was given and
`#400C0C` trim rendered black, and every fixture on the Reference Match page was suspected before
the renderer was. There is a test.

**`SHED_LIGHTING` is the only light rig.** The shaders bake their Lambert term against it and
`components/common/ShedLights.jsx` builds the scene's real lights from the same constant, so a
wall and the trim board nailed to it are lit from the same sky. Both pages mount `ShedLights`;
they used to write their own and `ReferenceMatch` disagreed with the shaders. Adding a light to a
scene still will not light the siding — the shaders bake, they do not join three's light loop.
Both canvases are `flat` (no tone mapping), so a paint colour renders as the colour picked.

Two spacings are measured off the Reference Photos, not chosen: T1-11 grooves are **8in** on
centre and roof panel ribs are **10in**. The ribs run **down the slope**, so the corrugation
repeats along the roof's extrusion axis (local Z) — repeating along X drew them parallel to the
ridge. Painted trim is `metalness: 0`; it is a dielectric, and the metalness that was there ate a
quarter of the diffuse albedo of the darkest colour on the building.

Garage doors render `sectional` (panelled) or `rollup` (ribbed).

## UI

`App.jsx` holds a three-page nav — Configurator, Component Preview, Reference Match — switched by
local state, not a router.

`ControlPanel.jsx` is a drawer with four tabs: **Size**, **Model**, **Colors**, **Options**, plus
a sticky footer (Save Design / Load / Reset). Tab ids match the CONTEXT.md terms (`dimensions`,
`model`, `colors`, `options`) — if you rename a tab id, rename its `activeTab ===` branch too.

**Reference Match** pairs a Reference Photo with the same building rendered by the real
`BarnShed` / `GableShed`, so fidelity work done there lands in the product (ADR-0012). The
fixtures in `pages/referenceTargets.js` are **measured, not guessed** — colours averaged over lit
patches, sizes scaled off a known 12 ft front, and each camera solved so the front face comes out
the shape and size it is in the photograph. Every number there carries the measurement that
produced it; change one only with a new measurement. The photos are untracked (`reference/` is
gitignored) and `referencePhotos.js` names each file it loads, so adding a target means adding
its name there too.

**Guard targets are the exception, and contribute no numbers.** A target whose id is a Model plus
an Option — `gable-skylight`, `barn-skylight` — exists so the pixel suite has a frozen render of
that Option's code path. There is no photograph of one, so each reuses a measured Design whole
(`GABLE_FRONT_DESIGN`, `BARN_BARNDOORS_DESIGN`) and changes only the Option and the camera. The
measured-not-guessed rule survives because these invent no dimension, colour or pitch.

**Click a wall to place an Opening.** `WallPicker` sits inside `App.jsx`'s `<Canvas>`, turns a
click into `{ wall, normalizedX, normalizedY }` through the kernel's `wallHit`, and `App` opens
`PlacementDialog` on it. The dialog is open exactly when that pick is non-null, so there is no
second `isOpen` to fall out of step with it.

Two things `WallPicker` does that the `RaycastingInteraction` inside `Canvas3D` did not, and both
are the reason it is a new file rather than a move:

- **It casts at the whole scene, not one nominated mesh.** The old one raycast a `shedMesh` that
  only `GableShed` ever supplied and only for its *front* wall; `BarnShed` handed over `null` with
  a note that Barn placement was "not yet wired". There was nothing to wire — which wall a point
  is on is the kernel's question and it answers from the point alone, so any hit on the building
  serves. It checks the hit is between the floor and the eave, because `wallHit` measures distance
  to a wall's *plane* and would otherwise name a wall for a click on the roof.
- **A drag is not a click.** OrbitControls owns the same pointer, so the pointer has to come back
  up within a few pixels of where it went down. Otherwise finishing an orbit drops a door wherever
  the rotation ended.

**Openings go on and come off.** `WallPicker` and `PlacementDialog` put one on a wall;
`PlacementsSection`, under the Options tab, lists what is on the shed and takes it off again. The
two are a pair and should stay one: an Opening a customer can add and not remove leaves Reset —
which throws the whole Design away — as the only way back.

It is a new component rather than the deleted `PlacementList.jsx`, which was written in
light-theme Tailwind for a panel that no longer exists, and named a `swing_barn_door` as
"Swing_barn_door". `PLACEMENT_TYPES` moved out of `PlacementDialog` into `placementPresets.js`
for that reason: the dialog offers a type and the list names it back, and a shed that offers
"Swing Barn Door" then lists "Swing_barn_door" has told the customer two different things about
one Opening. `placementTypeLabel` falls back to the opened-out type rather than asserting,
because `entry_door` has presets but is not offered — a saved Design can carry a type this build
cannot produce.

**Placements are not Options.** An Option is a catalog item with a price and a checkbox; a
Placement is a position on a named wall. They share a tab because that is where a customer looks
for what has been added, not because they are the same thing.

### What was deleted unmounted, and what it was worth knowing

Eleven files were unreachable from `main.jsx` and are gone. Nine were superseded and are not
worth another word: `Canvas3D`, `ShedConfigurator`, `ColorPicker`, `ColorPresetsDropdown`,
`PriceDisplay`, `RangeInput`, `ChevronDownIcon`, `BarnDoorPreview` and `BarnDoor` — `App.jsx`,
`ColorSection`, `TrimAndDetailsSection` and `SwingBarnDoorPreview` do all of it. Three things in
them are worth carrying forward:

- **There were two colour catalogues and they disagreed.** `constants/colorPresets.js` listed 18
  colours with categories and hard-coded WCAG ratios; `ColorSection.jsx` lists 10 siding and 10
  roof colours and is what a customer sees. The same name meant different paint — "Barn Red" was
  `#8B3A3A` in one and `#D2691E` in the other. `ColorSection` is authoritative, and contrast is
  *computed* by `advancedColorUtils`, never stated. Do not reintroduce a static table of ratios;
  it is a claim that cannot go stale loudly.
- **`BarnDoor.jsx` held a seventh copy of the placement formula, with both of the bugs that
  copying it causes.** Its `cy = -wallHeight / 2 + normalizedY * wallHeight` is the wall-*local*
  expression used as world space, which is upstream issue #26 — every opening half a wall too
  low. Its left and right cases measured `normalizedX * length` rather than the wall's own span,
  which is upstream issue #17. Both were fixed everywhere else years before this file was
  deleted, and it sat there with them intact because nothing rendered it. This is the concrete
  argument for the kernel's ADR-0002: the copies do not stay correct, and a dead one does not
  even fail.
- **`Canvas3D` clamped its camera and drew a ground grid.** `OrbitControls minDistance={10}
  maxDistance={50}` and a `gridHelper`, neither of which `App.jsx` has. Not restored because
  nobody asked for them, but they are the two things it had that the live canvas does not.

**Every form control needs a name of its own.** A styled `<label>` next to a `<select>` names
nothing — bind them with `htmlFor`/`id` (via `useId`), or give the control an `aria-label`. Watch
`OptionsSection` in particular: its `Checkbox` wraps children in the `<label>` that names the
checkbox, so a `<select>` nested inside inherits nothing and must name itself (issue #21).

The 3D canvas is the whole output of the product and says nothing to a screen reader, so
`describeDesign` in `utils/describeDesign.js` renders the Design as one spoken sentence. It is
both the canvas's `aria-label` and the page's single `aria-live` region — the visual price bar is
`aria-hidden` because it repeats what the sentence already says, and two live regions means
hearing it twice. Note R3F puts `role`/`aria-label` on its own wrapper `<div>`, not on the
`<canvas>`.

## Testing

There are two suites, and they never meet. `npm test` is vitest: tests live beside their subject
as `*.test.js` and run in node — no jsdom, because every seam under test is non-React. `npm run
test:e2e` is Playwright, and it lives in `frontend/e2e/` where vitest's `include`
(`src/**/*.test.js`) cannot see it.

| Seam | File |
|---|---|
| Roof math and the roof slab | `utils/roofGeometry.test.js` |
| Shader output pipeline, rib direction and spacing | `utils/shaders.test.js` |
| Model bundle, and render vs quoted peak | `utils/modelSpec.test.js` |
| Catalog and Option pricing | `utils/pricingUtils.test.js` |
| Placement rules | `utils/placementValidator.test.js` |
| Cutting openings | `utils/wallOpenings.test.js` |
| Walls and Placement routing | `utils/wallSides.test.js` |
| Trim placement | `utils/trimGeometry.test.js` |
| Gable-end openings | `utils/gableEndOpenings.test.js` |
| What hangs off an Opening | `utils/dependentOptions.test.js` |
| Store behaviour | `store/shedStore.test.js` |
| The save gate | `services/designApi.test.js` |
| The shared catalog file | `utils/catalog.test.js` |
| HTTP API | `main_test.go` |
| The rendered reference Designs | `e2e/reference-match.spec.js` |

Two rules that matter more than coverage:

1. **Expected values come from an independent source** — trigonometry, or a price in
   `shed-options.md`. Never recompute the expectation the way the code does.
2. **Nothing in the vitest suite mounts React.** Tests and a clean build can both pass while the
   app is broken on screen; that has already happened once. Run the app before believing a UI
   change.

### The pixel suite

`e2e/reference-match.spec.js` is the answer to rule 2 for the one thing rule 2 cannot cover: the
3D canvas is the whole output of the product and no vitest seam touches it. It drives the
Reference Match page through the browser — nav, then the target button — and freezes the canvas
of each approved reference Design, so a geometry or shader change that breaks fidelity fails
here (issue #7).

**`barn-barndoors` and `gable-front` have no Option enabled, and that is their job.** They are the
base-render guards: an Option that leaks into the shed everyone else buys moves one of them, and
zero tolerance means it fails. Every other target freezes one Option's code path. So adding an
Option means adding its target, in the change that creates its geometry — a baseline frozen
before the geometry exists is a frozen picture of nothing.

**It imports no component and no geometry function.** The seam is the `<canvas>` and only the
`<canvas>`; the Reference Photo beside it is out of frame, because `reference/` is gitignored and
a baseline holding the "no reference photo" placeholder would fail on every machine but the one
that made it.

**The baselines are not committed.** They are frozen renders rather than source, so each machine
makes its own under `e2e/__screenshots__/`. A clone's first run therefore writes them and
*fails*, and the second run is the first that means anything — loud rather than a silent pass.
`npm run test:e2e:approve` re-freezes them, and is a sign-off, not a way past a red test.

**Not one pixel may differ.** The render is bit-exact run to run on one machine, so a tolerance
costs sensitivity and buys nothing: at `maxDiffPixelRatio: 0.002` — 961 of these 639 × 752
pixels — widening trim stock by two inches passed on the barn. At zero, a fifth of an inch fails
the gable. The floor is the render's own resolution, not the tolerance: the barn is a 53 ft
three-quarter view and does not move at all until about a third of an inch. If a browser upgrade
ever reddens both targets at once with no change in the tree, that is the one case for
re-approving rather than debugging.

Two things cost an afternoon each and are worth knowing:

- **Wait for the canvas to reach its pane, not merely to exist.** The `<Canvas>` is keyed by
  target id so R3F picks up each target's camera, so switching target remounts it, and a fresh
  canvas spends a moment at the HTML default 300 × 150. A guard of `width * height > 0` returns
  inside that moment and freezes a grey box.
- **The page paints over its own canvas** — a badge top left, a caption bottom centre. Any check
  that compares two regions has to take both clear of them, or it differs whether or not anything
  was ever drawn, which is a green test that cannot fail.

Issue #7 warns that headless WebGL needs `--use-gl=angle --use-angle=swiftshader
--enable-unsafe-swiftshader`. It did not here — Playwright's bundled Chromium Headless Shell
151 gives a `webgl2` context unaided, and forcing SwiftShader would only change the pixels the
baselines are made of. Reach for those flags if `getContext('webgl2')` returns null on some other
machine, and re-approve that machine's baselines when you do.

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
  pages/ReferenceMatch.jsx        photo vs render, drawn by the real components (ADR-0012)
  utils/roofGeometry.js           roof math
  utils/modelSpec.js              what a Model bundles: wall height, rise, peak
  utils/design.js                 overlay a fixed Design on the store's (ADR-0012)
  utils/wallOpenings.js           openingTransform, wallSpan, and the kernel's cut wall panel
  utils/wallSides.js              the four walls, and routing Placements onto them
  utils/gableEndOpenings.js       the octagon in a gable end: where it sits, which ends carry one
  utils/dependentOptions.js       what hangs off an Opening: shutters, ramp
  utils/trimGeometry.js           where every trim board sits: corners, gable fascia, barn rake
  utils/shaders.js                siding and roof GLSL, and SHED_LIGHTING — the one light rig
  components/common/ShedLights.jsx  the scene lights, built from SHED_LIGHTING
  pages/referenceTargets.js       the Reference Match fixtures, every number measured
  utils/pricingUtils.js           catalog and Option line items
  services/designApi.js           axios client
  kernel/                         the wasm kernel, built from KERNEL.pin — see its README

catalog.json                      the catalog: 25 base prices and 15 Option prices, shared
main.go                           pricing, routes, SQLite storage (module root)
main_test.go                      API tests
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
