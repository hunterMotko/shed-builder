# ADR-0013: The roof is a slab, and the eave datum is the wall

## Status

Accepted

## Revision log

| Date | Description |
|------|-------------|
| 2026-08-26 | Document created |

## Context

Both roofs were built the same way: a **filled** 2D profile — a triangle for the
Gable, a trapezoid plus a triangle for the Barn — extruded with
`depth: shedLength`. A solid wedge exactly as long as the building.

That shape cannot express most of what the Reference Photos show.

- **No rake overhang.** The roof stopped dead at the gable end, because the
  extrusion depth was the shed length. Every photograph shows the roof
  projecting past it — 6 5/8 in on a gable, 2 in on a barn.
- **No thickness.** A filled profile has no underside, so there is no fascia
  face to see at the eave and no soffit to close. A boxed rake has nothing to
  hang from.
- **The gable end was drawn twice.** The prism's end cap sat 0.01 ft behind
  `GableEnd`'s siding triangle, two nearly coplanar surfaces competing for the
  same pixels.
- **The Barn borrowed its own caps for siding.** `GambrelRoof` addressed its
  end-cap material group with the siding shader so the barn's gable faces would
  match the walls. The roof was pretending to be a wall.

The profiles also placed `y = 0` — the eave datum — at the **tip of the
overhang** rather than at the wall. That quietly broke both Models in different
ways:

- A Barn's ridge rendered **10 inches above the Peak Height quoted on screen**,
  because `modelSpec.roofRiseFt` measures the rise from the wall and the roof
  measured it from the overhang.
- A Gable spread its 6:12 rise over half a width *plus* the overhang, rendering
  an effective **5.54:12** against a specified 6:12.

Both follow from the same mistake, and a wider soffit box made a taller
building — which is not how a roof works.

## Decision

**The roof is a slab: a plane with thickness, extruded past both gable ends.**

- The profile is a closed outline whose top surface is the roof plane and whose
  bottom surface is the same polyline dropped straight down by
  `ROOF_THICKNESS`. Extrusion depth is `shedLength + 2 * overhang`.
- **`y = 0` is the eave at the wall.** The ridge sits at the rise the Peak
  Height quotes, and the overhang tip hangs *below* the top plate — which is
  where a rafter tail actually is.
- The outlines live in `utils/roofGeometry.js` as pure functions
  (`gableRoofProfile`, `gambrelRoofProfile`), not inside the components.
- A Barn's end wall above the eave is `BarnEnd`, a real piece of siding, the
  gambrel counterpart of `GableEnd`.

The offset that gives the slab its thickness is **vertical, not
perpendicular**. That keeps the fascia cut plumb, which is how the board is
really cut, and it keeps the seam at the Knuckle a single point rather than two
offset lines that would have to be intersected.

## Consequences

**Benefits**

- There is an edge to trim. The boxed soffit and fascia the Gable needs, the
  J-channel and ridge cap both Models need, and the Barn's gambrel break
  flashing all have a surface to attach to.
- The rendered ridge and the quoted Peak Height agree, and there is a test
  asserting they agree at every width the catalog sells.
- The specified pitch is the rendered pitch.
- One mesh per roof instead of two for the Barn, and no material-group
  addressing — which is what issue #30 came from.

**Tradeoffs**

- A Barn is one component heavier: `BarnEnd` has to exist, where the roof used
  to supply that face for free.
- The slab's underside is visible from below at the overhang. That is correct,
  but it means the soffit is now something that can look unfinished, where
  before there was nothing there at all.
- Vertical rather than perpendicular offset makes the perpendicular thickness
  vary slightly with pitch. On a gambrel's steep lower slope it is thinner than
  on the shallow upper one. Invisible at any normal viewing distance, and the
  visible fascia face is plumb either way.

## Related Decisions

- **ADR-0010** — unchanged. Every Model still renders four real walls floor to
  eave; this decision only concerns what happens above them.
- **ADR-0011** — the same principle applied to the roof: one place works out
  the coordinates, and the components ask rather than compute.
