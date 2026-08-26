# One Source of Truth for Opening Coordinates

## Revision log

| Date | Description |
|------|-------------|
| 2026-08-25 | Document created |

## Context

An Opening exists twice in the scene: as a hole cut out of the wall, and as the thing you see in
the hole — a door slab, a window, a trim frame, a pair of shutters. The hole is cut by
`cutOpenings` in the wall's local space (ADR-0001). Everything visible is rendered by `ShedWall`
as a *sibling* of the wall mesh, positioned in shed space.

Both are derived from the same Placement, and nothing made them agree. Each of the seven visible
components carried its own copy of the position formula, and every copy was wrong in at least one
way:

**Vertically (issue #26)** — all seven used the wall-local expression `-wallHeight/2 + normalizedY
* wallHeight`. That is correct *inside* the wall mesh, which sits at world Y `wallHeight/2`. Used
in shed space it renders every opening half a wall too low. On a 10 ft wall the doors straddled
the floor line, 5 ft below their holes.

**Horizontally (issue #17)** — on left and right walls the components measured `normalizedX`
across the full `shedLength`, while the cut measured it across the wall's real span,
`shedLength - 2 * WALL_THICKNESS`. The two agree only at the centre of the wall and diverge to 6in
at either end.

**Facing** — the rotations disagreed with each other and with the geometry. Every component builds
its geometry facing local +Z, so the rotation has to carry +Z onto the wall's outward normal.
`Ramp` was the only component that had all four walls right. `DoorObject`, `WindowObject` and
`Shutters` left the back wall unrotated, so a back door faced into the shed; `GarageDoor` and
`SwingBarnDoor` had left and right inverted. The trim frames were wrong too, but symmetric enough
that nobody could see it.

The click-to-place path had the same two bugs in reverse: `getWallNormalizedCoordinates` divided
world Y by a wall-centred range and measured left/right across the full length, so a click and the
opening it produced would not have agreed either.

None of this was visible until issue #25 was fixed, because the CSG cut threw on every call and no
wall had a hole to compare an opening against.

## Decision

One function owns opening coordinates. `openingTransform(placement, shedDimensions, faceOffset)`
in `frontend/src/utils/wallOpenings.js` returns the `position` and `rotation` for an Opening in
shed space, and everything that draws or cuts an Opening goes through it.

- `normalizedY` is measured **from the floor**: 0 is the floor, 1 is the eave.
- `normalizedX` is measured across **that wall's own span**, from `wallSpan(wall, width, length)` —
  the same value the cut uses for its local X.
- `rotation` carries local +Z onto the wall's outward normal: front `0`, back `π`, left `-π/2`,
  right `+π/2`.
- `faceOffset` is how far proud of the wall's outer face the part sits. Passing
  `-WALL_THICKNESS / 2` lands exactly on the centre of the hole.

That last property is the one the tests hold onto: for every wall and any position on it,
`openingTransform(p, dims, -WALL_THICKNESS / 2)` must equal the hole's world centre, computed
independently by applying the wall mesh's own transform to the cut's local coordinates. If the two
conventions ever drift again, that test fails.

`WALL_THICKNESS` moves to the same module, next to the maths that depends on it, and is re-exported
from `ShedWall` for the roof and trim components that align against the wall face.

## Consequences

**Benefits:**
- An Opening and its hole cannot drift apart, because there is only one formula.
- The click path is the inverse of the same function, so a door lands where the user clicked. A
  test asserts the round trip.
- Adding a new opening type means calling `openingTransform` with an offset, not copying twenty
  lines of switch statement. Seven copies became one.
- Doors face out of the shed on all four walls, on every opening type.

**Tradeoffs:**
- Components no longer control their own positioning, so an opening type that genuinely needs to
  sit somewhere else — a skylight on the ridge, say — does not fit this function and will need its
  own, rather than a special case bolted onto this one.
- `faceOffset` is a per-component constant (`0.3` for a door slab, `0.25` for a window, `0.1` for a
  barn door, `trimWidth / 2` for a frame). Those numbers stay scattered; only the coordinate maths
  is centralised.

**Operational Implications:**
- Do not recompute a position from `normalizedX` / `normalizedY` inside a component. That is what
  produced seven divergent copies.
- The preview components pass a zero-sized shed (`{ width: 0, length: 0, wallHeight: 0 }`) and rely
  on the result collapsing to the origin plus the face offset. It does, and the Component Preview
  page renders unchanged.

## Implementation

1. Add `WALL_THICKNESS`, `wallSpan` and `openingTransform` to `frontend/src/utils/wallOpenings.js`,
   alongside `cutOpenings`.
2. Replace the transform block in all seven components with a call to `openingTransform`, passing
   each one's existing face offset: `DoorObject`, `WindowObject`, `DoorFrame`, `WindowFrame`,
   `GarageDoor`, `SwingBarnDoor`, `Shutters`.
3. `ShedWall` takes its `localGeomWidth` from `wallSpan` instead of computing it, and re-exports
   `WALL_THICKNESS`. `Ramp` drops its private copy of the constant.
4. `coordinateUtils.getWallNormalizedCoordinates` inverts the same convention: Y from the floor, X
   across `wallSpan`.
5. `openingTransform.test.js` covers the floor/eave range, the wall span, the outward facing, the
   round trip through `getWallNormalizedCoordinates`, and the agreement with the cut on every wall.

## Related Decisions

**Extends:**
- **ADR-001** — the cut stays in wall-local space. This adds the shed-space half of the same
  mapping and requires the two to agree, rather than leaving each component to guess.

**Implements:**
- **ADR-007** — a Placement positions an Option on the shed. This is what makes the position mean
  one thing rather than eight.

**Related:**
- **ADR-010** — every Model renders four walls, so all four now carry openings and all four
  rotations matter. Before, a Barn had no front or back wall for a back-facing door to be wrong on.
