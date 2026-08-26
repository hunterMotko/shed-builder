# Reference Match Drives the Real Components

## Revision log

| Date | Description |
|------|-------------|
| 2026-08-25 | Document created |

## Context

The Reference Match page paired a Reference Photo with a 3D reconstruction of the same
building. The reconstruction was `pages/reference-match/barn/` — five components that
re-implemented the shed from scratch: its own walls, its own gambrel extrusion, its own
siding and roofing shaders copied out of `utils/shaders.js`, its own runners, and a second
`BarnTrim` unrelated to the one in `components/shed/trim/`.

Every improvement made there landed in a scene no customer can reach. The product's own
components were never the thing being judged against the photo, so the gap between them
and the photo could only widen.

It could not simply be deleted, either. The fork's `BarnDoors.jsx` hand-placed a pair of
doors at `HALF_L + 0.12` because the real components could not draw them: `BarnShed`
rendered two walls and discarded every front and back Placement in silence (ADR-0010), and
the CSG cut threw on every call regardless (issue #25). The fork existed because the real
path did not work.

Both of those are now fixed, so the real components can render the target.

## Decision

The Reference Match page renders through `BarnShed` / `GableShed`, driven by a Design
fixture. `pages/reference-match/` is deleted.

A target is data — `pages/referenceTargets.js` — pairing a photo with the Design that
should reproduce it, plus a camera. Nothing under `pages/` builds geometry.

To let a page drive those components without disturbing the Design a customer is
configuring, both accept an optional `design` prop:

- `overlayDesign(base, override)` in `utils/design.js` lays the fields an override names
  over the store's Design. `undefined` never wins, so a fixture states only what makes it
  the building in the photo and inherits the rest.
- With no `design` prop the components read the store exactly as before, so the
  Configurator is unchanged.

`ShedWall` no longer reads the store at all. It took `options.shutters.enabled` directly,
which a fixture could not override; it now takes `showShutters` as a prop from whichever
component assembled it.

## Consequences

**Benefits:**
- Fidelity work reaches the product. Closing a gap with the photo now changes what a
  customer sees.
- One barn, one gambrel, one set of shaders, one `BarnTrim`.
- The page exercises the real pipeline — Placement routing, the CSG cut, the trim set — so
  a break in any of them is visible on a page whose whole purpose is looking at it.
- Adding a target is a data entry, not a component.

**Tradeoffs:**
- The shed components now have two sources for a Design and a caller can supply a partial
  one. `overlayDesign` keeps the merge in a single tested function, but the components are
  no longer purely store-driven.
- A `design` prop built inline would be a new object every render, and `placements`
  identity keys the CSG cut. Targets must be module-level constants; the fixture module
  says so and so do both components.

**Operational Implications:**
- The reconstruction is only as good as the shed components. Deleting the fork immediately
  surfaced issue #30 — every Barn roof drawing in the siding colour — which the fork's own
  correct material array had been hiding for as long as both existed.
- A target's `wallHeight` is the wall measured off the photograph, not the catalog's third
  number. Once wall height becomes a Model constant (#29) the fixture should stop stating
  it.

## Implementation

1. `utils/design.js` — `overlayDesign`, with `design.test.js` covering the undefined,
   falsy, absent-field and no-mutation cases.
2. `BarnShed` / `GableShed` take `design = null`, build the store's Design, and overlay.
   Dimension and colour props are renamed at the parameter so the merged values keep the
   names the JSX already uses.
3. `ShedWall` takes `showShutters`; both shed components pass `options.shutters.enabled`.
4. `pages/referenceTargets.js` holds `REFERENCE_TARGETS`. Each pins `options` and `porch`
   so a target cannot inherit what the customer switched on.
5. `pages/ReferenceMatch.jsx` renders `BarnShed` or `GableShed` off `target.model`.
6. Delete `pages/reference-match/`.

## Related Decisions

**Supersedes:**
- The fork itself was never recorded as a decision. This records the decision not to have
  one.

**Depends on:**
- **ADR-010** — a Barn renders four walls, so the front barn doors the target needs have a
  wall to sit on.
- **ADR-011** — one source of truth for opening coordinates, so a fixture's Placement lands
  where its hole is cut.

**Related:**
- **ADR-002** — the shader factories. The fork had copied both and they had already drifted.
